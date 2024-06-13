import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    "Transfer(address,address,uint256,address,bytes,bytes)": event("0x8988d59efc2c4547ef86c88f6543963bab0cea94f8e486e619c7c3a790db93be", {"from": indexed(p.address), "to": indexed(p.address), "tokenId": indexed(p.uint256), "operator": p.address, "userData": p.bytes, "operatorData": p.bytes}),
    "Transfer(address,address,uint256,address,bytes)": event("0xd5c97f2e041b2046be3b4337472f05720760a198f4d7d84980b7155eec7cca6f", {"from": indexed(p.address), "to": indexed(p.address), "tokenId": indexed(p.uint256), "operator": p.address, "userData": p.bytes}),
    "Transfer(address,address,uint256)": event("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", {"from": indexed(p.address), "to": indexed(p.address), "tokenId": indexed(p.uint256)}),
    // "Transfer(address,address,uint256)": event("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", {"from": indexed(p.address), "to": indexed(p.address), "tokenId": p.uint256}),
}

export const functions = {
    ownerOf: fun("0x6352211e", {"_tokenId": p.uint256}, p.address),
    tokenURI: fun("0xc87b56dd", {"_tokenId": p.uint256}, p.string),
    balanceOf: fun("0x70a08231", {"_owner": p.address}, p.uint256),
}

export class Contract extends ContractBase {

    ownerOf(_tokenId: OwnerOfParams["_tokenId"]) {
        return this.eth_call(functions.ownerOf, {_tokenId})
    }

    tokenURI(_tokenId: TokenURIParams["_tokenId"]) {
        return this.eth_call(functions.tokenURI, {_tokenId})
    }
}

/// Event types
export type TransferEventArgs_0 = EParams<typeof events["Transfer(address,address,uint256,address,bytes,bytes)"]>
export type TransferEventArgs_1 = EParams<typeof events["Transfer(address,address,uint256,address,bytes)"]>
export type TransferEventArgs_2 = EParams<typeof events["Transfer(address,address,uint256)"]>
// export type TransferEventArgs_2 = EParams<typeof events["Transfer(address,address,uint256)"]>

/// Function types
export type OwnerOfParams = FunctionArguments<typeof functions.ownerOf>
export type OwnerOfReturn = FunctionReturn<typeof functions.ownerOf>

export type TokenURIParams = FunctionArguments<typeof functions.tokenURI>
export type TokenURIReturn = FunctionReturn<typeof functions.tokenURI>

export type BalanceOfParams = FunctionArguments<typeof functions.balanceOf>
export type BalanceOfReturn = FunctionReturn<typeof functions.balanceOf>

