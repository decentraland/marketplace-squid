import { TypeormDatabase } from "@subsquid/typeorm-store";
import { Network } from "@dcl/schemas";
import * as landRegistryABI from "../abi/LANDRegistry";
import * as erc721abi from "../abi/ERC721";
import * as estateRegistryABI from "../abi/EstateRegistry";
import * as dclRegistrarAbi from "../abi/DCLRegistrar";
import * as marketplaceAbi from "../abi/Marketplace";
import * as erc721Bid from "../abi/ERC721Bid";
import * as dclControllerV2abi from "../abi/DCLControllerV2";
import { Order, Sale, Transfer, Network as ModelNetwork } from "../model";
import { processor } from "./processor";
import { getNFTId, getTokenURI, isMint } from "../common/utils";
import { tokenURIMutilcall } from "../common/utils/multicall";
import { getAddresses } from "../common/utils/addresses";
import {
  handleAddLand,
  handleCreateEstate,
  handleRemoveLand,
  handleUpdate as handleEstateUpdate,
  isAddLandEvent,
  isCreateEstateEvent,
  isRemoveLandEvent,
  isUpdateEvent,
} from "./handlers/estate";
import { handleUpdate as handleLandUpdate } from "./handlers/parcel";
import { Coordinate } from "../types";
import { getCategory } from "../common/utils/category";
import {
  addEventToStateIdsBasedOnCategory,
  getBidOwnerCutPerMillion,
  getBatchInMemoryState,
  getOwnerCutsValues,
  getMarketplaceOwnerCutPerMillion,
  setMarketplaceOwnerCutPerMillion,
  setBidOwnerCutPerMillion,
} from "./state";
import { handleNameBought, handleNameRegistered } from "./handlers/ens";
import {
  handleOrderCancelled,
  handleOrderCreated,
  handleOrderSuccessful,
} from "./handlers/marketplace";
import { getStoredData } from "./store";
import { decodeTokenIdsToCoordinates } from "./modules/land";
import {
  handleBidAccepted,
  handleBidCancelled,
  handleBidCreated,
} from "./handlers/bid";
import {
  handleAddItemV1,
  handleTransfer,
  handleTransferWearableV1,
} from "./handlers/nft";
import { getBidId } from "../common/handlers/bid";
import { handleInitializeWearablesV1 } from "./handlers/collection";
import { getItemId } from "../polygon/modules/item";
import { getWearableIdFromTokenURI } from "./modules/wearable";

const landCoordinates: Map<bigint, Coordinate> = new Map();
const tokenURIs: Map<string, string> = new Map();

let bytesRead = 0; // amount of bytes received

