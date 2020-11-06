//user NEAR accounts info type
export class Account {
    order/*:number*/ =0
    type /*:"acc"|"lock.c"*/ = "acc"
    note /*:string*/=""
    lastBalance /*:number*/ =0 // native balance from rpc:query/account & near state
    stakingPool /*+?:string+*/ 
    staked /*:number*/ = 0 // in the pool & staked
    unStaked/*:number*/ = 0 // in the pool & unstaked (maybe can withdraw)
    rewards /*:number*/ = 0 //Stakingpool rewards (initial staking - (staked+unstaked))
    stakingPoolPct /*+?:number+*/
    privateKey /*+?:string+*/
    ownerId /*+?:string+*/ //ownerId if this is a lockup-contract {type:"lock.c"}
    lockedOther/*:number*/ = 0 //locked for other reasons, e.g. this is a lockup-contract {type:"lock.c"}

    get totalInThePool()/*:number*/ {
        return this.staked + this.unStaked;
    }
    
  }
  
  export class ExtendedAccountData {

    type /*:string*/ //small-type + note
    name /*:string*/
    accessStatus /*:string*/
    typeFull /*:string*/ //full-type + note
    accountInfo /*:Account*/
    total /*:number*/ //lastBalance+inThePool
    unlockedOther /*:number*/
    available /*:number*/
    inThePool /*:number*/

    constructor(name/*:string*/, accountInfo/*:Account*/) {
        this.name = name;
        this.accountInfo = accountInfo;
        const typeFullTranslation/*:Record<string,string>*/ = {
            acc: "Account",
            "lock.c": "Lockup Contract"
        }

        this.type=this.accountInfo.type
        this.typeFull = typeFullTranslation[this.accountInfo.type]
        if (this.accountInfo.note) {
          const formattedNote=' ('+this.accountInfo.note+')'
          this.type += formattedNote
          this.typeFull += formattedNote
        }

        this.accessStatus = this.accountInfo.privateKey ? "Full Access" : "Read Only"

        if (!this.accountInfo.staked) this.accountInfo.staked = 0
        if (!this.accountInfo.unStaked) this.accountInfo.unStaked = 0
        this.inThePool = this.accountInfo.staked+this.accountInfo.unStaked
        
        if (!this.accountInfo.lockedOther) this.accountInfo.lockedOther = 0
        this.unlockedOther = this.accountInfo.lastBalance + this.inThePool - this.accountInfo.lockedOther

        this.available = this.accountInfo.lastBalance - this.accountInfo.lockedOther

        if (this.accountInfo.type == "lock.c"){
          this.available = Math.max(0,this.available-36);
          if (!this.accountInfo.privateKey) this.accessStatus = "owner";
        }

        this.total = this.accountInfo.lastBalance + this.inThePool

    }

}
