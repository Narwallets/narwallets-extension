import type {StateStruct,SecureOptions} from "./state-type.js";
import { NetworkInfo } from "./network.js"
import { Account } from "./account.js"
import { BatchAction, BatchTransaction, FunctionCall, Transfer} from "./batch-transaction.js";

//ask background, wait for response, return a Promise
export function askBackground(requestPayload:any):Promise<any>{
    requestPayload.dest="ext";
    return new Promise((resolve,reject)=>{
        console.log("sendMessage",requestPayload)
        const timeout=setTimeout(()=>{return reject(Error("timeout"));},10000);
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

export function askBackgroundGetState():Promise<StateStruct>{
    return askBackground({code:"get-state"}) as Promise<StateStruct>
}
export function askBackgroundGetNetworkInfo():Promise<NetworkInfo>{
    return askBackground({code:"get-network-info"})
}
export function askBackgroundGetOptions():Promise<SecureOptions>{
    return askBackground({code:"get-options"}) as Promise<SecureOptions>
}
export function askBackgroundSetNetwork(networkName:string):Promise<any>{
    return askBackground({code:"set-network",network:networkName})
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

export function askBackgroundCallMethod(    
    contractId: string,
    method: string,
    params: any,
    signerId: string,
    Tgas: number=25,
    attachedNear: number = 0):Promise<any>
    {
        const batchTx=new BatchTransaction(contractId);
        batchTx.addItem(new FunctionCall(method,params,Tgas,attachedNear))
        return askBackground({code:"apply",signerId:signerId, tx:batchTx})
}

export function askBackgroundTransferNear( fromAccountId:string, receiverId:string, attachedNear:number) :Promise<any> {
    const batchTx=new BatchTransaction(receiverId);
    batchTx.addItem(new Transfer(attachedNear))
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

