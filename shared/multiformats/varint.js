/* eslint-disable */
import varint from './vendor/varint.js';
export function decode(data, offset = 0) {
    const code = varint.decode(data, offset);
    return [code, varint.decode.bytes];
}
export function encodeTo(int, target, offset = 0) {
    varint.encode(int, target, offset);
    return target;
}
export function encodingLength(int) {
    return varint.encodingLength(int);
}
