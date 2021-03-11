let _logEnabled = false

export function logEnabled(onoff:boolean){
    _logEnabled = onoff
}

export function log(...args:any){
    if (_logEnabled) console.error(...args) //console.error so it gets on the extensions page error log
}
