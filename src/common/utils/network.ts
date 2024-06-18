import { Network } from "@dcl/schemas";

export function getURNNetwork(network: Network): string {
  return network === Network.ETHEREUM ? "ethereum" : network;
}
