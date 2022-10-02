import { timeStamp } from "node:console";
import { askBackground, askBackgroundSetAccount, askBackgroundViewMethod } from "../background/askBackground.js";
import * as c from "../util/conversions.js";
import { TOKEN_DEFAULT_SVG } from "../util/svg_const.js";
import { nearDollarPrice } from "./global.js";
import * as StakingPool from "../contracts/staking-pool.js"

//------------------------------------------------
// user NEAR accounts info type
// these are types and not classes because when serializing and deserializing to SecureState
// all data is converted to POJO. So to avoid re-hydrating issues, let's use POJOs and static functions 
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

export function assetAmount(self: Asset, amountString: string): number {
  return c.ytond(amountString, self.decimals);
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
  asset.balance = c.ytond(yoctos, asset.decimals || 24);
  asset.balanceTimestamp = Date.now()
  return asset.balance
}

export async function assetUpdateBalance(asset: Asset, accountId: string): Promise<void> {

  if (asset.type == "stake" || asset.type == "unstake") {
    if (asset.symbol == "UNSTAKED" || asset.symbol == "STAKED") {
      let poolAccInfo = await StakingPool.getAccInfo(
        accountId,
        asset.contractId
      );
      if (asset.symbol == "UNSTAKED") {
        setAssetBalanceYoctos(asset, poolAccInfo.unstaked_balance);
      } else if (asset.symbol == "STAKED") {
        setAssetBalanceYoctos(asset, poolAccInfo.staked_balance);
      }
    }
  }
  else if (asset.type == "ft") {
    if (asset.decimals == undefined) await assetUpdateMetadata(asset);

    let balanceYoctos = await askBackgroundViewMethod(
      asset.contractId, "ft_balance_of", { account_id: accountId }
    );
    setAssetBalanceYoctos(asset, balanceYoctos);
  }

}

export function updateTokenAssetFromMetadata(item: Asset, metaData: any) {
  item.symbol = metaData.symbol;
  item.decimals = metaData.decimals;
  if (metaData.icon?.startsWith("<svg")) {
    item.icon = metaData.icon;
  } else if (metaData.icon?.startsWith("data:image")) {
    item.icon = `<img src="${metaData.icon}">`;
  } else {
    item.icon = TOKEN_DEFAULT_SVG;
  }
  item.url = metaData.reference;
  item.spec = metaData.spec;
}

export async function assetUpdateMetadata(item: Asset): Promise<Asset> {
  let metaData = await askBackgroundViewMethod(item.contractId, "ft_metadata", {});
  updateTokenAssetFromMetadata(item, metaData)
  return item
}

export async function newTokenFromMetadata(contractId: string): Promise<Asset> {
  let item = new Asset(contractId, "ft");
  let metaData = await askBackgroundViewMethod(contractId, "ft_metadata", {});
  updateTokenAssetFromMetadata(item, metaData)
  return item
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

