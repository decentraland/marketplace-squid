import { BlockData } from "@subsquid/evm-processor";
import { Network } from "@dcl/schemas";
import {
  OrderCancelledEventArgs,
  OrderCreatedEventArgs,
  OrderSuccessfulEventArgs,
} from "../abi/Marketplace";
import { getCategory } from "../../common/utils/category";
import {
  cancelActiveOrder,
  getNFTId,
  updateNFTOrderProperties,
} from "../../common/utils";
import {
  Category,
  Count,
  NFT,
  Order,
  OrderStatus,
  Network as NetworkModel,
  SaleType,
} from "../../model";
import { trackSale } from "../modules/analytics";
import { PolygonInMemoryState, PolygonStoredData } from "../types";
import { buildCountFromOrder } from "../../common/modules/count";
import { getAddresses } from "../../common/utils/addresses";
import { MarketplaceContractData, MarketplaceV2ContractData } from "../state";

export type MarkteplaceEvents =
  | OrderCreatedEventArgs
  | OrderSuccessfulEventArgs
  | OrderCancelledEventArgs;

export function handleOrderCreated(
  event: OrderCreatedEventArgs,
  block: BlockData,
  contractAddress: string,
  txHash: string,
  orders: Map<string, Order>,
  nfts: Map<string, NFT>,
  counts: Map<string, Count>
): void {
  const { assetId, nftAddress, id, seller, priceInWei, expiresAt } = event;

  const nftId = getNFTId(nftAddress, assetId.toString());
  const nft = nfts.get(nftId);
  if (nft) {
    const orderId = id;

    const order = new Order({ id: orderId, network: NetworkModel.POLYGON });
    order.marketplaceAddress = contractAddress;
    order.status = OrderStatus.open;
    order.category = Category.wearable;
    order.nft = nft;
    order.nftAddress = nftAddress;
    order.tokenId = assetId;
    order.txHash = txHash;
    order.owner = seller;
    order.price = priceInWei;
    order.expiresAt = expiresAt;
    order.blockNumber = BigInt(block.header.height); // @TODO review this type
    const timestamp = BigInt(block.header.timestamp / 1000);
    order.createdAt = timestamp;
    order.updatedAt = timestamp;

    if (nft.activeOrder) {
      const oldOrder = orders.get(nft.activeOrder.id);

      if (oldOrder) {
        cancelActiveOrder(oldOrder, timestamp);
      }
    }

    nft.updatedAt = timestamp;
    updateNFTOrderProperties(nft, order);

    buildCountFromOrder(order, counts, NetworkModel.POLYGON);
    orders.set(orderId, order);
  } else {
    console.log(`ERROR: NFT not found for order created ${nftId}`);
  }
}

export function handleOrderSuccessful(
  event: OrderSuccessfulEventArgs,
  block: BlockData,
  txHash: string,
  marketplaceContractData: MarketplaceContractData,
  marketplaceV2ContractData: MarketplaceV2ContractData,
  storedData: PolygonStoredData,
  inMemoryData: PolygonInMemoryState
): void {
  const { assetId, buyer, id, nftAddress, seller, totalPrice } = event;
  const { orders, accounts, nfts } = storedData;

  const nftId = getNFTId(nftAddress, assetId.toString());
  const orderId = id;
  const order = orders.get(orderId);
  if (!order) {
    console.log(`ERROR: Order not found for order successful ${orderId}`);
    return;
  }

  // order.category = category as Category;
  order.status = OrderStatus.sold;
  order.buyer = buyer;
  order.price = totalPrice;
  order.blockNumber = BigInt(block.header.height);
  const timestamp = BigInt(block.header.timestamp / 1000);
  order.updatedAt = timestamp;

  const nft = nfts.get(nftId);
  if (!nft) {
    console.log(`ERROR: NFT not found for order successful ${nftId}`);
    return;
  }

  const buyerAccount = accounts.get(`${buyer}-${NetworkModel.POLYGON}`);
  if (buyerAccount) {
    nft.owner = buyerAccount;
  } else {
    console.log("ERROR: Buyer account not found for order successful");
  }

  nft.updatedAt = timestamp;
  updateNFTOrderProperties(nft!, order!);

  const addresses = getAddresses(Network.MATIC);
  const isMarketplaceV1 = addresses.Marketplace === order.marketplaceAddress;

  let feesCollectorCut: bigint;
  let feesCollector: string;
  let royaltiesCut: bigint;

  if (isMarketplaceV1) {
    if (
      marketplaceContractData.ownerCutPerMillion === undefined ||
      marketplaceContractData.owner === undefined
    ) {
      console.log("ERROR: Owner cut per million not found");
      return;
    }
    feesCollectorCut = marketplaceContractData.ownerCutPerMillion;
    feesCollector = marketplaceContractData.owner;
    royaltiesCut = BigInt(0);
  } else {
    if (
      marketplaceV2ContractData.feesCollector === undefined ||
      marketplaceV2ContractData.feesCollectorCutPerMillion === undefined ||
      marketplaceV2ContractData.royaltiesCutPerMillion === undefined
    ) {
      console.log(
        "ERROR: feesCollector or feesCollectorCutPerMillion or royaltiesCutPerMillion not found"
      );
      return;
    }
    feesCollectorCut = marketplaceV2ContractData.feesCollectorCutPerMillion;
    feesCollector = marketplaceV2ContractData.feesCollector;
    royaltiesCut = marketplaceV2ContractData.royaltiesCutPerMillion;
  }

  if (nft.item) {
    trackSale(
      storedData,
      inMemoryData,
      SaleType.order,
      buyer,
      seller,
      seller,
      nft.item.id,
      nft.id,
      order.price,
      feesCollectorCut,
      feesCollector,
      royaltiesCut,
      BigInt(block.header.timestamp / 1000), // @TODO fix this, has the have the event hash not the block
      txHash
    );
  } else {
    console.log("ERROR: NFT not found for sale in order successful: ", nftId);
  }
}

export function handleOrderCancelled(
  event: OrderCancelledEventArgs,
  block: BlockData,
  nfts: Map<string, NFT>,
  orders: Map<string, Order>
): void {
  const { assetId, id, nftAddress, seller } = event;
  const nftId = getNFTId(nftAddress, assetId.toString());

  const nft = nfts.get(nftId);
  const order = orders.get(id);

  if (nft && order) {
    order.status = OrderStatus.cancelled;
    order.blockNumber = BigInt(block.header.height);
    const timestamp = BigInt(block.header.timestamp / 1000);
    order.updatedAt = timestamp;

    nft.updatedAt = timestamp;
    updateNFTOrderProperties(nft, order);
  } else if (!nft) {
    console.log(
      `ERROR: NFT not found for order cancelled orderId:${id}, nftId: ${nftId}`
    );
  } else if (!order) {
    console.log(
      `ERROR: Order not found for order cancelled orderId:${id}, nftId: ${nftId}`
    );
  }
}
