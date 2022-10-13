import { LockupContract } from "./contracts/LockupContract.js";
import { getLockupContract } from "./util/search-accounts.js";

import { activeNetworkInfo, askBackground, askBackgroundSetAccount, askBackgroundViewMethod } from "./askBackground.js";
import { yton } from "./util/conversions.js";
import { nearDollarPrice } from "./data/price-data.js";
import { Account } from "./structs/account-info.js";


export class ExtendedAccountData {
  //type: string; //small-type + note
  name: string;
  //accessStatus: string;
  typeFull: string; //full-type + note
  accountInfo: Account;
  total: number | undefined = undefined; //lastBalance+inThePool
  totalUSD: number | undefined = undefined; //lastBalance+inThePool * NEAR price
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

    // 1 min valid cache
    if (this.accountInfo.lastBalanceTimestamp == undefined || this.accountInfo.lastBalanceTimestamp < Date.now() - 60 * 1000) {
      this.total = undefined;
      this.totalUSD = undefined;
    }
    else {
      this.total = this.accountInfo.lastBalance;
      this.totalUSD = this.total * nearDollarPrice;
    }
  }

  async refreshLastBalance() {
    await tryAsyncRefreshAccountInfoLastBalance(
      this.name,
      this.accountInfo
    );
    try {
      if (this.accountInfo.type == "lock.c") {
        const locked = await askBackgroundViewMethod(this.name, "get_locked_amount", {})
        this.accountInfo.lockedOther = yton(locked) + 35 // 35 NEAR are locked in lock-accounts to backup storage
      }
    } catch (ex) {
      console.error(ex)
    }
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

/// try AsyncRefreshAccountInfoLastBalance and just log error if failure (network timeout, bad account, etc)
export async function tryAsyncRefreshAccountInfoLastBalance(accName: string, info: Account, save: boolean = true) {
  try {
    await asyncRefreshAccountInfoLastBalance(accName,info,save)
  }
  catch(ex){
    console.error(JSON.stringify(ex))
  }
}

/// AsyncRefreshAccountInfoLastBalance and throw if error 
export async function asyncRefreshAccountInfoLastBalance(accName: string, info: Account, save: boolean = true) {

  let stateResultYoctos;
  try {
    stateResultYoctos = await askBackground({
      code: "query-near-account",
      accountId: accName,
    });
  } catch (ex) {
    console.error(ex)
    const err = ex as Error
    let reason = (err.message && err.message.includes("name:UNKNOWN_ACCOUNT")) ? `not found in ${activeNetworkInfo.name}` : err.message;
    throw Error(`account:"${accName}", Error:${reason}`);
  }
  let newBalance = yton(stateResultYoctos.amount);

  info.lastBalance = newBalance
  info.lastBalanceTimestamp = Date.now()
  // save updated balance
  if (save) {
    askBackgroundSetAccount(accName, info);
  }

}
