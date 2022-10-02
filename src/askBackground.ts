import type { StateStruct, SecureOptions } from "./structs/state-structs.js";
import { NetworkInfo } from "./lib/near-api-lite/network.js";

import {
  BatchAction,
  BatchTransaction,
  FunctionCall,
  Transfer,
} from "./lib/near-api-lite/batch-transaction.js";
import { log } from "./lib/log.js";
import { GContact } from "./data/contact.js";
import { Account } from "./structs/account-info.js";

//ask background, wait for response, return a Promise
export function askBackground(requestPayload: any): Promise<any> {
  requestPayload.dest = "ext";
  return new Promise((resolve, reject) => {
    log("askBackground ", requestPayload.code);
    const timeout = setTimeout(() => {
      return reject(Error("timeout"));
    }, 30000);
    chrome.runtime.sendMessage(requestPayload, function (response) {
      clearTimeout(timeout);
      //-- DEBUG
      const jres = JSON.stringify(response)
      log("response to ", requestPayload.code, jres.substring(0, Math.min(120, jres.length)));
      //----
      if (!response) {
        return reject(Error("response is empty"));
      } else if (response.err) {
        return reject(Error(response.err));
      }
      return resolve(response.data);
    });
  });
}

export function askBackgroundGetAccountRecordCopy(accName: string): Promise<Account> {
  return askBackground({
    code: "get-account",
    accountId: accName,
  });
}

export function askBackgroundSetAccount(
  accountId: string,
  accInfo: Account
): Promise<any> {
  return askBackground({
    code: "set-account",
    accountId: accountId,
    accInfo: accInfo,
  });
}

export function askBackgroundAddContact(
  name: string,
  contact: GContact
): Promise<any> {
  return askBackground({
    code: "add-contact",
    name: name,
    contact: contact,
  });
}

export function askBackgroundIsLocked(): Promise<boolean> {
  return askBackground({ code: "is-locked" }) as Promise<boolean>;
}
export function askBackgroundGetState(): Promise<StateStruct> {
  return askBackground({ code: "get-state" }) as Promise<StateStruct>;
}

export var activeNetworkInfo: NetworkInfo;
// function to check if the account matches active network
export const accountMatchesNetwork = (accName: string) => accName && activeNetworkInfo && accName.endsWith("." + activeNetworkInfo.rootAccount)

export async function askBackgroundSetNetwork(
  networkName: string
): Promise<NetworkInfo> {
  // save active NetworkInfo 
  activeNetworkInfo = await askBackground({ code: "set-network", network: networkName })
  return activeNetworkInfo
}
export async function askBackgroundGetNetworkInfo(): Promise<NetworkInfo> {
  activeNetworkInfo = await askBackground({ code: "get-network-info" });
  return activeNetworkInfo
}
export function askBackgroundGetOptions(): Promise<SecureOptions> {
  return askBackground({ code: "get-options" }) as Promise<SecureOptions>;
}
export function askBackgroundAllNetworkAccounts(): Promise<
  Record<string, Account>
> {
  return askBackground({ code: "all-network-accounts" }) as Promise<
    Record<string, Account>
  >;
}

export function askBackgroundGetValidators(): Promise<any> {
  return askBackground({ code: "get-validators" });
}

export function askBackgroundGetAccessKey(
  accountId: string,
  publicKey: string
): Promise<any> {
  return askBackground({
    code: "access-key",
    accountId: accountId,
    publicKey: publicKey,
  });
}

export function askBackgroundViewMethod(
  contract: string,
  method: string,
  args: Object
): Promise<any> {
  return askBackground({
    code: "view",
    contract: contract,
    method: method,
    args: args,
  });
}

export function askBackgroundAllAddressContact(): Promise<
  Record<string, GContact>
> {
  return askBackground({ code: "all-address-contacts" }) as Promise<
    Record<string, GContact>
  >;
}

export function askBackgroundCallMethod(
  contractId: string,
  method: string,
  params: any,
  signerId: string,
  gas?: string,
  attached?: string
): Promise<any> {
  const batchTx = new BatchTransaction(contractId);
  batchTx.addItem(new FunctionCall(method, params, gas, attached));
  return askBackground({ code: "apply", signerId: signerId, tx: batchTx });
}

export function askBackgroundTransferNear(
  fromAccountId: string,
  receiverId: string,
  attached: string
): Promise<any> {
  const batchTx = new BatchTransaction(receiverId);
  batchTx.addItem(new Transfer(attached));
  return askBackground({ code: "apply", signerId: fromAccountId, tx: batchTx });
}
export function askBackgroundApplyTxAction(
  receiverId: string,
  action: BatchAction,
  signerId: string
): Promise<any> {
  const batchTx = new BatchTransaction(receiverId);
  batchTx.addItem(action);
  return askBackground({ code: "apply", signerId: signerId, tx: batchTx });
}

export function askBackgroundApplyBatchTx(
  signerId: string,
  batchTx: BatchTransaction
): Promise<any> {
  return askBackground({ code: "apply", signerId: signerId, tx: batchTx });
}
