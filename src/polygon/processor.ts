import { assertNotNull } from "@subsquid/util-internal";
import {
  BlockHeader,
  DataHandlerContext,
  EvmBatchProcessor,
  EvmBatchProcessorFields,
  Log as _Log,
  Transaction as _Transaction,
} from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import { ChainId, Network } from "@dcl/schemas";
import * as CollectionFactoryABI from "./abi/CollectionFactory";
import * as RaritiesWithOracleABI from "./abi/RaritiesWithOracle";
import * as CollectionFactoryV3ABI from "./abi/CollectionFactoryV3";
import * as MarketplaceABI from "./abi/Marketplace";
import * as BidABI from "./abi/ERC721Bid";
import * as MarketplaceV2ABI from "./abi/MarketplaceV2";
import * as CommitteeABI from "./abi/Committee";
import * as CollectionV2ABI from "./abi/CollectionV2";
import * as RaritiesABI from "./abi/Rarity";
import * as CollectionManagerABI from "./abi/CollectionManager";
import { getBlockRange } from "../config";
import { getAddresses } from "../common/utils/addresses";
import { loadCollections } from "./utils/loaders";

const addresses = getAddresses(Network.MATIC);
const chainId = process.env.POLYGON_CHAIN_ID || ChainId.MATIC_MAINNET;

const GATEWAY = `https://v2.archive.subsquid.io/network/polygon-${
  chainId == ChainId.MATIC_MAINNET ? "mainnet" : "amoy-testnet"
}`;
const RPC_ENDPOINT = process.env.RPC_ENDPOINT_POLYGON;

const collections = loadCollections();

export const processor = new EvmBatchProcessor()
  .setGateway(GATEWAY)
  .setPrometheusPort(parseInt(process.env.POLYGON_PROMETHEUS_PORT || "3001"))
  .setRpcEndpoint({
    url: assertNotNull(RPC_ENDPOINT),
    rateLimit: 10,
  })
  .setFinalityConfirmation(75)
  .setFields({
    transaction: {
      input: true,
    },
    log: {
      transactionHash: true,
    },
  })
  .setBlockRange(getBlockRange(Network.MATIC))
  .addLog({
    address: [addresses.CollectionFactory, addresses.CollectionFactoryV3],
    topic0: [
      CollectionFactoryABI.events.ProxyCreated.topic,
      CollectionFactoryV3ABI.events.ProxyCreated.topic,
    ],
  })
  .addLog({
    address: [addresses.Marketplace, addresses.MarketplaceV2],
    topic0: [
      MarketplaceABI.events.OrderCreated.topic,
      MarketplaceABI.events.OrderSuccessful.topic,
      MarketplaceABI.events.OrderCancelled.topic,
      MarketplaceV2ABI.events.OrderCreated.topic,
      MarketplaceV2ABI.events.OrderSuccessful.topic,
      MarketplaceV2ABI.events.OrderCancelled.topic,
    ],
  })
  .addLog({
    address: [addresses.Bid, addresses.BidV2],
    topic0: [
      BidABI.events.BidCreated.topic,
      BidABI.events.BidAccepted.topic,
      BidABI.events.BidCancelled.topic,
    ],
  })
  .addLog({
    address: [addresses.OldCommittee, addresses.Committee],
    topic0: [CommitteeABI.events.MemberSet.topic],
  })
  .addLog({
    transaction: true,
    address: collections.addresses,
    topic0: [
      CollectionV2ABI.events.SetGlobalMinter.topic,
      CollectionV2ABI.events.SetGlobalManager.topic,
      CollectionV2ABI.events.SetItemMinter.topic,
      CollectionV2ABI.events.SetItemManager.topic,
      CollectionV2ABI.events.AddItem.topic,
      CollectionV2ABI.events.RescueItem.topic,
      CollectionV2ABI.events.UpdateItemData.topic,
      CollectionV2ABI.events.Issue.topic,
      CollectionV2ABI.events.SetApproved.topic,
      CollectionV2ABI.events.SetEditable.topic,
      CollectionV2ABI.events.Complete.topic,
      CollectionV2ABI.events.CreatorshipTransferred.topic,
      CollectionV2ABI.events.OwnershipTransferred.topic,
      CollectionV2ABI.events.Transfer.topic,
    ],
    range: { from: 0, to: collections.height },
  })
  .addLog({
    transaction: true,
    topic0: [
      CollectionV2ABI.events.SetGlobalMinter.topic,
      CollectionV2ABI.events.SetGlobalManager.topic,
      CollectionV2ABI.events.SetItemMinter.topic,
      CollectionV2ABI.events.SetItemManager.topic,
      CollectionV2ABI.events.AddItem.topic,
      CollectionV2ABI.events.RescueItem.topic,
      CollectionV2ABI.events.UpdateItemData.topic,
      CollectionV2ABI.events.Issue.topic,
      CollectionV2ABI.events.SetApproved.topic,
      CollectionV2ABI.events.SetEditable.topic,
      CollectionV2ABI.events.Complete.topic,
      CollectionV2ABI.events.CreatorshipTransferred.topic,
      CollectionV2ABI.events.OwnershipTransferred.topic,
      CollectionV2ABI.events.Transfer.topic,
    ],
    range: { from: collections.height + 1 },
  })
  .addLog({
    transaction: true,
    address: [addresses.Rarity, addresses.RaritiesWithOracle],
    topic0: [
      RaritiesABI.events.AddRarity.topic,
      RaritiesABI.events.UpdatePrice.topic,
      RaritiesWithOracleABI.events.AddRarity.topic,
      RaritiesWithOracleABI.events.UpdatePrice.topic,
    ],
  })
  .addLog({
    transaction: true,
    address: [addresses.CollectionManager],
    topic0: [CollectionManagerABI.events.RaritiesSet.topic],
  });

export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Context = DataHandlerContext<Store, Fields>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
