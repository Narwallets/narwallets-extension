let rpcUrl = "https://rpc.mainnet.near.org/";
export function setRpcUrl(newUrl) {
    rpcUrl = newUrl;
}
const fetchHeaders = { 'Content-type': 'application/json; charset=utf-8' };
export function addHeader(name, value) {
    fetchHeaders[name] = value;
}
export function getHeaders() {
    return fetchHeaders;
}
function ytonFull(str) {
    let result = (str + "").padStart(25, "0");
    result = result.slice(0, -24) + "." + result.slice(-24);
    return result;
}
export function formatJSONErr(obj) {
    let text = JSON.stringify(obj);
    text = text.replace(/{/g, " ");
    text = text.replace(/}/g, " ");
    text = text.replace(/"/g, "");
    //---------
    //try some enhancements
    //---------
    //convert yoctos to near
    const largeNumbersFound = text.match(/.*?['" ]\d{14,50}/g);
    if (largeNumbersFound) {
        for (const matches of largeNumbersFound) {
            const parts = matches.split(" ");
            const yoctosString = parts.pop() || "";
            if (yoctosString.length >= 20) {
                // show reference line
                text = text.replace(new RegExp(yoctosString, "g"), ytonFull(yoctosString));
            }
        }
    }
    //if panicked-at: show relevant info only
    const KEY = "panicked at '";
    const kl = KEY.length;
    let n = text.indexOf(KEY);
    if (n > 0 && n < text.length - kl - 5) {
        const i = text.indexOf("'", n + kl);
        const cutted = text.slice(n + kl, i);
        if (cutted.trim().length > 5)
            text = cutted;
    }
    return text;
}
let id = 0;
export async function jsonRpcInternal(payload) {
    try {
        const rpcOptions = {
            body: JSON.stringify(payload),
            method: "POST",
            headers: { 'Content-type': 'application/json; charset=utf-8' }
        };
        const fetchResult = await fetch(rpcUrl, rpcOptions);
        const response = await fetchResult.json();
        if (!fetchResult.ok)
            throw new Error(rpcUrl + " " + fetchResult.status + " " + fetchResult.statusText);
        let error = response.error;
        if (!error && response.result && response.result.error) {
            error = {
                message: response.result.error,
                code: "",
                data: ""
            };
        }
        if (error) {
            const errorMessage = formatJSONErr(error);
            // NOTE: All this hackery is happening because structured errors not implemented
            // TODO: Fix when https://github.com/nearprotocol/nearcore/issues/1839 gets resolved
            if (error.data === 'Timeout' || errorMessage.indexOf('Timeout error') != -1) {
                const err = new Error('jsonRpc has timed out');
                err.name = 'TimeoutError';
                throw err;
            }
            else {
                throw new Error("Network Error: " + errorMessage);
            }
        }
        return response.result;
    }
    catch (ex) {
        throw new Error("Network Err: " + ex.message);
    }
}
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
/**
 * makes a jsonRpc call with {method}
 * @param method jsonRpc method to call
 * @param jsonRpcParams string[] with parameters
 */
export function jsonRpc(method, jsonRpcParams) {
    const payload = {
        method: method,
        params: jsonRpcParams,
        id: ++id,
        jsonrpc: "2.0"
    };
    return jsonRpcInternal(payload);
}
/**
 * makes a jsonRpc "query" call
 * @param {string} queryWhat : account/xx | call/contract/method
 * @param {any} params : { amount:"2020202202212"}
 */
export async function jsonRpcQuery(queryWhat, params) {
    if (typeof params == "object" && Object.keys(params).length == 0) {
        params = undefined;
    }
    let queryParams = [queryWhat, params || ""]; //params for the fn call - something - the jsonrpc call fail if there's a single item in the array
    return await jsonRpc("query", queryParams);
}
//# sourceMappingURL=json-rpc.js.map