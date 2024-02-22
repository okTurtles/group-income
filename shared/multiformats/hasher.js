/* eslint-disable */
import * as Digest from './hashes/digest.js';
export function from({ name, code, encode }) {
    return new Hasher(name, code, encode);
}
/**
 * Hasher represents a hashing algorithm implementation that produces as
 * `MultihashDigest`.
 */
export class Hasher {
    name;
    code;
    encode;
    constructor(name, code, encode) {
        this.name = name;
        this.code = code;
        this.encode = encode;
    }
    digest(input) {
        if (input instanceof Uint8Array || input instanceof ReadableStream) {
            const result = this.encode(input);
            return result instanceof Uint8Array
                ? Digest.create(this.code, result)
                /* c8 ignore next 1 */
                : result.then(digest => Digest.create(this.code, digest));
        }
        else {
            throw Error('Unknown type, must be binary type');
            /* c8 ignore next 1 */
        }
    }
}
