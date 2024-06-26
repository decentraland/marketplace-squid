import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, BytesColumn as BytesColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, OneToMany as OneToMany_, OneToOne as OneToOne_, JoinColumn as JoinColumn_, IntColumn as IntColumn_, BooleanColumn as BooleanColumn_} from "@subsquid/typeorm-store"
import {Category} from "./_category"
import {Account} from "./account.model"
import {Order} from "./order.model"
import {Bid} from "./bid.model"
import {Parcel} from "./parcel.model"
import {Estate} from "./estate.model"
import {Wearable} from "./wearable.model"
import {ENS} from "./ens.model"
import {OrderStatus} from "./_orderStatus"
import {WearableCategory} from "./_wearableCategory"
import {WearableBodyShape} from "./_wearableBodyShape"

@Entity_()
export class NFT {
    constructor(props?: Partial<NFT>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    tokenId!: bigint

    @BytesColumn_({nullable: false})
    contractAddress!: Uint8Array

    @Column_("varchar", {length: 8, nullable: false})
    category!: Category

    @Index_()
    @ManyToOne_(() => Account, {nullable: true})
    owner!: Account

    @StringColumn_({nullable: true})
    tokenURI!: string | undefined | null

    @OneToMany_(() => Order, e => e.nft)
    orders!: Order[]

    @OneToMany_(() => Bid, e => e.nft)
    bids!: Bid[]

    @Index_()
    @ManyToOne_(() => Order, {nullable: true})
    activeOrder!: Order | undefined | null

    @StringColumn_({nullable: true})
    name!: string | undefined | null

    @StringColumn_({nullable: true})
    image!: string | undefined | null

    @Index_({unique: true})
    @OneToOne_(() => Parcel, {nullable: true})
    @JoinColumn_()
    parcel!: Parcel | undefined | null

    @Index_({unique: true})
    @OneToOne_(() => Estate, {nullable: true})
    @JoinColumn_()
    estate!: Estate | undefined | null

    @Index_({unique: true})
    @OneToOne_(() => Wearable, {nullable: true})
    @JoinColumn_()
    wearable!: Wearable | undefined | null

    @Index_({unique: true})
    @OneToOne_(() => ENS, {nullable: true})
    @JoinColumn_()
    ens!: ENS | undefined | null

    @BigIntColumn_({nullable: false})
    createdAt!: bigint

    @BigIntColumn_({nullable: false})
    updatedAt!: bigint

    @BigIntColumn_({nullable: true})
    soldAt!: bigint | undefined | null

    @BigIntColumn_({nullable: false})
    transferredAt!: bigint

    @IntColumn_({nullable: false})
    sales!: number

    @BigIntColumn_({nullable: false})
    volume!: bigint

    @Column_("varchar", {length: 9, nullable: true})
    searchOrderStatus!: OrderStatus | undefined | null

    @BigIntColumn_({nullable: true})
    searchOrderPrice!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    searchOrderExpiresAt!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    searchOrderCreatedAt!: bigint | undefined | null

    @BooleanColumn_({nullable: true})
    searchIsLand!: boolean | undefined | null

    @StringColumn_({nullable: true})
    searchText!: string | undefined | null

    @BooleanColumn_({nullable: true})
    searchParcelIsInBounds!: boolean | undefined | null

    @BigIntColumn_({nullable: true})
    searchParcelX!: bigint | undefined | null

    @BigIntColumn_({nullable: true})
    searchParcelY!: bigint | undefined | null

    @StringColumn_({nullable: true})
    searchParcelEstateId!: string | undefined | null

    @IntColumn_({nullable: true})
    searchDistanceToPlaza!: number | undefined | null

    @BooleanColumn_({nullable: true})
    searchAdjacentToRoad!: boolean | undefined | null

    @IntColumn_({nullable: true})
    searchEstateSize!: number | undefined | null

    @BooleanColumn_({nullable: true})
    searchIsWearableHead!: boolean | undefined | null

    @BooleanColumn_({nullable: true})
    searchIsWearableAccessory!: boolean | undefined | null

    @StringColumn_({nullable: true})
    searchWearableRarity!: string | undefined | null

    @Column_("varchar", {length: 11, nullable: true})
    searchWearableCategory!: WearableCategory | undefined | null

    @Column_("varchar", {length: 10, array: true, nullable: true})
    searchWearableBodyShapes!: (WearableBodyShape)[] | undefined | null
}
