import {sign_keyPair_fromSeed} from "../tweetnacl/sign.js"
import {sha512Async} from "../crypto-lite/crypto-primitives-browser.js"

declare type Keys = {
    key: Buffer;
    chainCode: Buffer;
};

const ED25519_CURVE_SEED = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;


//utils------------
const pathRegex: RegExp = new RegExp("^m(\\/[0-9]+')+$");
function replaceDerive(val: string):string{
    return val.replace("'", '')
};


async function hmac_sha512_Async(seed:ArrayBuffer, passwordSalt:ArrayBuffer) :Promise<ArrayBuffer> {

    //equivalent to node-js 'crypto':
    // const hmac = createHmac('sha512', passwordSalt);
    // const I = hmac.update(seed).digest();
    // console.log(JSON.stringify(Buffer.from(I)))
    // return I

    const key = await window.crypto.subtle.importKey(
        "raw", // raw format of the key - should be Uint8Array
        passwordSalt,
        { // algorithm details
            name: "HMAC",
            hash: {name: "SHA-512"}
        },
        false, // export = false
        ["sign", "verify"] // what this key can do
    );

    return window.crypto.subtle.sign(
            "HMAC",
            key,
            seed
        );

}

//------------
export async function getMasterKeyFromSeed(seed: ArrayBuffer): Promise<Keys> {

    var pwdSalt = new TextEncoder().encode(ED25519_CURVE_SEED);
    const I = Buffer.from( await hmac_sha512_Async(seed,pwdSalt) );
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR,
    };
};

export async function CKDPrivAsync ( k:Keys , index:number) : Promise<Keys>{

    const indexBuffer = Buffer.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index, 0);
    const data = Buffer.concat([Buffer.alloc(1, 0), k.key, indexBuffer]);
    const I = Buffer.from( await hmac_sha512_Async(data, k.chainCode) );
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    const result = {
        key: IL,
        chainCode: IR,
    };
    return result;
};

export function getPublicKey(privateKey: Buffer, withZeroByte: boolean=true): Buffer {
    const keyPair = sign_keyPair_fromSeed(privateKey);
    const signPk = keyPair.secretKey.subarray(32);
    const zero = Buffer.alloc(1, 0);
    return withZeroByte ?
        Buffer.concat([zero, Buffer.from(signPk)]) :
        Buffer.from(signPk);
};

export function isValidPath (path: string) : boolean {
    if (!pathRegex.test(path)) {
        return false;
    }
    for(let item of path.split('/').slice(1)){
        if (isNaN(Number(replaceDerive(item)))) return false;
    }
    return true;
};

export async function derivePathAsync(path: string, seed: ArrayBuffer): Promise<Keys> {
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
    for(let n=0;n<segments.length;n++){
        keys=await CKDPrivAsync( keys, segments[n] + HARDENED_OFFSET)
    }
  return keys
};
