import { Network } from "@dcl/schemas";
import { UpdateEventArgs } from "../../abi/LANDRegistry";
import { getNFTId } from "../../common/utils/nft";
import { Category, Data, NFT, Parcel } from "../../model";
import { getAddresses } from "../../common/utils/addresses";
import { DataType, buildData } from "../../common/utils";
import { Coordinate } from "../../types";
import { getParcelText } from "../LANDs/utils";
import { BlockData } from "@subsquid/evm-processor";

export function handleUpdate(
  event: UpdateEventArgs,
  block: BlockData,
  parcels: Map<string, Parcel>,
  nfts: Map<string, NFT>,
  coordinates: Map<bigint, Coordinate>,
  datas: Map<string, Data>
): void {
  const { assetId, data } = event;
  const parcelId = assetId.toString();
  const addresses = getAddresses(Network.ETHEREUM);

  const id = getNFTId(Category.parcel, addresses.LANDRegistry, parcelId);

  let parcel = parcels.get(id);
  if (!parcel) {
    console.log(`id not found ${id} for Parcel on handleUpdate`);
    parcel = new Parcel({ id });
    parcels.set(id, parcel);
  }
  parcel.rawData = data;
  const parcelData = buildData(id, data, DataType.PARCEL);
  if (id === "estate-0x959e104e1a4db6317fa58f8295f586e1a978c297-10") {
    console.log("parcelData: ", parcelData);
    console.log("parcelId: ", parcelId);
  }
  if (parcelData) {
    parcel.data = parcelData;
    datas.set(parcelData.id, parcelData);

    const coords = coordinates.get(assetId);
    if (coords) {
      parcel.x = coords._0;
      parcel.y = coords._1;
    }

    let nft = nfts.get(id);
    if (!nft) {
      console.log(`id not found ${id} for NFT`);
      nft = new NFT({ id });
      nfts.set(id, nft);
    }
    nft.name = parcelData.name;
    if (parcelData.name) {
      // @TODO check why this is needed
      nft.searchText = getParcelText(parcel, parcelData.name);
    }
    nft.updatedAt = BigInt(block.header.timestamp / 1000);
  } else {
    console.log(`parcelData not found for parcel ${id}`);
  }
}
