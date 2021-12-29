import * as c from "./conversions.js";

import { LockupContract } from "../contracts/LockupContract.js";
import { Account, asyncRefreshAccountInfoLastBalance } from "../data/account.js";
import { askBackground, askBackgroundGetNetworkInfo } from "../background/askBackground.js";
import { activeNetworkInfo } from "../index.js";

function checkNotLockup(accName: string) {
  const suffix = LockupContract.getLockupSuffix();
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
    //found the lockup contract and it's data, update accInfo
    return lc;
  } else {
    return undefined;
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
  checkNotLockup(accName);
  let result = new Account(activeNetworkInfo.name);
  await asyncRefreshAccountInfoLastBalance(accName, result);

  return result;
}
