import {
  ZERO_ADDRESS,
  createOrLoadAccount,
} from "../../common/modules/account";
import { getOrCreateAnalyticsDayData } from "../../common/modules/analytics";
import {
  buildCount,
  buildCountFromPrimarySale,
  buildCountFromSecondarySale,
} from "../../common/modules/count";
import { ONE_MILLION } from "../../common/utils/utils";
import {
  AnalyticsDayData,
  Item,
  ItemsDayData,
  Network,
  Sale,
  SaleType,
} from "../../model";
import { PolygonInMemoryState, PolygonStoredData } from "../types";
import {
  updateBuyerAccountsDayData,
  updateCreatorAccountsDayData,
  updateCreatorsSupportedSet,
  updateUniqueAndMythicItemsSet,
  updateUniqueCollectorsSet,
} from "./accountsDayData";

export function trackSale(
  storedData: PolygonStoredData,
  inMemoryData: PolygonInMemoryState,
  type: SaleType,
  buyer: string,
  seller: string,
  beneficiary: string,
  itemId: string,
  nftId: string,
  price: bigint,
  feesCollectorCut: bigint,
  feesCollector: string,
  royaltiesCut: bigint,
  timestamp: bigint,
  txHash: string
): void {
  const {
    counts,
    nfts,
    items,
    accounts,
    analytics,
    itemDayDatas,
    accountsDayDatas,
  } = storedData;
  const { sales } = inMemoryData;
  // ignore zero price sales
  if (price === BigInt(0)) {
    return;
  }

  // count sale
  // let count = buildCountFromSale(price);

  const count = buildCount(counts, Network.polygon);

  count.salesTotal += 1;
  count.salesManaTotal = count.salesManaTotal + price;

  counts.set(count.id, count);
  // count.save();

  // load entities
  let item = items.get(itemId);
  const nft = nfts.get(nftId);
  if (!item && !!nft?.item) {
    item = nft.item; // set the item coming out from the NFT
  }
  if (!item || !nft) {
    console.log("item: ", item);
    console.log("nft: ", nft);
    console.log(`ERROR: NFT or Item not found for sale ${nftId} ${itemId}`);
    return;
  }

  // save sale
  const saleId = `${BigInt(count.salesTotal).toString()}-${Network.polygon}`;
  const sale = new Sale({ id: saleId });
  sale.type = type;
  sale.buyer = buyer;
  sale.seller = seller;
  sale.beneficiary = Buffer.from(beneficiary.slice(2), "hex");
  sale.price = price;
  sale.item = item;
  sale.nft = nft;
  sale.timestamp = timestamp;
  sale.txHash = txHash;
  sale.searchItemId = item.blockchainId;
  sale.searchTokenId = nft.tokenId;
  sale.searchContractAddress = nft.contractAddress;
  sale.searchCategory = nft.category;
  sale.network = Network.polygon;

  // update Fees
  // console.log("feesCollector: ", feesCollector);
  // console.log("feesCollectorCut: ", feesCollectorCut);
  sale.feesCollector = Buffer.from(feesCollector.slice(2), "hex");
  sale.royaltiesCollector = Buffer.from(ZERO_ADDRESS.slice(2), "hex");
  sale.feesCollectorCut = (feesCollectorCut * sale.price) / ONE_MILLION;
  sale.royaltiesCut = (royaltiesCut * sale.price) / ONE_MILLION;

  const totalFees = sale.feesCollectorCut + sale.royaltiesCut;

  // add royalties to the count
  count.royaltiesManaTotal = count.royaltiesManaTotal + totalFees;
  // count = buildCountFromRoyalties(totalFees);
  // count.save();

  if (royaltiesCut > BigInt(0)) {
    if (item.beneficiary !== ZERO_ADDRESS || item.creator !== ZERO_ADDRESS) {
      const royaltiesCollectorAddress =
        item.beneficiary !== ZERO_ADDRESS ? item.beneficiary : item.creator;

      sale.royaltiesCollector = Buffer.from(
        royaltiesCollectorAddress.slice(2),
        "hex"
      );
      // update royalties collector account
      const royaltiesCollectorAccount = createOrLoadAccount(
        accounts,
        royaltiesCollectorAddress,
        Network.polygon
      );
      royaltiesCollectorAccount.earned =
        royaltiesCollectorAccount.earned + sale.royaltiesCut;
      royaltiesCollectorAccount.royalties =
        royaltiesCollectorAccount.royalties + sale.royaltiesCut;
      // royaltiesCollectorAccount.save();
    } else {
      // If there is not royalties receiver, all the fees goes to the fees collector
      sale.feesCollectorCut = sale.feesCollectorCut + sale.royaltiesCut;
      sale.royaltiesCut = BigInt(0);
    }
  }

  // we update the count here because the sale has the updated values based on the royalties reciever

  count.creatorEarningsManaTotal =
    count.creatorEarningsManaTotal +
    (sale.type == SaleType.mint
      ? sale.price - sale.feesCollectorCut
      : sale.royaltiesCut);

  count.daoEarningsManaTotal =
    count.daoEarningsManaTotal +
    (sale.type == SaleType.mint ? sale.feesCollectorCut : BigInt(0));

  sales.set(saleId, sale);

  // update buyer account
  const buyerAccount = createOrLoadAccount(accounts, buyer, Network.polygon);
  buyerAccount.purchases += 1;
  buyerAccount.spent = buyerAccount.spent + price;

  if (item.rarity === "unique" || item.rarity === "mythic") {
    buyerAccount.uniqueAndMythicItems = updateUniqueAndMythicItemsSet(
      buyerAccount.uniqueAndMythicItems,
      item
    );
    buyerAccount.uniqueAndMythicItemsTotal =
      buyerAccount.uniqueAndMythicItems.length;
  }
  buyerAccount.creatorsSupported = updateCreatorsSupportedSet(
    buyerAccount.creatorsSupported,
    sale.seller
  );
  buyerAccount.creatorsSupportedTotal = buyerAccount.creatorsSupported.length;

  // buyerAccount.save();

  // update seller account
  const sellerAccount = createOrLoadAccount(accounts, seller, Network.polygon);
  sellerAccount.sales += 1;
  sellerAccount.earned = sellerAccount.earned + (price - totalFees);
  sellerAccount.uniqueCollectors = updateUniqueCollectorsSet(
    sellerAccount.uniqueCollectors,
    buyer
  );
  // console.log(
  //   "sellerAccount.uniqueCollectors: ",
  //   sellerAccount.uniqueCollectors
  // );
  // console.log(
  //   "sellerAccount.uniqueCollectors.length: ",
  //   sellerAccount.uniqueCollectors.length
  // );
  sellerAccount.uniqueCollectorsTotal = sellerAccount.uniqueCollectors.length;

  // sellerAccount.save();

  // update fees collector account
  const feesCollectorAccount = createOrLoadAccount(accounts, feesCollector, Network.polygon);
  feesCollectorAccount.earned =
    feesCollectorAccount.earned + sale.feesCollectorCut;
  feesCollectorAccount.royalties =
    feesCollectorAccount.royalties + sale.feesCollectorCut;
  // feesCollectorAccount.save();

  // update item
  item.soldAt = timestamp;
  item.sales += 1;
  item.volume = item.volume + price;
  item.updatedAt = timestamp;
  item.uniqueCollectors = updateUniqueCollectorsSet(
    item.uniqueCollectors,
    buyer
  );
  item.uniqueCollectorsTotal = item.uniqueCollectors.length;

  // item.save();

  // update nft
  nft.soldAt = timestamp;
  nft.sales += 1;
  nft.volume = nft.volume + price;
  nft.updatedAt = timestamp;
  // nft.save();

  // track primary sales
  if (type == SaleType.mint) {
    buildCountFromPrimarySale(counts, price);
    // count.save();
    // track the sale and mana earned in the creator account
    const creatorAccount = createOrLoadAccount(
      accounts,
      item.creator,
      Network.polygon
    );
    creatorAccount.primarySales += 1;
    creatorAccount.primarySalesEarned =
      creatorAccount.primarySalesEarned + (price - totalFees);
    // creatorAccount.save();
  } else {
    // track secondary sale
    buildCountFromSecondarySale(counts, price);
  }

  // console.log("tracking sale2");

  const analyticsDayData = updateAnalyticsDayData(analytics, sale);
  // console.log("analyticsDayData: ", analyticsDayData);
  analytics.set(analyticsDayData.id, analyticsDayData);

  const itemDayData = updateItemDayData(itemDayDatas, sale, item);
  itemDayDatas.set(itemDayData.id, itemDayData);
  // itemDayData.save();

  const buyerAccountsDayData = updateBuyerAccountsDayData(
    accountsDayDatas,
    sale,
    item
  );
  accountsDayDatas.set(buyerAccountsDayData.id, buyerAccountsDayData);
  // buyerAccountsDayData.save();

  const creatorsAccountsDayData = updateCreatorAccountsDayData(
    accountsDayDatas,
    sale,
    price - totalFees,
    item.collection.id
  );
  accountsDayDatas.set(creatorsAccountsDayData.id, creatorsAccountsDayData);
  // creatorsAccountsDayData.save();
}

