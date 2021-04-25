import { sign_keyPair_fromSeed } from "../../tweetnacl/sign.js";
const ED25519_CURVE_SEED = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;
//utils------------
const pathRegex = new RegExp("^m(\\/[0-9]+')+$");
function replaceDerive(val) {
    return val.replace("'", '');
}
;
async function hmac_sha512_Async(seed, passwordSalt) {
    //equivalent to node-js 'crypto':
    // const hmac = createHmac('sha512', passwordSalt);
    // const I = hmac.update(seed).digest();
    // console.log(JSON.stringify(Buffer.from(I)))
    // return I
    const key = await window.crypto.subtle.importKey("raw", // raw format of the key - should be Uint8Array
    passwordSalt, {
        name: "HMAC",
        hash: { name: "SHA-512" }
    }, false, // export = false
    ["sign", "verify"] // what this key can do
    );
    return window.crypto.subtle.sign("HMAC", key, seed);
}
//------------
export async function getMasterKeyFromSeed(seed) {
    var pwdSalt = new TextEncoder().encode(ED25519_CURVE_SEED);
    const I = Buffer.from(await hmac_sha512_Async(seed, pwdSalt));
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
}
;
export async function CKDPrivAsync(k, index) {
    const indexBuffer = Buffer.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index, 0);
    const data = Buffer.concat([Buffer.alloc(1, 0), k.key, indexBuffer]);
    const I = Buffer.from(await hmac_sha512_Async(data, k.chainCode));
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    const result = {
        key: IL,
        chainCode: IR,
    };
    return result;
}
;
export function getPublicKey(privateKey, withZeroByte = true) {
    const keyPair = sign_keyPair_fromSeed(privateKey);
    const signPk = keyPair.secretKey.subarray(32);
    const zero = Buffer.alloc(1, 0);
    return withZeroByte ?
        Buffer.concat([zero, Buffer.from(signPk)]) :
        Buffer.from(signPk);
}
;
export function isValidPath(path) {
    if (!pathRegex.test(path)) {
        return false;
    }
    for (let item of path.split('/').slice(1)) {
        if (isNaN(Number(replaceDerive(item))))
            return false;
    }
    return true;
}
;
export async function derivePathAsync(path, seed) {
    if (!isValidPath(path)) {
        throw new Error('Invalid derivation path');
    }
    const segments = path
        .split('/')
        .slice(1)
        .map(replaceDerive)
        .map(el => parseInt(el, 10));
    //derive
    let keys = await getMasterKeyFromSeed(seed);
    for (let n = 0; n < segments.length; n++) {
        keys = await CKDPrivAsync(keys, segments[n] + HARDENED_OFFSET);
    }
    return keys;
}
;
//# sourceMappingURL=near-hd-key.js.map