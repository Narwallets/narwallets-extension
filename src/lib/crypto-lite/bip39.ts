// Based on bip-39 spec
// but:
// normalize words to lowercase
//
import { pbkdf2_sha512_Async, sha256Async, getRandomValues } from './crypto-primitives-browser.js';
import { wordlist } from './bip39-en-wordlist.js';

const INVALID_ENTROPY = 'Invalid entropy';

export async function generateMnemonicAsync(): Promise<string[]> {
  const strength = 128; //128 (12 words) - 256 (24 words)
  const entropy = getRandomValues(strength / 8)
  return entropyToMnemonicAsync(entropy);
}

export async function mnemonicToSeedAsync(words: string[], password?: string): Promise<ArrayBuffer> {
  if (!words || words.length < 12 || words.length > 24) throw Error("12-24 words expected");
  const mnemonicString = words.join(' ').toLowerCase().normalize('NFKD');
  return pbkdf2_sha512_Async(mnemonicString, salt(password), 2048);
}

async function entropyToMnemonicAsync(entropy: Uint8Array): Promise<string[]> {
  // 128 <= ENT <= 256
  if (entropy.length < 16 || entropy.length > 32) {
    throw new TypeError(INVALID_ENTROPY);
  }
  const entropyBitsBinaryString = bytesToBinaryString(entropy);
  const checksumBitsBinaryString = await deriveChecksumBitsBinaryString(entropy);
  //join bits+checksum as per BIP-39 spec, to make bit-length a byte-compatible multiple of 8
  const bits = `${entropyBitsBinaryString}${checksumBitsBinaryString}`;
  //split in chunks of 11-bits, 11-bits => 2048, that's why there are 2048 words in the wordlist
  //for each 11-bit-chunk, get the word in the wordlist
  let words = []
  for (let n = 0; n < bits.length; n += 11) words.push(wordlist[binaryToByte(bits.slice(n, n + 11))]);
  return words;
}

function salt(password?: string): string {
  return 'mnemonic' + (password ? password.normalize('NFKD') : '');
}
function lpad(str: string, padString: string, length: number) {
  return str.padStart(length, padString);
}
function binaryToByte(bin: string) {
  return parseInt(bin, 2);
}
function bytesToBinaryString(bytes: Uint8Array): string {
  //for each item, convert to string, base 2, padLeft to 8 with zeroes, 
  let result = []
  for (let n = 0; n < bytes.byteLength; n++) result.push(lpad(bytes[n].toString(2), '0', 8));
  return result.join('');
}
async function deriveChecksumBitsBinaryString(entropyBuffer: ArrayBuffer): Promise<string> {
  const hash = await sha256Async(entropyBuffer);
  const ENT = entropyBuffer.byteLength * 8;
  const CS = ENT / 32;
  return bytesToBinaryString(new Uint8Array(hash)).slice(0, CS);
}
/*

const INVALID_CHECKSUM = 'Invalid mnemonic checksum';
const INVALID_MNEMONIC = 'Invalid mnemonic';

export function mnemonicToEntropy(
  mnemonic: string
): string {

  const words = utf8Normalize(mnemonic).split(' ');
  if (words.length % 3 !== 0) {
    throw new Error(INVALID_MNEMONIC);
  }

  // convert word indices to 11 bit binary strings
  const bits = words
    .map(
      (word: string): string => {
        const index = wordlist!.indexOf(word);
        if (index === -1) {
          throw new Error(INVALID_MNEMONIC);
        }

        return lpad(index.toString(2), '0', 11);
      },
    )
    .join('');

  // split the binary string into ENT/CS
  const dividerIndex = Math.floor(bits.length / 33) * 32;
  const entropyBits = bits.slice(0, dividerIndex);
  const checksumBits = bits.slice(dividerIndex);

  // calculate the checksum and compare
  const entropyBytes = entropyBits.match(/(.{1,8})/g)!.map(binaryToByte);
  if (entropyBytes.length < 16) {
    throw new Error(INVALID_ENTROPY);
  }
  if (entropyBytes.length > 32) {
    throw new Error(INVALID_ENTROPY);
  }
  if (entropyBytes.length % 4 !== 0) {
    throw new Error(INVALID_ENTROPY);
  }

  const entropy = new Uint8Array(entropyBytes);
  const newChecksum = deriveChecksumBits(entropy);
  if (newChecksum !== checksumBits) {
    throw new Error(INVALID_CHECKSUM);
  }

  return entropy.toString('hex');
}


export function generateMnemonic_OLD(
  strength?: number,
  rng?: (size: number) => Uint8Array,
  wordlist?: string[],
): string {
  strength = strength || 128;
  if (strength % 32 !== 0) {
    throw new TypeError(INVALID_ENTROPY);
  }
  rng = rng || randomBytes;

  return entropyToMnemonic(rng(strength / 8));
}

export function validateMnemonic(
  mnemonic: string,
): boolean {
  try {
    mnemonicToEntropy(mnemonic);
  } catch (e) {
    return false;
  }

  return true;
}
*/
