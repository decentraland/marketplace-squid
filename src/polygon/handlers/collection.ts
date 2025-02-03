import { Network } from "@dcl/schemas";
import { getURNForCollectionV2 } from "../../common/utils/network";
import { createOrLoadAccount } from "../../common/modules/account";
import {
  buildCountFromCollection,
  buildCountFromItem,
} from "../../common/modules/count";
import {
  Collection,
  Curation,
  Item,
  Network as ModelNetwork,
  Rarity,
} from "../../model";
import * as CollectionV2ABI from "../abi/CollectionV2";
import * as MarketplaceV3ABI from "../abi/DecentralandMarketplacePolygon";
import * as RaritiesWithOracleABI from "../abi/RaritiesWithOracle";
import { Block, Context } from "../processor";
import { PolygonInMemoryState, PolygonStoredData } from "../types";
import { getAddresses } from "../../common/utils/addresses";
import { getItemId, getItemImage, removeItemMinter } from "../modules/item";
import { getURNForWearableV2 } from "../modules/metadata/wearable";
import { buildItemMetadata, setItemSearchFields } from "../modules/metadata";
import { getOrCreateAnalyticsDayData } from "../../common/modules/analytics";
import {
  getBlockWhereRescueItemsStarted,
  getCurationId,
} from "../modules/curation";
import { Log, Transaction } from "@subsquid/evm-processor";
import { handleMintNFT, handleTransferNFT } from "./nft";
import { isMint } from "../../common/utils";
import { StoreContractData } from "../state";

export const handleCollectionCreation = async (
  ctx: Context,
  block: Block,
  address: string,
  storedData: PolygonStoredData
) => {
  const { collections, counts } = storedData;
  const collectionContract = new CollectionV2ABI.Contract(ctx, block, address);
  const timestamp = BigInt(block.timestamp / 1000);
  //   console.log("getting collection data");
  const [
    name,
    symbol,
    owner,
    creator,
    isCompleted,
    isApproved,
    isEditable,
    baseURI,
    chainId,
  ] = await Promise.all([
    collectionContract.name(),
    collectionContract.symbol(),
    collectionContract.owner(),
    collectionContract.creator(),
    collectionContract.isCompleted(),
    collectionContract.isApproved(),
    collectionContract.isEditable(),
    collectionContract.baseURI(),
    collectionContract.getChainId(),
  ]); // @TODO check if multicall would be possible

  //   console.log("all gotten");
  collections.set(
    address,
    new Collection({
      id: address,
      name,
      symbol,
      owner,
      creator,
      isCompleted,
      isApproved,
      isEditable,
      minters: [],
      managers: [],
      urn: getURNForCollectionV2(Network.MATIC, address),
      itemsCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      reviewedAt: timestamp,
      searchIsStoreMinter: false,
      searchText: name.toLowerCase(),
      baseURI,
      chainId,
      network: ModelNetwork.POLYGON,
    })
  );
  const metric = buildCountFromCollection(counts);
  counts.set(metric.id, metric);

  const creatorAccount = createOrLoadAccount(
    storedData.accounts,
    creator,
    ModelNetwork.POLYGON
  );
  creatorAccount.collections += 1;
};

