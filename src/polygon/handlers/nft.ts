import { Network } from "@dcl/schemas";
import { buildCountFromNFT } from "../../common/modules/count";
import {
  cancelActiveOrder,
  clearNFTOrderProperties,
  getNFTId,
} from "../../common/utils";
import {
  ZERO_ADDRESS,
  createOrLoadAccount,
} from "../../common/modules/account";
import { getAddresses } from "../../common/utils/addresses";
import {
  Category,
  Collection,
  Item,
  ItemType,
  Mint,
  NFT,
  Network as NetworkModel,
  SaleType,
} from "../../model";
import { IssueEventArgs, TransferEventArgs } from "../abi/CollectionV2";
import * as CollectionStore from "../abi/CollectionStore";
import { setNFTSearchFields } from "../modules/metadata";
import { Block, Context } from "../processor";
import { PolygonInMemoryState, PolygonStoredData } from "../types";
import { Transaction } from "@subsquid/evm-processor";
import { trackSale } from "../modules/analytics";
import { StoreContractData } from "../state";

/**
 * @notice mint an NFT by a collection v2 issue event
 * @param event
 * @param collectionAddress
 * @param item
 */
export function handleMintNFT(
  event: IssueEventArgs,
  block: Block,
  transaction: Transaction,
  collectionAddress: string,
  item: Item,
  storedData: PolygonStoredData,
  inMemoryData: PolygonInMemoryState,
  storeContractData: StoreContractData
): void {
  const { counts, collections, accounts, metadatas, wearables, emotes, nfts } =
    storedData;
  const { mints } = inMemoryData;
  const nftId = getNFTId(collectionAddress, event._tokenId.toString());
  const nft = new NFT({ id: nftId });

  const issuedId = event._issuedId;

  const collection = collections.get(collectionAddress);
  if (!collection) {
    console.log("ERROR: Collection not found", collectionAddress);
    return;
  }
  nft.collection = collection;
  nft.category = (
    item.itemType === ItemType.emote_v1 ? "emote" : "wearable"
  ) as Category;
  nft.tokenId = event._tokenId;
  nft.contractAddress = collectionAddress;
  nft.itemBlockchainId = event._itemId;
  nft.itemType = item.itemType;
  nft.issuedId = event._issuedId;
  nft.item = item;
  nft.urn = item.urn;
  const owner = createOrLoadAccount(
    accounts,
    event._beneficiary,
    NetworkModel.polygon
  );
  if (owner) {
    nft.owner = owner;
  } else {
    console.log(
      `ERROR: Owner not found ${event._beneficiary} for NFT ${nftId}`
    );
  }
  nft.tokenURI = item.uri + "/" + issuedId.toString();
  nft.image = item.image;
  nft.metadata = item.metadata;

  const timestamp = BigInt(block.timestamp / 1000);
  nft.createdAt = timestamp;
  nft.updatedAt = timestamp;
  nft.soldAt = null;
  nft.transferredAt = timestamp;

  nft.sales = 0;
  nft.volume = BigInt(0);

  setNFTSearchFields(nft, metadatas, wearables, emotes);

  createOrLoadAccount(accounts, event._beneficiary, NetworkModel.polygon);

  const metric = buildCountFromNFT(nft, counts, NetworkModel.polygon);
  counts.set(metric.id, metric);

  nft.network = NetworkModel.polygon;
  nfts.set(nftId, nft);

  // store mint data
  const minterAddress = event._caller;
  const addresses = getAddresses(Network.MATIC);
  const isStoreMinter = minterAddress === addresses.CollectionStore;

  const mint = new Mint({ id: nftId });
  mint.nft = nft;
  mint.item = item;
  mint.beneficiary = nft.owner.id;
  mint.creator = item.creator;
  mint.minter = minterAddress;
  mint.timestamp = timestamp;
  mint.searchContractAddress = collectionAddress; //@TODO check how this gets saved
  //   mint.searchContractAddress = nft.contractAddress.toString(); //@TODO check how this gets saved
  mint.searchTokenId = nft.tokenId;
  mint.searchItemId = item.blockchainId;
  mint.searchIssuedId = issuedId;
  mint.searchIsStoreMinter = isStoreMinter;

  const fee = storeContractData.fee;
  const feeOwner = storeContractData.feeOwner;

  if (fee === undefined || feeOwner === undefined) {
    console.log("ERROR: Fee or fee owner not found");
    return;
  }

  // count primary sale
  if (isStoreMinter) {
    mint.searchPrimarySalePrice = item.price;
    trackSale(
      storedData,
      inMemoryData,
      SaleType.mint,
      event._beneficiary,
      item.creator,
      item.beneficiary !== ZERO_ADDRESS ? item.beneficiary : item.creator,
      item.id,
      nft.id,
      item.price,
      fee,
      feeOwner,
      BigInt(0),
      timestamp,
      transaction.hash
    );
  }

  mints.set(mint.id, mint);
}

export function handleTransferNFT(
  collectionAddress: string,
  event: TransferEventArgs,
  block: Block,
  storedData: PolygonStoredData
): void {
  const { nfts } = storedData;
  if (event.tokenId.toString() === "") {
    return;
  }

  const id = getNFTId(collectionAddress, event.tokenId.toString());

  const nft = nfts.get(id);
  if (!nft) {
    console.log(`ERROR: NFT not found for transfer ${id}`);
    return;
  }

  const ownerAccount = createOrLoadAccount(
    storedData.accounts,
    event.to,
    NetworkModel.polygon
  );

  const timestamp = BigInt(block.timestamp / 1000);

  nft.owner = ownerAccount;
  nft.updatedAt = timestamp;
  nft.transferredAt = timestamp;

  if (nft.activeOrder && cancelActiveOrder(nft.activeOrder, timestamp)) {
    clearNFTOrderProperties(nft);
  }
}
