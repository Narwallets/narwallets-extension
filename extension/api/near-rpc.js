import { jsonRpc, jsonRpcQuery, formatJSONErr } from "./utils/json-rpc.js";
import * as naclUtil from "./tweetnacl/util.js";
import { KeyPairEd25519 } from "./utils/key-pair.js";
import { serialize, base_decode } from "./utils/serialize.js";
import * as TX from "./transaction.js";
import * as bs58 from "./utils/bs58.js";
import * as sha256 from './sha256.js';
//---------------------------
//-- NEAR PROTOCOL RPC CALLS
//---------------------------
//--helper fn
let recentBlockHash;
export function getRecentBlockHash() {
    return recentBlockHash;
}
//--helper fn
export function bufferToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}
//--helper fn
export function decodeJsonFromResult(result) {
    let text = naclUtil.encodeUTF8(result);
    if (text == "null")
        return ""; //I strongly prefer "" as alias to null (ORACLE style)
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
export function isValidAccountID(accountId) {
    const MIN_ACCOUNT_ID_LEN = 2;
    const MAX_ACCOUNT_ID_LEN = 64; //implicit accounts have 64 hex chars
    if (accountId.length < MIN_ACCOUNT_ID_LEN ||
        accountId.length > MAX_ACCOUNT_ID_LEN) {
        return false;
    }
    // The valid account ID regex is /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/
    // We can safely assume that last char was a separator.
    var last_char_is_separator = true;
    for (let n = 0; n < accountId.length; n++) {
        let c = accountId.charAt(n);
        let current_char_is_separator = c == "-" || c == "_" || c == ".";
        if (!current_char_is_separator &&
            !((c >= "a" && c <= "z") || (c >= "0" && c <= "9")))
            return false; //only 0..9 a..z and separators are valid chars
        if (current_char_is_separator && last_char_is_separator) {
            return false; //do not allow 2 separs together
        }
        last_char_is_separator = current_char_is_separator;
    }
    // The account can't end as separator.
    return !last_char_is_separator;
}
export function isValidAmount(amount) {
    if (isNaN(amount))
        return false;
    if (amount < 0)
        return false;
    return true;
}
//-------------------------------
export function getPublicKey(privateKey) {
    const keyPair = KeyPairEd25519.fromString(privateKey);
    return keyPair.getPublicKey().toString();
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
// always return StakingPoolAccountInfoResult. A empty one if the pool can't find the account. See: core-contracts/staking-pool
export async function getStakingPoolAccInfo(accountName, stakingPool) {
    return view(stakingPool, "get_account", { account_id: accountName });
}
export async function getStakingPoolFee(stakingPool) {
    const rewardFeeFraction = await view(stakingPool, "get_reward_fee_fraction");
    return rewardFeeFraction.numerator * 100 / rewardFeeFraction.denominator;
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
export async function broadcast_tx_commit_actions(actions, sender, receiver, privateKey) {
    const keyPair = KeyPairEd25519.fromString(privateKey);
    const publicKey = keyPair.getPublicKey();
    const accessKey = await access_key(sender, publicKey.toString());
    if (accessKey.permission !== 'FullAccess')
        throw Error(`The key is not full access for account '${sender}'`);
    // converts a recent block hash into an array of bytes 
    // this hash was retrieved earlier when creating the accessKey (Line 26)
    // this is required to prove the tx was recently constructed (within 24hrs)
    recentBlockHash = base_decode(accessKey.block_hash);
    // each transaction requires a unique number or nonce
    // this is created by taking the current nonce and incrementing it
    const nonce = ++accessKey.nonce;
    const transaction = TX.createTransaction(sender, publicKey, receiver, nonce, actions, recentBlockHash);
    const serializedTx = serialize(TX.SCHEMA, transaction);
    const serializedTxHash = new Uint8Array(sha256.hash(serializedTx));
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
        console.error(JSON.stringify(result));
        console.error(result);
        throw Error(formatJSONErr(result.status.Failure));
    }
    if (result.status && result.status.SuccessValue) {
        const sv = naclUtil.encodeUTF8(naclUtil.decodeBase64(result.status.SuccessValue));
        console.log("result.status.SuccessValue:", sv);
        if (sv == "false") {
            console.error(JSON.stringify(result));
            throw Error(getLogsAndErrorsFromReceipts(result));
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
export function send(sender, receiver, amountNear, privateKey) {
    if (isNaN(amountNear) || amountNear <= 0)
        throw Error("invalid amount");
    const actions = [TX.transfer(new BN(ntoy(amountNear)))];
    return broadcast_tx_commit_actions(actions, sender, receiver, privateKey);
}
//-------------------------------
// export function stake(stakingPoolId: string, amountNear: number, sender: string, privateKey: string): Promise<any> {
//     if (isNaN(amountNear) || amountNear <= 0) throw Error("invalid amount")
//     const actions = [TX.stake(new BN(ntoy(amountNear)), publicKey???which one?)]
//     return broadcast_tx_commit_actions(actions, sender, stakingPoolId, privateKey)
// }
//-------------------------------
//-- CALL CONTRACT METHOD -------
//-------------------------------
export const BN_ZERO = new BN("0");
export const ONE_TGAS = new BN("1" + "0".repeat(12));
export const ONE_NEAR = new BN("1" + "0".repeat(24));
export function call_method(contractId, method, params, sender, privateKey, gas, attachedAmount = 0) {
    return broadcast_tx_commit_actions([TX.functionCall(method, params, gas, ONE_NEAR.muln(attachedAmount))], sender, contractId, privateKey);
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