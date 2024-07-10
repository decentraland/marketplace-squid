import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    AddRarity: event("0xa1551daaa553ebc192df9198fc7d3d7e68b02a9be07fc92605cccd0d935d2c00", {"_rarity": p.struct({"name": p.string, "maxSupply": p.uint256, "price": p.uint256})}),
    MetaTransactionExecuted: event("0x5845892132946850460bff5a0083f71031bc5bf9aadcd40f1de79423eac9b10b", {"userAddress": p.address, "relayerAddress": p.address, "functionSignature": p.bytes}),
    OracleSet: event("0xc1d3048301c0d23629a2532c8defa6d68f8e1a0e4157918769e9fb1b2eeb888e", {"_oldOracle": indexed(p.address), "_newOracle": indexed(p.address)}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
    UpdatePrice: event("0x05b0e3546b37c788d01ccb3d1c8a6329795f32a6b78cb3bfe6782bd86d0e26fe", {"_name": p.string, "_price": p.uint256}),
}

export const functions = {
    addRarities: fun("0x5b26f8da", {"_rarities": p.array(p.struct({"name": p.string, "maxSupply": p.uint256, "price": p.uint256}))}, ),
    domainSeparator: fun("0xf698da25", {}, p.bytes32),
    executeMetaTransaction: fun("0x0c53c51c", {"userAddress": p.address, "functionSignature": p.bytes, "sigR": p.bytes32, "sigS": p.bytes32, "sigV": p.uint8}, p.bytes),
    getChainId: fun("0x3408e470", {}, p.uint256),
    getNonce: fun("0x2d0335ab", {"user": p.address}, p.uint256),
    getRarityByName: fun("0xb5262333", {"_rarity": p.string}, p.struct({"name": p.string, "maxSupply": p.uint256, "price": p.uint256})),
    oracle: fun("0x7dc0d1d0", {}, p.address),
    owner: fun("0x8da5cb5b", {}, p.address),
    rarities: fun("0x17b8e1cf", {"_0": p.uint256}, {"name": p.string, "maxSupply": p.uint256, "price": p.uint256}),
    raritiesCount: fun("0x89e9c4d3", {}, p.uint256),
    renounceOwnership: fun("0x715018a6", {}, ),
    setOracle: fun("0x7adbf973", {"_newOracle": p.address}, ),
    transferOwnership: fun("0xf2fde38b", {"newOwner": p.address}, ),
    updatePrices: fun("0xfa21cc7b", {"_names": p.array(p.string), "_prices": p.array(p.uint256)}, ),
}

export class Contract extends ContractBase {

    domainSeparator() {
        return this.eth_call(functions.domainSeparator, {})
    }

    getChainId() {
        return this.eth_call(functions.getChainId, {})
    }

    getNonce(user: GetNonceParams["user"]) {
        return this.eth_call(functions.getNonce, {user})
    }

    getRarityByName(_rarity: GetRarityByNameParams["_rarity"]) {
        return this.eth_call(functions.getRarityByName, {_rarity})
    }

    oracle() {
        return this.eth_call(functions.oracle, {})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    rarities(_0: RaritiesParams["_0"]) {
        return this.eth_call(functions.rarities, {_0})
    }

    raritiesCount() {
        return this.eth_call(functions.raritiesCount, {})
    }
}

/// Event types
export type AddRarityEventArgs = EParams<typeof events.AddRarity>
export type MetaTransactionExecutedEventArgs = EParams<typeof events.MetaTransactionExecuted>
export type OracleSetEventArgs = EParams<typeof events.OracleSet>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>
export type UpdatePriceEventArgs = EParams<typeof events.UpdatePrice>

/// Function types
export type AddRaritiesParams = FunctionArguments<typeof functions.addRarities>
export type AddRaritiesReturn = FunctionReturn<typeof functions.addRarities>

export type DomainSeparatorParams = FunctionArguments<typeof functions.domainSeparator>
export type DomainSeparatorReturn = FunctionReturn<typeof functions.domainSeparator>

export type ExecuteMetaTransactionParams = FunctionArguments<typeof functions.executeMetaTransaction>
export type ExecuteMetaTransactionReturn = FunctionReturn<typeof functions.executeMetaTransaction>

export type GetChainIdParams = FunctionArguments<typeof functions.getChainId>
export type GetChainIdReturn = FunctionReturn<typeof functions.getChainId>

export type GetNonceParams = FunctionArguments<typeof functions.getNonce>
export type GetNonceReturn = FunctionReturn<typeof functions.getNonce>

export type GetRarityByNameParams = FunctionArguments<typeof functions.getRarityByName>
export type GetRarityByNameReturn = FunctionReturn<typeof functions.getRarityByName>

export type OracleParams = FunctionArguments<typeof functions.oracle>
export type OracleReturn = FunctionReturn<typeof functions.oracle>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type RaritiesParams = FunctionArguments<typeof functions.rarities>
export type RaritiesReturn = FunctionReturn<typeof functions.rarities>

export type RaritiesCountParams = FunctionArguments<typeof functions.raritiesCount>
export type RaritiesCountReturn = FunctionReturn<typeof functions.raritiesCount>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type SetOracleParams = FunctionArguments<typeof functions.setOracle>
export type SetOracleReturn = FunctionReturn<typeof functions.setOracle>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

export type UpdatePricesParams = FunctionArguments<typeof functions.updatePrices>
export type UpdatePricesReturn = FunctionReturn<typeof functions.updatePrices>

