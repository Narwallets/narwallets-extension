import * as bs58 from "./bs58.js";
// import type bip39Namespace from "../../bundled-types/bip39-light.js"
// declare var bip39:typeof bip39Namespace
import { mnemonicToSeedAsync, generateMnemonicAsync } from "../crypto-lite/bip39.js";
import { derivePath } from "./near-hd-key.js";
import { sign_keyPair_fromSeed } from "../tweetnacl/sign.js";
const KEY_DERIVATION_PATH = "m/44'/397'/0'";
export async function generateSeedPhraseAsync() {
    const new12Words = await generateMnemonicAsync();
    return parseSeedPhraseAsync(new12Words);
}
export function checkSeedPhrase(seedPhrase) {
    if (!seedPhrase || seedPhrase.length !== 12)
        throw Error("seed phrase:expected 12 words");
}
export function normalizeSeedPhrase(seedPhrase) {
    return seedPhrase.map(part => part.toLowerCase());
}
export async function parseSeedPhraseAsync(seedPhrase) {
    const seed = await mnemonicToSeedAsync(normalizeSeedPhrase(seedPhrase));
    const { key } = derivePath(KEY_DERIVATION_PATH, Buffer.from(seed).toString('hex'));
    const keyPair = sign_keyPair_fromSeed(key);
    const publicKey = 'ed25519:' + bs58.encode(Buffer.from(keyPair.publicKey));
    const secretKey = 'ed25519:' + bs58.encode(Buffer.from(keyPair.secretKey));
    return { seedPhrase, secretKey, publicKey };
}
//# sourceMappingURL=seed-phrase.js.map