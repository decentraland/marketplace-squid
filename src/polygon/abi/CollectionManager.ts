import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    AcceptedTokenSet: event("0x445f1d4a39b3dc9fd0f6ff6527b9a81ae56e9e252f7044d8d8003c846645117a", {"_oldAcceptedToken": indexed(p.address), "_newAcceptedToken": indexed(p.address)}),
    CommitteeMethodSet: event("0x1a51ffe2f1115bd5c7ddac144366022f293976666d3e5dd1e24b0164ceabe009", {"_method": indexed(p.bytes4), "_isAllowed": p.bool}),
    CommitteeSet: event("0x526f01d990f9112502588ce703f53664ec8196974fb325ee8676a79b6aec5f10", {"_oldCommittee": indexed(p.address), "_newCommittee": indexed(p.address)}),
    FeesCollectorSet: event("0x58283f7e46512bbcb30558fa508283f23fac7be18fb20bfdf6d4bbf83c529d53", {"_oldFeesCollector": indexed(p.address), "_newFeesCollector": indexed(p.address)}),
    MetaTransactionExecuted: event("0x5845892132946850460bff5a0083f71031bc5bf9aadcd40f1de79423eac9b10b", {"userAddress": p.address, "relayerAddress": p.address, "functionSignature": p.bytes}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
    RaritiesSet: event("0x0bc1256959e2ee3a5c21d5d5d2c02a97313e6245fc2130d13cf2b69575711b44", {"_oldRarities": indexed(p.address), "_newRarities": indexed(p.address)}),
}

export const functions = {
    acceptedToken: fun("0x451c3d80", {}, p.address),
    allowedCommitteeMethods: fun("0x39432c54", {"_0": p.bytes4}, p.bool),
    committee: fun("0xd864e740", {}, p.address),
    createCollection: fun("0x35a629c2", {"_forwarder": p.address, "_factory": p.address, "_salt": p.bytes32, "_name": p.string, "_symbol": p.string, "_baseURI": p.string, "_creator": p.address, "_items": p.array(p.struct({"rarity": p.string, "price": p.uint256, "beneficiary": p.address, "metadata": p.string}))}, ),
    domainSeparator: fun("0xf698da25", {}, p.bytes32),
    executeMetaTransaction: fun("0x0c53c51c", {"userAddress": p.address, "functionSignature": p.bytes, "sigR": p.bytes32, "sigS": p.bytes32, "sigV": p.uint8}, p.bytes),
    feesCollector: fun("0x9cf160f6", {}, p.address),
    getChainId: fun("0x3408e470", {}, p.uint256),
    getNonce: fun("0x2d0335ab", {"user": p.address}, p.uint256),
    manageCollection: fun("0x1e5a92c1", {"_forwarder": p.address, "_collection": p.address, "_data": p.bytes}, ),
    owner: fun("0x8da5cb5b", {}, p.address),
    pricePerItem: fun("0x382d9b7d", {}, p.uint256),
    rarities: fun("0x3992cd0d", {}, p.address),
    renounceOwnership: fun("0x715018a6", {}, ),
    setAcceptedToken: fun("0x7487f528", {"_newAcceptedToken": p.address}, ),
    setCommittee: fun("0xbddae40e", {"_newCommittee": p.address}, ),
    setCommitteeMethods: fun("0xea1b33b9", {"_methods": p.array(p.bytes4), "_values": p.array(p.bool)}, ),
    setFeesCollector: fun("0x373071f2", {"_newFeesCollector": p.address}, ),
    setRarities: fun("0xf02353ea", {"_newRarities": p.address}, ),
    transferOwnership: fun("0xf2fde38b", {"newOwner": p.address}, ),
}

export class Contract extends ContractBase {

    acceptedToken() {
        return this.eth_call(functions.acceptedToken, {})
    }

    allowedCommitteeMethods(_0: AllowedCommitteeMethodsParams["_0"]) {
        return this.eth_call(functions.allowedCommitteeMethods, {_0})
    }

    committee() {
        return this.eth_call(functions.committee, {})
    }