export function handleSetGlobalMinter(
  collectionAddress: string,
  event: CollectionV2ABI.SetGlobalMinterEventArgs,
  block: Block,
  storedData: PolygonStoredData
): void {
  const { collections, items } = storedData;
  const addresses = getAddresses(Network.MATIC);
  const storeAddress = addresses.CollectionStore;

  const minterAddress = event._minter; //@TODO check this
  //   let minterAddress = event._minter.toHexString(); //@TODO check this

  const collection = collections.get(collectionAddress);

  if (!collection) {
    console.log(
      `ERROR: Collection not found in handleSetGlobalMinter: ${collectionAddress}`
    );
    return;
  }

  const minters = collection.minters;

  if (event._value && minters !== null) {
    minters.push(minterAddress);
    collection.minters = minters;

    // set flag on collection
    if (minterAddress === storeAddress) {
      collection.searchIsStoreMinter = true;

      if (!collection.firstListedAt) {
        collection.firstListedAt = BigInt(block.timestamp / 1000);
      }

      // loop over all items and set flag
      const itemCount = collection.itemsCount;
      for (let i = 0; i < itemCount; i++) {
        const itemId = getItemId(collectionAddress, i.toString());
        // let item = Item.load(itemId);
        const item = items.get(itemId);
        if (item) {
          item.searchIsStoreMinter = true;

          if (!item.firstListedAt) {
            item.firstListedAt = BigInt(block.timestamp / 1000);
          }
        } else {
          console.log(`ERROR: Item not found: ${itemId}`);
        }
      }
    }
  } else {
    const newMinters = new Array<string>(0);

    for (let i = 0; i < minters.length; i++) {
      if (minters[i] !== event._minter) {
        newMinters.push(minters[i]);
      }
    }

    // unset flag on collection
    if (minterAddress === storeAddress) {
      collection.searchIsStoreMinter = false;
      // loop over all items and unset flag (only if store is not an item minter)
      const itemCount = collection.itemsCount;
      for (let i = 0; i < itemCount; i++) {
        const itemId = getItemId(collectionAddress, i.toString());
        const item = items.get(itemId);
        if (item) {
          // check if store is item minter
          let isStoreItemMinter = false;
          const itemMinters = item.minters;
          for (let j = 0; j < item.minters.length; j++) {
            if (storeAddress == itemMinters[i]) {
              isStoreItemMinter = true;
            }
          }
          // set flag only if store is item minter, otherwise unset it
          item.searchIsStoreMinter = isStoreItemMinter;
        } else {
          console.log(`ERROR: Item not found: ${itemId}`);
        }
      }
    }

    collection.minters = newMinters;
  }
}

export function handleSetGlobalManager(
  collectionAddress: string,
  event: CollectionV2ABI.SetGlobalManagerEventArgs,
  storedData: PolygonStoredData
): void {
  const { collections } = storedData;
  const collection = collections.get(collectionAddress);

  if (!collection) {
    console.log(
      `ERROR: Collection not found in handleSetGlobalManager: ${collectionAddress}`
    );
    return;
  }

  const managers = collection.managers;

  if (event._value === true && managers !== null) {
    managers.push(event._manager);
    collection.managers = managers;
  } else {
    let newManagers = new Array<string>(0);

    for (let i = 0; i < managers.length; i++) {
      if (managers[i] != event._manager) {
        newManagers.push(managers[i]);
      }
    }

    collection.managers = newManagers;
  }
}

export function handleSetItemMinter(
  collectionAddress: string,
  event: CollectionV2ABI.SetItemMinterEventArgs,
  block: Block,
  storedData: PolygonStoredData
): void {
  const { items, collections } = storedData;
  const addresses = getAddresses(Network.MATIC);
  const storeAddress = addresses.CollectionStore;
  const minterAddress = event._minter;
  const itemId = event._itemId.toString();
  const id = getItemId(collectionAddress, itemId);

  const item = items.get(id);
  if (!item) {
    console.log(`ERROR: Item not found in handleSetItemMinter: ${id}`);
    return;
  }

  let minters = item.minters;

  if (event._value > BigInt(0)) {
    minters.push(minterAddress);
    item.minters = minters;
    // if minter is store address, set flag
    if (minterAddress === storeAddress) {
      item.searchIsStoreMinter = true;

      if (!item.firstListedAt) {
        item.firstListedAt = BigInt(block.timestamp / 1000);
      }
    }
  } else {
    // item.minters = removeItemMinter(item, minterAddress);
    item.minters = item.minters.filter((m) => m != minterAddress);
    // if minter is store address, unset flag, but only if store is not global minter
    const collection = collections.get(item.collection.id);
    if (!collection) {
      console.log(
        `ERROR: Collection not found in handleSetItemMinter: ${item.collection.id}`
      );
    }
    if (
      collection != null &&
      !collection.searchIsStoreMinter &&
      minterAddress == storeAddress
    ) {
      item.searchIsStoreMinter = false;
    }
  }
}

