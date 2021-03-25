import { jsonRpc, jsonRpcQuery, formatJSONErr } from "./utils/json-rpc.js";
import { isValidAccountID } from "./utils/valid.js";
import { KeyPairEd25519 } from "./utils/key-pair.js";
import { serialize } from "./utils/serialize.js";
import * as TX from "./transaction.js";
import * as bs58 from "../crypto-lite/bs58.js";
import { sha256Async } from '../crypto-lite/crypto-primitives-browser.js';
import { log } from "../log.js";
import { decodeBase64, stringFromArray, stringFromUint8Array } from "../crypto-lite/encode.js";
//---------------------------
//-- NEAR PROTOCOL RPC CALLS
//---------------------------
//--helper fn
let recentBlockHash;
export function getRecentBlockHash() {
    return recentBlockHash;
}
//--helper fn
export function decodeJsonFromResult(result) {
    let text = stringFromArray(result);
    //if (text == "null") return "" //I strongly prefer "" as alias to null (ORACLE style)
    try {
        return JSON.parse(text);
    }
    catch (ex) {
        throw Error("ERR at JSON.parse: " + text);
    }
}
/**
 * convert nears expressed as a js-number with MAX 4 decimals into a yoctos-string
 * @param n amount in near MAX 4 DECIMALS
 */
export function ntoy(n) {
    let by1e4 = Math.round(n * 1e4).toString(); // near * 1e4 - round
    let yoctosText = by1e4 + "0".repeat(20); //  mul by 1e20 => yoctos = near * 1e(4+20)
    return yoctosText;
}
/**
 * returns amount truncated to 4 decimal places
 * @param yoctos amount expressed in yoctos
 */
export function yton(yoctos) {
    if (yoctos.indexOf(".") !== -1)
        throw new Error("a yocto string can't have a decimal point: " + yoctos);
    let padded = yoctos.padStart(25, "0"); //at least 0.xxx
    let nearsText = padded.slice(0, -24) + "." + padded.slice(-24, -20); //add decimal point. Equivalent to near=yoctos/1e24 and truncate to 4 dec places
    return Number(nearsText);
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
export async function queryAccount(accountId) {
    try {
        return await jsonRpcQuery("account/" + accountId);
    }
    catch (ex) {
        //intercept and make err message better for "account not found"
        const reason = ex.message.replace("while viewing", "");
        throw Error(reason);
    }
}
;
//-------------------------------
export function access_key(accountId, publicKey) {
    return jsonRpcQuery(`access_key/${accountId}/${publicKey}`);
}
;
//-------------------------------
export function viewRaw(contractId, method, params) {
    let encodedParams = undefined;
    if (params)
        encodedParams = bs58.encode(Buffer.from(JSON.stringify(params)));
    return jsonRpcQuery("call/" + contractId + "/" + method, encodedParams);
}
export async function view(contractId, method, params) {
    const data = await viewRaw(contractId, method, params);
    return decodeJsonFromResult(data.result);
}
//---------------------------------
//---- VALIDATORS & STAKING POOLS -
//---------------------------------
export function getValidators() {
    return jsonRpc('validators', [null]);
}
;
//-------------------------------
export function broadcast_tx_commit_signed(signedTransaction) {
    const borshEcoded = signedTransaction.encode();
    const b64Encoded = Buffer.from(borshEcoded).toString('base64');
    return jsonRpc('broadcast_tx_commit', [b64Encoded]);
}
;
//-------------------------------
export async function broadcast_tx_commit_actions(actions, signerId, receiver, privateKey) {
    const keyPair = KeyPairEd25519.fromString(privateKey);
    const publicKey = keyPair.getPublicKey();
    const accessKey = await access_key(signerId, publicKey.toString());
    if (accessKey.permission !== 'FullAccess')
        throw Error(`The key is not full access for account '${signerId}'`);
    // converts a recent block hash into an array of bytes 
    // this hash was retrieved earlier when creating the accessKey (Line 26)
    // this is required to prove the tx was recently constructed (within 24hrs)
    recentBlockHash = bs58.decode(accessKey.block_hash);
    // each transaction requires a unique number or nonce
    // this is created by taking the current nonce and incrementing it
    const nonce = ++accessKey.nonce;
    const transaction = TX.createTransaction(signerId, publicKey, receiver, nonce, actions, recentBlockHash);
    const serializedTx = serialize(TX.SCHEMA, transaction);
    const serializedTxHash = new Uint8Array(await sha256Async(serializedTx));
    const signature = keyPair.sign(serializedTxHash);
    const signedTransaction = new TX.SignedTransaction({
        transaction: transaction,
        signature: new TX.Signature({
            keyType: transaction.publicKey.keyType,
            data: signature.signature
        })
    });
    const result = await broadcast_tx_commit_signed(signedTransaction);
    if (result.status && result.status.Failure) {
        //log(JSON.stringify(result))
        log(getLogsAndErrorsFromReceipts(result));
        throw Error(formatJSONErr(result.status.Failure));
    }
    if (result.status && result.status.SuccessValue) {
        const sv = stringFromUint8Array(decodeBase64(result.status.SuccessValue));
        //console.log("result.status.SuccessValue:", sv)
        if (sv == "false") {
            //log(JSON.stringify(result))
            throw Error(getLogsAndErrorsFromReceipts(result));
        }
        else if (sv == "null")
            return ""; //I strongly prefer "" as alias to null (ORACLE style)
        else {
            try {
                return JSON.parse(sv); //result from fn_call
            }
            catch (ex) {
                throw Error("ERR at JSON.parse: " + sv);
            }
        }
    }
    return result;
}
//-------------------------------
function getLogsAndErrorsFromReceipts(txResult) {
    let result = [];
    result.push("Transaction failed.");
    try {
        for (let ro of txResult.receipts_outcome) {
            //get logs
            for (let logLine of ro.outcome.logs) {
                result.push(logLine);
            }
            //check status.Failure
            if (ro.outcome.status.Failure) {
                result.push(formatJSONErr(ro.outcome.status.Failure));
            }
        }
    }
    catch (ex) {
        result.push("internal error parsing result outcome");
    }
    finally {
        return result.join('\n');
    }
}
//-------------------------------
export function send(sender, receiver, amountYoctos, privateKey) {
    const actions = [TX.transfer(BigInt(amountYoctos))];
    return broadcast_tx_commit_actions(actions, sender, receiver, privateKey);
}
//-------------------------------
export function delete_account(accountToDelete, privateKey, beneficiary) {
    if (!isValidAccountID(accountToDelete))
        throw Error("Delete account: invalid account name to delete");
    if (!isValidAccountID(beneficiary))
        throw Error("Delete account: invalid beneficiary account name");
    const actions = [TX.deleteAccount(beneficiary)];
    return broadcast_tx_commit_actions(actions, accountToDelete, accountToDelete, privateKey);
}
//# sourceMappingURL=near-rpc.js.map