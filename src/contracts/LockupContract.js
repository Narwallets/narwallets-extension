import * as c from "../util/conversions.js"
import * as d from "../util/document.js"
import * as Network from "../data/Network.js"
import * as sha256 from "../api/sha256.js"
import * as naclUtil from "../util/tweetnacl/nacl-util.js";
import * as near from "../api/near-rpc.js";
import * as TX from "../api/transaction.js";
/*+
import { BN } from "../bundled-types/BN.js";
+*/


export class LockupContract {

  contractAccount/*:string*/
  liquidBalanceY/*:string*/ = ""
  lockedY/*:string*/ = ""
  stakedY/*:string*/ = ""
  ownerId/*:string*/ = ""
  stakingPool/*:string*/ = ""
  stakedPlusRewardsY/*:string*/ = ""
  stakingPoolPct/*:number*/ = 0

  BASE_GAS/*:BN*/;
  
  static getLockupSuffix() {
    const rootAccount = Network.currentInfo().rootAccount
    //HACK to test lockup contracts in testnet - until core devs provide a way to
    //create xxx.lockup.testnet accounts- we use .lockupy.testnet, that we created
    const lockupSuffix = (rootAccount == "testnet" ? "lockupy" : "lockup")
    return "." + lockupSuffix + "." + rootAccount;
  }

  constructor(ownerAccountId/*:string*/) {
    this.BASE_GAS = new BN("25"+"0".repeat(12));
    const suffix = LockupContract.getLockupSuffix()
    if (ownerAccountId.endsWith(suffix)) { //already a lockup contractAccount
      this.contractAccount = ownerAccountId
    }
    else {
      const contractComputedName = LockupContract.computeContractAccount(ownerAccountId)
      this.contractAccount = contractComputedName + suffix;
      this.ownerId = ownerAccountId
    }
  }

  static computeContractAccount(accountId /*:string*/) {
    const b = sha256.hash(naclUtil.decodeUTF8(accountId)).buffer
    const hex = near.bufferToHex(b)
    return `${hex.slice(0, 40)}`;
  }

  async getAmountY(method/*:string*/) {
    return await near.view(this.contractAccount, method)
  }

  async tryRetrieveInfo()/*:Promise<boolean>*/ {
    let firstOneOK = false;
    try {
      //const ownerBalanceY = await getAmountY("get_owners_balance")
      this.liquidBalanceY = await this.getAmountY("get_liquid_owners_balance")
      firstOneOK = true;
      this.stakedY = await this.getAmountY("get_known_deposited_balance")
      this.lockedY = await this.getAmountY("get_locked_amount")
      this.stakingPool = await near.view(this.contractAccount, "get_staking_pool_account_id")
      if (this.stakingPool) {
        //get total amount in the staking pool to compute staking rewards
        this.stakedPlusRewardsY = await near.view(this.stakingPool, "get_account_total_balance", { account_id: this.contractAccount })
        this.stakingPoolPct = await near.getStakingPoolFee(this.stakingPool)
      }
      return true
    }
    catch (ex) {
      console.log("INFO", "retrieving lockupcontract ", ex.message);
      if (firstOneOK) d.showErr("lockup.c search error: " + ex.message) //another error
      return false
    }
  }

  //total balance
  get totalBalance()/*:number*/ {
    return c.ytoNN(this.liquidBalanceY) + c.ytoNN(this.lockedY) + this.rewards;
  }

  get liquidBalance()/*:number*/ {
    return c.ytoNN(this.liquidBalanceY)
  }


  get locked()/*:number*/ {
    return c.ytoNN(this.lockedY)
  }

  get staked()/*:number*/ {
    return c.ytoNN(this.stakedY) + this.rewards;
  }

  get rewards()/*:number*/ {
    if (!this.stakingPool) return 0;
    return c.ytoNN(this.stakedPlusRewardsY) - c.ytoNN(this.stakedY)
  }

  //owner calls
  async stakeWith(sender /*:string*/, stakingPool /*:string*/, amountNear /*:number*/, privateKey /*:string*/) /*: Promise<any>*/ {

    const actualSP = await this.get_staking_pool_account_id()
    if (actualSP && actualSP!=stakingPool) throw Error("Already staking with "+actualSP+ ". Unstake & withdraw first");

    if (isNaN(amountNear) || amountNear <= 0) throw Error("invalid amount")

    if (!actualSP){
      const actionsSelect = [
        TX.functionCall("select_staking_pool", { staking_pool_account_id: stakingPool }, this.BASE_GAS.muln(3), new BN(0)),
      ]
      await near.broadcast_tx_commit_actions(actionsSelect, sender, this.contractAccount, privateKey)
    }
  
    const actionsStake = [
      TX.functionCall("deposit_and_stake", { amount: near.ntoy(amountNear) }, this.BASE_GAS.muln(5), new BN(0)),
    ]
    await near.broadcast_tx_commit_actions(actionsStake, sender, this.contractAccount, privateKey)

  }

  get_staking_pool_account_id() /*: Promise<string>*/ {
    return near.view(this.contractAccount,"get_staking_pool_account_id")
  }

  async select_staking_pool(sender /*:string*/, stakingPool /*:string*/, privateKey /*:string*/) /*: Promise<any>*/ {

    const actions = [
      TX.functionCall("select_staking_pool", { staking_pool_account_id: stakingPool }, this.BASE_GAS.muln(3), new BN(0)),
    ]

    return near.broadcast_tx_commit_actions(actions, sender, this.contractAccount, privateKey)

  }

  async deposit_and_stake(sender /*:string*/, amountNear /*:number*/, privateKey /*:string*/) /*: Promise<any>*/ {

    if (isNaN(amountNear) || amountNear <= 0) throw Error("invalid amount")

    const actions = [
      TX.functionCall("deposit_and_stake", { amount: near.ntoy(amountNear) }, this.BASE_GAS.muln(5), new BN(0))
    ]

    return near.broadcast_tx_commit_actions(actions, sender, this.contractAccount, privateKey)

  }


}