export function updateAnalyticsDayData(
  analytics: Map<string, AnalyticsDayData>,
  sale: Sale
): AnalyticsDayData {
  const analyticsDayData = getOrCreateAnalyticsDayData(
    sale.timestamp,
    analytics,
    Network.polygon
  );
  // console.log("sale.feesCollectorCut: ", sale.feesCollectorCut);
  // console.log("sale.royaltiesCut: ", sale.royaltiesCut);
  if (
    sale.feesCollectorCut === undefined ||
    sale.feesCollectorCut === null ||
    sale.royaltiesCut === undefined ||
    sale.royaltiesCut === null
  ) {
    console.log(
      "ERROR: Sale fees or royalties not set because feesCollectorCut or royaltiesCut are missing",
      sale.id
    );
    return analyticsDayData;
  }

  analyticsDayData.sales += 1;
  analyticsDayData.volume = analyticsDayData.volume + sale.price;
  analyticsDayData.creatorsEarnings =
    sale.type == SaleType.mint
      ? analyticsDayData.creatorsEarnings + (sale.price - sale.feesCollectorCut) // if it's a MINT, the creator earning is the sale price
      : analyticsDayData.creatorsEarnings + sale.royaltiesCut; // if it's a secondary sale, the creator earning is the royaltiesCut (if it's set already)

  // console.log(
  //   "sale.feesCollectorCut in updateAnalyticsDayData: ",
  //   sale.feesCollectorCut
  // );
  // console.log("analyticsDayData.daoEarnings: ", analyticsDayData.daoEarnings);
  analyticsDayData.daoEarnings =
    analyticsDayData.daoEarnings + sale.feesCollectorCut;

  return analyticsDayData;
}

