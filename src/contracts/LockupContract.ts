import * as c from "../util/conversions.js"
import * as d from "../util/document.js"

import { sha256Async } from "../lib/crypto-lite/crypto-primitives-browser.js"

//import * as near from "../api/near-rpc.js";
import * as StakingPool from "./staking-pool.js";
//import * as TX from "../api/transaction.js";
import { isValidAccountID, CheckValidAmount } from "../lib/near-api-lite/utils/valid.js";
import { activeNetworkInfo, askBackground, askBackgroundApplyTxAction, askBackgroundCallMethod, askBackgroundViewMethod } from "../askBackground.js";
import { FunctionCall } from "../lib/near-api-lite/batch-transaction.js";

import type { StakingPoolAccountInfoResult } from "./staking-pool.js";
import { encodeHex, Uint8ArrayFromString } from "../lib/crypto-lite/encode.js";
import { ExtendedAccountData } from "../extendedAccountData.js";
import { Account, removeAsset } from "../structs/account-info.js";


const BASE_GAS = 25;

export class LockupContract {

  contractAccount: string = ""
  accountInfo: Account
  accountBalanceYoctos: string = "0" // how much can be staked
  //liquidBalance: number = 0
  locked: number = 0

  constructor(info: Account) {
    this.accountInfo = info
    this.accountInfo.type = "lock.c"
  }

  static async hexContractAccountAsync(accountId: string) {
    const b = await sha256Async(Uint8ArrayFromString(accountId))
    const hex = encodeHex(new Uint8Array(b))
    return `${hex.slice(0, 40)}`;
  }

  static getLockupSuffix() {
    //HACK to test lockup contracts in testnet - until core developers provide a way to
    //create xxx.lockup.testnet accounts- we use .lockupy.testnet, that we created
    const lockupSuffix = (activeNetworkInfo.name == "testnet" ? "lockupy" : "lockup")
    return "." + lockupSuffix + "." + activeNetworkInfo.rootAccount;
  }

  async computeContractAccount() {
    const owner = this.accountInfo.ownerId
    if (!owner) throw Error("missing accountInfo.ownerId")
    const suffix = LockupContract.getLockupSuffix()
    if (owner.endsWith(suffix)) throw Error("use the owner account Id to init a lockup contract instance")
    const hexName = await LockupContract.hexContractAccountAsync(owner)
    this.contractAccount = hexName + suffix;
  }

  async getAmount(method: string): Promise<number> {
    const yoctos = await askBackgroundViewMethod(this.contractAccount, method, {})
    return c.yton(yoctos) //cut to 4 dec places
  }

  async tryRetrieveInfo(): Promise<boolean> {
    let firstOneOK = false;

    try {
      let stateResultYoctos = await askBackground({
        code: "query-near-account",
        accountId: this.contractAccount,
      });
      this.accountInfo.lastBalance = c.yton(stateResultYoctos.amount)
      this.accountInfo.lastBalanceTimestamp = Date.now()
      firstOneOK = true;

      // 35 is the reserve for storage for old lockups https://github.com/near/core-contracts/blob/master/lockup/src/lib.rs
      this.accountBalanceYoctos = (BigInt(stateResultYoctos.amount) - BigInt(c.ntoy(35))).toString() // note: get_account_balance is not published in the lockup contract -- await this.getAmount("get_account_balance")
      //this.liquidBalance = await this.getAmount("get_liquid_owners_balance")

      //const ownerBal = await this.getAmount("get_owners_balance")
      const locked = await this.getAmount("get_locked_amount")

      //this.accountInfo.lastBalance = ownerBal + locked
      this.accountInfo.lockedOther = locked + 35 //35 extra near required for lockup-contracts
      // const contractKnownPoolDeposited = await this.getAmount(
      //   "get_known_deposited_balance"
      // );

      return true;
    } catch (ex) {
      //console.log("INFO", "retrieving lockup-contract ", ex.message);
      if (firstOneOK) console.log("lockup.c search error: " + ex.message); //another error
      return false
    }
  }

  //wraps call to this lockup contract (method, params, gas)
  call_method(method: string, args: any, gas: string): Promise<any> {
    if (!this.accountInfo.ownerId) {
      throw Error("accountInfo.ownerId is undefined")
    }
    return askBackgroundApplyTxAction(
      this.contractAccount,
      new FunctionCall(method, args, gas),
      this.accountInfo.ownerId
    );
  }


