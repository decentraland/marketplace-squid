import { In } from "typeorm";
import {
  Account,
  AnalyticsDayData,
  Bid,
  Count,
  NFT,
  Order,
  Wearable,
  Network as ModelNetwork,
  Collection,
  Item,
  Rarity,
  Metadata,
  Emote,
  ItemsDayData,
  AccountsDayData,
} from "../model";
import { Context } from "./processor";
import { PolygonInMemoryState, PolygonStoredData } from "./types";
import { DEFAULT_ID } from "../common/modules/count";

export const getStoredData = async (
  ctx: Context,
  ids: Pick<
    PolygonInMemoryState,
    | "accountIds"
    | "tokenIds"
    | "analyticsIds"
    | "bidIds"
    | "collectionIds"
    | "itemIds"
  >
): Promise<PolygonStoredData> => {
  const { accountIds, tokenIds, analyticsIds, bidIds, collectionIds, itemIds } =
    ids;

  const accountIdsToLookFor = [...accountIds].map(
    (id) => `${id}-${ModelNetwork.polygon}`
  );
  const accounts = await ctx.store
    .findBy(Account, {
      id: In(accountIdsToLookFor),
      network: ModelNetwork.polygon,
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  // grab ids from all nfts to query
  const nftIds = [
    ...Array.from(tokenIds.entries())
      .map(([contractAddress, tokenId]) =>
        tokenId.map((id) => `${contractAddress}-${id}`)
      )
      .flat(),
  ];

  const nfts = await ctx.store
    .find(NFT, {
      relations: {
        owner: true,
        activeOrder: true,
        metadata: true,
        item: true,
      },
      where: {
        id: In(nftIds),
        network: ModelNetwork.polygon,
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const orders = await ctx.store
    .findBy(Order, {
      nft: In([...Array.from(nftIds.values())]),
      network: ModelNetwork.polygon,
      // id: In([...Array.from(nfts.values()).map((nft) => nft.activeOrder)]), // @TODO, revisit this
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const analytics = await ctx.store
    .findBy(AnalyticsDayData, {
      id: In([...Array.from(analyticsIds.values())]),
      network: ModelNetwork.polygon,
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const itemDayDatas = await ctx.store
    .findBy(ItemsDayData, {
      id: In([...Array.from(analyticsIds.values())]),
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const accountsDayDatas = await ctx.store
    .findBy(AccountsDayData, {
      id: In([...Array.from(analyticsIds.values())]),
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const counts = await ctx.store
    .find(Count, {
      where: {
        network: ModelNetwork.polygon,
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const nftItemIds = Array.from(nfts.values()).map((nft) => nft.item?.id);

  const items = await ctx.store
    .find(Item, {
      relations: {
        collection: true,
        metadata: true,
      },
      where: [
        {
          collection: In([...collectionIds]),
        },
        {
          id: In([...itemIds]),
        },
        {
          id: In([...nftItemIds]),
        },
      ],
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const wearables = await ctx.store
    .find(Wearable, {
      where: {
        id: In([...itemIds]),
        network: ModelNetwork.polygon,
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const emotes = await ctx.store
    .find(Emote, {
      where: {
        id: In([...itemIds]),
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const metadataIds = [
    ...Array.from(itemIds.entries())
      .map(([contractAddress, tokenId]) =>
        tokenId.map((id) => `${contractAddress}-${id}`)
      )
      .flat(),
  ];

  const metadatas = await ctx.store
    .find(Metadata, {
      where: {
        id: In([...metadataIds]),
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const collections = await ctx.store
    .find(Collection, {
      where: {
        id: In([...collectionIds]),
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const bids = await ctx.store
    .find(Bid, {
      relations: {
        nft: true,
      },
      where: {
        id: In([...Array.from(bidIds.values())]),
        network: ModelNetwork.polygon,
      },
    })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  const rarities = await ctx.store
    .find(Rarity)
    .then((q) => new Map(q.map((i) => [i.id, i])));

  return {
    counts,
    accounts,
    collections,
    orders,
    bids,
    nfts,
    analytics,
    itemDayDatas,
    accountsDayDatas,
    items,
    wearables,
    emotes,
    metadatas,
    rarities,
  };
};
