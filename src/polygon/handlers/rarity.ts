import { Currency, Rarity } from "../../model";
import { AddRarityEventArgs, UpdatePriceEventArgs } from "../abi/Rarity";
import * as utils from "../modules/rarity";

const CURRENCY = Currency.MANA;

export function handleAddRarity(
  rarities: Map<string, Rarity>,
  event: AddRarityEventArgs
): void {
  utils.handleAddRarity(
    rarities,
    event._rarity.name,
    event._rarity.price,
    event._rarity.maxSupply,
    CURRENCY
  );
}

export function handleUpdatePrice(
  rarities: Map<string, Rarity>,
  event: UpdatePriceEventArgs
): void {
  utils.handleUpdatePrice(rarities, event._name, event._price, CURRENCY);
}
