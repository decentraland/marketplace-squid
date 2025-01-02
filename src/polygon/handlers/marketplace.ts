import { BlockData, Transaction } from "@subsquid/evm-processor";
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
import * as CollectionV2ABI from "../abi/CollectionV2";
import * as MarketplaceV3ABI from "../abi/DecentralandMarketplacePolygon";
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
import { Context } from "../processor";
import { TradedEventArgs } from "../abi/DecentralandMarketplacePolygon";
import { encodeTokenId, handleIssue } from "./collection";
import {
  getTradeEventData,
  getTradeEventType,
  TradeAssetType,
  TradeType,
} from "../../common/utils/marketplaceV3";
import { normalizeTimestamp } from "../../common/utils/utils";

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
    order.item = nft.item;
    order.nftAddress = nftAddress;
    order.tokenId = assetId;
    order.txHash = txHash;
    order.owner = seller;
    order.price = priceInWei;
    order.expiresAt = expiresAt;
    order.expiresAtNormalized = normalizeTimestamp(expiresAt);

    order.blockNumber = BigInt(block.header.height); // @TODO review this type
    const timestamp = BigInt(block.header.timestamp / 1000);
    order.createdAt = timestamp;
    order.updatedAt = timestamp;

    if (nft.activeOrder) {
      const oldOrder = orders.get(nft.activeOrder.id);

      if (oldOrder) {
        cancelActiveOrder(oldOrder, timestamp);
      } else {
        console.log(
          `ERROR: Order not found when trying to cancel order ${nft.activeOrder.id}`
        );
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

export async function handleOrderSuccessful(
  ctx: Context,
  event: OrderSuccessfulEventArgs,
  block: BlockData,
  txHash: string,
  marketplaceContractData: MarketplaceContractData,
  marketplaceV2ContractData: MarketplaceV2ContractData,
  storedData: PolygonStoredData,
  inMemoryData: PolygonInMemoryState
): Promise<void> {
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
    nft.ownerAddress = buyer;
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
    await trackSale(
      ctx,
      block.header,
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

export async function handleTraded(
  ctx: Context,
  event: TradedEventArgs,
  block: BlockData,
  transaction: Transaction & { input: string },
  storedData: PolygonStoredData,
  inMemoryData: PolygonInMemoryState
): Promise<void> {
  const addresses = getAddresses(Network.MATIC);
  const { accounts, nfts } = storedData;

  const tradeData = getTradeEventData(event, Network.MATIC);
  const tradeType = getTradeEventType(event, Network.MATIC);
  const { assetType, collectionAddress, tokenId, buyer, price, seller } =
    tradeData;
  const marketplaceV3Contract = new MarketplaceV3ABI.Contract(
    ctx,
    block.header,
    addresses.MarketplaceV3
  );
  const feesCollector = await marketplaceV3Contract.feeCollector();
  const feeRate = await marketplaceV3Contract.feeRate();
  const royaltiesRate = await marketplaceV3Contract.royaltiesRate();

  // NFT
  if (Number(assetType) === TradeAssetType.ERC721) {
    if (!tokenId) {
      console.log("ERROR: tokenId not found in traded event");
      return;
    }
    const nftId = getNFTId(collectionAddress, tokenId.toString());
    const timestamp = BigInt(block.header.timestamp / 1000);

    const nft = nfts.get(nftId);
    if (!nft) {
      console.log(`ERROR: NFT not found for traded event ${nftId}`);
      return;
    }

    const buyerAccount = accounts.get(`${buyer}-${NetworkModel.POLYGON}`);
    if (buyerAccount) {
      nft.owner = buyerAccount;
      nft.ownerAddress = buyer;
    } else {
      console.log("ERROR: Buyer account not found for traded event");
    }

    nft.updatedAt = timestamp;

    if (nft.item) {
      await trackSale(
        ctx,
        block.header,
        storedData,
        inMemoryData,
        tradeType === TradeType.Bid ? SaleType.bid : SaleType.order,
        buyer,
        seller,
        seller,
        nft.item.id,
        nft.id,
        price,
        feeRate,
        feesCollector,
        royaltiesRate,
        BigInt(block.header.timestamp / 1000), // @TODO fix this, has the have the event hash not the block
        transaction.hash
      );
    } else {
      console.log("ERROR: NFT not found for sale in traded event");
    }
  } else if (Number(assetType) === TradeAssetType.ITEM) {
    const addresses = getAddresses(Network.MATIC);
    const itemId = tradeData.itemId;
    if (itemId === undefined) {
      console.log("ERROR: itemId not found in traded event");
      return;
    }
    const collectionContract = new CollectionV2ABI.Contract(
      ctx,
      block.header,
      collectionAddress
    );
    const item = await collectionContract.items(itemId);
    const tokenId = encodeTokenId(Number(itemId), Number(item.totalSupply));
    // simulates an issue event to re-use all the logic inside the `handleIssue` function
    const issueEvent = {
      _beneficiary:
        tradeType === TradeType.Order
          ? event._trade.sent[0].beneficiary
          : event._trade.received[0].beneficiary,
      _caller: addresses.MarketplaceV3,
      _itemId: itemId,
      _tokenId: tokenId,
      _issuedId: item.totalSupply,
    };
    await handleIssue(
      ctx,
      collectionAddress,
      issueEvent,
      block.header,
      transaction,
      storedData,
      inMemoryData,
      {
        fee: feeRate,
        feeOwner: feesCollector,
      },
      event
    );
  } else {
    console.log(
      `ERROR: Asset type not supported in trade: event ${event}, tx hash ${transaction.hash} and assetType ${assetType}`
    );
  }
}
