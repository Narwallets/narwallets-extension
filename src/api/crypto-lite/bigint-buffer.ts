// originally from https://github.com/no2chem/bigint-buffer/blob/master/src/index.ts

import { assert } from "console";

/**
 * Convert a big-endian buffer into a BigInt
 * @param buf The big-endian buffer to convert.
 * @returns A BigInt with the big-endian representation of buf.
 */
export function fromBE(buf: Buffer): bigint {
    const hex = buf.toString('hex');
    if (hex.length === 0) return 0n;
    return BigInt(`0x${hex}`);
}
  
/**
 * Convert a little-endian buffer into a BigInt.
 * @param buf The little-endian buffer to convert
 * @returns A BigInt with the little-endian representation of buf.
 */
export function fromLE(buf: Buffer): bigint {
    return fromBE(Buffer.from(buf).reverse());
}
  
 
/**
 * Convert a BigInt to a big-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A big-endian buffer representation of num.
 */
export function toBufferBE(num: bigint, width: number): Buffer {
    const hex = num.toString(16);
    const buf = Buffer.from(hex.padStart(width * 2, '0'), 'hex')
    if (buf.length!=width) throw Error("int too big");
    return buf;
}

/**
 * Convert a BigInt to a little-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A little-endian buffer representation of num.
 */
export function toBufferLE(num: bigint, width: number): Buffer {
    return toBufferBE(num,width).reverse();
}
