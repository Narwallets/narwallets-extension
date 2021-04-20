export function ByteArray(n) {
    return new Uint8Array(n);
}
export function HalfArray(n) {
    return new Uint16Array(n);
}
export function WordArray(n) {
    return new Uint32Array(n);
}
export function IntArray(n) {
    return new Int32Array(n);
}
export function NumArray(n) {
    return new Float64Array(n);
}
export function checkArrayTypes(...arrays) {
    for (const array of arrays) {
        if (!(array instanceof Uint8Array)) {
            throw new TypeError('unexpected type, use ByteArray');
        }
    }
}
