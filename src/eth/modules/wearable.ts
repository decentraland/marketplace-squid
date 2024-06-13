import { getCatalystBase } from "../../common/utils/catalyst";
import { ChainId, Network } from "@dcl/schemas";
import {
  NFT,
  WearableBodyShape,
  WearableCategory,
  WearableRarity,
} from "../../model";
import {
  Wearable,
  atari_launch,
  binance_us_collection,
  china_flying,
  community_contest,
  cybermike_cybersoldier_set,
  cz_mercenary_mtz,
  dappcraft_moonminer,
  dc_meta,
  dc_niftyblocksmith,
  dcg_collection,
  dcl_launch,
  dg_atari_dillon_francis,
  dg_fall_2020,
  dg_summer_2020,
  dgtble_headspace,
  digital_alchemy,
  ethermon_wearables,
  exclusive_masks,
  halloween_2019,
  halloween_2020,
  mch_collection,
  meme_dontbuythis,
  mf_sammichgamer,
  ml_liondance,
  ml_pekingopera,
  moonshot_2020,
  pm_dreamverse_eminence,
  pm_outtathisworld,
  rac_basics,
  release_the_kraken,
  rtfkt_x_atari,
  stay_safe,
  sugarclub_yumi,
  tech_tribal_marc0matic,
  threelau_basics,
  winklevoss_capital,
  wonderzone_meteorchaser,
  wonderzone_steampunk,
  wz_wonderbot,
  xmas_2019,
  xmas_2020,
  xmash_up_2020,
} from "../data/wearables";
import * as categories from "../data/wearables/categories";
import { Wearable as WearableEntity } from "../../model";

import { getURNNetwork } from "../../common/utils/network";

export function buildWearableFromNFT(nft: NFT): WearableEntity {
  // https://wearable-api.decentraland.org/v2/standards/erc721-metadata/collections/halloween_2019/wearables/funny_skull_mask/1
  let wearableId = "";
  if (nft.tokenURI) {
    wearableId = getWearableIdFromTokenURI(nft.tokenURI);
    if (wearableId === "") {
      console.log("Could not get a wearable id from tokenURI {} and nft {}", [
        nft.tokenURI,
        nft.id,
      ]);
      return new WearableEntity({ id: "" });
    }
  } else {
    console.log("ERROR: NFT {} does not have a tokenURI", nft.id);
  }

  const allCollections: Wearable[][] = [
    atari_launch,
    binance_us_collection,
    china_flying,
    community_contest,
    cybermike_cybersoldier_set,
    cz_mercenary_mtz,
    dappcraft_moonminer,
    dc_meta,
    dc_niftyblocksmith,
    dcg_collection,
    dcl_launch,
    dg_atari_dillon_francis,
    dg_fall_2020,
    dg_summer_2020,
    dgtble_headspace,
    digital_alchemy,
    ethermon_wearables,
    exclusive_masks,
    halloween_2019,
    halloween_2020,
    mch_collection,
    meme_dontbuythis,
    mf_sammichgamer,
    ml_liondance,
    ml_pekingopera,
    moonshot_2020,
    pm_dreamverse_eminence,
    pm_outtathisworld,
    rac_basics,
    release_the_kraken,
    rtfkt_x_atari,
    stay_safe,
    sugarclub_yumi,
    tech_tribal_marc0matic,
    threelau_basics,
    winklevoss_capital,
    wonderzone_meteorchaser,
    wonderzone_steampunk,
    wz_wonderbot,
    xmas_2019,
    xmas_2020,
    xmash_up_2020,
  ];
  const collectionNames: string[] = [
    "atari_launch",
    "binance_us_collection",
    "china_flying",
    "community_contest",
    "cybermike_cybersoldier_set",
    "cz_mercenary_mtz",
    "dappcraft_moonminer",
    "dc_meta",
    "dc_niftyblocksmith",
    "dcg_collection",
    "dcl_launch",
    "dg_atari_dillon_francis",
    "dg_fall_2020",
    "dg_summer_2020",
    "dgtble_headspace",
    "digital_alchemy",
    "ethermon_wearables",
    "exclusive_masks",
    "halloween_2019",
    "halloween_2020",
    "mch_collection",
    "meme_dontbuythis",
    "mf_sammichgamer",
    "ml_liondance",
    "ml_pekingopera",
    "moonshot_2020",
    "pm_dreamverse_eminence",
    "pm_outtathisworld",
    "rac_basics",
    "release_the_kraken",
    "rtfkt_x_atari",
    "stay_safe",
    "sugarclub_yumi",
    "tech_tribal_marc0matic",
    "3lau_basics", // threelau_basics
    "winklevoss_capital",
    "wonderzone_meteorchaser",
    "wonderzone_steampunk",
    "wz_wonderbot",
    "xmas_2019",
    "xmas_2020",
    "xmash_up_2020",
  ];
  for (let i = 0; i < allCollections.length; i++) {
    const wearable = findWearable(wearableId, allCollections[i]);
  
    if (wearable.id === wearableId) {
      wearable.id = nft.id;
      wearable.collection = collectionNames[i];
      wearable.owner = nft.owner;
      return wearable;
    }
  }

  console.log(
    "Could not find a wearable for the id {} found on the tokenURI {} and nft {}",
    [wearableId, nft.tokenURI, nft.id]
  );
  return new WearableEntity({ id: "" });
}