export function getOrCreateItemDayData(
  itemsDayDatas: Map<string, ItemsDayData>,
  blockTimestamp: bigint,
  itemId: string
): ItemsDayData {
  const timestamp = blockTimestamp;
  const dayID = timestamp / BigInt(86400); // unix timestamp for start of day / 86400 giving a unique day index
  const dayStartTimestamp = dayID * BigInt(86400);
  const itemDayDataId = dayID.toString() + "-" + itemId;

  let itemDayData = itemsDayDatas.get(itemDayDataId);
  if (!itemDayData) {
    itemDayData = new ItemsDayData({ id: itemDayDataId });
    itemDayData.date = +dayStartTimestamp.toString(); // unix timestamp for start of day
    itemDayData.sales = 0;
    itemDayData.volume = BigInt(0);
  }

  return itemDayData as ItemsDayData;
}

export function updateItemDayData(
  itemsDayDatas: Map<string, ItemsDayData>,
  sale: Sale,
  item: Item
): ItemsDayData {
  const itemDayData = getOrCreateItemDayData(
    itemsDayDatas,
    sale.timestamp,
    item.id
  );
  itemDayData.sales += 1;
  itemDayData.volume = itemDayData.volume + sale.price;
  if (item) {
    itemDayData.searchWearableCategory = item.searchWearableCategory;
    itemDayData.searchEmoteCategory = item.searchEmoteCategory;
    itemDayData.searchRarity = item.rarity;
  }

  return itemDayData;
}
