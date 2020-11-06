import * as global from "../data/global.js"
import * as c from "./conversions.js"
import * as d from "./document.js"
import * as Network from "../data/Network.js"
import * as near from "../api/near-rpc.js";
import { LockupContract } from "../contracts/LockupContract.js"
import { Account } from "../data/Account.js"

function checkNotLockup(accName/*:string*/) {
    if (accName.endsWith(LockupContract.getLockupSuffix())) {
        throw Error("You must import the owner's account to get the Lockup contract account")
    }
}

export async function asyncRefreshAccountInfo(accName/*:string*/, info/*:Account*/) {

    if (accName.endsWith(LockupContract.getLockupSuffix())) {
        //es un lockup
        if (!info.ownerId) return;
        const lockup = await getLockupContract(info)
        if (!lockup) return;
    }

    else {
        //normal
        let stateResultYoctos;
        try {
            stateResultYoctos = await near.queryAccount(accName)
        }
        catch (ex) {
            const reason = ex.message.replace("while viewing", "")
            throw Error(reason)
        }

        info.lastBalance = c.yton(stateResultYoctos.amount)
        if (info.stakingPool){
            const previnThePool = info.staked+info.unStaked;
            const stakingInfo = await near.getStakingPoolAccInfo(accName,info.stakingPool)
            info.staked = near.yton(stakingInfo.staked_balance)
            info.unStaked = near.yton(stakingInfo.unstaked_balance)
            info.rewards = previnThePool>0? info.staked + info.unStaked - previnThePool : 0;
            info.stakingPoolPct = await near.getStakingPoolFee(info.stakingPool)
        }
        else {
            info.staked = 0
            info.unStaked = 0
        }
    }

}

export async function searchAccount(accName/*:string*/) /*:Promise<Account>*/ {

    checkNotLockup(accName)

    let result = new Account();
    await asyncRefreshAccountInfo(accName,result)

    return result;
}

export async function getLockupContract(accInfo/*:Account*/)/*:Promise<LockupContract|undefined>*/ {
    //Try search lockup contract
    const result = new LockupContract(accInfo);
    if (await result.tryRetrieveInfo()) {
        //found the lockup contract
        return result
    }
    else {
        return undefined;
    }
}