export function getWearableImage(wearable: WearableEntity): string {
  const chainId = parseInt(
    process.env.ETHEREUM_CHAIN_ID || ChainId.ETHEREUM_MAINNET.toString()
  ) as ChainId;
  const baseURI = getCatalystBase(chainId);
  const urn = getWearableURN(wearable);

  return baseURI + "/lambdas/collections/contents/" + urn + "/thumbnail";
}

export function getWearableURN(wearable: WearableEntity): string {
  return (
    "urn:decentraland:" +
    getURNNetwork(Network.ETHEREUM) +
    ":collections-v1:" +
    wearable.collection +
    ":" +
    wearable.representationId
  );
}

export function isWearableHead(wearable: WearableEntity): boolean {
  let category = wearable.category;
  return (
    category == categories.EYEBROWS ||
    category == categories.EYES ||
    category == categories.FACIAL_HAIR ||
    category == categories.HAIR ||
    category == categories.MOUTH
  );
}

export function isWearableAccessory(wearable: WearableEntity): boolean {
  let category = wearable.category;
  return (
    category == categories.EARRING ||
    category == categories.EYEWEAR ||
    category == categories.HAT ||
    category == categories.HELMET ||
    category == categories.MASK ||
    category == categories.TIARA ||
    category == categories.TOP_HEAD
  );
}

function findWearable(id: string, collection: Wearable[]): WearableEntity {
  for (let i = 0; i < collection.length; i++) {
    const representation = collection[i];
    if (id === representation.id) {
      // TODO: representation.toEntity()
      const wearable = new WearableEntity({ id });
      wearable.representationId = representation.id;
      wearable.name = representation.name;
      wearable.description = representation.description;
      wearable.category = representation.category as WearableCategory;
      wearable.rarity = representation.rarity as WearableRarity;
      wearable.bodyShapes = representation.bodyShapes as WearableBodyShape[];
      return wearable;
    }
  }

  return new WearableEntity({ id: "" });
}

export function getWearableIdFromTokenURI(tokenURI: string): string {
  let splitted = tokenURI.split("/");

  // https://wearable-api.decentraland.org/v2/standards/erc721-metadata/collections/halloween_2019/wearables/funny_skull_mask/1
  // or
  // dcl://halloween_2019/vampire_feet/55
  if (splitted.length == 11 || splitted.length == 5) {
    let ids = splitted.slice(-2);
    return ids[0];
  }

  return "";
}
