// originally from https://github.com/no2chem/bigint-buffer/blob/master/src/index.ts

export function uInt8ArrayToHex(bytes: Uint8Array): string {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}
export function hexToUint8Array(hexString: string): Uint8Array {
  var bytes = new Uint8Array(Math.ceil(hexString.length / 2));
  for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  return bytes
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
  const hex = num.toString(16).padStart(width*2,"0");
  const buf = hexToUint8Array(hex)
  if (buf.length != width) throw Error("toBufferBE: buf.length != width");
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

export function writeUInt32BE(buf: Uint8Array, value: number, offset: number) {
  value = +value
  offset = offset >>> 0
  buf[offset] = (value >>> 24)
  buf[offset + 1] = (value >>> 16)
  buf[offset + 2] = (value >>> 8)
  buf[offset + 3] = (value & 0xff)
}

export function concatU8Arrays(a: Uint8Array, toAppend: Uint8Array): Uint8Array {
  const newArray = new Uint8Array(a.byteLength + toAppend.byteLength);
  newArray.set(a)
  newArray.set(toAppend, a.byteLength)
  return newArray
}

export function concat3U8Arrays(a: Uint8Array, b: Uint8Array, c: Uint8Array): Uint8Array {
  const newArray = new Uint8Array(a.byteLength + b.byteLength + c.byteLength);
  newArray.set(a)
  newArray.set(b, a.byteLength)
  newArray.set(c, a.byteLength + b.byteLength)
  return newArray
}