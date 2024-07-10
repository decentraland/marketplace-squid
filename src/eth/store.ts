import { In } from "typeorm";
import {
  Account,
  AnalyticsDayData,
  Bid,
  Count,
  Data,
  ENS,
  Estate,
  NFT,
  Order,
  Parcel,
  Wearable,
  Network as ModelNetwork,
} from "../model";
import { Context } from "./processor";
import { getAddresses } from "../common/utils/addresses";
import { Network } from "@dcl/schemas";
import { EthereumInMemoryState } from "./types";
import { DEFAULT_ID } from "./modules/count";

export const getStoredData = async (
  ctx: Context,
  ids: Pick<
    EthereumInMemoryState,
    | "accountIds"
    | "landTokenIds"
    | "estateTokenIds"
    | "ensTokenIds"
    | "tokenIds"
    | "analyticsIds"
    | "bidIds"
  >
) => {
  const {
    accountIds,
    ensTokenIds,
    estateTokenIds,
    landTokenIds,
    tokenIds,
    analyticsIds,
    bidIds,
  } = ids;

  const accountIdsToLookFor = [...accountIds].map(
    (id) => `${id}-${ModelNetwork.ethereum}`
  );
  // console.log("accountIdsToLookFor: ", accountIdsToLookFor);

  const accounts = await ctx.store
    .findBy(Account, {
      id: In(accountIdsToLookFor),
      network: ModelNetwork.ethereum,
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));
  // console.log("accounts: ", accounts);

  const parcels = await ctx.store
    .findBy(Parcel, { tokenId: In([...landTokenIds]) })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const estates = await ctx.store
    .findBy(Estate, { tokenId: In([...estateTokenIds]) })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const addresses = getAddresses(Network.ETHEREUM);

  // grab ids from all nfts to query
  const nftIds = [
    ...Array.from(estates.values()).map(
      (e) => `estate-${addresses.EstateRegistry}-${e.tokenId}`
    ),
    ...Array.from(parcels.values()).map(
      (p) => `parcel-${addresses.LANDRegistry}-${p.tokenId}`
    ),
    ...Array.from(tokenIds.entries())
      .map(([contractAddress, tokenId]) =>
        tokenId.map((id) => `wearable-${contractAddress}-${id}`)
      )
      .flat(),
    ...Array.from(ensTokenIds.values()).map(
      (tokenId) => `ens-${addresses.DCLRegistrar}-${tokenId}`
    ),
  ];

  const nfts = await ctx.store
    .find(NFT, {
      relations: {
        owner: true,
        activeOrder: true,
      },
      where: {
        id: In(nftIds),
        network: ModelNetwork.ethereum,
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const orders = await ctx.store
    .findBy(Order, {
      nft: In([...Array.from(nftIds.values())]),
      network: ModelNetwork.ethereum,
      // id: In([...Array.from(nfts.values()).map((nft) => nft.activeOrder)]), // @TODO, revisit this
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const datas = await ctx.store
    .find(Data, {
      where: [
        { estate: In([...estateTokenIds]) },
        { parcel: In([...landTokenIds]) },
      ],
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const wearablesIds: string[] = [];
  Array.from(tokenIds.entries()).forEach(([contractAddress, tokenId]) => {
    for (const id of tokenId) {
      wearablesIds.push(`wearable-${contractAddress}-${id}`);
    }
  });

  const wearables = await ctx.store
    .findBy(Wearable, {
      id: In([...Array.from(wearablesIds.values())]),
      network: ModelNetwork.ethereum,
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const ens = await ctx.store
    .findBy(ENS, {
      tokenId: In([...Array.from(ensTokenIds.values())]),
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const analytics = await ctx.store
    .findBy(AnalyticsDayData, {
      id: In([...Array.from(analyticsIds.values())]),
      network: ModelNetwork.ethereum,
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const counts = await ctx.store
    .findBy(Count, {
      network: ModelNetwork.ethereum,
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const bids = await ctx.store
    .find(Bid, {
      relations: {
        nft: true,
      },
      where: {
        id: In([...Array.from(bidIds.values())]),
        network: ModelNetwork.ethereum,
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  return {
    parcels,
    estates,
    ens,
    datas,
    accounts,
    nfts,
    orders,
    wearables,
    analytics,
    counts,
    bids,
  };
};