export function handleSetItemManager(
  collectionAddress: string,
  event: CollectionV2ABI.SetItemManagerEventArgs,
  storedData: PolygonStoredData
): void {
  const { items } = storedData;
  let itemId = event._itemId.toString();
  let id = getItemId(collectionAddress, itemId);

  let item = items.get(id);
  if (!item) {
    console.log(`ERROR: Item not found in handleSetItemManager: ${id}`);
    return;
  }

  let managers = item.managers;

  if (event._value === true && managers !== null) {
    managers.push(event._manager);
    // managers.push(event._manager.toHexString());
    item.managers = managers;
  } else {
    // let newManagers = new Array<string>(0);

    // for (let i = 0; i < managers.length; i++) {
    //   if (managers[i] !== event._manager) {
    //     newManagers.push(managers[i]);
    //   }
    // }

    // item.managers = newManagers;
    item.managers = item.managers.filter((m) => m != event._manager);
  }

  //   item.save();
}

export async function handleAddItem(
  ctx: Context,
  block: Block,
  collectionAddress: string,
  event: CollectionV2ABI.AddItemEventArgs,
  storedData: PolygonStoredData,
  rarities: Map<string, Rarity>
): Promise<void> {
  const {
    collections,
    metadatas,
    wearables,
    emotes,
    analytics,
    counts,
    items,
  } = storedData;
  const collection = collections.get(collectionAddress);

  if (!collection) {
    // Skip it, collection will be set up once the proxy event is created
    // The ProxyCreated event is emitted right after the collection's event
    console.log(
      `ERROR: Collection not found in handleAddItem: ${collectionAddress}`
    );
    return;
  }

  // Count item
  collection.itemsCount += 1;

  // Bind contract
  const collectionContract = new CollectionV2ABI.Contract(
    ctx,
    block,
    collectionAddress
  );

  const contractItem = event._item;
  const itemId = event._itemId.toString();

  const id = getItemId(collectionAddress, itemId.toString());
  const rarity = rarities.get(contractItem.rarity);
  if (!rarity) {
    console.log(`ERROR: Rarity not found: ${contractItem.rarity}`);
  }

  let creationFee = BigInt(0);

  if (!rarity) {
    console.log(
      `ERROR: Undefined rarity ${
        contractItem.rarity
      } for collection ${collectionAddress} and item ${itemId.toString()}`
    );
  } else {
    creationFee = rarity.price;

    if (rarity.currency === "USD") {
      const addresses = getAddresses(Network.MATIC);
      const raritiesWithOracle = new RaritiesWithOracleABI.Contract(
        ctx,
        block,
        addresses.RaritiesWithOracle
      );
      const result = await raritiesWithOracle.getRarityByName(rarity.name); // @TODO save this in state

      creationFee = result.price;
    }
  }

  const item = new Item({ id });
  item.network = ModelNetwork.POLYGON;
  item.creator = collection.creator;
  item.blockchainId = event._itemId;
  item.collection = collection;
  //   item.collection = collectionAddress;
  item.creationFee = creationFee;
  item.rarity = contractItem.rarity;
  item.available = contractItem.maxSupply;
  item.totalSupply = contractItem.totalSupply;
  item.maxSupply = contractItem.maxSupply;
  item.price = contractItem.price;
  item.beneficiary = contractItem.beneficiary;
  //   item.beneficiary = contractItem.beneficiary.toHexString();
  item.contentHash = contractItem.contentHash;
  item.rawMetadata = contractItem.metadata;
  //   console.log("getting is approved");
  //   item.searchIsCollectionApproved = await collectionContract.isApproved();
  //   console.log(
  //     "item.searchIsCollectionApproved: ",
  //     item.searchIsCollectionApproved
  //   );
  const baseURI = collection.baseURI;
  const chainId = collection.chainId.toString();

  //   item.uri =
  //     // (await collectionContract.baseURI()) +
  //     // (await collectionContract.getChainId()).toString() +
  //     "/" +
  //     collectionAddress +
  //     "/" +
  //     itemId;

  item.uri = `${baseURI}${chainId}/${collectionAddress}/${itemId}`;
  //   console.log("item.uri: ", item.uri);
  item.urn = getURNForWearableV2(
    collectionAddress,
    itemId.toString(),
    Network.MATIC
  );
  item.image = getItemImage(item);
  item.minters = [];
  item.managers = [];
  item.searchIsStoreMinter = false;

  const timestamp = BigInt(block.timestamp / 1000);
  item.createdAt = timestamp;
  item.updatedAt = timestamp;
  item.reviewedAt = timestamp;
  item.soldAt = null;
  item.sales = 0;
  item.volume = BigInt(0);
  item.uniqueCollectors = [];
  item.uniqueCollectorsTotal = 0;

  const metadata = buildItemMetadata(item, metadatas, wearables, emotes);
  metadatas.set(id, metadata);

  item.metadata = metadata;
  item.itemType = metadata.itemType;

  setItemSearchFields(item, metadatas, wearables, emotes);
  //   item.save();

  const count = buildCountFromItem(counts);
  count.daoEarningsManaTotal = count.daoEarningsManaTotal + creationFee;

  // tracks the number of items created by the creator and fees to DAO
  const analyticsDayData = getOrCreateAnalyticsDayData(
    timestamp,
    analytics,
    ModelNetwork.POLYGON
  );
  analyticsDayData.daoEarnings = analyticsDayData.daoEarnings + creationFee;
  //   console.log("analyticsDayData.id: ", analyticsDayData.id);
  //   console.log("creationFee in handleAddItem: ", creationFee);
  //   console.log("analyticsDayData.daoEarnings: ", analyticsDayData.daoEarnings);

  analytics.set(analyticsDayData.id, analyticsDayData);

  items.set(id, item);
  //   analyticsDayData.save();
}

