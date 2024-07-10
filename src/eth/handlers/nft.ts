import { BlockData } from "@subsquid/evm-processor";
import { TransferEventArgs_2 } from "../../abi/ERC721";
import {
  Account,
  Category,
  Count,
  ENS,
  Estate,
  NFT,
  Order,
  Parcel,
  Wearable,
  Network as ModelNetwork,
} from "../../model";
import { Network } from "@dcl/schemas";
import { bigint } from "../../model/generated/marshal";
import {
  buildEstateFromNFT,
  buildParcelFromNFT,
  getAdjacentToRoad,
  getDistanceToPlaza,
  getEstateImage,
  getParcelImage,
  getParcelText,
  isInBounds,
} from "../../eth/LANDs/utils";
import { Coordinate } from "../../types";
import {
  buildWearableFromNFT,
  getWearableImage,
} from "../../eth/modules/wearable";
import { buildENSFromNFT } from "../../eth/modules/ens";
import { buildCountFromNFT } from "../../eth/modules/count";
import { getAddresses } from "../../common/utils/addresses";
import { getCategory } from "../../common/utils/category";
import {
  cancelActiveOrder,
  clearNFTOrderProperties,
  getNFTId,
  isMint,
} from "../../common/utils";
import {
  createAccount,
  createOrLoadAccount,
} from "../../common/modules/account";
import {
  isWearableAccessory,
  isWearableHead,
} from "../../common/modules/metadata/wearable";

