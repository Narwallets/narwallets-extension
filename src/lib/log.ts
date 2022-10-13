let _logEnabled = 0

export function logEnabled(stream: number) {
    _logEnabled = stream
}

export function log(...args: any) {
    if (_logEnabled == 2) console.error(...args) // console.error so it gets on the extensions page error log
    if (_logEnabled == 1) console.log(...args)
}

export function debug(...args: any) {
    console.error(...args) // console.error so it gets on the extensions page error log
}


