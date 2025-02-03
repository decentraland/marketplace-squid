import { In, Not } from "typeorm";
import { TypeormDatabase } from "@subsquid/typeorm-store";
import { Network } from "@dcl/schemas";
import {
  Order,
  Rarity,
  Transfer,
  Network as ModelNetwork,
  Collection,
  Currency,
} from "../model";
import * as CollectionFactoryABI from "./abi/CollectionFactory";
import * as CollectionFactoryV3ABI from "./abi/CollectionFactoryV3";
import * as CollectionV2ABI from "./abi/CollectionV2";
import * as MarketplaceABI from "./abi/Marketplace";
import * as MarketplaceV2ABI from "./abi/MarketplaceV2";
import * as CommitteeABI from "./abi/Committee";
import * as RaritiesABI from "./abi/Rarity";
import * as MarketplaceV3ABI from "./abi/DecentralandMarketplacePolygon";
import * as ERC721BidABI from "./abi/ERC721Bid";
import * as CollectionStoreABI from "./abi/CollectionStore";
import * as CollectionManagerABI from "./abi/CollectionManager";
import { getAddresses } from "../common/utils/addresses";
import {
  encodeTokenId,
  handleAddItem,
  handleCollectionCreation,
  handleCompleteCollection,
  handleIssue,
  handleRescueItem,
  handleSetApproved,
  handleSetEditable,
  handleSetGlobalManager,
  handleSetGlobalMinter,
  handleSetItemManager,
  handleSetItemMinter,
  handleTransfer,
  handleTransferCreatorship,
  handleTransferOwnership,
  handleUpdateItemData,
} from "./handlers/collection";
import { processor } from "./processor";
import {
  getBatchInMemoryState,
  getBidV2ContractData,
  getMarketplaceContractData,
  getMarketplaceV2ContractData,
  getStoreContractData,
  setBidOwnerCutPerMillion,
  setMarketplaceOwnerCutPerMillion,
  setStoreFee,
  setStoreFeeOwner,
} from "./state";
import { getStoredData } from "./store";
import { handleMemeberSet } from "./handlers/committee";
import { handleAddRarity, handleUpdatePrice } from "./handlers/rarity";
import { getBidId } from "../common/handlers/bid";
import {
  handleBidAccepted,
  handleBidCancelled,
  handleBidCreated,
} from "./handlers/bid";
import {
  handleOrderCancelled,
  handleOrderCreated,
  handleOrderSuccessful,
  handleTraded,
} from "./handlers/marketplace";
import { getNFTId } from "../common/utils";
import { handleRaritiesSet } from "./handlers/collectionManager";
import { loadCollections } from "./utils/loaders";
import { checkCpuUsageAndThrottle } from "../tools/os";
import {
  getTradeEventData,
  getTradeEventType,
} from "../common/utils/marketplaceV3";

const schemaName = process.env.DB_SCHEMA;
const addresses = getAddresses(Network.MATIC);
let bytesRead = 0; // amount of bytes received
const preloadedCollections = loadCollections().addresses;
const preloadedCollectionsHeight = loadCollections().height;

