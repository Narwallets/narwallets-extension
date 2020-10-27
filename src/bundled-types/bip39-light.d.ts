
export declare function bip39Namespace(mnemonic: string, password?: string): Buffer;
export declare function mnemonicToSeed(mnemonic: string, password?: string): Buffer;
export declare function mnemonicToEntropy(mnemonic: string, wordlist?: string[]): string;
export declare function entropyToMnemonic(entropy: Buffer | string, wordlist?: string[]): string;
export declare function generateMnemonic(strength?: number, rng?: (size: number) => Buffer, wordlist?: string[]): string;
export declare function validateMnemonic(mnemonic: string, wordlist?: string[]): boolean;
export declare function setDefaultWordlist(language: string): void;
export declare function getDefaultWordlist(): string;
