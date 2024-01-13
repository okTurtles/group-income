/* eslint-disable */
import { coerce, equals as equalBytes } from '../bytes.js';
import * as varint from '../varint.js';
/**
 * Creates a multihash digest.
 */
export function create(code, digest) {
    const size = digest.byteLength;
    const sizeOffset = varint.encodingLength(code);
    const digestOffset = sizeOffset + varint.encodingLength(size);
    const bytes = new Uint8Array(digestOffset + size);
    varint.encodeTo(code, bytes, 0);
    varint.encodeTo(size, bytes, sizeOffset);
    bytes.set(digest, digestOffset);
    return new Digest(code, size, digest, bytes);
}
/**
 * Turns bytes representation of multihash digest into an instance.
 */
export function decode(multihash) {
    const bytes = coerce(multihash);
    const [code, sizeOffset] = varint.decode(bytes);
    const [size, digestOffset] = varint.decode(bytes.subarray(sizeOffset));
    const digest = bytes.subarray(sizeOffset + digestOffset);
    if (digest.byteLength !== size) {
        throw new Error('Incorrect length');
    }
    return new Digest(code, size, digest, bytes);
}
export function equals(a, b) {
    if (a === b) {
        return true;
    }
    else {
        const data = b;
        return (a.code === data.code &&
            a.size === data.size &&
            data.bytes instanceof Uint8Array &&
            equalBytes(a.bytes, data.bytes));
    }
}
/**
 * Represents a multihash digest which carries information about the
 * hashing algorithm and an actual hash digest.
 */
export class Digest {
    code;
    size;
    digest;
    bytes;
    /**
     * Creates a multihash digest.
     */
    constructor(code, size, digest, bytes) {
        this.code = code;
        this.size = size;
        this.digest = digest;
        this.bytes = bytes;
    }
}
