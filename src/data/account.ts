import { timeStamp } from "node:console";
import { askBackgroundViewMethod } from "../background/askBackground.js";
import { yton, ytond } from "../util/conversions.js";
import { TOKEN_DEFAULT_SVG } from "../util/svg_const.js";
import { nearDollarPrice } from "./global.js";

//user NEAR accounts info type
export class Account {
  public order: number;
  public note: string;
  public lockedOther: number;//locked for other reasons, e.g. this is a lockup-contract {type:"lock.c"}
  public assets: Asset[] = []; //assets
  public history: History[] = []; //history
  constructor(
    public network: string,
    public type: "acc" | "lock.c" = "acc",
    public lastBalance: number = 0, // native balance from rpc:query/account & near state
    // stakingPool?: string;
    // staked: number = 0; // in the pool & staked
    // unstaked: number = 0; // in the pool & unstaked (maybe can withdraw)
    // rewards: number = 0; //Staking-pool rewards (initial staking - (staked+unstaked))
    // stakingPoolPct?: number;
    public privateKey?: string,
    public ownerId?: string, //ownerId if this is a lockup-contract {type:"lock.c"}
    //contacts: Contact[] = [];

  ) {
    this.order = 0;
    this.note = "";
    this.lockedOther = 0;
    this.assets = [];
    this.history = []
  };

  // get totalInThePool(): number {
  //   return this.staked + this.unstaked;
  // }
}

export class Contact {
  accountId: string = "";
  alias: string = "";
}

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

  addHistory(
    type: string,
    amount: number,
    destination?: string,
    icon?: string
  ) {
    let hist = new History(type, amount, destination, icon);
    this.history.unshift(hist);
  }

}

// note: moved outside so it works with POJOs
export function assetSetBalanceYoctos(asset: Asset, yoctos: string): number {
  asset.balance = ytond(yoctos, asset.decimals || 24);
  return asset.balance
}

export async function assetUpdateBalance(asset: Asset, accountId: string): Promise<number> {
  if (asset.type = "ft") {
    let balanceYoctos = await askBackgroundViewMethod(
      asset.contractId, "ft_balance_of", { account_id: accountId }
    );
    return assetSetBalanceYoctos(asset, balanceYoctos);
  }
  else {
    throw Error("assetUpdateBalance only supports ft")
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
  icon: string = "";

  constructor(type: string, amount: number, destination?: string, icon?: string) {
    this.amount = amount;
    this.date = new Date().toISOString();
    this.type = type;
    this.destination = destination || "";
    this.icon = icon || "";

    // commented. use https://www.w3schools.com/csSref/css3_pr_text-overflow.asp
    // if (destination.length> 27)
    //     destination= destination.substring(0, 24) + "..."
    // }

  }
}

export class ExtendedAccountData {
  //type: string; //small-type + note
  name: string;
  //accessStatus: string;
  typeFull: string; //full-type + note
  accountInfo: Account;
  total: number; //lastBalance+inThePool
  totalUSD: number; //lastBalance+inThePool * NEAR price
  unlockedOther: number;
  available: number;

  findAsset(contractId: string, symbol?: string): Asset | undefined {
    for (var assetPojo of this.accountInfo.assets) {
      if (
        assetPojo.contractId == contractId && (symbol == undefined || assetPojo.symbol == symbol)
      )
        return assetPojo; // returns a pointer
    }
    return undefined;
  }

  findAssetByType(type: string): Asset | undefined {
    for (var assetPojo of this.accountInfo.assets) {
      if (assetPojo.type == type) {
        return assetPojo; // returns a pointer
      }
    }
    return undefined;
  }

  removeAsset(contractId: string, type?: string) {
    let inx = 0;
    for (var asset of this.accountInfo.assets) {
      if (asset.contractId == contractId && (type == undefined || asset.type == type)) {
        this.accountInfo.assets.splice(inx, 1)
        break;
      }
      inx++
    }
  }

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

    //this.accessStatus = this.isReadOnly ? "Read Only" : "Full Access";

    if (!this.accountInfo.assets) this.accountInfo.assets = [];
    //if (!this.accountInfo.contacts) this.accountInfo.contacts = [];
    // if (!this.accountInfo.staked) this.accountInfo.staked = 0;
    // if (!this.accountInfo.unstaked) this.accountInfo.unstaked = 0;
    // this.inThePool = this.accountInfo.staked + this.accountInfo.unstaked;

    if (!this.accountInfo.lockedOther) this.accountInfo.lockedOther = 0;
    this.unlockedOther =
      this.accountInfo.lastBalance -
      // this.inThePool -
      this.accountInfo.lockedOther;

    this.available =
      this.accountInfo.lastBalance - this.accountInfo.lockedOther;

    if (this.isLockup) {
      this.available = Math.max(0, this.available - 4);
    }
    this.total = accountInfo.lastBalance;

    this.totalUSD = this.total * nearDollarPrice;
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
