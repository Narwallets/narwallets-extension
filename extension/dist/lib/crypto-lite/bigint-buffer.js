// originally from https://github.com/no2chem/bigint-buffer/blob/master/src/index.ts
/**
 * Convert a big-endian buffer into a BigInt
 * @param buf The big-endian buffer to convert.
 * @returns A BigInt with the big-endian representation of buf.
 */
export function fromBE(buf) {
    const hex = buf.toString('hex');
    if (hex.length === 0)
        return 0n;
    return BigInt(`0x${hex}`);
}
/**
 * Convert a little-endian buffer into a BigInt.
 * @param buf The little-endian buffer to convert
 * @returns A BigInt with the little-endian representation of buf.
 */
export function fromLE(buf) {
    return fromBE(Buffer.from(buf).reverse());
}
/**
 * Convert a BigInt to a big-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A big-endian buffer representation of num.
 */
export function toBufferBE(num, width) {
    const hex = num.toString(16);
    const buf = Buffer.from(hex.padStart(width * 2, '0'), 'hex');
    if (buf.length != width)
        throw Error("int too big");
    return buf;
}
/**
 * Convert a BigInt to a little-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A little-endian buffer representation of num.
 */
export function toBufferLE(num, width) {
    return toBufferBE(num, width).reverse();
}