export function handleTransfer(
  block: BlockData,
  contractAddress: string,
  event: TransferEventArgs_2,
  accounts: Map<string, Account>,
  counts: Map<string, Count>,
  nfts: Map<string, NFT>,
  parcels: Map<string, Parcel>,
  estates: Map<string, Estate>,
  wearables: Map<string, Wearable>,
  orders: Map<string, Order>,
  ensMap: Map<string, ENS>,
  tokenURIs: Map<string, string>,
  coordinates: Map<bigint, Coordinate>
): { nft?: NFT; parcel?: Parcel; account?: Account } {
  const addresses = getAddresses(Network.ETHEREUM);
  const { tokenId, to, from } = event;

  if (tokenId.toString() === "") {
    return {};
  }

  const category = getCategory(Network.ETHEREUM, contractAddress);
  const id = getNFTId(contractAddress, tokenId.toString(), category);

  let nft = nfts.get(id);

  if (!nft) {
    nft = new NFT({ id });
    nft.network = ModelNetwork.ethereum;
    nfts.set(id, nft);
  }

  let toAccount = accounts.get(`${to}-${ModelNetwork.ethereum}`);
  if (!toAccount) {
    toAccount = createAccount(to);
    accounts.set(`${to}-${ModelNetwork.ethereum}`, toAccount);
  }

  const timestamp = BigInt(block.header.timestamp / 1000);

  nft.tokenId = tokenId;
  nft.owner = toAccount;
  nft.contractAddress = Buffer.from(contractAddress.slice(2), "hex");
  nft.category = category as Category;
  nft.updatedAt = timestamp;
  nft.soldAt = null;
  nft.transferredAt = timestamp;
  nft.sales = 0;
  nft.volume = bigint.fromJSON("0");

  if (
    contractAddress !== addresses.LANDRegistry &&
    contractAddress !== addresses.EstateRegistry &&
    contractAddress !== addresses.DCLRegistrar
  ) {
    // The LANDRegistry/EstateRegistry/DCLRegistrar contracts do not have a tokenURI method
    if (!nft.tokenURI) {
      nft.tokenURI = tokenURIs.get(`${contractAddress}-${tokenId}`);
    }
  } else {
    if (contractAddress === addresses.LANDRegistry) {
      nft.tokenURI = null;
    } else {
      // this is just to accomplish the same behavior as the original subgraph code
      nft.tokenURI = "";
    }
  }

  if (isMint(from)) {
    nft.createdAt = timestamp;
    // We're defaulting "Estate size" to one to allow the frontend to search for `searchEstateSize_gt: 0`,
    // necessary because thegraph doesn't support complex queries and we can't do `OR` operations
    nft.searchEstateSize = 1;
    // We default the "in bounds" property for parcels and no-parcels alike so we can just add  `searchParcelIsInBounds: true`
    // to all queries
    nft.searchParcelIsInBounds = true;
    nft.searchText = "";
    nft.searchIsLand = false;

    const metric = buildCountFromNFT(nft, counts);
    counts.set(metric.id, metric);
  } else {
    const existingNFT = nfts.get(id);
    if (existingNFT) {
      const nftActiveOrder = existingNFT.activeOrder;
      if (nftActiveOrder) {
        const order = orders.get(nftActiveOrder.id);
        if (order) {
          cancelActiveOrder(order, timestamp);
          clearNFTOrderProperties(nft!);
        } else {
          console.log(`ERROR: Order not found ${nftActiveOrder.id}`);
        }
      }
    } else {
      console.log(`ERROR: NFT not found ${id} in handleTransfer`);
    }
  }

  if (category == Category.parcel) {
    let parcel = parcels.get(id);
    if (isMint(from)) {
      const coords = coordinates.get(tokenId);
      if (coords) {
        parcel = buildParcelFromNFT(nft, coords);
        nft.parcel = parcel;
        nft.image = getParcelImage(parcel);
        nft.searchIsLand = true;
        nft.searchParcelIsInBounds = isInBounds(parcel.x, parcel.y);
        nft.searchParcelX = parcel.x;
        nft.searchParcelY = parcel.y;
        nft.searchDistanceToPlaza = getDistanceToPlaza(parcel);
        nft.searchAdjacentToRoad = getAdjacentToRoad(parcel);
        nft.searchText = getParcelText(parcel, "");
      }
    } else {
      if (parcel) parcel.owner = nft.owner;
    }
    if (parcel) parcels.set(id, parcel);
  } else if (category == Category.estate) {
    let estate = estates.get(id);
    if (isMint(from)) {
      estate = buildEstateFromNFT(nft);
      nft.estate = estate;
      nft.image = getEstateImage(estate);
      nft.searchIsLand = true;
      nft.searchDistanceToPlaza = -1;
      nft.searchAdjacentToRoad = false;
      nft.searchEstateSize = estate.size;
    } else {
      if (estate) estate.owner = nft.owner;
    }
    if (estate) estates.set(id, estate);
  } else if (category == Category.wearable) {
    let wearable: Wearable | undefined = undefined;
    if (isMint(from)) {
      wearable = buildWearableFromNFT(nft);
      if (!!wearable.id) {
        nft.wearable = wearable;
        nft.name = wearable.name;
        nft.image = getWearableImage(wearable);
        nft.searchIsWearableHead = isWearableHead(wearable.category);
        nft.searchIsWearableAccessory = isWearableAccessory(wearable.category);
        nft.searchWearableCategory = wearable.category;
        nft.searchWearableBodyShapes = wearable.bodyShapes;
        nft.searchWearableRarity = wearable.rarity;
        nft.searchText = wearable.name.toLowerCase();
      }
    } else {
      const existingWearable = wearables.get(id);
      if (existingWearable) {
        wearable = new Wearable({ id: nft.id });
        wearable.network = ModelNetwork.ethereum;
        wearable = existingWearable;
        wearable.owner = nft.owner;
      } else {
        console.log(`ERROR: Wearable not found ${id}`);
      }
    }
    if (wearable) wearables.set(id, wearable);
  } else if (category == Category.ens) {
    let ens: ENS | undefined = undefined;
    if (isMint(from)) {
      ens = buildENSFromNFT(nft);
      nft.ens = ens;
    } else {
      const existingENS = ensMap.get(id);

      if (existingENS) {
        ens = existingENS;
        ens.owner = nft.owner;
      } else {
        console.log(`ERROR: ENS not found ${id}`);
      }
    }
    if (ens) ensMap.set(id, ens);
  }

  createOrLoadAccount(accounts, to);

  return { nft, account: toAccount };
}
