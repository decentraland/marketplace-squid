import { BlockData, Log, Transaction } from "@subsquid/evm-processor";
import * as CollectionV2 from "./abi/CollectionV2";
import * as CollectionFactoryV3ABI from "./abi/CollectionFactoryV3";
import * as erc721abi from "../abi/ERC721";
import * as marketplaceAbi from "../abi/Marketplace";
import * as erc721BidAbi from "../abi/ERC721Bid";
import * as CommitteeABI from "./abi/Committee";
import * as RarityABI from "./abi/Rarity";
import {
  Account,
  AccountsDayData,
  AnalyticsDayData,
  Bid,
  Collection,
  Count,
  Curation,
  Emote,
  Item,
  ItemsDayData,
  Metadata,
  Mint,
  NFT,
  Order,
  Rarity,
  Sale,
  Transfer,
  Wearable,
} from "../model";
import {
  BidContractData,
  BidV2ContractData,
  MarketplaceContractData,
  MarketplaceV2ContractData,
  StoreContractData,
} from "./state";

export type PolygonInMemoryState = {
  // collections: Map<string, Collection>;
  // items: Map<string, Item>;
  sales: Map<string, Sale>;
  curations: Map<string, Curation>;
  mints: Map<string, Mint>;
  transfers: Map<string, Transfer>;
  // rarities: Map<string, Rarity>;
  // ids
  collectionIds: Set<string>;
  tokenIds: Map<string, bigint[]>;
  itemIds: Map<string, bigint[]>;
  accountIds: Set<string>;
  analyticsIds: Set<string>;
  bidIds: Set<string>;
  // events
  transferEvents: Map<
    string,
    { event: erc721abi.TransferEventArgs_2; block: BlockData }[]
  >;
  markteplaceEvents: {
    topic: string;
    event:
      | marketplaceAbi.OrderCreatedEventArgs
      | marketplaceAbi.OrderSuccessfulEventArgs
      | marketplaceAbi.OrderCancelledEventArgs
      | erc721BidAbi.BidCreatedEventArgs
      | erc721BidAbi.BidCancelledEventArgs
      | erc721BidAbi.BidAcceptedEventArgs
      | erc721abi.TransferEventArgs_2;
    block: BlockData;
    log: Log & { transactionHash: string };
    // marketplaceOwnerCutPerMillion: bigint | null;
    marketplaceContractData: MarketplaceContractData;
    marketplaceV2ContractData: MarketplaceV2ContractData;
    // bidOwnerCutPerMillion: bigint | null;
    // bidV1ContractData: BidContractData;
    bidV2ContractData: BidV2ContractData;
  }[];
  collectionFactoryEvents: {
    event: CollectionFactoryV3ABI.ProxyCreatedEventArgs;
    block: BlockData;
  }[];
  collectionEvents: {
    topic: string;
    event:
      | CollectionV2.SetGlobalMinterEventArgs
      | CollectionV2.SetGlobalManagerEventArgs
      | CollectionV2.SetItemMinterEventArgs
      | CollectionV2.SetItemManagerEventArgs
      | CollectionV2.AddItemEventArgs
      | CollectionV2.RescueItemEventArgs
      | CollectionV2.UpdateItemDataEventArgs
      | CollectionV2.IssueEventArgs
      | CollectionV2.SetApprovedEventArgs
      | CollectionV2.SetEditableEventArgs
      | CollectionV2.CompleteEventArgs
      | CollectionV2.CreatorshipTransferredEventArgs
      | CollectionV2.OwnershipTransferredEventArgs
      | CollectionV2.TransferEventArgs;
    block: BlockData;
    log: Log & { transactionHash: string };
    transaction?: Transaction & { input: string };
    rarities?: Map<string, Rarity>;
    storeContractData: StoreContractData;
  }[];
  committeeEvents: CommitteeABI.MemberSetEventArgs[];
  // rarityEvents: (
  //   | RarityABI.AddRarityEventArgs
  //   | RarityABI.UpdatePriceEventArgs
  // )[];
};

export type PolygonStoredData = {
  accounts: Map<string, Account>;
  counts: Map<string, Count>;
  collections: Map<string, Collection>;
  orders: Map<string, Order>;
  bids: Map<string, Bid>;
  nfts: Map<string, NFT>;
  analytics: Map<string, AnalyticsDayData>;
  itemDayDatas: Map<string, ItemsDayData>;
  accountsDayDatas: Map<string, AccountsDayData>;
  items: Map<string, Item>;
  wearables: Map<string, Wearable>;
  emotes: Map<string, Emote>;
  metadatas: Map<string, Metadata>;
  rarities: Map<string, Rarity>;
};
