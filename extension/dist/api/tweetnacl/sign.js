import { ByteArray, NumArray, checkArrayTypes } from './core/array.js';
import { _verify_32 } from './core/verify.js';
import { gf, gf0, gf1, D2, A, D, S, M, X, Y, Z, I } from './core/core.js';
import { _randomBytes } from './core/random.js';
import { set25519, sel25519, inv25519, pack25519, unpack25519, par25519, neq25519 } from './core/curve25519.js';
import { _hash } from './core/hash.js';
export function sign(msg, secretKey) {
    checkArrayTypes(msg, secretKey);
    if (secretKey.length !== 64 /* SecretKey */)
        throw new Error('bad secret key size');
    const signedMsg = ByteArray(64 /* Signature */ + msg.length);
    _sign(signedMsg, msg, msg.length, secretKey);
    return signedMsg;
}
export function sign_open(signedMsg, publicKey) {
    checkArrayTypes(signedMsg, publicKey);
    if (publicKey.length !== 32 /* PublicKey */)
        throw new Error('bad public key size');
    const tmp = ByteArray(signedMsg.length);
    const mlen = _sign_open(tmp, signedMsg, signedMsg.length, publicKey);
    if (mlen < 0)
        return;
    const m = ByteArray(mlen);
    for (let i = 0; i < m.length; i++)
        m[i] = tmp[i];
    return m;
}
export function sign_detached(msg, secretKey) {
    const signedMsg = sign(msg, secretKey);
    const sig = ByteArray(64 /* Signature */);
    for (let i = 0; i < sig.length; i++)
        sig[i] = signedMsg[i];
    return sig;
}
export function sign_detached_verify(msg, sig, publicKey) {
    checkArrayTypes(msg, sig, publicKey);
    if (sig.length !== 64 /* Signature */)
        throw new Error('bad signature size');
    if (publicKey.length !== 32 /* PublicKey */)
        throw new Error('bad public key size');
    const sm = ByteArray(64 /* Signature */ + msg.length);
    const m = ByteArray(64 /* Signature */ + msg.length);
    let i;
    for (i = 0; i < 64 /* Signature */; i++)
        sm[i] = sig[i];
    for (i = 0; i < msg.length; i++)
        sm[i + 64 /* Signature */] = msg[i];
    return _sign_open(m, sm, sm.length, publicKey) >= 0;
}
export function sign_keyPair() {
    const pk = ByteArray(32 /* PublicKey */);
    const sk = ByteArray(64 /* SecretKey */);
    _sign_keypair(pk, sk, false);
    return { publicKey: pk, secretKey: sk };
}
export function sign_keyPair_fromSecretKey(secretKey) {
    checkArrayTypes(secretKey);
    if (secretKey.length !== 64 /* SecretKey */)
        throw new Error('bad secret key size');
    const pk = ByteArray(32 /* PublicKey */);
    for (let i = 0; i < pk.length; i++)
        pk[i] = secretKey[32 + i];
    return { publicKey: pk, secretKey: ByteArray(secretKey) };
}
export function sign_keyPair_fromSeed(seed) {
    checkArrayTypes(seed);
    if (seed.length !== 32 /* Seed */)
        throw new Error('bad seed size');
    const pk = ByteArray(32 /* PublicKey */);
    const sk = ByteArray(64 /* SecretKey */);
    for (let i = 0; i < 32; i++)
        sk[i] = seed[i];
    _sign_keypair(pk, sk, true);
    return { publicKey: pk, secretKey: sk };
}
// low level
function _sign_keypair(pk, sk, seeded) {
    const d = ByteArray(64);
    const p = [gf(), gf(), gf(), gf()];
    let i;
    if (!seeded)
        _randomBytes(sk, 32);
    _hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    scalarbase(p, d);
    pack(pk, p);
    for (i = 0; i < 32; i++)
        sk[i + 32] = pk[i];
    return 0;
}
// Note: difference from C - smlen returned, not passed as argument.
function _sign(sm, m, n, sk) {
    const d = ByteArray(64), h = ByteArray(64), r = ByteArray(64);
    const x = NumArray(64);
    const p = [gf(), gf(), gf(), gf()];
    let i, j;
    _hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    const smlen = n + 64;
    for (i = 0; i < n; i++)
        sm[64 + i] = m[i];
    for (i = 0; i < 32; i++)
        sm[32 + i] = d[32 + i];
    _hash(r, sm.subarray(32), n + 32);
    reduce(r);
    scalarbase(p, r);
    pack(sm, p);
    for (i = 32; i < 64; i++)
        sm[i] = sk[i];
    _hash(h, sm, n + 64);
    reduce(h);
    for (i = 0; i < 64; i++)
        x[i] = 0;
    for (i = 0; i < 32; i++)
        x[i] = r[i];
    for (i = 0; i < 32; i++) {
        for (j = 0; j < 32; j++) {
            x[i + j] += h[i] * d[j];
        }
    }
    modL(sm.subarray(32), x);
    return smlen;
}
function _sign_open(m, sm, n, pk) {
    const t = ByteArray(32), h = ByteArray(64);
    const p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
    let i, mlen;
    mlen = -1;
    if (n < 64 || unpackneg(q, pk))
        return -1;
    for (i = 0; i < n; i++)
        m[i] = sm[i];
    for (i = 0; i < 32; i++)
        m[i + 32] = pk[i];
    _hash(h, m, n);
    reduce(h);
    scalarmult(p, q, h);
    scalarbase(q, sm.subarray(32));
    add(p, q);
    pack(t, p);
    n -= 64;
    if (_verify_32(sm, 0, t, 0)) {
        for (i = 0; i < n; i++)
            m[i] = 0;
        return -1;
    }
    for (i = 0; i < n; i++)
        m[i] = sm[i + 64];
    mlen = n;
    return mlen;
}
export function scalarbase(p, s) {
    const q = [gf(), gf(), gf(), gf()];
    set25519(q[0], X);
    set25519(q[1], Y);
    set25519(q[2], gf1);
    M(q[3], X, Y);
    scalarmult(p, q, s);
}
export function scalarmult(p, q, s) {
    let b, i;
    set25519(p[0], gf0);
    set25519(p[1], gf1);
    set25519(p[2], gf1);
    set25519(p[3], gf0);
    for (i = 255; i >= 0; --i) {
        b = (s[(i / 8) | 0] >> (i & 7)) & 1;
        cswap(p, q, b);
        add(q, p);
        add(p, p);
        cswap(p, q, b);
    }
}
function pack(r, p) {
    const tx = gf(), ty = gf(), zi = gf();
    inv25519(zi, p[2]);
    M(tx, p[0], zi);
    M(ty, p[1], zi);
    pack25519(r, ty);
    r[31] ^= par25519(tx) << 7;
}
function unpackneg(r, p) {
    const t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
    set25519(r[2], gf1);
    unpack25519(r[1], p);
    S(num, r[1]);
    M(den, num, D);
    Z(num, num, r[2]);
    A(den, r[2], den);
    S(den2, den);
    S(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);
    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r[0], t, den);
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        M(r[0], r[0], I);
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        return -1;
    if (par25519(r[0]) === (p[31] >> 7))
        Z(r[0], gf0, r[0]);
    M(r[3], r[0], r[1]);
    return 0;
}
function reduce(r) {
    const x = NumArray(64);
    let i;
    for (i = 0; i < 64; i++)
        x[i] = r[i];
    for (i = 0; i < 64; i++)
        r[i] = 0;
    modL(r, x);
}
const L = NumArray([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);
function modL(r, x) {
    let carry, i, j, k;
    for (i = 63; i >= 32; --i) {
        carry = 0;
        for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L[j - (i - 32)];
            carry = (x[j] + 128) >> 8;
            x[j] -= carry * 256;
        }
        x[j] += carry;
        x[i] = 0;
    }
    carry = 0;
    for (j = 0; j < 32; j++) {
        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
    }
    for (j = 0; j < 32; j++)
        x[j] -= carry * L[j];
    for (i = 0; i < 32; i++) {
        x[i + 1] += x[i] >> 8;
        r[i] = x[i] & 255;
    }
}
function add(p, q) {
    const a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
    Z(a, p[1], p[0]);
    Z(t, q[1], q[0]);
    M(a, a, t);
    A(b, p[0], p[1]);
    A(t, q[0], q[1]);
    M(b, b, t);
    M(c, p[3], q[3]);
    M(c, c, D2);
    M(d, p[2], q[2]);
    A(d, d, d);
    Z(e, b, a);
    Z(f, d, c);
    A(g, d, c);
    A(h, b, a);
    M(p[0], e, f);
    M(p[1], h, g);
    M(p[2], g, f);
    M(p[3], e, h);
}
function cswap(p, q, b) {
    for (let i = 0; i < 4; i++) {
        sel25519(p[i], q[i], b);
    }
}
function pow2523(o, i) {
    const c = gf();
    let a;
    for (a = 0; a < 16; a++)
        c[a] = i[a];
    for (a = 250; a >= 0; a--) {
        S(c, c);
        if (a !== 1)
            M(c, c, i);
    }
    for (a = 0; a < 16; a++)
        o[a] = c[a];
}
