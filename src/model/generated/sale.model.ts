import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, ManyToOne as ManyToOne_, Index as Index_, BytesColumn as BytesColumn_} from "@subsquid/typeorm-store"
import {SaleType} from "./_saleType"
import {NFT} from "./nft.model"

@Entity_()
export class Sale {
    constructor(props?: Partial<Sale>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Column_("varchar", {length: 5, nullable: false})
    type!: SaleType

    @StringColumn_({nullable: false})
    buyer!: string

    @StringColumn_({nullable: false})
    seller!: string

    @BigIntColumn_({nullable: false})
    price!: bigint

    @Index_()
    @ManyToOne_(() => NFT, {nullable: true})
    nft!: NFT

    @BigIntColumn_({nullable: false})
    timestamp!: bigint

    @StringColumn_({nullable: false})
    txHash!: string

    @BigIntColumn_({nullable: false})
    searchTokenId!: bigint

    @BytesColumn_({nullable: false})
    searchContractAddress!: Uint8Array

    @StringColumn_({nullable: false})
    searchCategory!: string
}
