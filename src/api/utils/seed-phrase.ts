import * as bs58 from "./bs58.js"

import type bip39Namespace from "../../bundled-types/bip39-light.js"
declare var bip39:typeof bip39Namespace

import {derivePath} from "./near-hd-key.js"

import {sign_keyPair_fromSeed} from "../tweetnacl/sign.js"

const KEY_DERIVATION_PATH = "m/44'/397'/0'"

export function generateSeedPhrase(){
    return parseSeedPhrase(bip39.generateMnemonic())
}

export function check(seedPhrase:string):string{
    const parts=seedPhrase.trim().split(/\s+/)
    if (parts.length!==12) return "expected 12 words"
    return ""
}

export function normalizeSeedPhrase(seedPhrase:string){ return seedPhrase.trim().split(/\s+/).map(part => part.toLowerCase()).join(' ') }

export function parseSeedPhrase(seedPhrase:string) {
    const seed = bip39.mnemonicToSeed(normalizeSeedPhrase(seedPhrase))
    const { key } = derivePath(KEY_DERIVATION_PATH, seed.toString('hex'))
    const keyPair = sign_keyPair_fromSeed(key)
    const publicKey = 'ed25519:' + bs58.encode(Buffer.from(keyPair.publicKey))
    const secretKey = 'ed25519:' + bs58.encode(Buffer.from(keyPair.secretKey))
    return { seedPhrase, secretKey, publicKey }
}
