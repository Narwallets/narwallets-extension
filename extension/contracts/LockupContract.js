import * as c from "../util/conversions.js"
import * as d from "../util/document.js"

import * as sha256 from "../api/sha256.js"
import * as naclUtil from "../util/tweetnacl/nacl-util.js";
import * as near from "../api/near-rpc.js";
import * as StakingPool from "../api/staking-pool.js";
import * as TX from "../api/transaction.js";
import { Account } from "../api/account.js"
import {isValidAccountID} from "../api/utils/valid.js";
import { askBackgroundGetNetworkInfo } from "../api/askBackground.js";

/*+
import { BN } from "../bundled-types/BN.js";
import type {StakingPoolAccountInfoResult} from "../api/staking-pool.js";
+*/

export class LockupContract {

  contractAccount/*:string*/=""
  accountInfo/*:Account*/
  liquidBalance/*:number*/ = 0
  locked/*:number*/ = 0

  BASE_GAS/*:BN*/;
  BN_ZERO/*:BN*/;

  constructor(info/*:Account*/) {
    this.BASE_GAS = new BN("25" + "0".repeat(12));
    this.BN_ZERO = new BN("0");
    this.accountInfo = info
    this.accountInfo.type = "lock.c"
  }

  static hexContractAccount(accountId /*:string*/) {
    const b = sha256.hash(naclUtil.decodeUTF8(accountId)).buffer
    const hex = near.bufferToHex(b)
    return `${hex.slice(0, 40)}`;
  }

  static async getLockupSuffix() {
    const networkInfo = await askBackgroundGetNetworkInfo()
    const rootAccount = networkInfo.rootAccount
    //HACK to test lockup contracts in testnet - until core devs provide a way to
    //create xxx.lockup.testnet accounts- we use .lockupy.testnet, that we created
    const lockupSuffix = (rootAccount == "testnet" ? "lockupy" : "lockup")
    return "." + lockupSuffix + "." + rootAccount;
  }

  async computeContractAccount(){
    const owner=this.accountInfo.ownerId
    if (!owner) throw Error("missing accountInfo.ownerId")
    const suffix = await LockupContract.getLockupSuffix()
    if (owner.endsWith(suffix)) throw Error("use the owner account Id to init a lockup contract instance")
    const hexName = LockupContract.hexContractAccount(owner)
    this.contractAccount = hexName + suffix;
  }

  async getAmount(method/*:string*/) /*:Promise<number>*/ {
    const yoctos = await near.view(this.contractAccount, method)
    return c.yton(yoctos) //cut to 4 dec places
  }

  async tryRetrieveInfo()/*:Promise<boolean>*/ {
    let firstOneOK = false;

    try {

      let stateResultYoctos = await near.queryAccount(this.contractAccount)
      this.accountInfo.lastBalance = c.yton(stateResultYoctos.amount)
      firstOneOK = true;

      this.liquidBalance = await this.getAmount("get_liquid_owners_balance")

      const ownerBal = await this.getAmount("get_owners_balance")
      const locked = await this.getAmount("get_locked_amount")

      //this.accountInfo.lastBalance = ownerBal + locked
      this.accountInfo.lockedOther = locked
      const contractKnownPoolDeposited = await this.getAmount("get_known_deposited_balance")
      this.accountInfo.stakingPool = await near.view(this.contractAccount, "get_staking_pool_account_id")
      if (this.accountInfo.stakingPool) {
        //get total amount in the staking pool to compute staking rewards
        const poolAcc = await this.getStakingPoolAccInfo()
        this.accountInfo.staked = c.yton(poolAcc.staked_balance)
        this.accountInfo.unStaked = c.yton(poolAcc.unstaked_balance)
        const inThePool = this.accountInfo.staked+this.accountInfo.unStaked
        this.accountInfo.rewards = this.accountInfo.staked + this.accountInfo.unStaked - contractKnownPoolDeposited
        this.accountInfo.stakingPoolPct = await StakingPool.getFee(this.accountInfo.stakingPool)
      }

      return true
    }
    catch (ex) {
      console.log("INFO", "retrieving lockupcontract ", ex.message);
      if (firstOneOK) d.showErr("lockup.c search error: " + ex.message) //another error
      return false
    }
  }

  //total balance - mal calculado
  // get totalBalance()/*:number*/ {
  //   return this.liquidBalance + this.locked + this.accountInfo.staked + this.accountInfo.rewards;
  // }

  //wraps a tx with  TX.functionCall(method, params, gas, this.BN_ZERO)
  call_method(method/*:string*/, params/*:any*/, gas/*:BN*/,sender/*:string*/, privateKey/*:string*/) /*:Promise<any>*/ {
    
    return near.broadcast_tx_commit_actions(
          [TX.functionCall(method, params, gas, this.BN_ZERO)],
          sender, this.contractAccount, privateKey)
  }


