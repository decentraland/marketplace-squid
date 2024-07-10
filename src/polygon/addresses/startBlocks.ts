import { ChainId } from "@dcl/schemas";

// enum ContractName {
//   Marketplace,
//   MarketplaceV2,
// }

export const startBlockByNetwork: Record<string, Record<string, number>> = {
  [ChainId.MATIC_MAINNET]: {
    Marketplace: 8828687,
    MarketplaceV2: 8828687,
    Bid: 8828687,
    BidV2: 8828687,
  },
  [ChainId.MATIC_AMOY]: {
    Marketplace: 14517370,
    MarketplaceV2: 5706656,
    BidV1: 21834173,
    BidV2: 5706662,
  },
};
