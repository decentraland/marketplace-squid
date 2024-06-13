import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, OneToMany as OneToMany_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {NFT} from "./nft.model"

@Entity_()
export class Account {
    constructor(props?: Partial<Account>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    address!: string

    @OneToMany_(() => NFT, e => e.owner)
    nfts!: NFT[]

    @IntColumn_({nullable: false})
    sales!: number

    @IntColumn_({nullable: false})
    purchases!: number

    @BigIntColumn_({nullable: false})
    spent!: bigint

    @BigIntColumn_({nullable: false})
    earned!: bigint
}
