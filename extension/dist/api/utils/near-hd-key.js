import { sign_keyPair_fromSeed } from "../tweetnacl/sign.js";
const createHmac = createHmacPackage.createHmac;
const ED25519_CURVE = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;
//utils------------
const pathRegex = new RegExp("^m(\\/[0-9]+')+$");
function replaceDerive(val) {
    return val.replace("'", '');
}
;
//------------
export function getMasterKeyFromSeed(seed) {
    const hmac = createHmac('sha512', ED25519_CURVE);
    const I = hmac.update(Buffer.from(seed, 'hex')).digest();
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
}
;
//@ts-ignore
const CKDPriv = ({ key, chainCode }, index) => {
    const indexBuffer = Buffer.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index, 0);
    const data = Buffer.concat([Buffer.alloc(1, 0), key, indexBuffer]);
    const I = createHmac('sha512', chainCode)
        .update(data)
        .digest();
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
};
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
    // return !path
    //     .split('/')
    //     .slice(1)
    //     .map(replaceDerive)
    //     .some(isNaN);
}
;
export function derivePath(path, seed) {
    if (!isValidPath(path)) {
        throw new Error('Invalid derivation path');
    }
    const { key, chainCode } = getMasterKeyFromSeed(seed);
    const segments = path
        .split('/')
        .slice(1)
        .map(replaceDerive)
        .map(el => parseInt(el, 10));
    return segments.reduce((parentKeys, segment) => CKDPriv(parentKeys, segment + HARDENED_OFFSET), { key, chainCode });
}
;
