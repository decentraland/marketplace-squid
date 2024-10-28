import { TradedEventArgs } from "../../abi/DecentralandMarketplaceEthereum";
import { Network } from "../../types";
import { getAddresses } from "./addresses";

export enum TradeType {
  Order = "Order",
  Bid = "Bid",
}

export enum TradeAssetType {
  ERC20 = 1,
  ERC721 = 3,
  ITEM = 4,
}

export const getTradeEventType = (
  event: TradedEventArgs,
  network: Network
): TradeType | undefined => {
  const addresses = getAddresses(network);

  // We're only supporting the case of one trade for the moment. We could have multiple trades in the future
  const isReceivingERC20 =
    Number(event._trade.received[0].assetType) === TradeAssetType.ERC20;
  const isSendingERC20 =
    Number(event._trade.sent[0].assetType) === TradeAssetType.ERC20;
  const contractAddressReceived = event._trade.received[0].contractAddress;
  const contractAddressSent = event._trade.sent[0].contractAddress;

  // if received is MANA, then it's an order. We could also have other ERC20 sent, but for the moment we are only checking for MANA
  if (
    isReceivingERC20 &&
    [addresses.MANA, addresses.TRANSAK_TOKEN].includes(contractAddressReceived) // support Transak token to track sales in dev
  ) {
    return TradeType.Order;
  } else if (
    isSendingERC20 &&
    [addresses.MANA, addresses.TRANSAK_TOKEN].includes(contractAddressSent)
  ) {
    return TradeType.Bid;
  }
};

export const getTradeEventData = (event: TradedEventArgs, network: Network) => {
  const tradeType = getTradeEventType(event, network);
  if (tradeType === TradeType.Order) {
    return {
      collectionAddress: event._trade.sent[0].contractAddress,
      tokenId:
        Number(event._trade.sent[0].assetType) === TradeAssetType.ERC721
          ? event._trade.sent[0].value
          : undefined,
      itemId:
        Number(event._trade.sent[0].assetType) === TradeAssetType.ITEM
          ? event._trade.sent[0].value
          : undefined,
      seller: event._trade.received[0].beneficiary,
      buyer: event._trade.sent[0].beneficiary,
      price: event._trade.received[0].value,
      assetType: event._trade.sent[0].assetType,
    };
  } else {
    return {
      collectionAddress: event._trade.received[0].contractAddress,
      tokenId:
        Number(event._trade.received[0].assetType) === TradeAssetType.ERC721
          ? event._trade.received[0].value
          : undefined,
      itemId:
        Number(event._trade.received[0].assetType) === TradeAssetType.ITEM
          ? event._trade.received[0].value
          : undefined,
      seller: event._trade.sent[0].beneficiary,
      buyer: event._trade.received[0].beneficiary,
      price: event._trade.sent[0].value,
      assetType: event._trade.received[0].assetType,
    };
  }
};
