import { ByteArray } from './array.js';
const QUOTE = 1 << 16;
export function _randomBytes(x, n) {
    for (let i = 0; i < n; i += QUOTE) {
        crypto.getRandomValues(x.subarray(i, i + Math.min(n - i, QUOTE)));
    }
}
export function randomBytes(n) {
    const b = ByteArray(n);
    _randomBytes(b, n);
    return b;
}
//# sourceMappingURL=random.js.map