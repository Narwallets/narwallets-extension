export function logEnabled(onoff) {
    let _logEnabled = onoff;
}
let _logEnabled = false;
export function log(...args) {
    if (_logEnabled)
        console.log(...args);
}
//# sourceMappingURL=log.js.map