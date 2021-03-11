import { Assignable } from './enums.js';
import * as nacl from '../../tweetnacl/sign.js';
import * as bs58 from '../../crypto-lite/bs58.js';
/** All supported key types */
export var KeyType;
(function (KeyType) {
    KeyType[KeyType["ED25519"] = 0] = "ED25519";
})(KeyType || (KeyType = {}));
function key_type_to_str(keyType) {
    switch (keyType) {
        case KeyType.ED25519: return 'ed25519';
        default: throw new Error(`Unknown key type ${keyType}`);
    }
}
function str_to_key_type(keyType) {
    switch (keyType.toLowerCase()) {
        case 'ed25519': return KeyType.ED25519;
        default: throw new Error(`Unknown key type ${keyType}`);
    }
}
/**
 * PublicKey representation that has type and bytes of the key.
 */
export class CurveAndArrayKey extends Assignable {
    static fromString(encodedKey) {
        const parts = encodedKey.split(':');
        if (parts.length === 1) { //assume is all a ed25519 key
            return new CurveAndArrayKey({ keyType: KeyType.ED25519, data: bs58.decode(parts[0]) });
        }
        else if (parts.length === 2) {
            return new CurveAndArrayKey({ keyType: str_to_key_type(parts[0]), data: bs58.decode(parts[1]) });
        }
        else {
            throw new Error('Invalid encoded key format, must be <curve>:<encoded key>');
        }
    }
    toString() {
        return `${key_type_to_str(this.keyType)}:${bs58.encode(this.data)}`;
    }
}
export class KeyPair {
    static fromString(privateKey) {
        const t = CurveAndArrayKey.fromString(privateKey);
        return new KeyPairEd25519(t.data);
    }
    /**
     * @param curve Name of elliptical curve, case-insensitive
     * @returns Random KeyPair based on the curve
     */
    static fromRandom(curve) {
        switch (curve.toUpperCase()) {
            case 'ED25519': return KeyPairEd25519.fromRandom();
            default: throw new Error(`Unknown curve ${curve}`);
        }
    }
}
/**
 * This class provides key pair functionality for Ed25519 curve:
 * generating key pairs, encoding key pairs, signing and verifying.
 */
export class KeyPairEd25519 extends KeyPair {
    /**
     * Construct an instance of key pair given a secret key.
     * It's generally assumed that these are encoded in base58.
     * @param {string} secretKey
     */
    constructor(secretKey) {
        super();
        const keyPair = nacl.sign_keyPair_fromSecretKey(secretKey);
        this.publicKey = new CurveAndArrayKey({ keyType: KeyType.ED25519, data: keyPair.publicKey });
        this.secretKey = secretKey;
    }
    /**
     * Generate a new random keypair.
     * @example
     * const keyRandom = KeyPair.fromRandom();
     * keyRandom.publicKey
     * // returns [PUBLIC_KEY]
     *
     * keyRandom.secretKey
     * // returns [SECRET_KEY]
     */
    static fromRandom() {
        const newKeyPair = nacl.sign_keyPair();
        return new KeyPairEd25519(newKeyPair.secretKey);
    }
    sign(message) {
        const signature = nacl.sign_detached(message, this.secretKey);
        return { signature, publicKey: this.publicKey };
    }
    verify(message, signature) {
        return nacl.sign_detached_verify(message, signature, this.publicKey.data);
    }
    //returns private key .- good enough to re-build the pair
    toString() {
        return `ed25519:${bs58.encode(this.secretKey)}`;
    }
    getPublicKey() {
        return this.publicKey;
    }
    getSecretKey() {
        return this.secretKey;
    }
}
