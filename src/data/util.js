// data/util.js

export async function recoverFromSyncStorage(title/*:string*/,code/*:string*/,defaultValue/*:any*/)/*:Promise<any>*/ {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(code, (keys) => {
          let result = (keys[code] || {})
          if (Object.keys(result).length == 0) Object.assign(result, defaultValue);
          return resolve(result)
        })
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
        console.error("CRITICAL. Can't recover "+title, err.message);
        reject()
      }
      finally { }
    });
  }
  
  export function saveToSyncStorage(title/*:string*/,code/*:string*/,value/*:any*/) {
    const payload/*:Record<string,any>*/={}    
    payload[code]=value
    chrome.storage.sync.set(payload, () => {
      if (chrome.runtime.lastError) console.error("ERR saving "+title+" chrome.storage.sync.set{"+code+":...} " + chrome.runtime.lastError.message /*+as string+*/);
    })
  }
  