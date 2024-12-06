import { createOrLoadAccount } from "../../common/modules/account";
import { ONE_MILLION } from "../../common/utils/utils";
import {
  Account,
  AnalyticsDayData,
  Count,
  NFT,
  Network,
  Sale,
  SaleType,
} from "../../model";
import { buildCountFromSale } from "./count";
import { getOrCreateAnalyticsDayData } from "../../common/modules/analytics";
import { getOwner } from "../../common/utils/nft";
import { Block, Context } from "../processor";

export let BID_SALE_TYPE = "bid";
export let ORDER_SALE_TYPE = "order";

// check if the buyer in a sale was a third party provider (to pay with credit card, cross chain, etc)
export function isThirdPartySale(buyer: string): boolean {
  if (
    buyer == "0xea749fd6ba492dbc14c24fe8a3d08769229b896c" || // Axelar Ethereum old contract
    buyer == "0xad6cea45f98444a922a2b4fe96b8c90f0862d2f4" // Axelar Ethereum new contract
  ) {
    return true;
  }
  return false;
}

export async function trackSale(
  ctx: Context,
  block: Block,
  type: string,
  buyer: string,
  seller: string,
  nftId: string,
  price: bigint,
  feesCollectorCut: bigint,
  timestamp: bigint,
  txHash: string,
  nfts: Map<string, NFT>,
  sales: Map<string, Sale>,
  accounts: Map<string, Account>,
  analytics: Map<string, AnalyticsDayData>,
  counts: Map<string, Count>
): Promise<void> {
  // ignore zero price sales
  if (price === BigInt(0)) {
    console.log("INFO: ignoring zero price sale");
    return;
  }

  // count sale
  const count = buildCountFromSale(price, feesCollectorCut, counts);
  counts.set(count.id, count);

  // load entities
  const nft = nfts.get(nftId);

  // save sale
  const saleId = `${BigInt(count.salesTotal).toString()}-${Network.ETHEREUM}`;
  const sale = new Sale({ id: saleId });
  sale.type = type as SaleType;
  sale.seller = seller;
  sale.price = price;
  if (nft) {
    sale.buyer = isThirdPartySale(buyer)
      ? await getOwner(ctx, block, nft.contractAddress, nft.tokenId)
      : buyer;
    sale.nft = nft;
    sale.searchTokenId = nft.tokenId;
    sale.searchContractAddress = nft.contractAddress;
    sale.searchCategory = nft.category;
  } else {
    console.log("ERROR: NFT not found for sale", nftId);
  }
  sale.timestamp = timestamp;
  sale.txHash = txHash;
  sale.network = Network.ETHEREUM;
  sales.set(saleId, sale);

  // update buyer account
  const buyerAccount = createOrLoadAccount(accounts, buyer);
  if (buyerAccount) {
    buyerAccount.purchases += 1;
    buyerAccount.spent = buyerAccount.spent + price;
    // accounts.set(buyer, buyerAccount);
  }

  // update seller account
  const sellerAccount = createOrLoadAccount(accounts, seller);
  if (sellerAccount) {
    sellerAccount.sales += 1;
    sellerAccount.earned = sellerAccount.earned + price;
    // accounts.set(seller, sellerAccount);
  }

  // update nft
  if (nft) {
    nft.soldAt = timestamp;
    nft.sales += 1;
    nft.volume = nft.volume + price;
    nft.updatedAt = timestamp;
    nfts.set(nftId, nft);
  }

  const analyticsDayData = updateAnalyticsDayData(
    sale,
    feesCollectorCut,
    analytics
  );
  analytics.set(analyticsDayData.id, analyticsDayData);
}

// export function getOrCreateAnalyticsDayData(
//   blockTimestamp: bigint,
//   analytics: Map<string, AnalyticsDayData>
// ): AnalyticsDayData {
//   const timestamp = blockTimestamp;
//   const dayID = timestamp / BigInt(86400); // unix timestamp for start of day / 86400 giving a unique day index
//   const dayStartTimestamp = dayID * BigInt(86400);
//   let analyticsDayData = analytics.get(dayID.toString());
//   if (analyticsDayData == null) {
//     analyticsDayData = new AnalyticsDayData({ id: dayID.toString() });
//     analyticsDayData.date = +dayStartTimestamp.toString(); // unix timestamp for start of day
//     analyticsDayData.sales = 0;
//     analyticsDayData.volume = BigInt(0);
//     analyticsDayData.creatorsEarnings = BigInt(0); // won't be used at all, the bids and transfer from here have no fees for creators
//     analyticsDayData.daoEarnings = BigInt(0);
//   }
//   return analyticsDayData;
// }

export function updateAnalyticsDayData(
  sale: Sale,
  feesCollectorCut: bigint,
  analytics: Map<string, AnalyticsDayData>
): AnalyticsDayData {
  const analyticsDayData = getOrCreateAnalyticsDayData(
    sale.timestamp,
    analytics
  );
  analyticsDayData.sales += 1;
  analyticsDayData.volume = analyticsDayData.volume + sale.price;
  analyticsDayData.daoEarnings =
    analyticsDayData.daoEarnings +
    (feesCollectorCut * sale.price) / ONE_MILLION;

  return analyticsDayData;
}
