import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    OrderCreated: event("0x84c66c3f7ba4b390e20e8e8233e2a516f3ce34a72749e4f12bd010dfba238039", {"id": p.bytes32, "assetId": indexed(p.uint256), "seller": indexed(p.address), "nftAddress": p.address, "priceInWei": p.uint256, "expiresAt": p.uint256}),
    OrderSuccessful: event("0x695ec315e8a642a74d450a4505eeea53df699b47a7378c7d752e97d5b16eb9bb", {"id": p.bytes32, "assetId": indexed(p.uint256), "seller": indexed(p.address), "nftAddress": p.address, "totalPrice": p.uint256, "buyer": indexed(p.address)}),
    OrderCancelled: event("0x0325426328de5b91ae4ad8462ad4076de4bcaf4551e81556185cacde5a425c6b", {"id": p.bytes32, "assetId": indexed(p.uint256), "seller": indexed(p.address), "nftAddress": p.address}),
    ChangedPublicationFee: event("0xe7fa8737293f41b5dfa0d5c3e552860a06275bed7015581b083c7be7003308ba", {"publicationFee": p.uint256}),
    ChangedOwnerCutPerMillion: event("0xfa406a120a9e7f2b332bfb7a43d3bf1c3f079262202907a6b69c94b2821a02c6", {"ownerCutPerMillion": p.uint256}),
    ChangeLegacyNFTAddress: event("0x6e65d1b616d558dd96db7a58e31a954d28d47d57d568e7d7fc7819803878928f", {"legacyNFTAddress": indexed(p.address)}),
    AuctionCreated: event("0x9493ae82b9872af74473effb9d302efba34e0df360a99cc5e577cd3f28e3cab2", {"id": p.bytes32, "assetId": indexed(p.uint256), "seller": indexed(p.address), "priceInWei": p.uint256, "expiresAt": p.uint256}),
    AuctionSuccessful: event("0xedcc7e1c269bc295dc24e74dc46b129c8449e6b0544af73b57c4201b78d119db", {"id": p.bytes32, "assetId": indexed(p.uint256), "seller": indexed(p.address), "totalPrice": p.uint256, "winner": indexed(p.address)}),
    AuctionCancelled: event("0x88bd2ba46f3dc2567144331c35bd4c5ced3d547d8828638a152ddd9591c137a6", {"id": p.bytes32, "assetId": indexed(p.uint256), "seller": indexed(p.address)}),
    Pause: event("0x6985a02210a168e66602d3235cb6db0e70f92b3ba4d376a33c0f3d9434bff625", {}),
    Unpause: event("0x7805862f689e2f13df9f062ff482ad3ad112aca9e0847911ed832e158c525b33", {}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
    Migrated: event("0xdd117a11c22118c9dee4b5a67ce578bc44529dce21ee0ccc439588fbb9fb4ea3", {"contractName": p.string, "migrationId": p.string}),
}

export const functions = {
    setOwnerCutPerMillion: fun("0x19dad16d", {"_ownerCutPerMillion": p.uint256}, ),
    setLegacyNFTAddress: fun("0x1b357750", {"_legacyNFTAddress": p.address}, ),
    ERC721_Interface: fun("0x2b4c32be", {}, p.bytes4),
    InterfaceId_ValidateFingerprint: fun("0x37f82f37", {}, p.bytes4),
    unpause: fun("0x3f4ba83a", {}, ),
    acceptedToken: fun("0x451c3d80", {}, p.address),
    "cancelOrder(uint256)": fun("0x514fcac7", {"assetId": p.uint256}, ),
    paused: fun("0x5c975abb", {}, p.bool),
    "cancelOrder(address,uint256)": fun("0x6a206137", {"nftAddress": p.address, "assetId": p.uint256}, ),
    "createOrder(address,uint256,uint256,uint256)": fun("0x6f652e1a", {"nftAddress": p.address, "assetId": p.uint256, "priceInWei": p.uint256, "expiresAt": p.uint256}, ),
    "initialize()": fun("0x8129fc1c", {}, ),
    pause: fun("0x8456cb59", {}, ),
    owner: fun("0x8da5cb5b", {}, p.address),
    safeExecuteOrder: fun("0x9b214f77", {"nftAddress": p.address, "assetId": p.uint256, "price": p.uint256, "fingerprint": p.bytes}, ),
    ownerCutPerMillion: fun("0xa01f79d4", {}, p.uint256),
    "createOrder(uint256,uint256,uint256)": fun("0xa1ba444d", {"assetId": p.uint256, "priceInWei": p.uint256, "expiresAt": p.uint256}, ),
    publicationFeeInWei: fun("0xae4f1198", {}, p.uint256),
    "executeOrder(address,uint256,uint256)": fun("0xae7b0333", {"nftAddress": p.address, "assetId": p.uint256, "price": p.uint256}, ),
    setPublicationFee: fun("0xaf8996f1", {"_publicationFee": p.uint256}, ),
    isMigrated: fun("0xc0bac1a8", {"contractName": p.string, "migrationId": p.string}, p.bool),
    "initialize(address,address,address)": fun("0xc0c53b8b", {"_acceptedToken": p.address, "_legacyNFTAddress": p.address, "_owner": p.address}, ),
    "initialize(address)": fun("0xc4d66de8", {"_sender": p.address}, ),
    legacyNFTAddress: fun("0xd6b26813", {}, p.address),
    auctionByAssetId: fun("0xd7b40107", {"assetId": p.uint256}, {"_0": p.bytes32, "_1": p.address, "_2": p.uint256, "_3": p.uint256}),
    orderByAssetId: fun("0xe61f3851", {"_0": p.address, "_1": p.uint256}, {"id": p.bytes32, "seller": p.address, "nftAddress": p.address, "price": p.uint256, "expiresAt": p.uint256}),
    "executeOrder(uint256,uint256)": fun("0xef46e0ca", {"assetId": p.uint256, "price": p.uint256}, ),
    transferOwnership: fun("0xf2fde38b", {"newOwner": p.address}, ),
}

