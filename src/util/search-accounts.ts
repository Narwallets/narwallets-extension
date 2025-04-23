
import { LockupContract } from "../contracts/LockupContract.js";
import { Account, newAccount } from "../structs/account-info.js";
import { askBackgroundQueryNearAccount } from "../askBackground.js";
import { asyncRefreshAccountInfoLastBalance } from "../extendedAccountData.js";
import { networkIndicatorNetwork } from "../index.js";

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
    let stateResult = await askBackgroundQueryNearAccount(accName);
    return true;
  }
  catch (ex) {
    return false;
  }
}

export async function searchAccount(accName: string): Promise<Account> {
  checkNotLockup(accName);
  let newAccInfo = newAccount(networkIndicatorNetwork.name);
  await asyncRefreshAccountInfoLastBalance(accName, newAccInfo, false);
  return newAccInfo;
}
