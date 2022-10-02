//------------------------------------------------
// user NEAR accounts info type
// these are types and not classes because when serializing and deserializing to SecureState
// all data is converted to POJO. So to avoid re-hydrating issues, let's use POJOs and static functions 

import { ytond } from "../util/conversions.js";

// with a first "self" parameter
export type Account = {
    order: number;
    network: string,
    type: "acc" | "lock.c",
    lastBalance: number, // native balance from rpc:query/account & near state
    lastBalanceTimestamp: number, // native balance from rpc:query/account & near state
    // stakingPool?: string;
    // staked: number = 0; // in the pool & staked
    // unstaked: number = 0; // in the pool & unstaked (maybe can withdraw)
    // rewards: number = 0; //Staking-pool rewards (initial staking - (staked+unstaked))
    // stakingPoolPct?: number;
    privateKey?: string,
    ownerId?: string, //ownerId if this is a lockup-contract {type:"lock.c"}
    //contacts: Contact[] = [];
    note: string;
    lockedOther: number;//locked for other reasons, e.g. this is a lockup-contract {type:"lock.c"}
    assets: Asset[];
    history: History[];
}

//------------------------------------------------
// be careful because Account.assets[] is an array of POJOs, not Assets instances (because serialization/de-serialization)
// only asset_selected is rehydrated
export class Asset {

    public balance: number | undefined = undefined;
    public balanceTimestamp: number = 0;
    public spec: string = ""; // ft metadata spec
    public url: string = ""; // ft metadata url
    history: History[] = [];

    constructor(
        public contractId: string = "",
        public type: string = "ft",
        public symbol: string = "",
        public icon: string = "",
        public decimals: number = 24,
    ) { };

    static newFrom(assetToClone: Asset) {
        let result = new Asset();
        // copy contract, type, symbol, info
        Object.assign(result, assetToClone);
        // clear some fields
        result.balance = 0;
        result.history = []
        return result
    }

}

export class History {
    date: string = ""; //store as date.toISOString() so JSON.stringify/parse does not change the value
    type: string = "send";
    amount: number = 0;
    destination: string = "";
    icon: string | undefined = undefined; // auto-set on populate

    constructor(type: string, amount: number, destination?: string) {
        this.amount = amount;
        this.date = new Date().toISOString();
        this.type = type;
        this.destination = destination || "";
    }
}


export const ASSET_HISTORY_TEMPLATE = `
    <div id="{key}">
      <div class="history-line">
        <div class="history-icon">{icon}</div>
        <div class="history-type">{type}&nbsp;
          <span class="history-contract-id">{destination}</span>
        </div>
        <div class="history-date">{date}</div>
        <div class="history-amount">{amount}</div>
        <div class="history-fiat"></div>
      </div>
    </div>
  `;

export function newAccount(network: string): Account {
    return {
        network: network,
        order: 0,
        type: "acc",
        lastBalance: 0,
        lastBalanceTimestamp: 0,
        note: "",
        lockedOther: 0,
        assets: [],
        history: []
    };
}

export function findAsset(self: Account, contractId: string, symbol?: string): Asset | undefined {
    for (var assetPojo of self.assets) {
        if (
            assetPojo.contractId == contractId && (symbol == undefined || assetPojo.symbol == symbol)
        )
            return assetPojo; // returns a pointer
    }
    return undefined;
}

export function assetDivId(item: Asset): string {
    // warning this id is not a valid selector, use [id="a.b.c."] for document.querySelector
    return item.symbol + "." + item.contractId
    //return item.contractId.replace(/\./g, "-dot-").replace(/\#/g, "-hash-").replace(/\&/g, "-amp-") + (item.symbol == "STAKED" || item.symbol == "UNSTAKED" ? item.symbol : "")
}

export function findAssetIndex(self: Account, contractId: string, symbol?: string): number {
    let index = 0
    for (var assetPojo of self.assets) {
        if (
            assetPojo.contractId == contractId && (symbol == undefined || assetPojo.symbol == symbol)
        ) {
            return index; // returns an index
        }
        index += 1
    }
    return -1;
}

export function removeAsset(self: Account, contractId: string, type?: string) {
    let inx = 0;
    for (var asset of self.assets) {
        if (asset.contractId == contractId && (type == undefined || asset.type == type)) {
            self.assets.splice(inx, 1)
            break;
        }
        inx++
    }
}

//------------------------------------------------
export class Contact {
    accountId: string = "";
    alias: string = "";
}

export function assetAmount(self: Asset, amountString: string): number {
    return ytond(amountString, self.decimals);
}

// note: moved outside so it works with POJOs
export function assetAddHistory(
    self: Asset,
    type: string,
    amount: number,
    destination?: string,
) {
    let hist = new History(type, amount, destination);
    self.history.unshift(hist);
}

// note: moved outside so it works with POJOs
export function setAssetBalanceYoctos(asset: Asset, yoctos: string): number {
    asset.balance = ytond(yoctos, asset.decimals || 24);
    asset.balanceTimestamp = Date.now()
    return asset.balance
}