    domainSeparator() {
        return this.eth_call(functions.domainSeparator, {})
    }

    feesCollector() {
        return this.eth_call(functions.feesCollector, {})
    }

    getChainId() {
        return this.eth_call(functions.getChainId, {})
    }

    getNonce(user: GetNonceParams["user"]) {
        return this.eth_call(functions.getNonce, {user})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    pricePerItem() {
        return this.eth_call(functions.pricePerItem, {})
    }

    rarities() {
        return this.eth_call(functions.rarities, {})
    }
}

/// Event types
export type AcceptedTokenSetEventArgs = EParams<typeof events.AcceptedTokenSet>
export type CommitteeMethodSetEventArgs = EParams<typeof events.CommitteeMethodSet>
export type CommitteeSetEventArgs = EParams<typeof events.CommitteeSet>
export type FeesCollectorSetEventArgs = EParams<typeof events.FeesCollectorSet>
export type MetaTransactionExecutedEventArgs = EParams<typeof events.MetaTransactionExecuted>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>
export type RaritiesSetEventArgs = EParams<typeof events.RaritiesSet>

/// Function types
export type AcceptedTokenParams = FunctionArguments<typeof functions.acceptedToken>
export type AcceptedTokenReturn = FunctionReturn<typeof functions.acceptedToken>

export type AllowedCommitteeMethodsParams = FunctionArguments<typeof functions.allowedCommitteeMethods>
export type AllowedCommitteeMethodsReturn = FunctionReturn<typeof functions.allowedCommitteeMethods>

export type CommitteeParams = FunctionArguments<typeof functions.committee>
export type CommitteeReturn = FunctionReturn<typeof functions.committee>

export type CreateCollectionParams = FunctionArguments<typeof functions.createCollection>
export type CreateCollectionReturn = FunctionReturn<typeof functions.createCollection>

export type DomainSeparatorParams = FunctionArguments<typeof functions.domainSeparator>
export type DomainSeparatorReturn = FunctionReturn<typeof functions.domainSeparator>

export type ExecuteMetaTransactionParams = FunctionArguments<typeof functions.executeMetaTransaction>
export type ExecuteMetaTransactionReturn = FunctionReturn<typeof functions.executeMetaTransaction>

export type FeesCollectorParams = FunctionArguments<typeof functions.feesCollector>
export type FeesCollectorReturn = FunctionReturn<typeof functions.feesCollector>

export type GetChainIdParams = FunctionArguments<typeof functions.getChainId>
export type GetChainIdReturn = FunctionReturn<typeof functions.getChainId>

export type GetNonceParams = FunctionArguments<typeof functions.getNonce>
export type GetNonceReturn = FunctionReturn<typeof functions.getNonce>

export type ManageCollectionParams = FunctionArguments<typeof functions.manageCollection>
export type ManageCollectionReturn = FunctionReturn<typeof functions.manageCollection>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type PricePerItemParams = FunctionArguments<typeof functions.pricePerItem>
export type PricePerItemReturn = FunctionReturn<typeof functions.pricePerItem>

export type RaritiesParams = FunctionArguments<typeof functions.rarities>
export type RaritiesReturn = FunctionReturn<typeof functions.rarities>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type SetAcceptedTokenParams = FunctionArguments<typeof functions.setAcceptedToken>
export type SetAcceptedTokenReturn = FunctionReturn<typeof functions.setAcceptedToken>

export type SetCommitteeParams = FunctionArguments<typeof functions.setCommittee>
export type SetCommitteeReturn = FunctionReturn<typeof functions.setCommittee>

export type SetCommitteeMethodsParams = FunctionArguments<typeof functions.setCommitteeMethods>
export type SetCommitteeMethodsReturn = FunctionReturn<typeof functions.setCommitteeMethods>

export type SetFeesCollectorParams = FunctionArguments<typeof functions.setFeesCollector>
export type SetFeesCollectorReturn = FunctionReturn<typeof functions.setFeesCollector>

export type SetRaritiesParams = FunctionArguments<typeof functions.setRarities>
export type SetRaritiesReturn = FunctionReturn<typeof functions.setRarities>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

