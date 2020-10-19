import * as global from "../../data/global+ts.js"
import * as Network from "../../data/Network+ts.js"

let id = 0

export async function jsonRpcInternal(payload/*:Record<string,any>*/) /*:Promise<any>*/ {

    //try {

    const rpcOptions = {
        body: JSON.stringify(payload),
        method: "POST",
        headers: { 'Content-type': 'application/json; charset=utf-8' }
    }

    let rpcUrl = Network.currentInfo().rpc;
    const fetchResult= await fetch(rpcUrl, rpcOptions);
    if (!fetchResult.ok) throw Error(rpcUrl+" "+fetchResult.statusText)
    const jsonResponse = await fetchResult.json()
    return jsonResponse

    // if (!response.ok) {
    //     if (response.status === 503) {
    //         console.warn(`Retrying HTTP request for ${url} as it's not available now`);
    //         return null;
    //     }
    //     throw createError(response.status, await response.text());
    // }
    //     return response;
    // } catch (error) {
    //     if (error.toString().includes('FetchError')) {
    //         console.warn(`Retrying HTTP request for ${url} because of error: ${error}`);
    //         return null;
    //     }
    //     throw error;
    // }
}

export async function jsonRpc(method/*:string*/, ...params/*:string[]*/) /*:Promise<any>*/ {
    if (params.length==1) params.push(""); //jsonrpc fails if there's a single item in the array
    const payload = {
        method: "query",
        params:  Array.isArray(params) ? params : [params],
        id: ++id,
        jsonrpc: "2.0"
    }
    return jsonRpcInternal(payload);
}

export async function query(...params/*:string[]*/) /*:Promise<any>*/ {
    return jsonRpc("query", ...params);
}

export async function state(accountId/*:string*/) /*:Promise<any>*/ {
    const response = await query("account/" + accountId);
   if (response.error) {
       return Promise.reject(response.error.data);
   }
    /* 
    result:
        amount: "27101097909936818225912322116"
        block_hash: "DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
        block_height: 20046823
        code_hash: "11111111111111111111111111111111"
        locked: "0"
        storage_paid_at: 0
        storage_usage: 2080
        }
    */
   return Promise.resolve(response.result);
}   
