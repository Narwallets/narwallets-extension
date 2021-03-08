// -------------------------------------------------------------
// Crypto-primitives *BROWSER ONLY* .- uses window.crypto.subtle
// -------------------------------------------------------------
// based on: https://gist.github.com/Allegan/97a7b002837e21fa37a3e929c546ca11
// async functions returning ArrayBuffer (undelying buffer for UInt8Array & other views)
// https://stackoverflow.com/questions/42416783/where-to-use-arraybuffer-vs-typed-array-in-javascript
//
//random
export function getRandomValues(byteLength) {
    return window.crypto.getRandomValues(new Uint8Array(byteLength));
}
//sha256
export async function sha256Async(byt) {
    return window.crypto.subtle.digest("SHA-256", byt);
}
//sha512
export async function sha512Async(byt) {
    return window.crypto.subtle.digest("SHA-512", byt);
}
// export pbkdf2_sha256_Async
export async function pbkdf2_sha256_Async(key, salt, iterations) {
    return pbkdf2Async(key, salt, iterations, 'SHA-256', 256);
}
// export pbkdf2_sha512_Async
export async function pbkdf2_sha512_Async(key, salt, iterations) {
    return pbkdf2Async(key, salt, iterations, 'SHA-512', 512);
}
//-- Internal common
async function pbkdf2Async(key, salt, iterations, shaAlgo, dkLenBits) {
    const te = new TextEncoder();
    // turn password into a key object
    const bytKey = await window.crypto.subtle.importKey("raw", te.encode(key), "PBKDF2", false, ["deriveBits"]);
    return window.crypto.subtle.deriveBits({
        "name": "PBKDF2",
        hash: { name: shaAlgo },
        salt: te.encode(salt),
        iterations: iterations,
    }, bytKey, //your key from generateKey or importKey
    dkLenBits //length in bits
    );
}
//# sourceMappingURL=crypto-primitives-browser.js.map