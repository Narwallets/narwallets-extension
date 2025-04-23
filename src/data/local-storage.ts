// data/util.js

// get for simpler items
export async function localStorageGet(code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(code, (obj) => {
        //console.log("localStorageGet",code,obj)
        if (chrome.runtime.lastError) {
          console.error(JSON.stringify(chrome.runtime.lastError));
        }
        return resolve(obj[code]);
      });
    } catch (err) {
      console.error(
        "CRITICAL. localStorageGet('" + code + "') failed",
        err.message
      );
      reject();
    } finally {
    }
  });
}
// get & remove for simpler items
export async function localStorageGetAndRemove(code: string): Promise<any> {
  const value = await localStorageGet(code);
  localStorageRemove(code);
  return value;
}

// set for simpler items
export function localStorageSet(payload: any) {
  //console.log("localStorageSet",payload)
  chrome.storage.local.set(payload, () => {
    if (chrome.runtime.lastError)
      console.error(
        "ERR chrome.storage.local.set(...) " + chrome.runtime.lastError.message
      );
  });
}
// remove for simpler items
export function localStorageRemove(code: string) {
  chrome.storage.local.remove(code);
}
// recover for complex objects like state
export async function recoverFromLocalStorage<T>(
  title: string,
  code: string,
  defaultValue: T
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(code, (keys) => {
        if (chrome.runtime.lastError) {
          console.error(JSON.stringify(chrome.runtime.lastError));
        }
        let result = keys[code] || {};
        if (Object.keys(result).length == 0) { // empty object
          Object.assign(result, defaultValue);
        }
        return resolve(result);
      });
    }
    catch (err) {
      console.error("CRITICAL. Can't recover " + title, err.message);
      reject();
    }
  });
}

export function localStorageSave(title: string, code: string, value: any) {
  const payload: Record<string, any> = {};
  payload[code] = value;
  chrome.storage.local.set(payload, () => {
    if (chrome.runtime.lastError)
      console.error(
        ("ERR saving " +
          title +
          " chrome.storage.local.set{" +
          code +
          ":...} " +
          chrome.runtime.lastError.message) as string
      );
  });
}

export function showPassword(e: Event) {

  const showHideButton = e.target as HTMLButtonElement;
  const input = showHideButton.previousSibling?.previousSibling as HTMLInputElement;

  if (input?.type === "password") {
    input.type = "text";
    showHideButton.classList.add("text-strike-through")
  } else {
    input.type = "password";
    showHideButton.classList.remove("text-strike-through")
  }
}
