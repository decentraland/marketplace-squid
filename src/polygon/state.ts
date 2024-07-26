import { ChainId, Network } from "@dcl/schemas";
import { PolygonInMemoryState } from "./types";
import { Sale } from "../model";
import { getAddresses } from "../common/utils/addresses";
import { Contract as MarketplaceContract } from "./abi/Marketplace";
import { Contract as MarketplaceV2Contract } from "./abi/MarketplaceV2";
import { Contract as CollectionStoreContract } from "./abi/CollectionStore";
import { Contract as ERC721BidV2Contract } from "./abi/ERC721BidV2";
import { Block, Context } from "./processor";

const chainId = +(process.env.POLYGON_CHAIN_ID || ChainId.MATIC_MAINNET);

export const getBatchInMemoryState: () => PolygonInMemoryState = () => ({
  curations: new Map(),
  mints: new Map(),
  transfers: new Map(),
  sales: new Map<string, Sale>(),
  // ids
  tokenIds: new Map(),
  accountIds: new Set(),
  collectionIds: new Set(),
  analyticsIds: new Set(),
  bidIds: new Set(),
  itemIds: new Map(),
  // events
  transferEvents: new Map(),
  collectionFactoryEvents: [],
  events: [],
  committeeEvents: [],
  rarityEvents: [],
});

export type StoreContractData = {
  fee: bigint | undefined;
  feeOwner: string | undefined;
};

export type MarketplaceContractData = {
  ownerCutPerMillion: bigint | undefined;
  owner: string | undefined;
};

export type MarketplaceV2ContractData = {
  feesCollectorCutPerMillion: bigint | undefined;
  feesCollector: string | undefined;
  royaltiesCutPerMillion: bigint | undefined;
};

export type BidContractData = {
  ownerCutPerMillion: bigint | undefined;
  owner: string | undefined;
};

export type BidV2ContractData = {
  feesCollectorCutPerMillion: bigint | undefined;
  feesCollector: string | undefined;
  royaltiesCutPerMillion: bigint | undefined;
};

export let marketplaceContractData: MarketplaceContractData = {
  ownerCutPerMillion: undefined,
  owner: undefined,
};

export let marketplaceV2ContractData: MarketplaceV2ContractData = {
  feesCollectorCutPerMillion: undefined,
  feesCollector: undefined,
  royaltiesCutPerMillion: undefined,
};

export let bidV2ContractData: BidV2ContractData = {
  feesCollectorCutPerMillion: undefined,
  feesCollector: undefined,
  royaltiesCutPerMillion: undefined,
};

export let storeContractData: StoreContractData = {
  fee: undefined,
  feeOwner: undefined,
};

export const getStoreContractData = async (ctx: Context, block: Block) => {
  if (
    storeContractData.fee === undefined ||
    storeContractData.feeOwner === undefined
  ) {
    console.log("INFO: Fetching store contract data for first time");
    const addresses = getAddresses(Network.MATIC);
    const storeContract = new CollectionStoreContract(
      ctx,
      block,
      addresses.CollectionStore
    );
    storeContractData.fee = await storeContract.fee();
    storeContractData.feeOwner = await storeContract.feeOwner();
  }
  return storeContractData;
};

const START_BLOCK_MARKETPLACEV1: Record<number, number> = {
  [ChainId.MATIC_AMOY]: 14517370,
  [ChainId.MATIC_MAINNET]: 15202000,
};

export const getMarketplaceContractData = async (
  ctx: Context,
  block: Block
) => {
  if (
    chainId === ChainId.MATIC_MAINNET && // there's no contract for AMOY
    (marketplaceContractData.ownerCutPerMillion === undefined ||
      marketplaceContractData.owner === undefined)
  ) {
    console.log("INFO: Fetching Marketplace v1 contract data for first time");
    const addresses = getAddresses(Network.MATIC);
    const c = new MarketplaceContract(ctx, block, addresses.Marketplace);
    marketplaceContractData.ownerCutPerMillion = await c.ownerCutPerMillion();
    marketplaceContractData.owner = await c.owner();
  }
  return marketplaceContractData;
};

const START_BLOCK_MARKETPLACEV2: Record<number, number> = {
  [ChainId.MATIC_AMOY]: 5706656,
  [ChainId.MATIC_MAINNET]: 22514900,
};

export const getMarketplaceV2ContractData = async (
  ctx: Context,
  block: Block
) => {
  const contractStartingBlock = START_BLOCK_MARKETPLACEV2[chainId];
  if (
    (marketplaceV2ContractData.feesCollectorCutPerMillion === undefined ||
      marketplaceV2ContractData.feesCollector === undefined ||
      marketplaceV2ContractData.royaltiesCutPerMillion === undefined) &&
    block.height >= contractStartingBlock
  ) {
    console.log("INFO: Fetching marketplace v2 contract data for first time");
    const addresses = getAddresses(Network.MATIC);
    const c = new MarketplaceV2Contract(ctx, block, addresses.MarketplaceV2);
    marketplaceV2ContractData.feesCollectorCutPerMillion =
      await c.feesCollectorCutPerMillion();
    marketplaceV2ContractData.feesCollector = await c.feesCollector();
    marketplaceV2ContractData.royaltiesCutPerMillion =
      await c.royaltiesCutPerMillion();
  }
  return marketplaceV2ContractData;
};

const START_BLOCK_BIDV2: Record<number, number> = {
  [ChainId.MATIC_AMOY]: 5706662,
  [ChainId.MATIC_MAINNET]: 22913743,
};

export const getBidV2ContractData = async (ctx: Context, block: Block) => {
  const contractStartingBlock = START_BLOCK_BIDV2[chainId];
  if (
    (bidV2ContractData.feesCollectorCutPerMillion === undefined ||
      bidV2ContractData.feesCollector === undefined ||
      bidV2ContractData.royaltiesCutPerMillion === undefined) &&
    block.height >= contractStartingBlock
  ) {
    console.log("INFO: Fetching bid v2 contract data for first time");
    const addresses = getAddresses(Network.MATIC);
    const c = new ERC721BidV2Contract(ctx, block, addresses.BidV2);
    bidV2ContractData.feesCollectorCutPerMillion =
      await c.feesCollectorCutPerMillion();
    bidV2ContractData.feesCollector = await c.feesCollector();
    bidV2ContractData.royaltiesCutPerMillion = await c.royaltiesCutPerMillion();
  }
  return bidV2ContractData;
};

export const setStoreFee = (fee: bigint) => {
  storeContractData.fee = fee;
};

export const setStoreFeeOwner = (feeOwner: string) => {
  storeContractData.feeOwner = feeOwner;
};

export let marketplaceOwnerCutPerMillion: bigint | null = null;
export let marketplaceV2OwnerCutPerMillion: bigint | null = null;
export let bidOwnerCutPerMillion: bigint | null = null;

export const getMarketplaceOwnerCutPerMillion = () => {
  return marketplaceOwnerCutPerMillion;
};

export const getMarketplaceV2OwnerCutPerMillion = () => {
  return marketplaceV2OwnerCutPerMillion;
};

export const getBidOwnerCutPerMillion = () => {
  return bidOwnerCutPerMillion;
};

export const setMarketplaceOwnerCutPerMillion = (value: bigint) => {
  marketplaceOwnerCutPerMillion = value;
};

export const setMarketplaceV2OwnerCutPerMillion = (value: bigint) => {
  marketplaceV2OwnerCutPerMillion = value;
};

export const setBidOwnerCutPerMillion = (value: bigint) => {
  bidOwnerCutPerMillion = value;
};
