
export function logEnabled(onoff:boolean){
    let _logEnabled = onoff
}

let _logEnabled = false

export function log(...args:any){
    if (_logEnabled) console.error(...args) //console.error so it gets on the extensions page error log
}
