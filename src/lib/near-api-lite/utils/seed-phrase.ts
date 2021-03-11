import * as bs58 from "../../crypto-lite/bs58.js"

import {mnemonicToSeedAsync, generateMnemonicAsync} from "../../crypto-lite/bip39.js"
import {derivePathAsync} from "./near-hd-key.js"

import {sign_keyPair_fromSeed} from "../../tweetnacl/sign.js"

const KEY_DERIVATION_PATH = "m/44'/397'/0'"

export type SeedPhraseResult = {
    seedPhrase:string[];
    secretKey:string;
    publicKey:string;
}

export async function generateSeedPhraseAsync():Promise<SeedPhraseResult> {
    const new12Words= await generateMnemonicAsync();
    return parseSeedPhraseAsync(new12Words);
}

export function checkSeedPhrase(seedPhrase:string[]){
    if (!seedPhrase||seedPhrase.length!==12) throw Error("seed phrase:expected 12 words")
}

export function normalizeSeedPhrase(seedPhrase:string[]):string[]{ 
    return seedPhrase.map(part => part.toLowerCase())
}

export async function parseSeedPhraseAsync(seedPhrase:string[]): Promise<SeedPhraseResult> {
    const seed = await mnemonicToSeedAsync(normalizeSeedPhrase(seedPhrase))
    const { key } = await derivePathAsync(KEY_DERIVATION_PATH, seed)
    const keyPair = sign_keyPair_fromSeed(new Uint8Array(key))
    const publicKey = 'ed25519:' + bs58.encode(keyPair.publicKey)
    const secretKey = 'ed25519:' + bs58.encode(keyPair.secretKey)
    return { seedPhrase, secretKey, publicKey }
}