processor.run(
  new TypeormDatabase({
    isolationLevel: "READ COMMITTED",
    supportHotBlocks: true,
    stateSchema: `polygon_processor_${schemaName}`,
  }),
  async (ctx) => {
    // update the amount of bytes read
    bytesRead += ctx.blocks.reduce(
      (acc, block) => acc + Buffer.byteLength(JSON.stringify(block), "utf8"),
      0
    );

    const rarities = await ctx.store
      .find(Rarity)
      .then((q) => new Map(q.map((i) => [i.id, i])));

    const collectionIdsNotIncludedInPreloaded = await ctx.store
      .find(Collection, {
        where: {
          id: Not(In(preloadedCollections)),
          network: ModelNetwork.POLYGON,
        },
      })
      .then((q) => new Set(q.map((c) => c.id)));

    const isThereImportantDataInBatch = ctx.blocks.some((block) =>
      block.logs.some(
        (log) =>
          log.address === addresses.CollectionFactory ||
          log.address === addresses.CollectionFactoryV3 ||
          log.address === addresses.BidV2 ||
          log.address === addresses.ERC721Bid ||
          log.address === addresses.Marketplace ||
          log.address === addresses.MarketplaceV2 ||
          log.address === addresses.OldCommittee ||
          log.address === addresses.Committee ||
          log.address === addresses.CollectionStore ||
          log.address === addresses.RaritiesWithOracle ||
          log.address === addresses.Rarity ||
          log.address === addresses.CollectionManager ||
          log.address === addresses.MarketplaceV3 ||
          preloadedCollections.includes(log.address) ||
          collectionIdsNotIncludedInPreloaded.has(log.address)
      )
    );

    if (
      !isThereImportantDataInBatch &&
      ctx.blocks[ctx.blocks.length - 1].header.height >
        preloadedCollectionsHeight
    ) {
      console.log(
        "INFO: Batch contains important data: ",
        isThereImportantDataInBatch
      );
      return;
    }

    const collectionIdsCreatedInBatch = new Set<string>();
    const inMemoryData = getBatchInMemoryState();
    const {
      sales,
      curations,
      mints,
      // ids
      itemIds,
      collectionIds,
      accountIds,
      tokenIds,
      transfers,
      bidIds,
      analyticsIds,
      // events
      events,
      collectionFactoryEvents,
      committeeEvents,
    } = inMemoryData;

    ctx.log.info(
      `blocks, amount: ${ctx.blocks.length}, from: ${
        ctx.blocks[0].header.height
      } to: ${ctx.blocks[ctx.blocks.length - 1].header.height}`
    );
    for (let block of ctx.blocks) {
      for (let log of block.logs) {
        const topic = log.topics[0];
        const timestamp = BigInt(block.header.timestamp / 1000);
        const analyticDayDataId = `${(
          BigInt(timestamp) / BigInt(86400)
        ).toString()}-${ModelNetwork.POLYGON}`;
        switch (topic) {
          case CollectionFactoryABI.events.ProxyCreated.topic:
          case CollectionFactoryV3ABI.events.ProxyCreated.topic: {
            if (
              ![addresses.CollectionFactory, addresses.CollectionFactoryV3]
                .map((c) => c.toLowerCase())
                .includes(log.address)
            ) {
              ctx.log.warn(
                `CollectionFactory event found not from collection factory contract: ${log.address}`
              );
              break;
            }

            const event =
              topic === CollectionFactoryABI.events.ProxyCreated.topic
                ? CollectionFactoryABI.events.ProxyCreated.decode(log)
                : CollectionFactoryV3ABI.events.ProxyCreated.decode(log);

            // collectionsCreatedByFactory.add(event._address.toLowerCase());
            collectionIdsCreatedInBatch.add(event._address); // add the Id to the list of collections to be processed

            const collectionContract = new CollectionV2ABI.Contract(
              ctx,
              block.header,
              event._address
            );

            accountIds.add((await collectionContract.owner()).toLowerCase());
            collectionIds.add(event._address.toLowerCase());

            collectionFactoryEvents.push({
              event:
                topic === CollectionFactoryABI.events.ProxyCreated.topic
                  ? CollectionFactoryABI.events.ProxyCreated.decode(log)
                  : CollectionFactoryV3ABI.events.ProxyCreated.decode(log),
              block,
            });

            break;
          }
          case MarketplaceABI.events.OrderCreated.topic:
          case MarketplaceV2ABI.events.OrderCreated.topic:
            if (
              ![addresses.Marketplace, addresses.MarketplaceV2]
                .map((c) => c.toLowerCase())
                .includes(log.address)
            ) {
              ctx.log.warn(
                "Marketplace event found not from marketplace contract"
              );
              break;
            }

            const event = MarketplaceABI.events.OrderCreated.decode(log);
            tokenIds.set(event.nftAddress, [
              ...(tokenIds.get(event.nftAddress) || []),
              event.assetId,
            ]);

            events.push({
              topic,
              event,
              block,
              log,
              marketplaceContractData: await getMarketplaceContractData(
                ctx,
                block.header
              ),
              marketplaceV2ContractData: await getMarketplaceV2ContractData(
                ctx,
                block.header
              ),
              bidV2ContractData: await getBidV2ContractData(ctx, block.header),
            });
            break;

          case MarketplaceABI.events.OrderSuccessful.topic:
          case MarketplaceV2ABI.events.OrderSuccessful.topic: {
            if (
              ![addresses.Marketplace, addresses.MarketplaceV2]
                .map((c) => c.toLowerCase())
                .includes(log.address)
            ) {
              ctx.log.warn(
                `Marketplace event found not from marketplace contract`
              );
              break;
            }
            const event = MarketplaceABI.events.OrderSuccessful.decode(log);
            tokenIds.set(event.nftAddress, [
              ...(tokenIds.get(event.nftAddress) || []),
              event.assetId,
            ]);
            accountIds.add(event.seller); // load sellers acount to update metrics
            accountIds.add(event.buyer); // load buyers acount to update metrics
            analyticsIds.add(analyticDayDataId);
            events.push({
              topic,
              event,
              block,
              log,
              marketplaceContractData: await getMarketplaceContractData(
                ctx,
                block.header
              ),
              marketplaceV2ContractData: await getMarketplaceV2ContractData(
                ctx,
                block.header
              ),
              bidV2ContractData: await getBidV2ContractData(ctx, block.header),
            });
            break;
          }

          case MarketplaceABI.events.OrderCancelled.topic:
          case MarketplaceV2ABI.events.OrderCancelled.topic: {
            if (
              ![addresses.Marketplace, addresses.MarketplaceV2]
                .map((c) => c.toLowerCase())
                .includes(log.address)
            ) {
              break;
            }
            const event = MarketplaceABI.events.OrderCancelled.decode(log);
            tokenIds.set(event.nftAddress, [
              ...(tokenIds.get(event.nftAddress) || []),
              event.assetId,
            ]);
            events.push({
              topic,
              event,
              block,
              log,
              marketplaceContractData: await getMarketplaceContractData(
                ctx,
                block.header
              ),
              marketplaceV2ContractData: await getMarketplaceV2ContractData(
                ctx,
                block.header
              ),
              bidV2ContractData: await getBidV2ContractData(ctx, block.header),
            });
            break;
          }
          // bid events
          case ERC721BidABI.events.BidCreated.topic: {
            const event = ERC721BidABI.events.BidCreated.decode(log);
            tokenIds.set(event._tokenAddress, [
              ...(tokenIds.get(event._tokenAddress) || []),
              event._tokenId,
            ]);

            events.push({
              topic: ERC721BidABI.events.BidCreated.topic,
              event,
              block,
              log,
              marketplaceContractData: await getMarketplaceContractData(
                ctx,
                block.header
              ),
              marketplaceV2ContractData: await getMarketplaceV2ContractData(
                ctx,
                block.header
              ),
              bidV2ContractData: await getBidV2ContractData(ctx, block.header),
            });
            break;
          }
          case ERC721BidABI.events.BidAccepted.topic: {
            const event = ERC721BidABI.events.BidAccepted.decode(log);
            const bidId = getBidId(
              event._tokenAddress,
              event._tokenId.toString(),
              event._bidder
            );
            accountIds.add(event._seller); // load sellers acount to update metrics
            accountIds.add(event._bidder); // load buyers acount to update metrics
            bidIds.add(bidId);
            tokenIds.set(event._tokenAddress, [
              ...(tokenIds.get(event._tokenAddress) || []),
              event._tokenId,
            ]);
            analyticsIds.add(analyticDayDataId);
            events.push({
              topic: ERC721BidABI.events.BidAccepted.topic,
              event,
              block,
              log,
              marketplaceContractData: await getMarketplaceContractData(
                ctx,
                block.header
              ),
              marketplaceV2ContractData: await getMarketplaceV2ContractData(
                ctx,
                block.header
              ),
              bidV2ContractData: await getBidV2ContractData(ctx, block.header),
            });
            break;
          }
          case ERC721BidABI.events.BidCancelled.topic: {
            const event = ERC721BidABI.events.BidCancelled.decode(log);
            const bidId = getBidId(
              event._tokenAddress,
              event._tokenId.toString(),
              event._bidder
            );
            bidIds.add(bidId);
            tokenIds.set(event._tokenAddress, [
              ...(tokenIds.get(event._tokenAddress) || []),
              event._tokenId,
            ]);
            events.push({
              topic: ERC721BidABI.events.BidCancelled.topic,
              event,
              block,
              log,
              marketplaceContractData: await getMarketplaceContractData(
                ctx,
                block.header
              ),
              marketplaceV2ContractData: await getMarketplaceV2ContractData(
                ctx,
                block.header
              ),
              bidV2ContractData: await getBidV2ContractData(ctx, block.header),
            });
            break;
          }
          case MarketplaceV2ABI.events.ChangedFeesCollectorCutPerMillion.topic:
          case ERC721BidABI.events.ChangedOwnerCutPerMillion.topic: {
            if (log.address === addresses.Marketplace) {
              const event =
                MarketplaceV2ABI.events.ChangedFeesCollectorCutPerMillion.decode(
                  log
                );
              setMarketplaceOwnerCutPerMillion(
                event.feesCollectorCutPerMillion
              );
            } else {
              const event =
                ERC721BidABI.events.ChangedOwnerCutPerMillion.decode(log);
              setBidOwnerCutPerMillion(event._ownerCutPerMillion);
            }
            break;
          }
          case CommitteeABI.events.MemberSet.topic: {
            if (
              ![addresses.Committee, addresses.OldCommittee]
                .map((c) => c.toLowerCase())
                .includes(log.address)
            ) {
              console.log(
                "ERROR: Committee event found not from committee contract"
              );
              break;
            }
            const event = CommitteeABI.events.MemberSet.decode(log);
            committeeEvents.push(event);
            accountIds.add(event._member.toLowerCase());
            break;
          }
          case CollectionV2ABI.events.SetGlobalMinter.topic:
          case CollectionV2ABI.events.SetGlobalManager.topic:
          case CollectionV2ABI.events.SetItemMinter.topic:
          case CollectionV2ABI.events.SetItemManager.topic:
          case CollectionV2ABI.events.AddItem.topic:
          case CollectionV2ABI.events.RescueItem.topic:
          case CollectionV2ABI.events.UpdateItemData.topic:
          case CollectionV2ABI.events.Issue.topic:
          case CollectionV2ABI.events.SetApproved.topic:
          case CollectionV2ABI.events.SetEditable.topic:
          case CollectionV2ABI.events.Complete.topic:
          case CollectionV2ABI.events.CreatorshipTransferred.topic:
          case CollectionV2ABI.events.OwnershipTransferred.topic:
          case CollectionV2ABI.events.Transfer.topic: {
            // @TODO check addresses
            if (
              ![
                ...preloadedCollections, // collections already pre-calculated
                ...collectionIdsNotIncludedInPreloaded, // collections not included in the preloaded list but yes in the db (newest ones)
                ...collectionIdsCreatedInBatch, // collections created in the current batch, will later by saved in the db
              ].includes(log.address)
            ) {
              break;
            }
            let event;

            switch (topic) {
              case CollectionV2ABI.events.SetGlobalMinter.topic:
                event = CollectionV2ABI.events.SetGlobalMinter.decode(log);
                break;
              case CollectionV2ABI.events.SetGlobalManager.topic:
                event = CollectionV2ABI.events.SetGlobalManager.decode(log);
                break;
              case CollectionV2ABI.events.SetItemMinter.topic:
                event = CollectionV2ABI.events.SetItemMinter.decode(log);
                break;
              case CollectionV2ABI.events.SetItemManager.topic:
                event = CollectionV2ABI.events.SetItemManager.decode(log);
                break;
              case CollectionV2ABI.events.AddItem.topic:
                event = CollectionV2ABI.events.AddItem.decode(log);
                analyticsIds.add(analyticDayDataId);
                break;
              case CollectionV2ABI.events.RescueItem.topic:
                event = CollectionV2ABI.events.RescueItem.decode(log);
                break;
              case CollectionV2ABI.events.UpdateItemData.topic:
                event = CollectionV2ABI.events.UpdateItemData.decode(log);
                itemIds.set(log.address, [
                  ...(itemIds.get(log.address) || []),
                  event._itemId,
                ]);
                break;
              case CollectionV2ABI.events.Issue.topic: {
                event = CollectionV2ABI.events.Issue.decode(log);
                accountIds.add(event._beneficiary.toLowerCase());
                analyticsIds.add(analyticDayDataId);
                itemIds.set(log.address, [
                  ...(itemIds.get(log.address) || []),
                  event._itemId,
                ]);
                // account for creator
                // we need to load item creators, seller and royalties accounts
                // we also need the feeCollector account
                break;
              }
              case CollectionV2ABI.events.SetApproved.topic:
                event = CollectionV2ABI.events.SetApproved.decode(log);
                break;
              case CollectionV2ABI.events.SetEditable.topic:
                event = CollectionV2ABI.events.SetEditable.decode(log);
                break;
              case CollectionV2ABI.events.Complete.topic:
                event = CollectionV2ABI.events.Complete.decode(log);
                break;
              case CollectionV2ABI.events.CreatorshipTransferred.topic:
                event =
                  CollectionV2ABI.events.CreatorshipTransferred.decode(log);
                break;
              case CollectionV2ABI.events.OwnershipTransferred.topic:
                event = CollectionV2ABI.events.OwnershipTransferred.decode(log);
                break;
              case CollectionV2ABI.events.Transfer.topic: {
                event = CollectionV2ABI.events.Transfer.decode(log);
                accountIds.add(event.to.toLowerCase());
                const timestamp = block.header.timestamp / 1000;
                const nftId = getNFTId(log.address, event.tokenId.toString());
                tokenIds.set(log.address, [
                  ...(tokenIds.get(log.address) || []),
                  event.tokenId,
                ]);
                transfers.set(
                  `${nftId}-${timestamp}`,
                  new Transfer({
                    id: `${nftId}-${timestamp}`,
                    nftId,
                    block: block.header.height,
                    from: event.from,
                    to: event.to,
                    network: ModelNetwork.POLYGON,
                    timestamp: BigInt(timestamp),
                    txHash: log.transactionHash,
                  })
                );
                break;
              }
            }
            if (event) {
              const raritiesCopy = new Map(
                Array.from(rarities).map(([k, v]) => [k, { ...v }])
              );
              collectionIds.add(log.address.toLowerCase()); // @TODO check lowercase if needed
              events.push({
                topic,
                event,
                block,
                log,
                transaction: log.transaction,
                // make a copy of rarities so it has an snapshot at this block
                rarities: raritiesCopy,
                storeContractData: await getStoreContractData(
                  ctx,
                  block.header
                ),
              });
            } else {
              console.log("ERROR: Event not decoded correctly");
            }
            break;
          }
          case RaritiesABI.events.AddRarity.topic: {
            const event = RaritiesABI.events.AddRarity.decode(log);
            handleAddRarity(
              rarities,
              event,
              log.address === addresses.Rarity ? Currency.MANA : Currency.USD
            );
            break;
          }
          case RaritiesABI.events.UpdatePrice.topic: {
            const event = RaritiesABI.events.UpdatePrice.decode(log);
            handleUpdatePrice(
              rarities,
              event,
              log.address === addresses.Rarity ? Currency.MANA : Currency.USD
            );
            break;
          }
          case CollectionStoreABI.events.SetFee.topic: {
            const event = CollectionStoreABI.events.SetFee.decode(log);
            setStoreFee(event._newFee);
            break;
          }
          case CollectionStoreABI.events.SetFeeOwner.topic: {
            const event = CollectionStoreABI.events.SetFeeOwner.decode(log);
            setStoreFeeOwner(event._newFeeOwner);
            break;
          }
          case CollectionManagerABI.events.RaritiesSet.topic: {
            const event = CollectionManagerABI.events.RaritiesSet.decode(log);
            await handleRaritiesSet(ctx, block.header, event, rarities);
            break;
          }
          case MarketplaceV3ABI.events.Traded.topic: {
            const event = MarketplaceV3ABI.events.Traded.decode(log);
            const tradeData = getTradeEventData(event, Network.MATIC);
            const { collectionAddress, buyer, seller, assetType, itemId } =
              tradeData;
            let tokenId = tradeData.tokenId;
            // secondary sale
            if (Number(assetType) === 4 && itemId !== undefined) {
              const collectionContract = new CollectionV2ABI.Contract(
                ctx,
                block.header,
                collectionAddress
              );
              const item = await collectionContract.items(itemId);
              tokenId = encodeTokenId(Number(itemId), Number(item.totalSupply));
            }
            collectionIds.add(collectionAddress);

            if (tokenId) {
              tokenIds.set(collectionAddress, [
                ...(tokenIds.get(collectionAddress) || []),
                tokenId,
              ]);
            } else {
              console.log("ERROR: tokenId not found in trade event data");
              break;
            }
            accountIds.add(seller); // load sellers acount to update metrics
            accountIds.add(buyer); // load buyers acount to update metrics
            analyticsIds.add(analyticDayDataId);

            events.push({
              topic,
              event,
              block,
              log,
              transaction: log.transaction,
              // make a copy of rarities so it has an snapshot at this block
              rarities: new Map(
                Array.from(rarities).map(([k, v]) => [k, { ...v }])
              ),
              storeContractData: await getStoreContractData(ctx, block.header),
            });

            break;
          }
        }
      }
    }

    // get stored data
    const storedData = await getStoredData(ctx, {
      accountIds,
      collectionIds,
      tokenIds,
      analyticsIds,
      bidIds,
      itemIds,
    });

    const { counts, accounts, orders, bids, nfts, items, metadatas } =
      storedData;

    // Collection Factory Events
    for (const { block, event } of collectionFactoryEvents) {
      await handleCollectionCreation(
        ctx,
        block.header,
        event._address,
        storedData
      );
    }

    // Collection Events
    for (const {
      block,
      event,
      topic,
      log,
      transaction,
      rarities,
      storeContractData,
      bidV2ContractData,
      marketplaceContractData,
      marketplaceV2ContractData,
    } of events) {
      switch (topic) {
        case CollectionV2ABI.events.SetGlobalMinter.topic:
          handleSetGlobalMinter(
            log.address,
            event as CollectionV2ABI.SetGlobalMinterEventArgs,
            block.header,
            storedData
          );
          break;
        case CollectionV2ABI.events.SetGlobalManager.topic:
          handleSetGlobalManager(
            log.address,
            event as CollectionV2ABI.SetGlobalManagerEventArgs,
            storedData
          );
          break;
        case CollectionV2ABI.events.SetItemMinter.topic:
          handleSetItemMinter(
            log.address,
            event as CollectionV2ABI.SetItemMinterEventArgs,
            block.header,
            storedData
          );
          break;
        case CollectionV2ABI.events.SetItemManager.topic:
          handleSetItemManager(
            log.address,
            event as CollectionV2ABI.SetItemManagerEventArgs,
            storedData
          );
          break;
        case CollectionV2ABI.events.AddItem.topic:
          rarities &&
            (await handleAddItem(
              ctx,
              block.header,
              log.address,
              event as CollectionV2ABI.AddItemEventArgs,
              storedData,
              rarities
            ));
          break;
        case CollectionV2ABI.events.RescueItem.topic:
          transaction &&
            handleRescueItem(
              event as CollectionV2ABI.RescueItemEventArgs,
              block.header,
              log,
              transaction,
              storedData,
              inMemoryData
            );
          break;
        case CollectionV2ABI.events.UpdateItemData.topic:
          handleUpdateItemData(
            log.address,
            event as CollectionV2ABI.UpdateItemDataEventArgs,
            block.header,
            storedData
          );
          break;
        case MarketplaceV3ABI.events.Traded.topic: {
          if (!storeContractData || !transaction) {
            console.log("ERROR: storeContractData not found");
            break;
          }
          await handleTraded(
            ctx,
            event as MarketplaceV3ABI.TradedEventArgs,
            block,
            transaction,
            storedData,
            inMemoryData
          );
          break;
        }
        case CollectionV2ABI.events.Issue.topic:
          if (!storeContractData) {
            console.log("ERROR: storeContractData not found");
            break;
          }
          if (
            (event as CollectionV2ABI.IssueEventArgs)._caller ===
            addresses.MarketplaceV3
          ) {
            break;
          }
          await handleIssue(
            ctx,
            log.address,
            event as CollectionV2ABI.IssueEventArgs,
            block.header,
            transaction!,
            storedData,
            inMemoryData,
            storeContractData
          );
          break;
        case CollectionV2ABI.events.SetApproved.topic:
          !!transaction &&
            handleSetApproved(
              log.address,
              event as CollectionV2ABI.SetApprovedEventArgs,
              block.header,
              log,
              transaction,
              storedData
            );
          break;
        case CollectionV2ABI.events.SetEditable.topic:
          handleSetEditable(
            log.address,
            event as CollectionV2ABI.SetEditableEventArgs,
            storedData
          );
          break;
        case CollectionV2ABI.events.Complete.topic:
          handleCompleteCollection(log.address, storedData);
          break;
        case CollectionV2ABI.events.CreatorshipTransferred.topic:
          handleTransferCreatorship(
            log.address,
            event as CollectionV2ABI.CreatorshipTransferredEventArgs,
            block.header,
            storedData
          );
          break;
        case CollectionV2ABI.events.OwnershipTransferred.topic:
          handleTransferOwnership(
            log.address,
            event as CollectionV2ABI.OwnershipTransferredEventArgs,
            block.header,
            storedData
          );
          break;
        case CollectionV2ABI.events.Transfer.topic:
          handleTransfer(
            log.address,
            event as CollectionV2ABI.TransferEventArgs,
            block.header,
            storedData
          );
          break;

        case MarketplaceABI.events.OrderCreated.topic: {
          handleOrderCreated(
            event as MarketplaceABI.OrderCreatedEventArgs,
            block,
            log.address,
            log.transactionHash,
            orders,
            nfts,
            counts
          );
          break;
        }
        case MarketplaceABI.events.OrderSuccessful.topic: {
          if (!marketplaceContractData || !marketplaceV2ContractData) {
            console.log(
              "ERROR: marketplaceContractData or marketplaceV2ContractData not found"
            );
            break;
          }
          await handleOrderSuccessful(
            ctx,
            event as MarketplaceABI.OrderSuccessfulEventArgs,
            block,
            log.transactionHash,
            marketplaceContractData,
            marketplaceV2ContractData,
            storedData,
            inMemoryData
          );
          break;
        }
        case MarketplaceABI.events.OrderCancelled.topic: {
          handleOrderCancelled(
            event as MarketplaceABI.OrderCancelledEventArgs,
            block,
            nfts,
            orders
          );
          break;
        }
        case ERC721BidABI.events.BidCreated.topic: {
          handleBidCreated(
            event as ERC721BidABI.BidCreatedEventArgs,
            block,
            log.address,
            nfts,
            bids,
            counts
          );
          break;
        }
        case ERC721BidABI.events.BidAccepted.topic: {
          if (!bidV2ContractData) {
            console.log("ERROR: bidV2ContractData not found");
            break;
          }
          await handleBidAccepted(
            ctx,
            event as ERC721BidABI.BidAcceptedEventArgs,
            block,
            log.transactionHash,
            bidV2ContractData,
            storedData,
            inMemoryData
          );
          break;
        }
        case ERC721BidABI.events.BidCancelled.topic: {
          handleBidCancelled(
            event as ERC721BidABI.BidCancelledEventArgs,
            block,
            bids,
            nfts
          );
          break;
        }
      }
    }

    // Committee Events
    for (const event of committeeEvents) {
      handleMemeberSet(accounts, event);
    }

    await ctx.store.upsert([...rarities.values()]);
    for (const [key, value] of Object.entries(storedData)) {
      if (
        value &&
        !["nfts", "orders", "transfers", "items", "metadata", "bids"].includes(
          key
        )
      ) {
        await ctx.store.upsert([...value.values()]);
      }
    }
    // metadatas has to go before items
    await ctx.store.upsert([...metadatas.values()]);
    await ctx.store.upsert([...items.values()]);

    // work around for circular dependency of orders and nfts
    const orderByNFT: Map<string, Order> = new Map();
    for (const nft of nfts.values()) {
      if (nft.activeOrder) {
        orderByNFT.set(nft.id, nft.activeOrder);
        nft.activeOrder = null;
      }
    }
    await ctx.store.upsert([...nfts.values()]); // save NFTs with no orders
    await ctx.store.upsert([...orders.values()]); // save orders

    // put NFT active orders back
    for (const [nftId, order] of orderByNFT) {
      const nft = nfts.get(nftId);
      if (nft) {
        nft.activeOrder = order;
      }
    }
    await ctx.store.upsert([...nfts.values()]); // save NFTs back with orders
    await ctx.store.upsert([...bids.values()]); // bids needs to be upserted after nfts
    await ctx.store.upsert([...rarities.values()]); // upsert rarities

    // insert all new entities with no dependencies
    await ctx.store.insert([...sales.values()]);
    await ctx.store.insert([...mints.values()]);
    await ctx.store.insert([...transfers.values()]);
    await ctx.store.insert([...curations.values()]);
    // console.log('accounts polygon: ', accounts);
    ctx.log.info(
      `Batch from block: ${ctx.blocks[0].header.height} to ${
        ctx.blocks[ctx.blocks.length - 1].header.height
      } saved, counts: ${counts.size}, accounts: ${
        accounts.size
      }, collections: ${storedData.collections.size}, nfts: ${
        nfts.size
      }, items: ${items.size}, metadatas: ${metadatas.size}, bids: ${
        bids.size
      }, sales: ${sales.size}, mints: ${mints.size}, transfers: ${
        transfers.size
      }, curations: ${curations.size}`
    );
    console.log("bytes read until now: ", bytesRead);
  }
);