export function handleRescueItem(
  event: CollectionV2ABI.RescueItemEventArgs,
  block: Block,
  log: Log & { transactionHash: string },
  transaction: Transaction & { input: string },
  storedData: PolygonStoredData,
  inMemoryData: PolygonInMemoryState
): void {
  const { curations } = inMemoryData;
  const { accounts, collections, items, metadatas, wearables, emotes } =
    storedData;
  const collectionAddress = log.address;
  const itemId = event._itemId.toString();
  const id = getItemId(collectionAddress, itemId);
  const timestamp = BigInt(block.timestamp / 1000);

  const item = items.get(id);
  let isNewContent = false;
  if (item) {
    isNewContent = item.contentHash != event._contentHash;

    item.rawMetadata = event._metadata;
    item.contentHash = event._contentHash;

    let metadata = buildItemMetadata(item, metadatas, wearables, emotes);

    item.metadata = metadata;
    item.itemType = metadata.itemType;

    setItemSearchFields(item, metadatas, wearables, emotes);
    item.updatedAt = timestamp;
  } else {
    console.log(`ERROR: Item not found in handleRescueItem: ${id}`);
    return;
  }

  const collection = collections.get(collectionAddress);

  if (collection) {
    collection.updatedAt = timestamp;
    collection.reviewedAt = timestamp;
    // collection.save();
  } else {
    console.log(
      `ERROR: Collection not found in handleRescueItem: ${collectionAddress}`
    );
    return;
  }

  const blockWhereRescueItemsStarted = getBlockWhereRescueItemsStarted();
  if (isNewContent && BigInt(block.height) >= blockWhereRescueItemsStarted) {
    // @TODO check this out
    // Create curation
    const txInput = transaction.input;
    // console.log("transaction inside handler: ", transaction);
    // console.log("transaction.hash: ", transaction.hash);
    // console.log("txInput: ", txInput);
    // forwardMetaTx(address _target, bytes calldata _data) or manageCollection(address,address,address,bytes[]) selector
    if (txInput.startsWith("0x07bd3522") || txInput.startsWith("0x81c9308e")) {
      let curationId = getCurationId(
        collectionAddress,
        transaction.hash,
        log.logIndex.toString()
      );

      const curation = new Curation({ id: curationId });
      let curator = "";
      if (txInput.startsWith("0x81c9308e")) {
        // manageCollection(address,address,address,bytes[]) selector
        curator = transaction.from;
      } else {
        // executeMetaTransaction(address,bytes,bytes32,bytes32,uint8) selector
        const index = txInput.indexOf("0c53c51c");

        // Sender is the first parameter of the executeMetaTransaction
        curator = "0x" + txInput.substr(index + 32, 40);
      }

      curation.collection = collection;
      curation.item = item;
      curation.isApproved = true;
      curation.txHash = Buffer.from(transaction.hash.slice(2), "hex");
      curation.timestamp = timestamp;

      curations.set(curationId, curation);

      // Increase total curations
      let account = createOrLoadAccount(
        accounts,
        curator,
        ModelNetwork.POLYGON
      );

      curation.curator = account;

      if (
        account.totalCurations !== undefined &&
        account.totalCurations !== null
      ) {
        // hack since in ETH we dont have this field
        account.totalCurations += 1;
      }
    }
  }
}

