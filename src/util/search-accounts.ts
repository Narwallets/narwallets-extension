import * as c from "./conversions.js";

import { LockupContract } from "../contracts/LockupContract.js";
import { Account } from "../data/account.js";
import { askBackground, askBackgroundGetNetworkInfo } from "../background/askBackground.js";
import { activeNetworkInfo } from "../index.js";

async function checkNotLockup(accName: string) {
  const suffix = await LockupContract.getLockupSuffix();
  if (accName.endsWith(suffix)) {
    throw Error(
      "You must import the owner's account to get the Lockup contract account"
    );
  }
}

export async function getLockupContract(
  accInfo: Account
): Promise<LockupContract | undefined> {
  //Try search lockup contract
  const lc = new LockupContract(accInfo);
  await lc.computeContractAccount();
  if (await lc.tryRetrieveInfo()) {
    //found the lockup contract
    return lc;
  } else {
    return undefined;
  }
}

export async function asyncRefreshAccountInfo(accName: string, info: Account) {
  const suffix = await LockupContract.getLockupSuffix();
  if (accName.endsWith(suffix)) {
    //lockup contract
    if (!info.ownerId) return;
    //get lockup contract data and update info param
    const lockup = await getLockupContract(info);
    if (!lockup) return;
  } else {
    //normal account
    let stateResultYoctos;
    try {
      stateResultYoctos = await askBackground({
        code: "query-near-account",
        accountId: accName,
      });
    } catch (ex) {
      let reason = ex.message.includes("name:UNKNOWN_ACCOUNT") ? `not found in ${activeNetworkInfo.name}` : ex.message;
      throw Error(`account:"${accName}", Error:${reason}`);
    }

    info.lastBalance = c.yton(stateResultYoctos.amount);

    // if (info.stakingPool) {
    //     const previnThePool = info.staked + info.unstaked;
    //     const stakingInfo = await StakingPool.getAccInfo(accName, info.stakingPool)
    //     info.staked = c.yton(stakingInfo.staked_balance)
    //     info.unstaked = c.yton(stakingInfo.unstaked_balance)
    //     info.rewards = previnThePool > 0 ? info.staked + info.unstaked - previnThePool : 0;
    //     if (info.rewards < 0) info.rewards = 0;
    //     info.stakingPoolPct = await StakingPool.getFee(info.stakingPool)
    // }
    // else {
    //     info.staked = 0
    //     info.unstaked = 0
    // }
  }
}

export async function checkIfAccountExists(accName: string): Promise<boolean> {
  try {
    await askBackground({
      code: "query-near-account",
      accountId: accName,
    });
    return true;
  } catch (ex) {
    // const reason = ex.message.replace("while viewing", "");
    return false;
  }
}

export async function searchAccount(accName: string): Promise<Account> {
  await checkNotLockup(accName);
  let result = new Account(activeNetworkInfo.name);
  await asyncRefreshAccountInfo(accName, result);

  return result;
}
