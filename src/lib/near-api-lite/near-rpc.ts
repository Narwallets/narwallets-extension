import { jsonRpc, jsonRpcQuery, formatJSONErr } from "./utils/json-rpc.js"

import { isValidAccountID } from "./utils/valid.js";
import { CurveAndArrayKey, KeyPairEd25519 } from "./utils/key-pair.js"
import { serialize } from "./utils/serialize.js"
import * as TX from "./transaction.js"

import * as bs58 from "../crypto-lite/bs58.js";
import { sha256Async } from '../crypto-lite/crypto-primitives-browser.js';

import { log } from "../log.js"
import { decodeBase64, encodeBase64, stringFromArray, stringFromUint8Array, Uint8ArrayFromString } from "../crypto-lite/encode.js";
import { FinalExecutionOutcome, FinalExecutionStatus } from "./near-types.js";


//---------------------------
//-- NEAR PROTOCOL RPC CALLS
//---------------------------

//--helper fn
let recentBlockHash: Uint8Array;
export function getRecentBlockHash(): Uint8Array {
    return recentBlockHash
}

//--helper fn
export function decodeJsonFromResult(result: number[]): string {
    let text = stringFromArray(result)
    //if (text == "null") return "" //I strongly prefer "" as alias to null (ORACLE style)
    try {
        return JSON.parse(text);
    }
    catch (ex) {
        throw Error("ERR at JSON.parse: " + text)
    }
}

/**
 * convert nears expressed as a js-number with MAX 4 decimals into a yoctos-string
 * @param n amount in near MAX 4 DECIMALS
 */
export function ntoy(n: number) {
    let by1e4 = Math.round(n * 1e4).toString() // near * 1e4 - round
    let yoctosText = by1e4 + "0".repeat(20) //  mul by 1e20 => yoctos = near * 1e(4+20)
    return yoctosText
}

/**
 * returns amount truncated to 4 decimal places
 * @param yoctos amount expressed in yoctos
 */
export function yton(yoctos: string) {
    if (yoctos.indexOf(".") !== -1) throw new Error("a yocto string can't have a decimal point: " + yoctos)
    let padded = yoctos.padStart(25, "0") //at least 0.xxx
    let nearsText = padded.slice(0, -24) + "." + padded.slice(-24, -20) //add decimal point. Equivalent to near=yoctos/1e24 and truncate to 4 dec places
    return Number(nearsText)
}


//-------------------------
//-- Query Account State
//-------------------------
export type StateResult = {
    amount: string; //"27101097909936818225912322116"
    block_hash: string; //"DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
    block_height: number; //20046823
    code_hash: string; //"11111111111111111111111111111111"
    locked: string; //"0"
    storage_paid_at: number; //0
    storage_usage: number; // 2080
}

/* 
near.state example result
result: {
    amount: "27101097909936818225912322116"
    block_hash: "DoTW1Tpp3TpC9egBe1xFJbbEb6vYxbT33g9GHepiYL5a"
    block_height: 20046823
    code_hash: "11111111111111111111111111111111"
    locked: "0"
    storage_paid_at: 0
    storage_usage: 2080
    }
*/

export async function queryAccount(accountId: string): Promise<StateResult> {
    try {
        return await jsonRpcQuery("account/" + accountId) as Promise<StateResult>
    }
    catch (ex) {
        //intercept and make err message better for "account not found"
        const reason = ex.message.replace("while viewing", "")
        throw Error(reason)
    }
};

//-------------------------------
export function access_key(accountId: string, publicKey: string): Promise<any> {
    return jsonRpcQuery(`access_key/${accountId}/${publicKey}`) as Promise<any>
};

//-------------------------------
export function viewRaw(contractId: string, method: string, params?: any): Promise<any> {
    let encodedParams = undefined;
    if (params) {
        const asArr = Uint8ArrayFromString(JSON.stringify(params))
        encodedParams = bs58.encode(asArr);
    }
    return jsonRpcQuery("call/" + contractId + "/" + method, encodedParams);
}
export async function view(contractId: string, method: string, params?: any): Promise<any> {
    const data = await viewRaw(contractId, method, params);
    return decodeJsonFromResult(data.result)
}

//---------------------------------
//---- VALIDATORS & STAKING POOLS -
//---------------------------------
export function getValidators(): Promise<any> {
    return jsonRpc('validators', [null]) as Promise<any>
};

//------------------
// SIGN and SEND ---
//------------------
export async function signMessageGetSignature(buf: Uint8Array, privateKey: string): Promise<any> {
    const keyPair = KeyPairEd25519.fromString(privateKey);
    const hash256 = new Uint8Array(await sha256Async(buf));
    return keyPair.sign(hash256)
}

