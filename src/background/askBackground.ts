import type {StateStruct,SecureOptions} from "../data/state-type.js";
import { NetworkInfo } from "../lib/near-api-lite/network.js"
import { Account } from "../data/account.js"
import { BatchAction, BatchTransaction, FunctionCall, Transfer} from "../lib/near-api-lite/batch-transaction.js";
import { log } from "../lib/log.js"

//ask background, wait for response, return a Promise
export function askBackground(requestPayload:any):Promise<any>{
    requestPayload.dest="ext";
    return new Promise((resolve,reject)=>{
        log("sendMessage",JSON.stringify(requestPayload))
        const timeout=setTimeout(()=>{return reject(Error("timeout"));},30000);
        chrome.runtime.sendMessage(requestPayload,function(response){
            clearTimeout(timeout);
            if (!response){
                return reject(Error("response is empty"));
            }
            else if(response.err) {
                return reject(Error(response.err));
            }
            return resolve(response.data);
        })
    })
}

export function askBackgroundSetAccount(accountId:string, accInfo:Account) :Promise<any> {
    return askBackground({code:"set-account", accountId:accountId, accInfo:accInfo})
}

export function askBackgroundIsLocked():Promise<boolean>{
    return askBackground({code:"is-locked"}) as Promise<boolean>
}
export function askBackgroundGetState():Promise<StateStruct>{
    return askBackground({code:"get-state"}) as Promise<StateStruct>
}
export function askBackgroundSetNetwork(networkName:string):Promise<NetworkInfo>{
    return askBackground({code:"set-network",network:networkName})
}
export function askBackgroundGetNetworkInfo():Promise<NetworkInfo>{
    return askBackground({code:"get-network-info"})
}
export function askBackgroundGetOptions():Promise<SecureOptions>{
    return askBackground({code:"get-options"}) as Promise<SecureOptions>
}
export function askBackgroundAllNetworkAccounts():Promise<Record<string,Account>>{
    return askBackground({code:"all-network-accounts"}) as Promise<Record<string,Account>>
}

export function askBackgroundGetValidators() :Promise<any> {
    return askBackground({code:"get-validators"})
}

export function askBackgroundGetAccessKey(accountId:string, publicKey:string) :Promise<any> {
    return askBackground({code:"access-key", accountId:accountId, publicKey:publicKey})
}

export function askBackgroundViewMethod(contract:string, method:string, args:Object) :Promise<any> {
        return askBackground({code:"view",contract:contract, method:method, args:args})
}

export function askBackgroundCallMethod(    
    contractId: string,
    method: string,
    params: any,
    signerId: string,
    gas?: string,
    attached?: string):Promise<any>
    {
        const batchTx=new BatchTransaction(contractId);
        batchTx.addItem(new FunctionCall(method,params,gas,attached))
        return askBackground({code:"apply",signerId:signerId, tx:batchTx})
}

export function askBackgroundTransferNear( fromAccountId:string, receiverId:string, attached:string) :Promise<any> {
    const batchTx=new BatchTransaction(receiverId);
    batchTx.addItem(new Transfer(attached))
    return askBackground({code:"apply", signerId:fromAccountId, tx:batchTx})
}
export function askBackgroundApplyTxAction(receiverId:string, action:BatchAction, signerId:string) :Promise<any> {
    const batchTx=new BatchTransaction(receiverId);
    batchTx.addItem(action)
    return askBackground({code:"apply", signerId:signerId, tx:batchTx})
}

export function askBackgroundApplyBatchTx( signerId:string, batchTx:BatchTransaction) :Promise<any> {
    return askBackground({code:"apply", signerId:signerId, tx:batchTx})
}

