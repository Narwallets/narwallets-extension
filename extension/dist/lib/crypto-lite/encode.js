//------------------------------------
//--- Encode/Decode to/from Uint8Array
//------------------------------------
export function Uint8ArrayFromString(s) {
    return new TextEncoder().encode(s);
}
export function stringFromUint8Array(u8arr) {
    return new TextDecoder().decode(u8arr);
}
;
export function stringFromArray(arr) {
    let u8arr = new Uint8Array(arr.length);
    for (let i = 0; i < arr.length; i++)
        u8arr[i] = arr[i];
    return stringFromUint8Array(u8arr);
    // var s = [];
    // for (let i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
    // return decodeURIComponent(escape(s.join('')));
}
;
//--------- BASE 64 ------------------
export function validateBase64(s) {
    if (!(/^(?:[A-Za-z0-9+\/]{2}[A-Za-z0-9+\/]{2})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/.test(s))) {
        throw new TypeError('invalid encoding');
    }
}
export function encodeBase64(arr) {
    let s = [], len = arr.length;
    for (let i = 0; i < len; i++)
        s.push(String.fromCharCode(arr[i]));
    return btoa(s.join(''));
}
;
export function decodeBase64(s) {
    validateBase64(s);
    let d = atob(s), b = new Uint8Array(d.length);
    for (let i = 0; i < d.length; i++)
        b[i] = d.charCodeAt(i);
    return b;
}
;
//--------- HEX BASE 16 ------------------
export function encodeHex(unit8Arr) {
    return [...unit8Arr]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}
export function decodeHex(hexString) {
    if (hexString.slice(0, 2) == "0x")
        hexString = hexString.slice(2);
    let b = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2)
        b[i] = parseInt(hexString.slice(i, i + 2), 16);
    return b;
}
//# sourceMappingURL=encode.js.map