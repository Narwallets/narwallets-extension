
export function logEnabled(onoff:boolean){
    let _logEnabled = onoff
}

let _logEnabled = false

export function log(...args:any){
    if (_logEnabled) console.log(...args)
}
