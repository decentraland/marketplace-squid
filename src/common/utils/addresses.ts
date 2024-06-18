import { ChainId, Network } from "@dcl/schemas";

export const getAddresses = (network: Network) => {
  const chainId =
    network === Network.ETHEREUM
      ? process.env.ETHEREUM_CHAIN_ID
      : process.env.MATIC_CHAIN_ID;

  const networkName = network === Network.ETHEREUM ? "eth" : "matic";
  const chainName =
    network === Network.ETHEREUM
      ? chainId === ChainId.ETHEREUM_MAINNET.toString()
        ? "mainnet"
        : "sepolia"
      : chainId === ChainId.MATIC_MAINNET.toString()
      ? "matic"
      : "mumbai";

  const path = `../../${networkName}/addreses/${chainName}`;
  return require(path);
};
