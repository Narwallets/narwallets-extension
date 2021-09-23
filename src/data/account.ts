import { timeStamp } from "node:console";
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

  public spec:string; // ft metadata spec
  public url:string; // ft metadata url
  history: History[];

  constructor(
    public contractId: string = "",
    public balance: number = 0,
    public type: string = "ft",
    public symbol: string = "",
    public icon: string = "",
  ) {
    this.spec="" 
    this.url="" 
    this.history = []
  };

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
    for (var asset of this.accountInfo.assets) {
      if (
        asset.contractId == contractId &&
        (symbol == undefined || asset.symbol == symbol)
      )
        return asset;
    }
    return undefined;
  }

  findAssetByType(type: string): Asset | undefined {
    for (var asset of this.accountInfo.assets) {
      if (asset.type == type) {
        return asset;
      }
    }
    return undefined;
  }

  removeAsset(contractId: string, type?: string) {
    let inx = 0;
    for (var asset of this.accountInfo.assets) {
      if (asset.contractId == contractId && (type==undefined || asset.type == type) ) {
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