export function handleUpdateItemData(
  collectionAddress: string,
  event: CollectionV2ABI.UpdateItemDataEventArgs,
  block: Block,
  storedData: PolygonStoredData
): void {
  const { items, metadatas, wearables, emotes } = storedData;
  //   let collectionAddress = event.address.toHexString();
  const itemId = event._itemId.toString();
  const id = getItemId(collectionAddress, itemId);
  const item = items.get(id);
  if (item) {
    item.price = event._price;
    item.beneficiary = event._beneficiary;
    item.rawMetadata = event._metadata;

    const metadata = buildItemMetadata(item, metadatas, wearables, emotes);

    item.metadata = metadata;
    item.itemType = metadata.itemType;
    setItemSearchFields(item, metadatas, wearables, emotes);

    const timestamp = BigInt(block.timestamp / 1000);
    item.updatedAt = timestamp;
  } else {
    console.log(`Error: Item not found in handleUpdateItemData: ${id}`);
  }
}

export function encodeTokenId(itemId: number, issuedId: number): bigint {
  const MAX_ITEM_ID = BigInt("0xFFFFFFFFFF"); // 40 bits max value
  const MAX_ISSUED_ID = BigInt(
    "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
  ); // 216 bits max value

  if (BigInt(itemId) > MAX_ITEM_ID) {
    throw new Error("encodeTokenId: INVALID_ITEM_ID");
  }

  if (BigInt(issuedId) > MAX_ISSUED_ID) {
    throw new Error("encodeTokenId: INVALID_ISSUED_ID");
  }

  // Shift the itemId left by 216 bits and OR it with issuedId
  return (BigInt(itemId) << BigInt(216)) | BigInt(issuedId);
}

