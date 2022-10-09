import { Assignable } from './enums.js';
import * as nacl from '../../tweetnacl/sign.js';
import * as bs58 from '../../crypto-lite/bs58.js';

export type Arrayish = string | ArrayLike<number>;

export interface Signature {
    signature: Uint8Array;
    publicKey: CurveAndArrayKey;
}

/** All supported key types */
export enum KeyType {
    ED25519 = 0,
}

function key_type_to_str(keyType: KeyType): string {
    switch (keyType) {
        case KeyType.ED25519: return 'ed25519';
        default: throw new Error(`Unknown key type ${keyType}`);
    }
}

function str_to_key_type(keyType: string): KeyType {
    switch (keyType.toLowerCase()) {
        case 'ed25519': return KeyType.ED25519;
        default: throw new Error(`Unknown key type ${keyType}`);
    }
}

/**
 * PublicKey representation that has type and bytes of the pub key.
 */
export class CurveAndArrayKey extends Assignable {
    keyType!: KeyType
    data!: Uint8Array

    static fromString(encodedKey: string): CurveAndArrayKey {
        const parts = encodedKey.split(':');
        if (parts.length === 1) { //assume is all a ed25519 key
            return new CurveAndArrayKey({ keyType: KeyType.ED25519, data: bs58.decode(parts[0]) });
        } else if (parts.length === 2) {
            return new CurveAndArrayKey({ keyType: str_to_key_type(parts[0]), data: bs58.decode(parts[1]) });
        } else {
            throw new Error('Invalid encoded key format, must be <curve>:<encoded key>');
        }
    }

    toString(): string {
        return `${key_type_to_str(this.keyType)}:${bs58.encode(this.data)}`;
    }
}

export abstract class KeyPair {
    abstract sign(message: Uint8Array): Signature;
    abstract verify(message: Uint8Array, signature: Uint8Array): boolean;
    abstract toString(): string;
    abstract getPublicKey(): CurveAndArrayKey;
    abstract getSecretKey(): Uint8Array;

    static fromString(privateKey: string): KeyPair {
        const t = CurveAndArrayKey.fromString(privateKey);
        return new KeyPairEd25519(t.data);
    }

    /**
     * @param curve Name of elliptical curve, case-insensitive
     * @returns Random KeyPair based on the curve
     */
    static fromRandom(curve: string): KeyPair {
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
    readonly publicKey: CurveAndArrayKey;
    readonly secretKey: Uint8Array;

    /**
     * Construct an instance of key pair given a secret key.
     * It's generally assumed that these are encoded in base58.
     * @param {string} secretKey
     */
    constructor(secretKey: Uint8Array) {
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

    sign(message: Uint8Array): Signature {
        const signature = nacl.sign_detached(message, this.secretKey);
        return { signature, publicKey: this.publicKey };
    }

    verify(message: Uint8Array, signature: Uint8Array): boolean {
        return nacl.sign_detached_verify(message, signature, this.publicKey.data);
    }

    //returns private key .- good enough to re-build the pair
    toString(): string {
        return `ed25519:${bs58.encode(this.secretKey)}`;
    }

    getPublicKey(): CurveAndArrayKey {
        return this.publicKey;
    }

    getSecretKey(): Uint8Array {
        return this.secretKey;
    }

}