//-------------------------------
export async function signTransaction(actions: TX.Action[], signerId: string, receiver: string, privateKey: string): Promise<TX.SignedTransaction> {

    const keyPair = KeyPairEd25519.fromString(privateKey);
    const publicKey = keyPair.getPublicKey();

    const accessKey = await access_key(signerId, publicKey.toString());
    if (accessKey.permission !== 'FullAccess') throw Error(`The key is not full access for account '${signerId}'`)

    // converts a recent block hash into an array of bytes 
    // this hash was retrieved earlier when creating the accessKey (Line 26)
    // this is required to prove the tx was recently constructed (within 24hrs)
    recentBlockHash = bs58.decode(accessKey.block_hash);

    // each transaction requires a unique number or nonce
    // this is created by taking the current nonce and incrementing it
    const nonce = ++accessKey.nonce;

    const transaction = TX.createTransaction(
        signerId,
        publicKey,
        receiver,
        nonce,
        actions,
        recentBlockHash
    )
    //console.log("Transaction", transaction)

    const serializedTx = serialize(TX.SCHEMA, transaction);
    const serializedTxHash = new Uint8Array(await sha256Async(serializedTx));
    const signature = keyPair.sign(serializedTxHash)

    const signedTransaction = new TX.SignedTransaction({
        transaction: transaction,
        signature: new TX.Signature({
            keyType: transaction.publicKey.keyType,
            data: signature.signature
        })
    });
    //console.log("signedTransaction", signedTransaction)
    return signedTransaction
}

//-------------------------------
export function sendSignedTransaction(signedTransaction: TX.SignedTransaction): Promise<FinalExecutionOutcome> {
    const borshEncoded = signedTransaction.encode();
    const b64EncodedString = encodeBase64(borshEncoded)
    return jsonRpc('broadcast_tx_commit', [b64EncodedString]) as Promise<FinalExecutionOutcome>
};


//-------------------------------
export async function sendTransaction(actions: TX.Action[], signerId: string, receiver: string, privateKey: string)
    : Promise<FinalExecutionOutcome> {

    const signedTransaction = await signTransaction(actions, signerId, receiver, privateKey)

    return sendSignedTransaction(signedTransaction)
}

//-------------------------------
export async function sendTransactionAndParseResult(actions: TX.Action[], signerId: string, receiver: string, privateKey: string)
    : Promise<FinalExecutionOutcome> {

    const signedTransaction = await signTransaction(actions, signerId, receiver, privateKey)

    const executionOutcome = await sendSignedTransaction(signedTransaction)

    return parseFinalExecutionOutcome(executionOutcome)
}

//-------------------------------
export function parseFinalExecutionOutcome(executionOutcome: FinalExecutionOutcome): any {

    if (executionOutcome.status) {
        const status = executionOutcome.status as FinalExecutionStatus
        if (status.Failure !== undefined) {
            //log(JSON.stringify(executionOutcome))
            log(getLogsAndErrorsFromReceipts(executionOutcome))
            throw Error(formatJSONErr(status.Failure))
        }
        else if (status.SuccessValue !== undefined) {
            if (status.SuccessValue === "") {
                return "" // early exit para return void functions
            }
            // decode from base64 and into string
            const sv = stringFromUint8Array(decodeBase64(status.SuccessValue))
            //console.log("executionOutcome.status.SuccessValue:", sv)
            if (sv == "false") {
                //log(JSON.stringify(executionOutcome))
                throw Error(getLogsAndErrorsFromReceipts(executionOutcome))
            }
            else if (sv == "null")
                return ""; //I strongly prefer "" as alias to null (ORACLE style)
            else {
                try {
                    return JSON.parse(sv); // result from smart contract
                }
                catch (ex) {
                    throw Error("ERR at JSON.parse: " + sv);
                }
            }
        }
    }
    // if we don't recognize the data
    log(JSON.stringify(executionOutcome))
    throw Error("not a valid execution outcome");
    //return executionOutcome
}


//-------------------------------
function getLogsAndErrorsFromReceipts(txResult: any) {
    let result = []
    result.push("Transaction failed.")
    try {
        for (let ro of txResult.receipts_outcome) {
            //get logs
            for (let logLine of ro.outcome.logs) {
                result.push(logLine)
            }
            //check status.Failure
            if (ro.outcome.status.Failure) {
                result.push(formatJSONErr(ro.outcome.status.Failure))
            }
        }
    } catch (ex) {
        result.push("internal error parsing result outcome")
    }
    finally {
        return result.join('\n')
    }
}

//-------------------------------
export function sendYoctos(sender: string, receiver: string, amountYoctos: string, privateKey: string): Promise<any> {
    const actions = [TX.transfer(BigInt(amountYoctos))]
    return sendTransactionAndParseResult(actions, sender, receiver, privateKey)
}


//-------------------------------
export function delete_account(accountToDelete: string, privateKey: string, beneficiary: string): Promise<any> {

    if (!isValidAccountID(accountToDelete)) throw Error("Delete account: invalid account name to delete")
    if (!isValidAccountID(beneficiary)) throw Error("Delete account: invalid beneficiary account name")

    const actions = [TX.deleteAccount(beneficiary)]
    return sendTransactionAndParseResult(actions, accountToDelete, accountToDelete, privateKey)

}