export async function handleIssue(
  ctx: Context,
  collectionAddress: string,
  event: CollectionV2ABI.IssueEventArgs,
  block: Block,
  transaction: Transaction & { input: string },
  storedData: PolygonStoredData,
  inMemoryData: PolygonInMemoryState,
  storeContractData: StoreContractData,
  tradedEvent?: MarketplaceV3ABI.TradedEventArgs
): Promise<void> {
  const { items } = storedData;
  const itemId = event._itemId.toString();
  const id = getItemId(collectionAddress, itemId);

  const item = items.get(id);

  if (item) {
    item.available = item.available - BigInt(1);
    item.totalSupply = item.totalSupply + BigInt(1);
    await handleMintNFT(
      ctx,
      event,
      block,
      transaction,
      collectionAddress,
      item,
      storedData,
      inMemoryData,
      storeContractData,
      tradedEvent
    );
  } else {
    console.log(`ERROR: Item not found in handleIssue: ${id}`);
  }

  // Bind contract
  //   let collectionContract = CollectionContract.bind(event.address);
  //   const collectionContract = new CollectionV2ABI.Contract(
  //     ctx,
  //     block,
  //     collectionAddress
  //   );
  //   const collection = collectionContract.getCollection();
  const isGlobalMinter = item?.collection.minters.includes(event._caller);
  //   console.log('isGlobalMinter: ', isGlobalMinter);

  if (isGlobalMinter) {
    return;
  }

  //   const amountOfMintsAvailable = await collectionContract.itemMinters(
  //     event._itemId,
  //     event._caller
  //   );

  //   if (amountOfMintsAvailable === BigInt(0) && !!item) {
  //     let minterAddress = event._caller;
  //     item.minters = removeItemMinter(item, minterAddress);
  //     const addresses = getAddresses(Network.MATIC);
  //     const storeAddress = addresses.CollectionStore;
  //     // unset flag if minter is store
  //     if (minterAddress === storeAddress) {
  //       item.searchIsStoreMinter = false;
  //     }
  //   }
  //   const isGlobalMinter = await collectionContract.globalMinters(event._caller);

  //   if (isGlobalMinter) {
  //     return;
  //   }

  //   const amountOfMintsAvailable = await collectionContract.itemMinters(
  //     event._itemId,
  //     event._caller
  //   );

  //   if (amountOfMintsAvailable === BigInt(0) && !!item) {
  //     let minterAddress = event._caller;
  //     item.minters = removeItemMinter(item, minterAddress);
  //     const addresses = getAddresses(Network.MATIC);
  //     const storeAddress = addresses.CollectionStore;
  //     // unset flag if minter is store
  //     if (minterAddress === storeAddress) {
  //       item.searchIsStoreMinter = false;
  //     }
  //   }
}

export function handleSetApproved(
  //   ctx: Context,
  collectionAddress: string,
  event: CollectionV2ABI.SetApprovedEventArgs,
  block: Block,
  log: Log & { transactionHash: string },
  transaction: Transaction & { input: string },
  storedData: PolygonStoredData
): void {
  const { collections, items, accounts } = storedData;
  const collection = collections.get(collectionAddress);
  const timestamp = BigInt(block.timestamp / 1000);

  if (!collection) {
    console.log(
      `ERROR: Collection not found in handleSetApproved: ${collectionAddress}`
    );
    return;
  }

  collection.isApproved = event._newValue;

  // Bind contract
  //   const collectionContract = new CollectionV2ABI.Contract(
  //     ctx,
  //     block,
  //     collectionAddress
  //   );

  //   console.log("getting items count");
  //   const itemsCount = await collectionContract.itemsCount();
  //   console.log("itemsCount: ", itemsCount);

  for (let i = BigInt(0); i < collection.itemsCount; i = i + BigInt(1)) {
    const id = getItemId(collectionAddress, i.toString());
    const item = items.get(id);
    if (item) {
      item.searchIsCollectionApproved = event._newValue;
      item.reviewedAt = timestamp;
    }
  }

  collection.updatedAt = timestamp; // to support old collections
  collection.reviewedAt = timestamp; // to support old collections
  //   collection.save();

  const rescueBlock = getBlockWhereRescueItemsStarted();
  if (block.height > rescueBlock) {
    // Create curation
    let txInput = transaction.input;
    // forwardMetaTx(address _target, bytes calldata _data) or manageCollection(address,address,address,bytes[]) selector
    if (txInput.startsWith("0x07bd3522") || txInput.startsWith("0x81c9308e")) {
      const curationId = getCurationId(
        collectionAddress,
        transaction.hash,
        log.logIndex.toString()
      );
      const curation = new Curation({ id: curationId });
      let curator = "";
      if (txInput.startsWith("0x81c9308e")) {
        // manageCollection(address,address,address,bytes[]) selector
        curator = transaction.from;
      } else {
        // executeMetaTransaction(address,bytes,bytes32,bytes32,uint8) selector
        const index = BigInt(txInput.indexOf("0c53c51c"));

        // Sender is the first parameter of the executeMetaTransaction
        curator = "0x" + txInput.substr(+(index + BigInt(32)).toString(), 40);
      }

      const curatorAccount = createOrLoadAccount(
        accounts,
        curator,
        ModelNetwork.POLYGON
      );

      curation.curator = curatorAccount;
      curation.collection = collection;
      curation.isApproved = event._newValue;
      curation.txHash = Buffer.from(transaction.hash.slice(2), "hex");
      curation.timestamp = timestamp;

      //   curation.save();

      // Increase total curations
      //   const account = createOrLoadAccount(
      //     accounts,
      //     curator,
      //     ModelNetwork.polygon
      //   );

      // hack since in ETH we dont have this field
      if (
        curatorAccount.totalCurations !== undefined &&
        curatorAccount.totalCurations !== null
      ) {
        curatorAccount.totalCurations += 1;
      }
    }
  }
}

