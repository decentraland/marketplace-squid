import { BlockData } from "@subsquid/evm-processor";
import { Network } from "@dcl/schemas";
import {
  AddLandEventArgs,
  CreateEstateEventArgs,
  RemoveLandEventArgs,
  UpdateEventArgs,
} from "../../abi/EstateRegistry";
import { DataType, buildData, getNFTId } from "../../common/utils";
import { getAddresses } from "../../common/utils/addresses";
import { Account, Category, Data, Estate, NFT, Parcel } from "../../model";
import { createOrLoadAccount } from "../../common/utils/account";
import { Coordinate } from "../../types";
import { getAdjacentToRoad, getDistanceToPlaza } from "../LANDs/utils";

export type EstateEvents =
  | CreateEstateEventArgs
  | AddLandEventArgs
  | RemoveLandEventArgs
  | UpdateEventArgs;

export function handleCreateEstate(
  block: BlockData,
  event: CreateEstateEventArgs,
  nfts: Map<string, NFT>,
  estates: Map<string, Estate>,
  accounts: Map<string, Account>,
  datas: Map<string, Data>
): void {
  const { _data, _estateId, _owner } = event;
  const addresses = getAddresses(Network.ETHEREUM);

  const id = getNFTId(
    Category.estate,
    addresses.EstateRegistry,
    _estateId.toString()
  );

  const estate = new Estate({ id });

  estate.tokenId = _estateId;
  const owner = accounts.get(_owner);
  if (owner) {
    estate.owner = owner; // @TODO: Check if all the estates have owners later on
  }
  estate.rawData = _data;
  estate.parcelDistances = [];
  estate.size = 0;
  estate.adjacentToRoadCount = 0;

  const estateData = buildData(id, _data, DataType.ESTATE);
  if (estateData) {
    estate.data = estateData;
    datas.set(estateData.id, estateData);

    const nft = nfts.get(id) || new NFT({ id });
    nft.name = estateData.name;
    nft.searchText = estateData.name?.toLowerCase();

    nft.createdAt = BigInt(block.header.timestamp / 1000);
    nft.updatedAt = BigInt(block.header.timestamp / 1000);
    nft.searchDistanceToPlaza = -1;
    nft.searchAdjacentToRoad = false;
    nft.soldAt = null;
    nft.sales = 0;
    nft.volume = BigInt(0);
    nfts.set(id, nft);
  } else {
    console.log(`ERROR: estateData not found for estate ${id}`);
  }

  estates.set(id, estate);

  createOrLoadAccount(accounts, _owner);
}

export function handleAddLand(
  event: AddLandEventArgs,
  estates: Map<string, Estate>,
  nfts: Map<string, NFT>,
  parcels: Map<string, Parcel>,
  accounts: Map<string, Account>,
  coordinates: Map<bigint, Coordinate>
): void {
  const { _estateId, _landId } = event;
  const estateId = _estateId.toString();
  const landId = _landId.toString();

  const addresses = getAddresses(Network.ETHEREUM);
  const id = getNFTId(Category.estate, addresses.EstateRegistry, estateId);
  const parcelId = getNFTId(Category.parcel, addresses.LANDRegistry, landId);

  const estate = estates.get(id);

  if (estate && estate.size !== undefined && estate.size !== null) {
    // @TODO: fix this ugly check
    estate.size += 1;
  } else {
    console.log(`estate not found to increase size in handleAddLand!: ${id}`);
    // @todo WARN
  }

  const estateNFT = nfts.get(id);
  if (estateNFT && estate) {
    estateNFT.searchEstateSize = estate.size;
  }

  let parcel = parcels.get(parcelId);

  if (parcel == null) {
    // Would expect that this isn't needed, but it is here for safety, since failing at block 6,000,000 slows down iterative testing
    const coords = coordinates.get(_landId);

    parcel = new Parcel({ id: parcelId });
    if (coords) {
      parcel.x = coords._0;
      parcel.y = coords._1;
    }
    parcel.tokenId = event._landId;
  }

  parcel.owner = addresses.EstateRegistry;
  parcel.estate = estates.get(id);

  //   let parcelNFT = new NFT({parcelId});
  const parcelNFT = nfts.get(parcelId);
  if (parcelNFT) {
    parcelNFT.searchParcelEstateId = id;
    const estateRegistryAccount = createOrLoadAccount(
      accounts,
      addresses.EstateRegistry
    );
    parcelNFT.owner = estateRegistryAccount;
  }

  if (!!estateNFT && !!estate) {
    // @TODO check why && estate.parcelDistances is needed
    estate.parcelDistances = getParcelDistances(parcel, estate.parcelDistances);

    const adjacentToRoad = getAdjacentToRoad(parcel!);
    if (
      adjacentToRoad &&
      estate.adjacentToRoadCount !== undefined &&
      estate.adjacentToRoadCount !== null
    ) {
      estate.adjacentToRoadCount += 1;
    }

    const distances = estate.parcelDistances!;
    estateNFT.searchDistanceToPlaza = distances.length ? distances[0] : -1;
    estateNFT.searchAdjacentToRoad =
      estateNFT.searchAdjacentToRoad || adjacentToRoad;
  }
}

