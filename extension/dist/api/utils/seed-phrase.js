import * as bs58 from "./bs58.js";
import { derivePath } from "./near-hd-key.js";
import { sign_keyPair_fromSeed } from "../tweetnacl/sign.js";
const KEY_DERIVATION_PATH = "m/44'/397'/0'";
export function generateSeedPhrase() {
    return parseSeedPhrase(bip39.generateMnemonic());
}
export function check(seedPhrase) {
    const parts = seedPhrase.trim().split(/\s+/);
    if (parts.length !== 12)
        return "expected 12 words";
    return "";
}
export function normalizeSeedPhrase(seedPhrase) { return seedPhrase.trim().split(/\s+/).map(part => part.toLowerCase()).join(' '); }
export function parseSeedPhrase(seedPhrase) {
    const seed = bip39.mnemonicToSeed(normalizeSeedPhrase(seedPhrase));
    const { key } = derivePath(KEY_DERIVATION_PATH, seed.toString('hex'));
    const keyPair = sign_keyPair_fromSeed(key);
    const publicKey = 'ed25519:' + bs58.encode(Buffer.from(keyPair.publicKey));
    const secretKey = 'ed25519:' + bs58.encode(Buffer.from(keyPair.secretKey));
    return { seedPhrase, secretKey, publicKey };
}
//# sourceMappingURL=seed-phrase.js.map