export class Contract extends ContractBase {

    ERC721_Interface() {
        return this.eth_call(functions.ERC721_Interface, {})
    }

    InterfaceId_ValidateFingerprint() {
        return this.eth_call(functions.InterfaceId_ValidateFingerprint, {})
    }

    acceptedToken() {
        return this.eth_call(functions.acceptedToken, {})
    }

    paused() {
        return this.eth_call(functions.paused, {})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    ownerCutPerMillion() {
        return this.eth_call(functions.ownerCutPerMillion, {})
    }

    publicationFeeInWei() {
        return this.eth_call(functions.publicationFeeInWei, {})
    }

    isMigrated(contractName: IsMigratedParams["contractName"], migrationId: IsMigratedParams["migrationId"]) {
        return this.eth_call(functions.isMigrated, {contractName, migrationId})
    }

    legacyNFTAddress() {
        return this.eth_call(functions.legacyNFTAddress, {})
    }

    auctionByAssetId(assetId: AuctionByAssetIdParams["assetId"]) {
        return this.eth_call(functions.auctionByAssetId, {assetId})
    }

    orderByAssetId(_0: OrderByAssetIdParams["_0"], _1: OrderByAssetIdParams["_1"]) {
        return this.eth_call(functions.orderByAssetId, {_0, _1})
    }
}

/// Event types
export type OrderCreatedEventArgs = EParams<typeof events.OrderCreated>
export type OrderSuccessfulEventArgs = EParams<typeof events.OrderSuccessful>
export type OrderCancelledEventArgs = EParams<typeof events.OrderCancelled>
export type ChangedPublicationFeeEventArgs = EParams<typeof events.ChangedPublicationFee>
export type ChangedOwnerCutPerMillionEventArgs = EParams<typeof events.ChangedOwnerCutPerMillion>
export type ChangeLegacyNFTAddressEventArgs = EParams<typeof events.ChangeLegacyNFTAddress>
export type AuctionCreatedEventArgs = EParams<typeof events.AuctionCreated>
export type AuctionSuccessfulEventArgs = EParams<typeof events.AuctionSuccessful>
export type AuctionCancelledEventArgs = EParams<typeof events.AuctionCancelled>
export type PauseEventArgs = EParams<typeof events.Pause>
export type UnpauseEventArgs = EParams<typeof events.Unpause>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>
export type MigratedEventArgs = EParams<typeof events.Migrated>

/// Function types
export type SetOwnerCutPerMillionParams = FunctionArguments<typeof functions.setOwnerCutPerMillion>
export type SetOwnerCutPerMillionReturn = FunctionReturn<typeof functions.setOwnerCutPerMillion>

export type SetLegacyNFTAddressParams = FunctionArguments<typeof functions.setLegacyNFTAddress>
export type SetLegacyNFTAddressReturn = FunctionReturn<typeof functions.setLegacyNFTAddress>

export type ERC721_InterfaceParams = FunctionArguments<typeof functions.ERC721_Interface>
export type ERC721_InterfaceReturn = FunctionReturn<typeof functions.ERC721_Interface>

export type InterfaceId_ValidateFingerprintParams = FunctionArguments<typeof functions.InterfaceId_ValidateFingerprint>
export type InterfaceId_ValidateFingerprintReturn = FunctionReturn<typeof functions.InterfaceId_ValidateFingerprint>

export type UnpauseParams = FunctionArguments<typeof functions.unpause>
export type UnpauseReturn = FunctionReturn<typeof functions.unpause>

export type AcceptedTokenParams = FunctionArguments<typeof functions.acceptedToken>
export type AcceptedTokenReturn = FunctionReturn<typeof functions.acceptedToken>

export type CancelOrderParams_0 = FunctionArguments<typeof functions["cancelOrder(uint256)"]>
export type CancelOrderReturn_0 = FunctionReturn<typeof functions["cancelOrder(uint256)"]>

export type PausedParams = FunctionArguments<typeof functions.paused>
export type PausedReturn = FunctionReturn<typeof functions.paused>

export type CancelOrderParams_1 = FunctionArguments<typeof functions["cancelOrder(address,uint256)"]>
export type CancelOrderReturn_1 = FunctionReturn<typeof functions["cancelOrder(address,uint256)"]>

export type CreateOrderParams_0 = FunctionArguments<typeof functions["createOrder(address,uint256,uint256,uint256)"]>
export type CreateOrderReturn_0 = FunctionReturn<typeof functions["createOrder(address,uint256,uint256,uint256)"]>

export type InitializeParams_0 = FunctionArguments<typeof functions["initialize()"]>
export type InitializeReturn_0 = FunctionReturn<typeof functions["initialize()"]>

export type PauseParams = FunctionArguments<typeof functions.pause>
export type PauseReturn = FunctionReturn<typeof functions.pause>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type SafeExecuteOrderParams = FunctionArguments<typeof functions.safeExecuteOrder>
export type SafeExecuteOrderReturn = FunctionReturn<typeof functions.safeExecuteOrder>

export type OwnerCutPerMillionParams = FunctionArguments<typeof functions.ownerCutPerMillion>
export type OwnerCutPerMillionReturn = FunctionReturn<typeof functions.ownerCutPerMillion>

export type CreateOrderParams_1 = FunctionArguments<typeof functions["createOrder(uint256,uint256,uint256)"]>
export type CreateOrderReturn_1 = FunctionReturn<typeof functions["createOrder(uint256,uint256,uint256)"]>

export type PublicationFeeInWeiParams = FunctionArguments<typeof functions.publicationFeeInWei>
export type PublicationFeeInWeiReturn = FunctionReturn<typeof functions.publicationFeeInWei>

export type ExecuteOrderParams_0 = FunctionArguments<typeof functions["executeOrder(address,uint256,uint256)"]>
export type ExecuteOrderReturn_0 = FunctionReturn<typeof functions["executeOrder(address,uint256,uint256)"]>

export type SetPublicationFeeParams = FunctionArguments<typeof functions.setPublicationFee>
export type SetPublicationFeeReturn = FunctionReturn<typeof functions.setPublicationFee>

export type IsMigratedParams = FunctionArguments<typeof functions.isMigrated>
export type IsMigratedReturn = FunctionReturn<typeof functions.isMigrated>

export type InitializeParams_1 = FunctionArguments<typeof functions["initialize(address,address,address)"]>
export type InitializeReturn_1 = FunctionReturn<typeof functions["initialize(address,address,address)"]>

export type InitializeParams_2 = FunctionArguments<typeof functions["initialize(address)"]>
export type InitializeReturn_2 = FunctionReturn<typeof functions["initialize(address)"]>

export type LegacyNFTAddressParams = FunctionArguments<typeof functions.legacyNFTAddress>
export type LegacyNFTAddressReturn = FunctionReturn<typeof functions.legacyNFTAddress>

export type AuctionByAssetIdParams = FunctionArguments<typeof functions.auctionByAssetId>
export type AuctionByAssetIdReturn = FunctionReturn<typeof functions.auctionByAssetId>

export type OrderByAssetIdParams = FunctionArguments<typeof functions.orderByAssetId>
export type OrderByAssetIdReturn = FunctionReturn<typeof functions.orderByAssetId>

export type ExecuteOrderParams_1 = FunctionArguments<typeof functions["executeOrder(uint256,uint256)"]>
export type ExecuteOrderReturn_1 = FunctionReturn<typeof functions["executeOrder(uint256,uint256)"]>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