export function handleRemoveLand(
  event: RemoveLandEventArgs,
  estates: Map<string, Estate>,
  nfts: Map<string, NFT>,
  parcels: Map<string, Parcel>,
  accounts: Map<string, Account>,
  coordinates: Map<bigint, Coordinate>
): void {
  const { _estateId, _landId, _destinatary } = event;
  const estateId = _estateId.toString();
  const landId = _landId.toString();

  const addresses = getAddresses(Network.ETHEREUM);

  const id = getNFTId(Category.estate, addresses.EstateRegistry, estateId);
  const parcelId = getNFTId(Category.parcel, addresses.LANDRegistry, landId);

  let estate = estates.get(id);

  if (estate && estate.size) {
    // @TODO check why && estate.size is needed, try to put at mandatory and start in -1
    estate.size -= 1;
  }

  const estateNFT = nfts.get(id);
  if (estateNFT && estate) {
    estateNFT.searchEstateSize = estate.size;
  }

  let parcel = parcels.get(parcelId);

  // Would expect that this isn't needed, but it is here for safety, since failing at block 6,000,000 slows down iterative testing
  // Because if land parcel doesn't exist, we get a crashed node
  if (parcel == null) {
    // let coordinates = decodeTokenId(event.params._landId);
    const coords = coordinates.get(_landId);

    parcel = new Parcel({ id: parcelId });
    if (coords) {
      parcel.x = coords._0;
      parcel.y = coords._1;
    }
    parcel.tokenId = _landId;
  }

  const owner = accounts.get(_destinatary);
  if (owner) {
    parcel.owner = owner;
  }
  parcel.estate = null;

  const parcelNFT = nfts.get(parcelId) || new NFT({ id: parcelId });
  if (parcelNFT && owner) {
    parcelNFT.searchParcelEstateId = null;
    parcelNFT.owner = owner;
    nfts.set(parcelId, parcelNFT);
  }

  if (estateNFT != null && estate != null) {
    if (shouldRecalculateMinDistance(parcel, estate, estateNFT)) {
      // parcelDistances is an ordered array, so we just need to remove the first element
      let distances = estate.parcelDistances!;
      distances.shift();
      estate.parcelDistances = distances;

      estateNFT.searchDistanceToPlaza = distances[0] || -1;
    }

    let adjacentToRoad = getAdjacentToRoad(parcel!);
    if (adjacentToRoad && estate.adjacentToRoadCount) {
      // @TODO: check why && estate.adjacentToRoadCount is needed
      estate.adjacentToRoadCount -= 1;

      estateNFT.searchAdjacentToRoad = estate.adjacentToRoadCount > 0;
    }
  }
}

export function handleUpdate(
  event: UpdateEventArgs,
  block: BlockData,
  estates: Map<string, Estate>,
  nfts: Map<string, NFT>,
  datas: Map<string, Data>
): void {
  // TODO: Code really similar to handleCreateEstate
  const { _assetId, _data } = event;
  const estateId = _assetId.toString();
  const data = _data.toString();
  const addresses = getAddresses(Network.ETHEREUM);

  const id = getNFTId(Category.estate, addresses.EstateRegistry, estateId);

  const estate = estates.get(id) || new Estate({ id });
  estate.rawData = data;

  const estateData = buildData(id, data, DataType.ESTATE);
  if (estateData) {
    estate.data = estateData;
    datas.set(estateData.id, estateData);
    let nft = nfts.get(id);
    if (!nft) {
      console.log(
        `id not found ${id} for NFT in the event: ${event._assetId.toString()}, ${
          event._data
        }`
      );
      nft = new NFT({ id });
    }
    nft.name = estateData.name;
    nft.searchText = estateData.name?.toLowerCase();
    nft.updatedAt = BigInt(block.header.timestamp / 1000);

    nfts.set(id, nft);
  } else {
    console.log(`estateData not found for estate ${id}`);
  }

  estates.set(id, estate);
}

export function getParcelDistances(
  parcel: Parcel | null,
  parcelDistances?: Array<number> | null
): Array<number> {
  let newDistances = parcelDistances || [];

  if (parcel == null) {
    return newDistances!;
  }

  let distance = getDistanceToPlaza(parcel!);
  if (distance == -1) {
    return newDistances!;
  }

  newDistances.push(distance);
  newDistances.sort((a, b) => a - b);
  return newDistances!;
}

export function shouldRecalculateMinDistance(
  deletedParcel: Parcel | null,
  estate: Estate | null,
  estateNFT: NFT | null
): boolean {
  if (
    deletedParcel == null ||
    estate == null ||
    estateNFT == null ||
    estate.parcelDistances == null ||
    estate.parcelDistances.length == 0
  ) {
    return false;
  }

  let distance = getDistanceToPlaza(deletedParcel!);
  let distances = estate.parcelDistances!;
  if (distance == -1 || distances[0] != distance) {
    return false;
  }

  return true;
}

export const isCreateEstateEvent = (
  event: EstateEvents
): event is CreateEstateEventArgs =>
  "_data" in event && "_estateId" in event && !!event._owner;

export const isAddLandEvent = (
  event: EstateEvents
): event is AddLandEventArgs => "_estateId" in event && "_landId" in event;

export const isRemoveLandEvent = (
  event: EstateEvents
): event is RemoveLandEventArgs =>
  "_estateId" in event && "_landId" in event && "_destinatary" in event;

export const isUpdateEvent = (event: EstateEvents): event is UpdateEventArgs =>
  "_assetId" in event &&
  "_holder" in event &&
  "_operator" in event &&
  "_data" in event;
