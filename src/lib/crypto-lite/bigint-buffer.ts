// originally from https://github.com/no2chem/bigint-buffer/blob/master/src/index.ts

export function uInt8ArrayToHex(bytes: Uint8Array) {
    return bytes.map(function (b) { var s = b.toString(16); return b < 0x10 ? '0' + s : s; }).join().toUpperCase()
}
export function hexToUint8Array(hex: string) {
    return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

/**
 * Convert a big-endian buffer into a BigInt
 * @param buf The big-endian buffer to convert.
 * @returns A BigInt with the big-endian representation of buf.
 */
export function fromBE(buf: Uint8Array): bigint {
    const hex = uInt8ArrayToHex(buf);
    if (hex.length === 0) return 0n;
    return BigInt(`0x${hex}`);
}

/**
 * Convert a little-endian buffer into a BigInt.
 * @param buf The little-endian buffer to convert
 * @returns A BigInt with the little-endian representation of buf.
 */
export function fromLE(buf: Uint8Array): bigint {
    return fromBE(buf.reverse());
}


/**
 * Convert a BigInt to a big-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A big-endian buffer representation of num.
 */
export function toBufferBE(num: bigint, width: number): Uint8Array {
    const hex = num.toString(16);
    const buf = hexToUint8Array(hex)
    if (buf.length != width) throw Error("int too big");
    return buf;
}

/**
 * Convert a BigInt to a little-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A little-endian buffer representation of num.
 */
export function toBufferLE(num: bigint, width: number): Uint8Array {
    return toBufferBE(num, width).reverse();
}