export function handleSetEditable(
  collectionAddress: string,
  event: CollectionV2ABI.SetEditableEventArgs,
  storedData: PolygonStoredData
): void {
  const { collections } = storedData;
  const collection = collections.get(collectionAddress);
  if (collection) {
    collection.isEditable = event._newValue;
  } else {
    console.log(
      `ERROR: Collection not found in handleSetEditable: ${collectionAddress}`
    );
  }
}

export function handleCompleteCollection(
  collectionAddress: string,
  storedData: PolygonStoredData
): void {
  const { collections } = storedData;
  const collection = collections.get(collectionAddress);
  if (collection) {
    collection.isCompleted = true;
  } else {
    console.log(
      `ERROR: Collection not found in handleCompleteCollection: ${collectionAddress}`
    );
  }
}

export function handleTransferCreatorship(
  collectionAddress: string,
  event: CollectionV2ABI.CreatorshipTransferredEventArgs,
  block: Block,
  storedData: PolygonStoredData
): void {
  const { collections, items } = storedData;
  const collection = collections.get(collectionAddress);
  const newCreator = event._newCreator;
  const timestamp = BigInt(block.timestamp / 1000);
  if (collection) {
    collection.creator = newCreator;
    collection.updatedAt = timestamp;
    let itemCount = collection.itemsCount;
    for (let i = 0; i < itemCount; i++) {
      let itemId = getItemId(collection.id, i.toString());
      const item = items.get(itemId);
      if (item) {
        item.creator = newCreator;
        item.updatedAt = timestamp;
      } else {
        console.log(
          `ERROR: Item not found in handleTransferCreatorship: ${itemId}`
        );
      }
    }
  } else {
    console.log(
      `ERROR: Collection not found in handleTransferCreatorship: ${collectionAddress}`
    );
  }
}

export function handleTransferOwnership(
  collectionAddress: string,
  event: CollectionV2ABI.OwnershipTransferredEventArgs,
  block: Block,
  storedData: PolygonStoredData
): void {
  const { collections } = storedData;
  const collection = collections.get(collectionAddress);
  const timestamp = BigInt(block.timestamp / 1000);
  if (collection) {
    collection.owner = event.newOwner;
    collection.updatedAt = timestamp
  } else {
    console.log(
      `ERROR: Collection not found in handleTransferOwnership: ${collectionAddress}`
    );
  }
}

export function handleTransfer(
  collectionAddress: string,
  event: CollectionV2ABI.TransferEventArgs,
  block: Block,
  storedData: PolygonStoredData
): void {
  // Do not compute mints
  if (!isMint(event.from)) {
    handleTransferNFT(collectionAddress, event, block, storedData);
  } else {
    // console.log(`transfer found but not mint, it was from: ${event.from}`);
  }
}
