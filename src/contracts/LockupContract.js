import * as c from "../util/conversions.js"
import * as Network from "../data/Network.js"
import * as sha256 from "../api/sha256.js"
import * as naclUtil from "../util/tweetnacl/nacl-util.js";
import * as near from "../api/near-rpc.js";
import * as nearAccounts from "../util/near-accounts.js";

export class LockupContract {

    contractAccount/*:string*/
    liquidBalanceY/*:string*/=""
    lockedY/*:string*/=""
    stakedY/*:string*/=""
    ownerId/*:string*/=""
    stakingPool/*:string*/=""
    stakedPlusRewardsY/*:string*/=""
    stakingPoolPct/*:number*/=0
  
    static getLockupSuffix(){
      const rootAccount=Network.currentInfo().rootAccount
      //HACK to test lockup contracts in testnet - until core devs provide a way to
      //create xxx.lockup.testnet accounts- we use .lockupy.testnet, that we created
      const lockupSuffix= (rootAccount=="testnet"?"lockupy":"lockup") 
      return "."+lockupSuffix+"."+rootAccount;
    }

    constructor(ownerAccountId/*:string*/) {
      const suffix=LockupContract.getLockupSuffix()
      if (ownerAccountId.endsWith(suffix)){ //already a lockup contractAccount
        this.contractAccount = ownerAccountId
      }
      else {
        const contractComputedName=LockupContract.computeContractAccount(ownerAccountId)
        this.contractAccount = contractComputedName + suffix;
      }
    }
  
    static computeContractAccount(accountId /*:string*/) {
      const b = sha256.hash(naclUtil.decodeUTF8(accountId)).buffer
      const hex = near.bufferToHex(b)
      return `${hex.slice(0, 40)}`;
    }
  
    async getAmountY(method/*:string*/) {
      return await near.viewString(this.contractAccount, method)
    }
  
    async tryRetrieveInfo()/*:Promise<boolean>*/ {
      try {
        //const ownerBalanceY = await getAmountY("get_owners_balance")
        this.liquidBalanceY = await this.getAmountY("get_liquid_owners_balance")
        this.stakedY = await this.getAmountY("get_known_deposited_balance")
        this.lockedY = await this.getAmountY("get_locked_amount")
        this.stakingPool = await near.viewString(this.contractAccount, "get_staking_pool_account_id")
        if (this.stakingPool){
          //get total amount in the staking pool to compute staking rewards
          this.stakedPlusRewardsY = await near.viewString(this.stakingPool, "get_account_total_balance",{account_id:this.contractAccount})
          const rewardFeeFractionText=await near.viewString(this.stakingPool, "get_reward_fee_fraction")
          const rff=JSON.parse(rewardFeeFractionText)
          this.stakingPoolPct = rff.numerator*100/rff.denominator
        }
        return true
      }
      catch (ex) {
        console.log("INFO", "retrieving lockupcontract ", ex.message);
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
      return c.ytoNN(this.stakedPlusRewardsY)- c.ytoNN(this.stakedY) 
    }

  }
  
  