  //-------------------------------------------
  //owner calls
  //-------------------------------------------
  async stakeWith(lockupEAcc: ExtendedAccountData, newStakingPool: string, amountYoctos: string): Promise<any> {
    if (c.yton(amountYoctos) <= 0) throw Error("invalid amount")

    //refresh lockup acc info - get staking pool and balances
    if (!(await this.tryRetrieveInfo())) {
      throw Error("Error refreshing lockup contract info");
    }

    let actualSP: string = await this.get_staking_pool_account_id()

    let poolAccInfo = {
      //empty info
      account_id: "",
      unstaked_balance: "0",
      staked_balance: "0",
      can_withdraw: false,
    };

    if (actualSP) {
      //ask the actual SP how much is staked
      poolAccInfo = await StakingPool.getAccInfo(this.contractAccount, actualSP)

      if (actualSP != newStakingPool) { //requesting a change of SP

        if (c.yton(poolAccInfo.unstaked_balance) >= 0.005 || c.yton(poolAccInfo.staked_balance) >= 0.005) {
          const staked = c.yton(poolAccInfo.staked_balance)
          const inThePool = c.yton(poolAccInfo.unstaked_balance) + staked
          throw Error(`Already staking with ${actualSP}. Unstake & withdraw first. In the pool:${inThePool}, staked: ${c.toStringDec(staked)}`);
          //----------------------
        }

        //if ZERO in the pool, unselect current staking pool
        await this.call_method("unselect_staking_pool", {}, c.TGas(BASE_GAS * 3))

        // remove assets (twice to cover STAKED and/or UNSTAKED)
        removeAsset(lockupEAcc.accountInfo, this.contractAccount)
        removeAsset(lockupEAcc.accountInfo, this.contractAccount)
        actualSP = ""
      }
    }

    if (!actualSP) {
      //select the new staking pool
      await this.call_method("select_staking_pool", { staking_pool_account_id: newStakingPool }, c.TGas(BASE_GAS * 3))
      actualSP = newStakingPool
      poolAccInfo = await StakingPool.getAccInfo(this.contractAccount, actualSP)
    }

    if (poolAccInfo.unstaked_balance != "0" && poolAccInfo.staked_balance == "0") { //deposited but unstaked, stake
      //just re-stake (maybe the user asked unstaking but now regrets it)
      await this.call_method("stake", { amount: poolAccInfo.unstaked_balance }, c.TGas(BASE_GAS * 5))
    }
    else {
      //deposit and stake
      await this.call_method("deposit_and_stake", { amount: amountYoctos }, c.TGas(BASE_GAS * 5))
    }

  }

  //-------------------------------
  async transfer(amountNear: number, receiverId: string): Promise<any> {

    CheckValidAmount(amountNear)
    if (!isValidAccountID(receiverId)) throw Error("invalid receiver account Id")

    //try to transfer
    await this.call_method("transfer", { amount: c.ntoy(amountNear), receiver_id: receiverId }, c.TGas(BASE_GAS * 2))

  }

  //---------------------------------------------------
  async unstakeAndWithdrawAll(signer: string, privateKey: string): Promise<string> {

    //refresh lockup acc info - get staking pool and balances
    if (!await this.tryRetrieveInfo()) throw Error("Error refreshing account info")

    const actualSP = await this.get_staking_pool_account_id()
    if (!actualSP) {
      throw Error("No staking pool selected in this lockup contract");
    }

    //check if it's staked or just in the pool but unstaked
    const poolAccInfo = await StakingPool.getAccInfo(this.contractAccount, actualSP)

    if (poolAccInfo.staked_balance == "0") {
      //nothing staked, maybe waiting to withdrawal

      if (poolAccInfo.unstaked_balance == "0") {
        //nothing to withdraw either! unselect the staking pool
        await this.call_method("unselect_staking_pool", {}, c.TGas(BASE_GAS))
        return "No funds left in the pool. Clearing pool selection"
        //----------------
      }

      //something to withdraw
      if (!poolAccInfo.can_withdraw) {
        throw Error("Funds are unstaked but you must wait (36-48hs) to withdraw")
        //----------------
      }

      //ok we've unstaked funds and can withdraw 
      await this.call_method("withdraw_all_from_staking_pool", {}, c.TGas(BASE_GAS * 8))
      return "Withdrawing all from the pool"
      //----------------
    }

    //here we've staked balance in the pool, call unstake
    await this.call_method("unstake_all", {}, c.TGas(BASE_GAS * 5))

    return "Unstake requested, you must wait (36-48hs) to withdraw"
  }

  //-------------------------------------------
  get_staking_pool_account_id(): Promise<string> {
    return askBackgroundViewMethod(this.contractAccount, "get_staking_pool_account_id", {})
  }

  //-------------------------------------------
  async select_staking_pool(signer: string, stakingPool: string, privateKey: string): Promise<any> {
    return this.call_method("select_staking_pool", { staking_pool_account_id: stakingPool }, c.TGas(BASE_GAS * 3))
  }

  //-------------------------------------------
  async deposit_and_stake(signer: string, amountNear: number, privateKey: string): Promise<any> {
    if (isNaN(amountNear) || amountNear <= 0) throw Error("invalid amount")
    return this.call_method("deposit_and_stake", { amount: c.ntoy(amountNear) }, c.TGas(BASE_GAS * 5))
  }


}

