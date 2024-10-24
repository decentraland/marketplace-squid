import { ChainId, Network } from "@dcl/schemas";
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
import { getAddresses } from "../common/utils/addresses";
import { getBlockRange } from "../config";
import * as landRegistryAbi from "../abi/LANDRegistry";
import * as estateRegistryAbi from "../abi/EstateRegistry";
import * as erc721Abi from "../abi/ERC721";
import * as marketplaceAbi from "../abi/Marketplace";
import * as dclRegistrarAbi from "../abi/DCLRegistrar";
import * as dclControllerV2 from "../abi/DCLControllerV2";
import * as erc721BidAbi from "../abi/ERC721Bid";
import * as MarketplaceV3 from "../abi/DecentralandMarketplaceEthereum";

const addresses = getAddresses(Network.ETHEREUM);
const chainId = process.env.ETHEREUM_CHAIN_ID || ChainId.ETHEREUM_MAINNET;

const GATEWAY = `https://v2.archive.subsquid.io/network/ethereum-${
  chainId == ChainId.ETHEREUM_MAINNET ? "mainnet" : "sepolia"
}`; // see https://docs.subsquid.io/evm-indexing/supported-networks/
const RPC_ENDPOINT = process.env.RPC_ENDPOINT_ETH;

export const processor = new EvmBatchProcessor()
  .setGateway(GATEWAY)
  .setPrometheusPort(parseInt(process.env.ETH_PROMETHEUS_PORT || "3000"))
  .setRpcEndpoint({
    url: assertNotNull(RPC_ENDPOINT),
    rateLimit: 10,
  })
  .setFinalityConfirmation(75)
  .setFields({
    log: {
      transactionHash: true,
    },
  })
  .setBlockRange(getBlockRange(Network.ETHEREUM))
  .addLog({
    address: [
      addresses.LANDRegistry,
      addresses.EstateRegistry,
      addresses.DCLRegistrar,
      ...Object.values(addresses.collections as string[]),
    ],
    topic0: [
      erc721Abi.events[
        "Transfer(address indexed,address indexed,uint256 indexed,address,bytes,bytes)"
      ].topic,
      erc721Abi.events[
        "Transfer(address indexed,address indexed,uint256 indexed,address,bytes)"
      ].topic,
      erc721Abi.events[
        "Transfer(address indexed,address indexed,uint256 indexed)"
      ].topic,
      erc721Abi.events["Transfer(address indexed,address indexed,uint256)"]
        .topic,
      erc721Abi.events.OwnershipTransferred.topic,
      erc721Abi.events.AddWearable.topic,
    ],
  })
  .addLog({
    address: [addresses.LANDRegistry, addresses.EstateRegistry],
    topic0: [
      landRegistryAbi.events.Update.topic,
      estateRegistryAbi.events.CreateEstate.topic,
      estateRegistryAbi.events.AddLand.topic,
      estateRegistryAbi.events.RemoveLand.topic,
      estateRegistryAbi.events.Update.topic,
    ],
  })
  .addLog({
    address: [addresses.Marketplace],
    topic0: [
      marketplaceAbi.events.OrderCreated.topic,
      marketplaceAbi.events.OrderSuccessful.topic,
      marketplaceAbi.events.OrderCancelled.topic,
      marketplaceAbi.events.ChangedOwnerCutPerMillion.topic,
    ],
  })
  .addLog({
    address: [addresses.DCLRegistrar],
    topic0: [dclRegistrarAbi.events.NameRegistered.topic],
  })
  .addLog({
    address: [addresses.ERC721Bid],
    topic0: [
      erc721BidAbi.events.BidAccepted.topic,
      erc721BidAbi.events.BidCreated.topic,
      erc721BidAbi.events.BidCancelled.topic,
      erc721BidAbi.events.ChangedOwnerCutPerMillion.topic,
    ],
  })
  .addLog({
    address: [addresses.DCLControllerV2],
    topic0: [dclControllerV2.events.NameBought.topic],
  })
  .addLog({
    transaction: true,
    address: [addresses.MarketplaceV3],
    topic0: [MarketplaceV3.events.Traded.topic],
  });

export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Context = DataHandlerContext<Store, Fields>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
