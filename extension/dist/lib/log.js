let _logEnabled = false;
export function logEnabled(onoff) {
    _logEnabled = onoff;
}
export function log(...args) {
    if (_logEnabled)
        console.error(...args); //console.error so it gets on the extensions page error log
}
//# sourceMappingURL=log.js.map