import * as global from "../data/global.js"
import * as c from "./conversions.js"
import * as d from "./document.js"
import * as Network from "../data/Network.js"
import * as near from "../api/near-rpc.js";
import { LockupContract } from "../contracts/LockupContract.js"

/*+
export type SearchAccountResult = {
    accName      : string;
    accountInfo  : global.AccountInfo|undefined;
    foundLockupContract: LockupContract|undefined;
    error:string;
}
+*/

export async function searchAccount(accName/*:string*/) /*:Promise<SearchAccountResult>*/ {

    let result/*:SearchAccountResult*/ = {
        accName: accName,
        accountInfo: undefined,
        foundLockupContract: undefined,
        error: ""
    }

    try {
        if (accName.endsWith(LockupContract.getLockupSuffix())) {
            //-------------------------
            //-- It's a lockup contract, just refresh balances
            //-------------------------
            let foundLockupContract = new LockupContract(accName);
            if (await foundLockupContract.tryRetrieveInfo()) {
                //found the balances -- return as if it was a standard account
                const prevInfo=global.SecureState.accounts[Network.current][accName]
                result.accountInfo = {
                    type: "lock.c",
                    lastBalance: foundLockupContract.totalBalance,
                    staked : foundLockupContract.staked,
                    stakingPool: foundLockupContract.stakingPool,
                    rewards: foundLockupContract.rewards,
                    ownerId: prevInfo.ownerId,
                    stakingPoolPct: foundLockupContract.stakingPoolPct
                }
                return result;
            }
            else {
                result.error = "Error retrieving Lockup C. Data";
                return result;
            }

        }
        else { //normal account

            let stateResultYoctos;
            try {
                stateResultYoctos = await near.queryAccount(accName)
            }
            catch (ex) {
                const reason = ex.message.replace("while viewing", "")
                result.error = reason;
                return result;
            }

            result.accountInfo = {
                type: "acc",
                lastBalance: c.ytoNN(stateResultYoctos.amount),
                staked : c.ytoNN(stateResultYoctos.locked),
            }
        

            //Try search lockup contract
            result.foundLockupContract = new LockupContract(accName);
            if (await result.foundLockupContract.tryRetrieveInfo()) {
                //found the lockup contract
            }
            else {
                result.foundLockupContract = undefined;
            }

            return result;
        }
    }
    catch(ex) {
        result.error= ex.message;
        return result;
    }
    finally {
    }

}


//------------------
export function saveFoundAccounts(result/*:SearchAccountResult*/) {

    if (result.error || !result.accName || !result.accountInfo) {
        console.error("saveFoundAccounts called but no data")
        return;
    }

    const userDataForCurrentNetwork = global.SecureState.accounts[Network.current] || {}
    //commented: if exists in the wallet, refresh it
    //if (userDataForCurrentNetwork[accName]) return d.showErr("The account is already in the wallet");

    const data = userDataForCurrentNetwork[result.accName] || {}

    if (data.isEmpty){ //new account
        d.showSuccess("Account found!")
    }

    Object.assign(data, {
        type: result.accountInfo.type,
        lastBalance: result.accountInfo.lastBalance,
        staked: result.accountInfo.staked,
        ownerId: result.accountInfo.ownerId,
        stakingPool: result.accountInfo.stakingPool,
        rewards: result.accountInfo.rewards,
        stakingPoolPct: result.accountInfo.stakingPoolPct,
    });

    userDataForCurrentNetwork[result.accName] = data //if it was new, add it
    global.saveSecureState()

    //also add foundLockupContract
    if (result.foundLockupContract) {
        //commented: if it is in the wallet, refresh
        //if (!userDataForCurrentNetwork[foundLockupContract.contractAccount]) return d.showErr("The account is already in the wallet");

        const lcData = userDataForCurrentNetwork[result.foundLockupContract.contractAccount] || {}

        if (lcData.isEmpty){ //new Lockup Contract account
            d.showSuccess("Associated Lockup Contract account found!")
        }

        Object.assign(lcData, {
            type: "lock.c",
            staked: result.foundLockupContract.staked,
            lastBalance: result.foundLockupContract.totalBalance,
            ownerId: result.foundLockupContract.ownerId,
            stakingPool: result.foundLockupContract.stakingPool,
            rewards: result.foundLockupContract.rewards,
            stakingPoolPct: result.foundLockupContract.stakingPoolPct,
        });

        
        userDataForCurrentNetwork[result.foundLockupContract.contractAccount] = lcData //if it was new, add it
        global.saveSecureState()

    }

}
