import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    FeeCollectorChanged: event("0x649c5e3d0ed183894196148e193af316452b0037e77d2ff0fef23b7dc722bed0", {"_oldFeeCollector": indexed(p.address), "_newFeeCollector": indexed(p.address)}),
    NameBought: event("0xb8c56202a5ae8b00edfcd57a54ec6c3fb8d2f6deb3067a7ba11408a7bd014a3e", {"_caller": indexed(p.address), "_beneficiary": indexed(p.address), "_price": p.uint256, "_name": p.string}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
}

export const functions = {
    PRICE: fun("0x8d859f3e", {}, p.uint256),
    acceptedToken: fun("0x451c3d80", {}, p.address),
    feeCollector: fun("0xc415b95c", {}, p.address),
    isOwner: fun("0x8f32d59b", {}, p.bool),
    owner: fun("0x8da5cb5b", {}, p.address),
    register: fun("0x1e59c529", {"_name": p.string, "_beneficiary": p.address}, ),
    registrar: fun("0x2b20e397", {}, p.address),
    renounceOwnership: fun("0x715018a6", {}, ),
    setFeeCollector: fun("0xa42dce80", {"_feeCollector": p.address}, ),
    transferOwnership: fun("0xf2fde38b", {"newOwner": p.address}, ),
}

export class Contract extends ContractBase {

    PRICE() {
        return this.eth_call(functions.PRICE, {})
    }

    acceptedToken() {
        return this.eth_call(functions.acceptedToken, {})
    }

    feeCollector() {
        return this.eth_call(functions.feeCollector, {})
    }

    isOwner() {
        return this.eth_call(functions.isOwner, {})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    registrar() {
        return this.eth_call(functions.registrar, {})
    }
}

/// Event types
export type FeeCollectorChangedEventArgs = EParams<typeof events.FeeCollectorChanged>
export type NameBoughtEventArgs = EParams<typeof events.NameBought>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>

/// Function types
export type PRICEParams = FunctionArguments<typeof functions.PRICE>
export type PRICEReturn = FunctionReturn<typeof functions.PRICE>

export type AcceptedTokenParams = FunctionArguments<typeof functions.acceptedToken>
export type AcceptedTokenReturn = FunctionReturn<typeof functions.acceptedToken>

export type FeeCollectorParams = FunctionArguments<typeof functions.feeCollector>
export type FeeCollectorReturn = FunctionReturn<typeof functions.feeCollector>

export type IsOwnerParams = FunctionArguments<typeof functions.isOwner>
export type IsOwnerReturn = FunctionReturn<typeof functions.isOwner>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type RegisterParams = FunctionArguments<typeof functions.register>
export type RegisterReturn = FunctionReturn<typeof functions.register>

export type RegistrarParams = FunctionArguments<typeof functions.registrar>
export type RegistrarReturn = FunctionReturn<typeof functions.registrar>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type SetFeeCollectorParams = FunctionArguments<typeof functions.setFeeCollector>
export type SetFeeCollectorReturn = FunctionReturn<typeof functions.setFeeCollector>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

