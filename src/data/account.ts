import { timeStamp } from "node:console";
import { nearDollarPrice } from "./global.js";

//user NEAR accounts info type
export class Account {
  order: number = 0;
  type: "acc" | "lock.c" = "acc";
  note: string = "";
  lastBalance: number = 0; // native balance from rpc:query/account & near state
  // stakingPool?: string;
  // staked: number = 0; // in the pool & staked
  // unstaked: number = 0; // in the pool & unstaked (maybe can withdraw)
  // rewards: number = 0; //Stakingpool rewards (initial staking - (staked+unstaked))
  // stakingPoolPct?: number;
  privateKey?: string;
  ownerId?: string; //ownerId if this is a lockup-contract {type:"lock.c"}
  lockedOther: number = 0; //locked for other reasons, e.g. this is a lockup-contract {type:"lock.c"}
  assets: Asset[] = []; //assets
  history: History[] = []; //history
  contacts: Contact[] = [];

  // get totalInThePool(): number {
  //   return this.staked + this.unstaked;
  // }
}

export class Contact {
  accountId: string = "";
  alias: string = "";
}

export class Asset {
  spec: string = "";
  url: string = "";
  contractId: string = "";
  balance: number = 0;
  type: string = "ft";
  symbol: string = "";
  history: History[] = [];
  icon: string = "";
}

export class History {
  date: string = "";
  type: string = "send";
  ammount: number = 0;
}

export class ExtendedAccountData {
  type: string; //small-type + note
  name: string;
  accessStatus: string;
  typeFull: string; //full-type + note
  accountInfo: Account;
  total: number; //lastBalance+inThePool
  totalUSD: number; //lastBalance+inThePool * NEAR price
  unlockedOther: number;
  available: number;
  // inThePool: number;

  constructor(name: string, accountInfo: Account) {
    this.name = name;
    this.accountInfo = accountInfo;
    const typeFullTranslation: Record<string, string> = {
      acc: "Account",
      "lock.c": "Lockup Contract",
    };
    this.accountInfo.assets = accountInfo.assets;

    this.type = this.accountInfo.type;
    this.typeFull = typeFullTranslation[this.accountInfo.type];
    if (this.accountInfo.note) {
      const formattedNote = " (" + this.accountInfo.note + ")";
      this.type += formattedNote;
      this.typeFull += formattedNote;
    }

    this.accessStatus = this.isReadOnly ? "Read Only" : "Full Access";

    if (!this.accountInfo.assets) this.accountInfo.assets = [];
    if (!this.accountInfo.contacts) this.accountInfo.contacts = [];
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

    if (this.accountInfo.type == "lock.c") {
      this.available = Math.max(0, this.available - 4);
    }
    this.total = accountInfo.lastBalance;

    this.totalUSD = this.total * nearDollarPrice;
    if (accountInfo.history) {
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
    }
  }

  get isReadOnly() {
    return !this.accountInfo.privateKey;
  }
  get isFullAccess() {
    return !this.isReadOnly;
  }
}
