import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    aggregate: fun("0x252dba42", {"calls": p.array(p.struct({"target": p.address, "callData": p.bytes}))}, {"blockNumber": p.uint256, "returnData": p.array(p.bytes)}),
    aggregate3: fun("0x82ad56cb", {"calls": p.array(p.struct({"target": p.address, "allowFailure": p.bool, "callData": p.bytes}))}, p.array(p.struct({"success": p.bool, "returnData": p.bytes}))),
    aggregate3Value: fun("0x174dea71", {"calls": p.array(p.struct({"target": p.address, "allowFailure": p.bool, "value": p.uint256, "callData": p.bytes}))}, p.array(p.struct({"success": p.bool, "returnData": p.bytes}))),
    blockAndAggregate: fun("0xc3077fa9", {"calls": p.array(p.struct({"target": p.address, "callData": p.bytes}))}, {"blockNumber": p.uint256, "blockHash": p.bytes32, "returnData": p.array(p.struct({"success": p.bool, "returnData": p.bytes}))}),
    getBasefee: fun("0x3e64a696", {}, p.uint256),
    getBlockHash: fun("0xee82ac5e", {"blockNumber": p.uint256}, p.bytes32),
    getBlockNumber: fun("0x42cbb15c", {}, p.uint256),
    getChainId: fun("0x3408e470", {}, p.uint256),
    getCurrentBlockCoinbase: fun("0xa8b0574e", {}, p.address),
    getCurrentBlockDifficulty: fun("0x72425d9d", {}, p.uint256),
    getCurrentBlockGasLimit: fun("0x86d516e8", {}, p.uint256),
    getCurrentBlockTimestamp: fun("0x0f28c97d", {}, p.uint256),
    getEthBalance: fun("0x4d2301cc", {"addr": p.address}, p.uint256),
    getLastBlockHash: fun("0x27e86d6e", {}, p.bytes32),
    tryAggregate: fun("0xbce38bd7", {"requireSuccess": p.bool, "calls": p.array(p.struct({"target": p.address, "callData": p.bytes}))}, p.array(p.struct({"success": p.bool, "returnData": p.bytes}))),
    tryBlockAndAggregate: fun("0x399542e9", {"requireSuccess": p.bool, "calls": p.array(p.struct({"target": p.address, "callData": p.bytes}))}, {"blockNumber": p.uint256, "blockHash": p.bytes32, "returnData": p.array(p.struct({"success": p.bool, "returnData": p.bytes}))}),
}

export class Contract extends ContractBase {

    getBasefee() {
        return this.eth_call(functions.getBasefee, {})
    }

    getBlockHash(blockNumber: GetBlockHashParams["blockNumber"]) {
        return this.eth_call(functions.getBlockHash, {blockNumber})
    }

    getBlockNumber() {
        return this.eth_call(functions.getBlockNumber, {})
    }

    getChainId() {
        return this.eth_call(functions.getChainId, {})
    }

    getCurrentBlockCoinbase() {
        return this.eth_call(functions.getCurrentBlockCoinbase, {})
    }

    getCurrentBlockDifficulty() {
        return this.eth_call(functions.getCurrentBlockDifficulty, {})
    }

    getCurrentBlockGasLimit() {
        return this.eth_call(functions.getCurrentBlockGasLimit, {})
    }

    getCurrentBlockTimestamp() {
        return this.eth_call(functions.getCurrentBlockTimestamp, {})
    }

    getEthBalance(addr: GetEthBalanceParams["addr"]) {
        return this.eth_call(functions.getEthBalance, {addr})
    }

    getLastBlockHash() {
        return this.eth_call(functions.getLastBlockHash, {})
    }
}

/// Function types
export type AggregateParams = FunctionArguments<typeof functions.aggregate>
export type AggregateReturn = FunctionReturn<typeof functions.aggregate>

export type Aggregate3Params = FunctionArguments<typeof functions.aggregate3>
export type Aggregate3Return = FunctionReturn<typeof functions.aggregate3>

export type Aggregate3ValueParams = FunctionArguments<typeof functions.aggregate3Value>
export type Aggregate3ValueReturn = FunctionReturn<typeof functions.aggregate3Value>

export type BlockAndAggregateParams = FunctionArguments<typeof functions.blockAndAggregate>
export type BlockAndAggregateReturn = FunctionReturn<typeof functions.blockAndAggregate>

export type GetBasefeeParams = FunctionArguments<typeof functions.getBasefee>
export type GetBasefeeReturn = FunctionReturn<typeof functions.getBasefee>

export type GetBlockHashParams = FunctionArguments<typeof functions.getBlockHash>
export type GetBlockHashReturn = FunctionReturn<typeof functions.getBlockHash>

export type GetBlockNumberParams = FunctionArguments<typeof functions.getBlockNumber>
export type GetBlockNumberReturn = FunctionReturn<typeof functions.getBlockNumber>

export type GetChainIdParams = FunctionArguments<typeof functions.getChainId>
export type GetChainIdReturn = FunctionReturn<typeof functions.getChainId>

export type GetCurrentBlockCoinbaseParams = FunctionArguments<typeof functions.getCurrentBlockCoinbase>
export type GetCurrentBlockCoinbaseReturn = FunctionReturn<typeof functions.getCurrentBlockCoinbase>

export type GetCurrentBlockDifficultyParams = FunctionArguments<typeof functions.getCurrentBlockDifficulty>
export type GetCurrentBlockDifficultyReturn = FunctionReturn<typeof functions.getCurrentBlockDifficulty>

export type GetCurrentBlockGasLimitParams = FunctionArguments<typeof functions.getCurrentBlockGasLimit>
export type GetCurrentBlockGasLimitReturn = FunctionReturn<typeof functions.getCurrentBlockGasLimit>

export type GetCurrentBlockTimestampParams = FunctionArguments<typeof functions.getCurrentBlockTimestamp>
export type GetCurrentBlockTimestampReturn = FunctionReturn<typeof functions.getCurrentBlockTimestamp>

export type GetEthBalanceParams = FunctionArguments<typeof functions.getEthBalance>
export type GetEthBalanceReturn = FunctionReturn<typeof functions.getEthBalance>

export type GetLastBlockHashParams = FunctionArguments<typeof functions.getLastBlockHash>
export type GetLastBlockHashReturn = FunctionReturn<typeof functions.getLastBlockHash>

export type TryAggregateParams = FunctionArguments<typeof functions.tryAggregate>
export type TryAggregateReturn = FunctionReturn<typeof functions.tryAggregate>

export type TryBlockAndAggregateParams = FunctionArguments<typeof functions.tryBlockAndAggregate>
export type TryBlockAndAggregateReturn = FunctionReturn<typeof functions.tryBlockAndAggregate>

