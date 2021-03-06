// data/util.js
// get for simpler items
export async function localStorageGet(code) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get(code, (obj) => {
                //console.log("localStorageGet",code,obj)
                if (chrome.runtime.lastError) {
                    console.error(JSON.stringify(chrome.runtime.lastError));
                }
                return resolve(obj[code]);
            });
        }
        catch (err) {
            console.error("CRITICAL. localStorageGet('" + code + "') failed", err.message);
            reject();
        }
        finally { }
    });
}
// get & remove for simpler items
export async function localStorageGetAndRemove(code) {
    const value = await localStorageGet(code);
    localStorageRemove(code);
    return value;
}
// set for simpler items
export function localStorageSet(payload) {
    //console.log("localStorageSet",payload)
    chrome.storage.local.set(payload, () => {
        if (chrome.runtime.lastError)
            console.error("ERR chrome.storage.local.set(...) " + chrome.runtime.lastError.message);
    });
}
// remove for simpler items
export function localStorageRemove(code) {
    chrome.storage.local.remove(code);
}
// recover for complex objects like state
export async function recoverFromLocalStorage(title, code, defaultValue) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get(code, (keys) => {
                if (chrome.runtime.lastError) {
                    console.error(JSON.stringify(chrome.runtime.lastError));
                }
                let result = (keys[code] || {});
                if (Object.keys(result).length == 0)
                    Object.assign(result, defaultValue);
                return resolve(result);
            });
            // const stringState = localStorage.getItem("S")
            // if (stringState) {
            //   try {
            //     State = JSON.parse(stringState);
            //   }
            //   catch {
            //     alert("CRITICAL. Invalid state. State reset");
            //   }
            //   finally { }
            // }
        }
        catch (err) {
            console.error("CRITICAL. Can't recover " + title, err.message);
            reject();
        }
        finally { }
    });
}
export function localStorageSave(title, code, value) {
    const payload = {};
    payload[code] = value;
    chrome.storage.local.set(payload, () => {
        if (chrome.runtime.lastError)
            console.error("ERR saving " + title + " chrome.storage.local.set{" + code + ":...} " + chrome.runtime.lastError.message);
    });
}
