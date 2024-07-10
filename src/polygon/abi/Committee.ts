import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    MemberSet: event("0x4efc5168d98ad88d2d4784344a20876aea2fa3e8aa503b5fb3164a09019ca3d6", {"_member": indexed(p.address), "_value": p.bool}),
    MetaTransactionExecuted: event("0x5845892132946850460bff5a0083f71031bc5bf9aadcd40f1de79423eac9b10b", {"userAddress": p.address, "relayerAddress": p.address, "functionSignature": p.bytes}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
}

export const functions = {
    domainSeparator: fun("0xf698da25", {}, p.bytes32),
    executeMetaTransaction: fun("0x0c53c51c", {"userAddress": p.address, "functionSignature": p.bytes, "sigR": p.bytes32, "sigS": p.bytes32, "sigV": p.uint8}, p.bytes),
    getChainId: fun("0x3408e470", {}, p.uint256),
    getNonce: fun("0x2d0335ab", {"user": p.address}, p.uint256),
    manageCollection: fun("0x902297f2", {"_collectionManager": p.address, "_forwarder": p.address, "_collection": p.address, "_data": p.bytes}, ),
    members: fun("0x08ae4b0c", {"_0": p.address}, p.bool),
    owner: fun("0x8da5cb5b", {}, p.address),
    renounceOwnership: fun("0x715018a6", {}, ),
    setMembers: fun("0x29352b27", {"_members": p.array(p.address), "_values": p.array(p.bool)}, ),
    transferOwnership: fun("0xf2fde38b", {"newOwner": p.address}, ),
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

    members(_0: MembersParams["_0"]) {
        return this.eth_call(functions.members, {_0})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }
}

/// Event types
export type MemberSetEventArgs = EParams<typeof events.MemberSet>
export type MetaTransactionExecutedEventArgs = EParams<typeof events.MetaTransactionExecuted>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>

/// Function types
export type DomainSeparatorParams = FunctionArguments<typeof functions.domainSeparator>
export type DomainSeparatorReturn = FunctionReturn<typeof functions.domainSeparator>

export type ExecuteMetaTransactionParams = FunctionArguments<typeof functions.executeMetaTransaction>
export type ExecuteMetaTransactionReturn = FunctionReturn<typeof functions.executeMetaTransaction>

export type GetChainIdParams = FunctionArguments<typeof functions.getChainId>
export type GetChainIdReturn = FunctionReturn<typeof functions.getChainId>

export type GetNonceParams = FunctionArguments<typeof functions.getNonce>
export type GetNonceReturn = FunctionReturn<typeof functions.getNonce>

export type ManageCollectionParams = FunctionArguments<typeof functions.manageCollection>
export type ManageCollectionReturn = FunctionReturn<typeof functions.manageCollection>

export type MembersParams = FunctionArguments<typeof functions.members>
export type MembersReturn = FunctionReturn<typeof functions.members>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type SetMembersParams = FunctionArguments<typeof functions.setMembers>
export type SetMembersReturn = FunctionReturn<typeof functions.setMembers>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

