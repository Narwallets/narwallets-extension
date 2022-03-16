import { timeStamp } from "node:console";
import { askBackground, askBackgroundSetAccount, askBackgroundViewMethod } from "../background/askBackground.js";
import { LockupContract } from "../contracts/LockupContract.js";
import { activeNetworkInfo } from "../index.js";
import * as c from "../util/conversions.js";
import { getLockupContract } from "../util/search-accounts.js";
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

export function assetDivId(item:Asset): string {
  return item.contractId.replace(/\./g,"-dot-").replace(/\#/g,"-hash-").replace(/\&/g,"-amp-") + (item.symbol=="STAKED"||item.symbol=="UNSTAKED"? item.symbol : "")
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

  public balance: number = 0;
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
export function assetSetBalanceYoctos(asset: Asset, yoctos: string): number {
  asset.balance = c.ytond(yoctos, asset.decimals || 24);
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
        asset.balance = c.yton(poolAccInfo.unstaked_balance);
      } else if (asset.symbol == "STAKED") {
        asset.balance = c.yton(poolAccInfo.staked_balance);
      }
    }
  }
  else if (asset.type == "ft") {
    if (asset.decimals == undefined) await assetUpdateMetadata(asset);

    let balanceYoctos = await askBackgroundViewMethod(
      asset.contractId, "ft_balance_of", { account_id: accountId }
    );
    assetSetBalanceYoctos(asset, balanceYoctos);
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

export class ExtendedAccountData {
  //type: string; //small-type + note
  name: string;
  //accessStatus: string;
  typeFull: string; //full-type + note
  accountInfo: Account;
  total: number = 0; //lastBalance+inThePool
  totalUSD: number = 0; //lastBalance+inThePool * NEAR price
  unlockedOther: number = 0;
  available: number = 0;

  constructor(name: string, accountInfo: Account) {
    this.name = name;
    this.accountInfo = accountInfo;
    const typeFullTranslation: Record<string, string> = {
      acc: "Account",
      "lock.c": "Lockup Contract",
    };
    this.accountInfo.assets = accountInfo.assets;

    //this.type = this.accountInfo.type;
    this.typeFull = typeFullTranslation[this.accountInfo.type];
    if (this.accountInfo.note) {
      const formattedNote = " (" + this.accountInfo.note + ")";
      //this.type += formattedNote;
      this.typeFull += formattedNote;
    }

    this.recomputeTotals()
    //this.accessStatus = this.isReadOnly ? "Read Only" : "Full Access";

    if (!this.accountInfo.assets) this.accountInfo.assets = [];
    //if (!this.accountInfo.contacts) this.accountInfo.contacts = [];
    // if (!this.accountInfo.staked) this.accountInfo.staked = 0;
    // if (!this.accountInfo.unstaked) this.accountInfo.unstaked = 0;
    // this.inThePool = this.accountInfo.staked + this.accountInfo.unstaked;

    /*if (accountInfo.history) {
      accountInfo.history.forEach((element) => {
        element.date = new Date(element.date).toLocaleString();
      });
    }
    if (accountInfo.assets) {
      accountInfo.assets.forEach((element) => {
        if (element.history) {
          element.history.forEach((elementInside) => {
            elementInside.date = new Date(elementInside.date).toLocaleString();
          });
        }
      });
    }*/
  }

  recomputeTotals() {
    if (!this.accountInfo.lockedOther) this.accountInfo.lockedOther = 0;

    this.unlockedOther = this.accountInfo.lastBalance - this.accountInfo.lockedOther;

    this.available = this.accountInfo.lastBalance - this.accountInfo.lockedOther;
    if (this.isLockup) {
      this.available = Math.max(0, this.available - 4);
    }

    this.total = this.accountInfo.lastBalance;

    this.totalUSD = this.total * nearDollarPrice;

  }

  async refreshLastBalance() {
    await asyncRefreshAccountInfoLastBalance(
      this.name,
      this.accountInfo
    );
    this.recomputeTotals()
  }

  get isReadOnly() {
    return !this.accountInfo.privateKey;
  }
  get isFullAccess() {
    return !this.isReadOnly;
  }
  get isLockup() {
    return this.accountInfo.type == "lock.c"
  }

}

export async function asyncRefreshAccountInfoLastBalance(accName: string, info: Account, save:boolean=true) {
  const suffix = LockupContract.getLockupSuffix();
  if (accName.endsWith(suffix)) {
    //lockup contract
    if (!info.ownerId) return;
    //get lockup contract data and update info param
    const lockup = await getLockupContract(info);
    if (!lockup) return;
    //
  } else {
    //normal account
    let stateResultYoctos;
    try {
      stateResultYoctos = await askBackground({
        code: "query-near-account",
        accountId: accName,
      });
    } catch (ex) {
      const err = ex as Error
      let reason = (err.message && err.message.includes("name:UNKNOWN_ACCOUNT")) ? `not found in ${activeNetworkInfo.name}` : err.message;
      throw Error(`account:"${accName}", Error:${reason}`);
    }

    let newBalance = c.yton(stateResultYoctos.amount);
    if (newBalance != info.lastBalance) {
      info.lastBalance = newBalance
      // save updated balance
      if (save) askBackgroundSetAccount(accName,info);
    }

    // if (info.stakingPool) {
    //     const previnThePool = info.staked + info.unstaked;
    //     const stakingInfo = await StakingPool.getAccInfo(accName, info.stakingPool)
    //     info.staked = c.yton(stakingInfo.staked_balance)
    //     info.unstaked = c.yton(stakingInfo.unstaked_balance)
    //     info.rewards = previnThePool > 0 ? info.staked + info.unstaked - previnThePool : 0;
    //     if (info.rewards < 0) info.rewards = 0;
    //     info.stakingPoolPct = await StakingPool.getFee(info.stakingPool)
    // }
    // else {
    //     info.staked = 0
    //     info.unstaked = 0
    // }
  }
}