const schemaName = process.env.DB_SCHEMA;
processor.run(
  new TypeormDatabase({
    isolationLevel: "READ COMMITTED",
    supportHotBlocks: true,
    stateSchema: `eth_processor_${schemaName}`,
  }),
  async (ctx) => {
    // update the amount of bytes read
    bytesRead += ctx.blocks.reduce(
      (acc, block) => acc + Buffer.byteLength(JSON.stringify(block), "utf8"),
      0
    );
    console.log("bytesRead: ", bytesRead);
    const addresses = getAddresses(Network.ETHEREUM);
    const {
      mints,
      collectionIds,
      itemIds,
      accountIds,
      estateEvents,
      estateTokenIds,
      landTokenIds,
      ensTokenIds,
      parcelEvents,
      tokenIds,
      transfers,
      bidIds,
      ensEvents,
      markteplaceEvents,
      analyticsIds,
    } = getBatchInMemoryState();

    ctx.log.info(`blocks, ${ctx.blocks.length}`);
    for (let block of ctx.blocks) {
      await getOwnerCutsValues(ctx, block);
      for (let log of block.logs) {
        const topic = log.topics[0];
        switch (topic) {
          case erc721abi.events[
            "Transfer(address,address,uint256,address,bytes,bytes)"
          ].topic:
          case erc721abi.events[
            "Transfer(address,address,uint256,address,bytes)"
          ].topic:
          case erc721abi.events["Transfer(address,address,uint256)"].topic: {
            const event =
              erc721abi.events["Transfer(address,address,uint256)"].decode(log);
            const contractAddress = log.address;
            markteplaceEvents.push({
              topic,
              event,
              block,
              log,
              marketplaceOwnerCutPerMillion: getMarketplaceOwnerCutPerMillion(),
              bidOwnerCutPerMillion: getBidOwnerCutPerMillion(),
            });

            accountIds.add(event.to.toString()); // we'll need the accounts to update some fields
            switch (contractAddress) {
              case addresses.LANDRegistry:
                landTokenIds.add(event.tokenId);
                break;
              case addresses.EstateRegistry:
                estateTokenIds.add(event.tokenId);
                break;
              case addresses.DCLRegistrar:
                ensTokenIds.add(event.tokenId);
                break;
              default:
                tokenIds.set(contractAddress, [
                  ...(tokenIds.get(contractAddress) || []),
                  event.tokenId,
                ]);
                // @TODO: check how to improve this
                const tokenURI = tokenURIs.get(
                  `${contractAddress}-${event.tokenId}`
                );
                if (tokenURI) {
                  const representationId = getWearableIdFromTokenURI(tokenURI);
                  const itemId = getItemId(contractAddress, representationId);
                  itemIds.set(contractAddress, [
                    ...(itemIds.get(contractAddress) || []),
                    itemId,
                  ]);
                }

                break;
            }
            const category = getCategory(Network.ETHEREUM, contractAddress);
            const nftId = getNFTId(
              contractAddress,
              event.tokenId.toString(),
              category
            );
            const timestamp = block.header.timestamp / 1000;
            transfers.set(
              `${nftId}-${timestamp}`,
              new Transfer({
                id: `${nftId}-${timestamp}`,
                nftId,
                block: block.header.height,
                from: event.from,
                to: event.to,
                // network: Network.ETHEREUM.toString(),
                network: ModelNetwork.ETHEREUM,
                timestamp: BigInt(timestamp),
                txHash: log.transactionHash,
              })
            );
            break;
          }
          case erc721abi.events.OwnershipTransferred.topic: {
            markteplaceEvents.push({
              topic,
              event: erc721abi.events.OwnershipTransferred.decode(log),
              block,
              log,
            });
            break;
          }
          case erc721abi.events.AddWearable.topic: {
            collectionIds.add(log.address.toLowerCase());
            markteplaceEvents.push({
              topic,
              event: erc721abi.events.AddWearable.decode(log),
              block,
              log,
            });
            break;
          }
          case estateRegistryABI.events.CreateEstate.topic: {
            estateEvents.push({
              topic,
              event: estateRegistryABI.events.CreateEstate.decode(log),
              block,
            });
            break;
          }
          case landRegistryABI.events.Update.topic:
          case estateRegistryABI.events.Update.topic: {
            if (log.address === addresses.EstateRegistry) {
              const event = estateRegistryABI.events.Update.decode(log);
              estateTokenIds.add(event._assetId);
              estateEvents.push({
                topic,
                event,
                block,
              });
            } else if (log.address === addresses.LANDRegistry) {
              const event = landRegistryABI.events.Update.decode(log);
              landTokenIds.add(event.assetId);
              parcelEvents.push({
                topic,
                event,
                block,
              });
            }
            break;
          }
          case estateRegistryABI.events.AddLand.topic: {
            const event = estateRegistryABI.events.AddLand.decode(log);
            estateTokenIds.add(event._estateId);
            estateEvents.push({
              topic: estateRegistryABI.events.AddLand.topic,
              event,
              block,
            });
            break;
          }
          case estateRegistryABI.events.RemoveLand.topic: {
            const event = estateRegistryABI.events.RemoveLand.decode(log);
            estateTokenIds.add(event._estateId);
            estateEvents.push({
              topic: estateRegistryABI.events.RemoveLand.topic,
              event,
              block,
            });

            break;
          }
          // ens
          case dclRegistrarAbi.events.NameRegistered.topic:
            ensEvents.push({
              topic,
              event: dclRegistrarAbi.events.NameRegistered.decode(log),
              block,
            });
            break;
          case dclControllerV2abi.events.NameBought.topic:
            ensEvents.push({
              topic,
              event: dclControllerV2abi.events.NameBought.decode(log),
              block,
            });

            // const analyticsDayData = getOrCreateAnalyticsDayData(
            //   BigInt(block.header.timestamp / 1000),
            //   analytics
            // );
            // analytics.set(analyticsDayData.id, analyticsDayData);
            // let dayData = getOrCreateAnalyticsDayData(event.block.timestamp)

            // dayData.daoEarnings = dayData.daoEarnings.plus(event.params._price)

            // dayData.save()
            // }
            // ensEvents.push(dclControllerV2abi.events.NameBought.decode(log));
            break;
          // order events
          case marketplaceAbi.events.OrderCreated.topic: {
            const event = marketplaceAbi.events.OrderCreated.decode(log);
            addEventToStateIdsBasedOnCategory(event.nftAddress, event.assetId, {
              landTokenIds,
              estateTokenIds,
              ensTokenIds,
              tokenIds,
            });

            markteplaceEvents.push({
              topic,
              event,
              block,
              log,
              marketplaceOwnerCutPerMillion: getMarketplaceOwnerCutPerMillion(),
              bidOwnerCutPerMillion: getBidOwnerCutPerMillion(),
            });
            break;
          }
          case marketplaceAbi.events.OrderSuccessful.topic: {
            const event = marketplaceAbi.events.OrderSuccessful.decode(log);
            addEventToStateIdsBasedOnCategory(event.nftAddress, event.assetId, {
              landTokenIds,
              estateTokenIds,
              ensTokenIds,
              tokenIds,
            });
            accountIds.add(event.seller); // load sellers acount to update metrics
            accountIds.add(event.buyer); // load buyers acount to update metrics
            const timestamp = BigInt(block.header.timestamp / 1000);
            const analyticDayDataId = `${(
              BigInt(timestamp) / BigInt(86400)
            ).toString()}-${ModelNetwork.ETHEREUM}`;
            analyticsIds.add(analyticDayDataId);
            markteplaceEvents.push({
              topic,
              event,
              block,
              log,
              marketplaceOwnerCutPerMillion: getMarketplaceOwnerCutPerMillion(),
              bidOwnerCutPerMillion: getBidOwnerCutPerMillion(),
            });
            break;
          }
          case marketplaceAbi.events.OrderCancelled.topic: {
            const event = marketplaceAbi.events.OrderCancelled.decode(log);
            addEventToStateIdsBasedOnCategory(event.nftAddress, event.assetId, {
              landTokenIds,
              estateTokenIds,
              ensTokenIds,
              tokenIds,
            });
            markteplaceEvents.push({
              topic,
              event,
              block,
              log,
              marketplaceOwnerCutPerMillion: getMarketplaceOwnerCutPerMillion(),
              bidOwnerCutPerMillion: getBidOwnerCutPerMillion(),
            });
            break;
          }
          case marketplaceAbi.events.ChangedOwnerCutPerMillion.topic:
          case erc721Bid.events.ChangedOwnerCutPerMillion.topic: {
            const event =
              marketplaceAbi.events.ChangedOwnerCutPerMillion.decode(log);
            if (log.address === addresses.Marketplace) {
              setMarketplaceOwnerCutPerMillion(event.ownerCutPerMillion);
            } else {
              setBidOwnerCutPerMillion(event.ownerCutPerMillion);
            }
            break;
          }
          // bid events
          case erc721Bid.events.BidCreated.topic: {
            const event = erc721Bid.events.BidCreated.decode(log);
            addEventToStateIdsBasedOnCategory(
              event._tokenAddress,
              event._tokenId,
              {
                landTokenIds,
                estateTokenIds,
                ensTokenIds,
                tokenIds,
              }
            );
            markteplaceEvents.push({
              topic: erc721Bid.events.BidCreated.topic,
              event,
              block,
              log,
              marketplaceOwnerCutPerMillion: getMarketplaceOwnerCutPerMillion(),
              bidOwnerCutPerMillion: getBidOwnerCutPerMillion(),
            });
            break;
          }
          case erc721Bid.events.BidAccepted.topic: {
            const event = erc721Bid.events.BidAccepted.decode(log);
            const bidId = getBidId(
              event._tokenAddress,
              event._tokenId.toString(),
              event._bidder
            );
            accountIds.add(event._seller); // load sellers acount to update metrics
            accountIds.add(event._bidder); // load buyers acount to update metrics
            bidIds.add(bidId);
            addEventToStateIdsBasedOnCategory(
              event._tokenAddress,
              event._tokenId,
              {
                landTokenIds,
                estateTokenIds,
                ensTokenIds,
                tokenIds,
              }
            );
            markteplaceEvents.push({
              topic: erc721Bid.events.BidAccepted.topic,
              event,
              block,
              log,
              marketplaceOwnerCutPerMillion: getMarketplaceOwnerCutPerMillion(),
              bidOwnerCutPerMillion: getBidOwnerCutPerMillion(),
            });
            break;
          }
          case erc721Bid.events.BidCancelled.topic: {
            const event = erc721Bid.events.BidCancelled.decode(log);
            const bidId = getBidId(
              event._tokenAddress,
              event._tokenId.toString(),
              event._bidder
            );
            bidIds.add(bidId);
            addEventToStateIdsBasedOnCategory(
              event._tokenAddress,
              event._tokenId,
              {
                landTokenIds,
                estateTokenIds,
                ensTokenIds,
                tokenIds,
              }
            );
            markteplaceEvents.push({
              topic: erc721Bid.events.BidCancelled.topic,
              event,
              block,
              log,
              marketplaceOwnerCutPerMillion: getMarketplaceOwnerCutPerMillion(),
              bidOwnerCutPerMillion: getBidOwnerCutPerMillion(),
            });
            break;
          }
        }
      }
    }

    if (tokenIds.size) {
      console.time("multicall tokenURIs");
    }

    const tokenIdsWithoutTokenURIs = new Map<string, bigint[]>();
    for (const [contractAddress, ids] of tokenIds.entries()) {
      const newIds = new Set<bigint>();
      for (const id of ids) {
        const tokenURI = tokenURIs.get(`${contractAddress}-${id}`);
        if (!tokenURI) {
          newIds.add(id);
        }
      }
      if (newIds.size > 0) {
        tokenIdsWithoutTokenURIs.set(contractAddress, [...newIds.values()]);
      }
    }

    const newTokenURIs =
      tokenIdsWithoutTokenURIs.size > 0
        ? await tokenURIMutilcall(
            ctx,
            ctx.blocks[ctx.blocks.length - 1].header, // use latest block of the batch to multicall fetch
            tokenIdsWithoutTokenURIs
          )
        : new Map<string, string>();

    if (tokenIds.size) {
      console.timeEnd("multicall tokenURIs");
    }

    [...newTokenURIs.entries()].forEach(([contractAndTokenId, value]) => {
      const tokenURI = value;
      tokenURIs.set(contractAndTokenId, value);

      const representationId = getWearableIdFromTokenURI(tokenURI);
      const contractAddress = contractAndTokenId.split("-")[0];
      const itemId = getItemId(contractAddress, representationId);

      itemIds.set(contractAddress, [
        ...(itemIds.get(contractAddress) || []),
        itemId,
      ]);
    });

    const {
      accounts,
      datas,
      parcels,
      estates,
      nfts,
      orders,
      wearables,
      ens,
      analytics,
      counts,
      bids,
      collections,
      items,
      metadatas,
    } = await getStoredData(ctx, {
      accountIds,
      landTokenIds,
      estateTokenIds,
      ensTokenIds,
      tokenIds,
      analyticsIds,
      bidIds,
      collectionIds,
      itemIds,
    });

    const sales = new Map<string, Sale>();

    // console.log(
    //   `about to get ${[...tokenIds.values()].reduce(
    //     (acc, curr) => acc + curr.length,
    //     0
    //   )} token URIs without filtering`
    // );

    // delete tokenIds from tokenIds array if they have been created and are in the nfts map
    // Array.from(tokenIds.entries()).forEach(([contractAddress, ids]) => {
    //   ids.forEach((tokenId) => {
    //     const nftId = getNFTId(
    //       contractAddress,
    //       tokenId.toString(),
    //       getCategory(Network.ETHEREUM, contractAddress)
    //     );
    //     if (nfts.has(nftId)) {
    //       const ids = tokenIds.get(contractAddress);
    //       if (ids) {
    //         const index = ids.indexOf(tokenId);
    //         if (index > -1) {
    //           ids.splice(index, 1);
    //         }
    //       }
    //     }
    //   });
    // });
    // console.log(
    //   `about to get ${[...tokenIds.values()].reduce(
    //     (acc, curr) => acc + curr.length,
    //     0
    //   )} non created token URIs`
    // );

    // if (tokenIds.size) {
    //   console.time("multicall tokenURIs");
    // }
    // const newTokenURIs =
    //   tokenIds.size > 0
    //     ? await tokenURIMutilcall(
    //         ctx,
    //         ctx.blocks[ctx.blocks.length - 1].header, // use latest block of the batch to multicall fetch
    //         tokenIds
    //       )
    //     : new Map<string, string>();

    // if (tokenIds.size) {
    //   console.timeEnd("multicall tokenURIs");
    // }

    // [...newTokenURIs.entries()].forEach(([contractAndTokenId, value]) => {
    //   tokenURIs.set(contractAndTokenId, value);
    // });

    // decode land token ids into coordinates for later usage
    if (landTokenIds.size > 0) {
      const newCoordinates = decodeTokenIdsToCoordinates(landTokenIds);

      newCoordinates.forEach((value, key) => {
        landCoordinates.set(key, value);
      });
    }

    // markteplaceEvents Events
    for (const {
      block,
      event,
      topic,
      log,
      bidOwnerCutPerMillion,
      marketplaceOwnerCutPerMillion,
    } of markteplaceEvents) {
      if (topic === marketplaceAbi.events.OrderCreated.topic) {
        handleOrderCreated(
          event as marketplaceAbi.OrderCreatedEventArgs,
          block,
          log.address,
          log.transactionHash,
          orders,
          nfts,
          counts
        );
      } else if (topic === marketplaceAbi.events.OrderSuccessful.topic) {
        await handleOrderSuccessful(
          ctx,
          event as marketplaceAbi.OrderSuccessfulEventArgs,
          block,
          log.transactionHash,
          marketplaceOwnerCutPerMillion || BigInt(0),
          orders,
          nfts,
          accounts,
          analytics,
          counts,
          sales
        );
      } else if (topic === marketplaceAbi.events.OrderCancelled.topic) {
        handleOrderCancelled(
          event as marketplaceAbi.OrderCancelledEventArgs,
          block,
          nfts,
          orders
        );
      } else if (topic === erc721Bid.events.BidCreated.topic) {
        handleBidCreated(
          event as erc721Bid.BidCreatedEventArgs,
          block,
          log.address,
          nfts,
          bids
        );
      } else if (topic === erc721Bid.events.BidAccepted.topic) {
        await handleBidAccepted(
          event as erc721Bid.BidAcceptedEventArgs,
          block,
          log.transactionHash,
          bidOwnerCutPerMillion || BigInt(0),
          bids,
          nfts,
          accounts,
          analytics,
          counts,
          sales
        );
      } else if (topic === erc721Bid.events.BidCancelled.topic && event) {
        handleBidCancelled(
          event as erc721Bid.BidCancelledEventArgs,
          block,
          bids,
          nfts
        );
      } else if (
        topic === erc721abi.events["Transfer(address,address,uint256)"].topic ||
        topic ===
          erc721abi.events["Transfer(address,address,uint256,address,bytes)"]
            .topic ||
        topic ===
          erc721abi.events[
            "Transfer(address,address,uint256,address,bytes,bytes)"
          ].topic
      ) {
        if ([...Object.values(addresses.collections)].includes(log.address)) {
          handleTransferWearableV1(
            block.header,
            log.address,
            event as erc721abi.TransferEventArgs_2,
            collections,
            items,
            accounts,
            metadatas,
            wearables,
            counts,
            mints,
            nfts,
            tokenURIs
          );
        } else {
          handleTransfer(
            block,
            log.address,
            event as erc721abi.TransferEventArgs_2,
            accounts,
            counts,
            nfts,
            parcels,
            estates,
            wearables,
            orders,
            ens,
            tokenURIs,
            landCoordinates
          );
        }
      } else if (topic === erc721abi.events.OwnershipTransferred.topic) {
        handleInitializeWearablesV1(counts);
      } else if (topic === erc721abi.events.AddWearable.topic) {
        await handleAddItemV1(
          ctx,
          log.address,
          event as erc721abi.AddWearableEventArgs,
          block,
          collections,
          items,
          counts,
          wearables,
          metadatas
        );
      }
    }

    for (const { block, event, topic } of estateEvents) {
      if (
        topic === estateRegistryABI.events.CreateEstate.topic &&
        isCreateEstateEvent(event)
      ) {
        handleCreateEstate(block, event, nfts, estates, accounts, datas);
      } else if (
        topic === estateRegistryABI.events.Update.topic &&
        isUpdateEvent(event)
      ) {
        handleEstateUpdate(event, block, estates, nfts, datas);
      } else if (
        topic === estateRegistryABI.events.AddLand.topic &&
        isAddLandEvent(event)
      ) {
        handleAddLand(event, estates, nfts, parcels, accounts, landCoordinates);
      } else if (
        topic === estateRegistryABI.events.RemoveLand.topic &&
        isRemoveLandEvent(event)
      ) {
        handleRemoveLand(
          event,
          estates,
          nfts,
          parcels,
          accounts,
          landCoordinates
        );
      }
    }

    // Parcel events
    for (const { block, event, topic } of parcelEvents) {
      if (topic === landRegistryABI.events.Update.topic) {
        handleLandUpdate(event, block, parcels, nfts, landCoordinates, datas);
      }
    }

    // ENS Events
    for (const { block, event, topic } of ensEvents) {
      if (topic === dclRegistrarAbi.events.NameRegistered.topic) {
        handleNameRegistered(
          event as dclRegistrarAbi.NameRegisteredEventArgs,
          ens,
          nfts,
          accounts
        );
      } else if (topic === dclControllerV2abi.events.NameBought.topic) {
        handleNameBought(
          event as dclControllerV2abi.NameBoughtEventArgs,
          BigInt(block.header.timestamp / 1000),
          analytics
        );
      }
    }

    try {
      // upsert all entities
      const maps = [
        accounts,
        datas,
        estates,
        parcels,
        wearables,
        ens,
        analytics,
        counts,
        collections,
        metadatas,
        items,
      ];

      for (const entity of maps) {
        if (entity) {
          await ctx.store.upsert([...entity.values()]);
        }
      }

      // work around for circular dependency of orders and nfts
      const orderByNFT: Map<string, Order> = new Map();
      for (const nft of nfts.values()) {
        if (nft.activeOrder) {
          orderByNFT.set(nft.id, nft.activeOrder);
          nft.activeOrder = null;
        }
      }
      await ctx.store.upsert([...nfts.values()]); // save NFTs with no orders
      await ctx.store.upsert([...sales.values()]); // save NFTs with no orders
      await ctx.store.upsert([...orders.values()]); // save orders

      // put NFT active orders back
      for (const [nftId, order] of orderByNFT) {
        const nft = nfts.get(nftId);
        if (nft) {
          nft.activeOrder = order;
        }
      }
      await ctx.store.upsert([...nfts.values()]); // save NFTs back with orders
      await ctx.store.upsert([...bids.values()]);
      await ctx.store.insert([...transfers.values()]);
      await ctx.store.insert([...mints.values()]);

      // log some stats
      ctx.log.info(
        `Batch from block: ${ctx.blocks[0].header.height} to ${
          ctx.blocks[ctx.blocks.length - 1].header.height
        } saved: parcels: ${parcels.size}, nfts: ${nfts.size}, accounts: ${
          accounts.size
        }, estates: ${estates.size}, transfers: ${transfers.size}, ens: ${
          ens.size
        }. Orders: ${orders.size}, Sales: ${sales.size}, Bids: ${bids.size}`
      );
    } catch (error) {
      ctx.log.error(`error: ${error}`);
    }
  }
);