  //-------------------------------------------
  //owner calls
  //-------------------------------------------
  async stakeWith(sender /*:string*/, newStakingPool /*:string*/, amountNear /*:number*/, privateKey /*:string*/) /*: Promise<any>*/ {

    if (isNaN(amountNear) || amountNear <= 0) throw Error("invalid amount")

    //refresh lockup acc info - get staking pool and balances
    if (!await this.tryRetrieveInfo()) throw Error("Error refreshing lockup contract info")

    let actualSP = this.accountInfo.stakingPool
    let poolAccInfo = { //empty info
      account_id: '',
      unstaked_balance: '0',
      staked_balance: '0',
      can_withdraw: false
    };

    if (actualSP) { //there's a selected SP

      //ask the actual SP how much is staked
      poolAccInfo = await this.getStakingPoolAccInfo()

      if (actualSP != newStakingPool) { //requesting a change of SP

        if (poolAccInfo.unstaked_balance != "0" || poolAccInfo.staked_balance != "0") {
          const staked = c.yton(poolAccInfo.staked_balance)
          const inThePool = c.yton(poolAccInfo.unstaked_balance) + staked
          throw Error(`Already staking with ${actualSP}. Unstake & withdraw first. In the pool:${inThePool}, staked: ${c.toStringDec(staked)}`);
          //----------------------
        }

        //if ZERO in the pool, unselect current staking pool
        await this.call_method("unselect_staking_pool", {}, this.BASE_GAS.muln(3), sender, privateKey)

        actualSP = ""
        this.accountInfo.stakingPool = ""
      }
    }

    if (!actualSP) {
      //select the new staking pool
      await this.call_method("select_staking_pool", {staking_pool_account_id:newStakingPool}, this.BASE_GAS.muln(3), sender, privateKey)

      this.accountInfo.stakingPool = newStakingPool
      poolAccInfo = await this.getStakingPoolAccInfo() //refresh info
    }

    if (poolAccInfo.unstaked_balance != "0" && poolAccInfo.staked_balance == "0") { //deposited but unstaked, stake
      //just re-stake (maybe the user asked unstaking but now regrets it)
      await this.call_method("stake", {amount:poolAccInfo.unstaked_balance}, this.BASE_GAS.muln(5), sender, privateKey)
    }
    else {
      //deposit and stake
      await this.call_method("deposit_and_stake", { amount: near.ntoy(amountNear) }, this.BASE_GAS.muln(5), sender, privateKey)
    }

  }

  //-------------------------------
  async transfer(sender /*:string*/, amountNear /*:number*/, receiverId /*:string*/, privateKey /*:string*/) /*: Promise<any>*/ {

    if (isNaN(amountNear) || amountNear <= 0) throw Error("invalid amount")
    if (!isValidAccountID(receiverId)) throw Error("invalid receiver account Id")

    //try to transfer
    await this.call_method("transfer",{amount:near.ntoy(amountNear),receiver_id:receiverId}, this.BASE_GAS.muln(2), sender, privateKey)

  }

  //-------------------------------------------
  async getStakingPoolAccInfo()/*Promise<StakingPoolAccountInfoResult>*/ {
    if (!this.accountInfo.stakingPool) throw Error("no staking pool informed")
    return StakingPool.getAccInfo(this.contractAccount, this.accountInfo.stakingPool)
  }

  //---------------------------------------------------
  async unstakeAndWithdrawAll(sender /*:string*/, privateKey /*:string*/) /*: Promise<string>*/ {

    //refresh lockup acc info - get staking pool and balances
    if (!await this.tryRetrieveInfo()) throw Error("Error refreshing account info")

    const actualSP = await this.get_staking_pool_account_id()
    if (!actualSP) throw Error("No staking pool selected in this lockup contract");

    //check if it's staked or just in the pool but unstaked
    const poolAccInfo = await this.getStakingPoolAccInfo()

    if (poolAccInfo.staked_balance == "0") {
      //nothing staked, maybe waiting to withdrawal

      if (poolAccInfo.unstaked_balance == "0") {
        //nothing to withdraw either! unselect the staking pool
        await this.call_method("unselect_staking_pool",{}, this.BASE_GAS.muln(1), sender, privateKey)
        return "No funds left in the pool. Clearing pool selection"
        //----------------
      }

      //something to withdraw
      if (!poolAccInfo.can_withdraw) {
        throw Error("Funds are unstaked but you must wait (36-48hs) for withdrawal")
        //----------------
      }

      //ok we've unstaked funds and can withdraw 
      await this.call_method("withdraw_all_from_staking_pool",{}, this.BASE_GAS.muln(8), sender, privateKey)
      return "Withdrawing all from the pool"
      //----------------
    }

    //here we've staked balance in the pool, call unstake
    await this.call_method("unstake_all",{}, this.BASE_GAS.muln(5), sender, privateKey)

    return "Unstake requested, you must wait (36-48hs) for withdrawal"
  }

  //-------------------------------------------
  get_staking_pool_account_id() /*: Promise<string>*/ {
    return near.view(this.contractAccount, "get_staking_pool_account_id")
  }

  //-------------------------------------------
  async select_staking_pool(sender /*:string*/, stakingPool /*:string*/, privateKey /*:string*/) /*: Promise<any>*/ {

    return this.call_method("select_staking_pool",{staking_pool_account_id:stakingPool}, this.BASE_GAS.muln(3), sender, privateKey)

  }

  //-------------------------------------------
  async deposit_and_stake(sender /*:string*/, amountNear /*:number*/, privateKey /*:string*/) /*: Promise<any>*/ {

    if (isNaN(amountNear) || amountNear <= 0) throw Error("invalid amount")

    return this.call_method("deposit_and_stake",{amount:near.ntoy(amountNear)}, this.BASE_GAS.muln(5), sender, privateKey)

  }


}

