"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from3, except, desc) => {
    if (from3 && typeof from3 === "object" || typeof from3 === "function") {
      for (let key of __getOwnPropNames(from3))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from3[key], enumerable: !(desc = __getOwnPropDesc(from3, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/blakejs/util.js
  var require_util = __commonJS({
    "node_modules/blakejs/util.js"(exports, module) {
      var ERROR_MSG_INPUT = "Input must be an string, Buffer or Uint8Array";
      function normalizeInput(input) {
        let ret;
        if (input instanceof Uint8Array) {
          ret = input;
        } else if (typeof input === "string") {
          const encoder = new TextEncoder();
          ret = encoder.encode(input);
        } else {
          throw new Error(ERROR_MSG_INPUT);
        }
        return ret;
      }
      function toHex(bytes) {
        return Array.prototype.map.call(bytes, function(n) {
          return (n < 16 ? "0" : "") + n.toString(16);
        }).join("");
      }
      function uint32ToHex(val) {
        return (4294967296 + val).toString(16).substring(1);
      }
      function debugPrint(label, arr, size) {
        let msg = "\n" + label + " = ";
        for (let i = 0; i < arr.length; i += 2) {
          if (size === 32) {
            msg += uint32ToHex(arr[i]).toUpperCase();
            msg += " ";
            msg += uint32ToHex(arr[i + 1]).toUpperCase();
          } else if (size === 64) {
            msg += uint32ToHex(arr[i + 1]).toUpperCase();
            msg += uint32ToHex(arr[i]).toUpperCase();
          } else throw new Error("Invalid size " + size);
          if (i % 6 === 4) {
            msg += "\n" + new Array(label.length + 4).join(" ");
          } else if (i < arr.length - 2) {
            msg += " ";
          }
        }
        console.log(msg);
      }
      function testSpeed(hashFn, N, M) {
        let startMs = (/* @__PURE__ */ new Date()).getTime();
        const input = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          input[i] = i % 256;
        }
        const genMs = (/* @__PURE__ */ new Date()).getTime();
        console.log("Generated random input in " + (genMs - startMs) + "ms");
        startMs = genMs;
        for (let i = 0; i < M; i++) {
          const hashHex = hashFn(input);
          const hashMs = (/* @__PURE__ */ new Date()).getTime();
          const ms = hashMs - startMs;
          startMs = hashMs;
          console.log("Hashed in " + ms + "ms: " + hashHex.substring(0, 20) + "...");
          console.log(
            Math.round(N / (1 << 20) / (ms / 1e3) * 100) / 100 + " MB PER SECOND"
          );
        }
      }
      module.exports = {
        normalizeInput,
        toHex,
        debugPrint,
        testSpeed
      };
    }
  });

  // node_modules/blakejs/blake2b.js
  var require_blake2b = __commonJS({
    "node_modules/blakejs/blake2b.js"(exports, module) {
      var util = require_util();
      function ADD64AA(v2, a, b) {
        const o0 = v2[a] + v2[b];
        let o1 = v2[a + 1] + v2[b + 1];
        if (o0 >= 4294967296) {
          o1++;
        }
        v2[a] = o0;
        v2[a + 1] = o1;
      }
      function ADD64AC(v2, a, b0, b1) {
        let o0 = v2[a] + b0;
        if (b0 < 0) {
          o0 += 4294967296;
        }
        let o1 = v2[a + 1] + b1;
        if (o0 >= 4294967296) {
          o1++;
        }
        v2[a] = o0;
        v2[a + 1] = o1;
      }
      function B2B_GET32(arr, i) {
        return arr[i] ^ arr[i + 1] << 8 ^ arr[i + 2] << 16 ^ arr[i + 3] << 24;
      }
      function B2B_G(a, b, c, d, ix, iy) {
        const x0 = m[ix];
        const x1 = m[ix + 1];
        const y0 = m[iy];
        const y1 = m[iy + 1];
        ADD64AA(v, a, b);
        ADD64AC(v, a, x0, x1);
        let xor0 = v[d] ^ v[a];
        let xor1 = v[d + 1] ^ v[a + 1];
        v[d] = xor1;
        v[d + 1] = xor0;
        ADD64AA(v, c, d);
        xor0 = v[b] ^ v[c];
        xor1 = v[b + 1] ^ v[c + 1];
        v[b] = xor0 >>> 24 ^ xor1 << 8;
        v[b + 1] = xor1 >>> 24 ^ xor0 << 8;
        ADD64AA(v, a, b);
        ADD64AC(v, a, y0, y1);
        xor0 = v[d] ^ v[a];
        xor1 = v[d + 1] ^ v[a + 1];
        v[d] = xor0 >>> 16 ^ xor1 << 16;
        v[d + 1] = xor1 >>> 16 ^ xor0 << 16;
        ADD64AA(v, c, d);
        xor0 = v[b] ^ v[c];
        xor1 = v[b + 1] ^ v[c + 1];
        v[b] = xor1 >>> 31 ^ xor0 << 1;
        v[b + 1] = xor0 >>> 31 ^ xor1 << 1;
      }
      var BLAKE2B_IV32 = new Uint32Array([
        4089235720,
        1779033703,
        2227873595,
        3144134277,
        4271175723,
        1013904242,
        1595750129,
        2773480762,
        2917565137,
        1359893119,
        725511199,
        2600822924,
        4215389547,
        528734635,
        327033209,
        1541459225
      ]);
      var SIGMA8 = [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        14,
        10,
        4,
        8,
        9,
        15,
        13,
        6,
        1,
        12,
        0,
        2,
        11,
        7,
        5,
        3,
        11,
        8,
        12,
        0,
        5,
        2,
        15,
        13,
        10,
        14,
        3,
        6,
        7,
        1,
        9,
        4,
        7,
        9,
        3,
        1,
        13,
        12,
        11,
        14,
        2,
        6,
        5,
        10,
        4,
        0,
        15,
        8,
        9,
        0,
        5,
        7,
        2,
        4,
        10,
        15,
        14,
        1,
        11,
        12,
        6,
        8,
        3,
        13,
        2,
        12,
        6,
        10,
        0,
        11,
        8,
        3,
        4,
        13,
        7,
        5,
        15,
        14,
        1,
        9,
        12,
        5,
        1,
        15,
        14,
        13,
        4,
        10,
        0,
        7,
        6,
        3,
        9,
        2,
        8,
        11,
        13,
        11,
        7,
        14,
        12,
        1,
        3,
        9,
        5,
        0,
        15,
        4,
        8,
        6,
        2,
        10,
        6,
        15,
        14,
        9,
        11,
        3,
        0,
        8,
        12,
        2,
        13,
        7,
        1,
        4,
        10,
        5,
        10,
        2,
        8,
        4,
        7,
        6,
        1,
        5,
        15,
        11,
        9,
        14,
        3,
        12,
        13,
        0,
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        14,
        10,
        4,
        8,
        9,
        15,
        13,
        6,
        1,
        12,
        0,
        2,
        11,
        7,
        5,
        3
      ];
      var SIGMA82 = new Uint8Array(
        SIGMA8.map(function(x) {
          return x * 2;
        })
      );
      var v = new Uint32Array(32);
      var m = new Uint32Array(32);
      function blake2bCompress(ctx, last) {
        let i = 0;
        for (i = 0; i < 16; i++) {
          v[i] = ctx.h[i];
          v[i + 16] = BLAKE2B_IV32[i];
        }
        v[24] = v[24] ^ ctx.t;
        v[25] = v[25] ^ ctx.t / 4294967296;
        if (last) {
          v[28] = ~v[28];
          v[29] = ~v[29];
        }
        for (i = 0; i < 32; i++) {
          m[i] = B2B_GET32(ctx.b, 4 * i);
        }
        for (i = 0; i < 12; i++) {
          B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1]);
          B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3]);
          B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5]);
          B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7]);
          B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9]);
          B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11]);
          B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13]);
          B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15]);
        }
        for (i = 0; i < 16; i++) {
          ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
        }
      }
      var parameterBlock = new Uint8Array([
        0,
        0,
        0,
        0,
        //  0: outlen, keylen, fanout, depth
        0,
        0,
        0,
        0,
        //  4: leaf length, sequential mode
        0,
        0,
        0,
        0,
        //  8: node offset
        0,
        0,
        0,
        0,
        // 12: node offset
        0,
        0,
        0,
        0,
        // 16: node depth, inner length, rfu
        0,
        0,
        0,
        0,
        // 20: rfu
        0,
        0,
        0,
        0,
        // 24: rfu
        0,
        0,
        0,
        0,
        // 28: rfu
        0,
        0,
        0,
        0,
        // 32: salt
        0,
        0,
        0,
        0,
        // 36: salt
        0,
        0,
        0,
        0,
        // 40: salt
        0,
        0,
        0,
        0,
        // 44: salt
        0,
        0,
        0,
        0,
        // 48: personal
        0,
        0,
        0,
        0,
        // 52: personal
        0,
        0,
        0,
        0,
        // 56: personal
        0,
        0,
        0,
        0
        // 60: personal
      ]);
      function blake2bInit2(outlen, key, salt, personal) {
        if (outlen === 0 || outlen > 64) {
          throw new Error("Illegal output length, expected 0 < length <= 64");
        }
        if (key && key.length > 64) {
          throw new Error("Illegal key, expected Uint8Array with 0 < length <= 64");
        }
        if (salt && salt.length !== 16) {
          throw new Error("Illegal salt, expected Uint8Array with length is 16");
        }
        if (personal && personal.length !== 16) {
          throw new Error("Illegal personal, expected Uint8Array with length is 16");
        }
        const ctx = {
          b: new Uint8Array(128),
          h: new Uint32Array(16),
          t: 0,
          // input count
          c: 0,
          // pointer within buffer
          outlen
          // output length in bytes
        };
        parameterBlock.fill(0);
        parameterBlock[0] = outlen;
        if (key) parameterBlock[1] = key.length;
        parameterBlock[2] = 1;
        parameterBlock[3] = 1;
        if (salt) parameterBlock.set(salt, 32);
        if (personal) parameterBlock.set(personal, 48);
        for (let i = 0; i < 16; i++) {
          ctx.h[i] = BLAKE2B_IV32[i] ^ B2B_GET32(parameterBlock, i * 4);
        }
        if (key) {
          blake2bUpdate2(ctx, key);
          ctx.c = 128;
        }
        return ctx;
      }
      function blake2bUpdate2(ctx, input) {
        for (let i = 0; i < input.length; i++) {
          if (ctx.c === 128) {
            ctx.t += ctx.c;
            blake2bCompress(ctx, false);
            ctx.c = 0;
          }
          ctx.b[ctx.c++] = input[i];
        }
      }
      function blake2bFinal2(ctx) {
        ctx.t += ctx.c;
        while (ctx.c < 128) {
          ctx.b[ctx.c++] = 0;
        }
        blake2bCompress(ctx, true);
        const out = new Uint8Array(ctx.outlen);
        for (let i = 0; i < ctx.outlen; i++) {
          out[i] = ctx.h[i >> 2] >> 8 * (i & 3);
        }
        return out;
      }
      function blake2b3(input, key, outlen, salt, personal) {
        outlen = outlen || 64;
        input = util.normalizeInput(input);
        if (salt) {
          salt = util.normalizeInput(salt);
        }
        if (personal) {
          personal = util.normalizeInput(personal);
        }
        const ctx = blake2bInit2(outlen, key, salt, personal);
        blake2bUpdate2(ctx, input);
        return blake2bFinal2(ctx);
      }
      function blake2bHex(input, key, outlen, salt, personal) {
        const output = blake2b3(input, key, outlen, salt, personal);
        return util.toHex(output);
      }
      module.exports = {
        blake2b: blake2b3,
        blake2bHex,
        blake2bInit: blake2bInit2,
        blake2bUpdate: blake2bUpdate2,
        blake2bFinal: blake2bFinal2
      };
    }
  });

  // node_modules/blakejs/blake2s.js
  var require_blake2s = __commonJS({
    "node_modules/blakejs/blake2s.js"(exports, module) {
      var util = require_util();
      function B2S_GET32(v2, i) {
        return v2[i] ^ v2[i + 1] << 8 ^ v2[i + 2] << 16 ^ v2[i + 3] << 24;
      }
      function B2S_G(a, b, c, d, x, y) {
        v[a] = v[a] + v[b] + x;
        v[d] = ROTR32(v[d] ^ v[a], 16);
        v[c] = v[c] + v[d];
        v[b] = ROTR32(v[b] ^ v[c], 12);
        v[a] = v[a] + v[b] + y;
        v[d] = ROTR32(v[d] ^ v[a], 8);
        v[c] = v[c] + v[d];
        v[b] = ROTR32(v[b] ^ v[c], 7);
      }
      function ROTR32(x, y) {
        return x >>> y ^ x << 32 - y;
      }
      var BLAKE2S_IV = new Uint32Array([
        1779033703,
        3144134277,
        1013904242,
        2773480762,
        1359893119,
        2600822924,
        528734635,
        1541459225
      ]);
      var SIGMA = new Uint8Array([
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        14,
        10,
        4,
        8,
        9,
        15,
        13,
        6,
        1,
        12,
        0,
        2,
        11,
        7,
        5,
        3,
        11,
        8,
        12,
        0,
        5,
        2,
        15,
        13,
        10,
        14,
        3,
        6,
        7,
        1,
        9,
        4,
        7,
        9,
        3,
        1,
        13,
        12,
        11,
        14,
        2,
        6,
        5,
        10,
        4,
        0,
        15,
        8,
        9,
        0,
        5,
        7,
        2,
        4,
        10,
        15,
        14,
        1,
        11,
        12,
        6,
        8,
        3,
        13,
        2,
        12,
        6,
        10,
        0,
        11,
        8,
        3,
        4,
        13,
        7,
        5,
        15,
        14,
        1,
        9,
        12,
        5,
        1,
        15,
        14,
        13,
        4,
        10,
        0,
        7,
        6,
        3,
        9,
        2,
        8,
        11,
        13,
        11,
        7,
        14,
        12,
        1,
        3,
        9,
        5,
        0,
        15,
        4,
        8,
        6,
        2,
        10,
        6,
        15,
        14,
        9,
        11,
        3,
        0,
        8,
        12,
        2,
        13,
        7,
        1,
        4,
        10,
        5,
        10,
        2,
        8,
        4,
        7,
        6,
        1,
        5,
        15,
        11,
        9,
        14,
        3,
        12,
        13,
        0
      ]);
      var v = new Uint32Array(16);
      var m = new Uint32Array(16);
      function blake2sCompress(ctx, last) {
        let i = 0;
        for (i = 0; i < 8; i++) {
          v[i] = ctx.h[i];
          v[i + 8] = BLAKE2S_IV[i];
        }
        v[12] ^= ctx.t;
        v[13] ^= ctx.t / 4294967296;
        if (last) {
          v[14] = ~v[14];
        }
        for (i = 0; i < 16; i++) {
          m[i] = B2S_GET32(ctx.b, 4 * i);
        }
        for (i = 0; i < 10; i++) {
          B2S_G(0, 4, 8, 12, m[SIGMA[i * 16 + 0]], m[SIGMA[i * 16 + 1]]);
          B2S_G(1, 5, 9, 13, m[SIGMA[i * 16 + 2]], m[SIGMA[i * 16 + 3]]);
          B2S_G(2, 6, 10, 14, m[SIGMA[i * 16 + 4]], m[SIGMA[i * 16 + 5]]);
          B2S_G(3, 7, 11, 15, m[SIGMA[i * 16 + 6]], m[SIGMA[i * 16 + 7]]);
          B2S_G(0, 5, 10, 15, m[SIGMA[i * 16 + 8]], m[SIGMA[i * 16 + 9]]);
          B2S_G(1, 6, 11, 12, m[SIGMA[i * 16 + 10]], m[SIGMA[i * 16 + 11]]);
          B2S_G(2, 7, 8, 13, m[SIGMA[i * 16 + 12]], m[SIGMA[i * 16 + 13]]);
          B2S_G(3, 4, 9, 14, m[SIGMA[i * 16 + 14]], m[SIGMA[i * 16 + 15]]);
        }
        for (i = 0; i < 8; i++) {
          ctx.h[i] ^= v[i] ^ v[i + 8];
        }
      }
      function blake2sInit(outlen, key) {
        if (!(outlen > 0 && outlen <= 32)) {
          throw new Error("Incorrect output length, should be in [1, 32]");
        }
        const keylen = key ? key.length : 0;
        if (key && !(keylen > 0 && keylen <= 32)) {
          throw new Error("Incorrect key length, should be in [1, 32]");
        }
        const ctx = {
          h: new Uint32Array(BLAKE2S_IV),
          // hash state
          b: new Uint8Array(64),
          // input block
          c: 0,
          // pointer within block
          t: 0,
          // input count
          outlen
          // output length in bytes
        };
        ctx.h[0] ^= 16842752 ^ keylen << 8 ^ outlen;
        if (keylen > 0) {
          blake2sUpdate(ctx, key);
          ctx.c = 64;
        }
        return ctx;
      }
      function blake2sUpdate(ctx, input) {
        for (let i = 0; i < input.length; i++) {
          if (ctx.c === 64) {
            ctx.t += ctx.c;
            blake2sCompress(ctx, false);
            ctx.c = 0;
          }
          ctx.b[ctx.c++] = input[i];
        }
      }
      function blake2sFinal(ctx) {
        ctx.t += ctx.c;
        while (ctx.c < 64) {
          ctx.b[ctx.c++] = 0;
        }
        blake2sCompress(ctx, true);
        const out = new Uint8Array(ctx.outlen);
        for (let i = 0; i < ctx.outlen; i++) {
          out[i] = ctx.h[i >> 2] >> 8 * (i & 3) & 255;
        }
        return out;
      }
      function blake2s(input, key, outlen) {
        outlen = outlen || 32;
        input = util.normalizeInput(input);
        const ctx = blake2sInit(outlen, key);
        blake2sUpdate(ctx, input);
        return blake2sFinal(ctx);
      }
      function blake2sHex(input, key, outlen) {
        const output = blake2s(input, key, outlen);
        return util.toHex(output);
      }
      module.exports = {
        blake2s,
        blake2sHex,
        blake2sInit,
        blake2sUpdate,
        blake2sFinal
      };
    }
  });

  // node_modules/blakejs/index.js
  var require_blakejs = __commonJS({
    "node_modules/blakejs/index.js"(exports, module) {
      var b2b = require_blake2b();
      var b2s = require_blake2s();
      module.exports = {
        blake2b: b2b.blake2b,
        blake2bHex: b2b.blake2bHex,
        blake2bInit: b2b.blake2bInit,
        blake2bUpdate: b2b.blake2bUpdate,
        blake2bFinal: b2b.blake2bFinal,
        blake2s: b2s.blake2s,
        blake2sHex: b2s.blake2sHex,
        blake2sInit: b2s.blake2sInit,
        blake2sUpdate: b2s.blake2sUpdate,
        blake2sFinal: b2s.blake2sFinal
      };
    }
  });

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len2; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/buffer/index.js
  var require_buffer = __commonJS({
    "node_modules/buffer/index.js"(exports) {
      "use strict";
      var base64 = require_base64_js();
      var ieee754 = require_ieee754();
      var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports.Buffer = Buffer2;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      var K_MAX_LENGTH = 2147483647;
      exports.kMaxLength = K_MAX_LENGTH;
      Buffer2.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer2.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
        );
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto3 = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto3, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto3);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer2.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer2.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length2) {
        if (length2 > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length2 + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length2);
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function Buffer2(arg, encodingOrOffset, length2) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError(
              'The "string" argument must be of type string. Received type number'
            );
          }
          return allocUnsafe(arg);
        }
        return from3(arg, encodingOrOffset, length2);
      }
      Buffer2.poolSize = 8192;
      function from3(value, encodingOrOffset, length2) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
          );
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length2);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length2);
        }
        if (typeof value === "number") {
          throw new TypeError(
            'The "value" argument must not be of type number. Received type number'
          );
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer2.from(valueOf, encodingOrOffset, length2);
        }
        const b = fromObject(value);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length2);
        }
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      Buffer2.from = function(value, encodingOrOffset, length2) {
        return from3(value, encodingOrOffset, length2);
      };
      Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer2, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer2.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer2.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer2.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string3, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer2.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length2 = byteLength(string3, encoding) | 0;
        let buf = createBuffer(length2);
        const actual = buf.write(string3, encoding);
        if (actual !== length2) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array) {
        const length2 = array.length < 0 ? 0 : checked(array.length) | 0;
        const buf = createBuffer(length2);
        for (let i = 0; i < length2; i += 1) {
          buf[i] = array[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array, byteOffset, length2) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length2 || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length2 === void 0) {
          buf = new Uint8Array(array);
        } else if (length2 === void 0) {
          buf = new Uint8Array(array, byteOffset);
        } else {
          buf = new Uint8Array(array, byteOffset, length2);
        }
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer2.isBuffer(obj)) {
          const len = checked(obj.length) | 0;
          const buf = createBuffer(len);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length2) {
        if (length2 >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length2 | 0;
      }
      function SlowBuffer(length2) {
        if (+length2 != length2) {
          length2 = 0;
        }
        return Buffer2.alloc(+length2);
      }
      Buffer2.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer2.prototype;
      };
      Buffer2.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array)) a = Buffer2.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array)) b = Buffer2.from(b, b.offset, b.byteLength);
        if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
          );
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer2.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer2.concat = function concat(list, length2) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer2.alloc(0);
        }
        let i;
        if (length2 === void 0) {
          length2 = 0;
          for (i = 0; i < list.length; ++i) {
            length2 += list[i].length;
          }
        }
        const buffer = Buffer2.allocUnsafe(length2);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer2.isBuffer(buf)) buf = Buffer2.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(
                buffer,
                buf,
                pos
              );
            }
          } else if (!Buffer2.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer, pos);
          }
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string3, encoding) {
        if (Buffer2.isBuffer(string3)) {
          return string3.length;
        }
        if (ArrayBuffer.isView(string3) || isInstance(string3, ArrayBuffer)) {
          return string3.byteLength;
        }
        if (typeof string3 !== "string") {
          throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string3
          );
        }
        const len = string3.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0) return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len;
            case "utf8":
            case "utf-8":
              return utf8ToBytes(string3).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len * 2;
            case "hex":
              return len >>> 1;
            case "base64":
              return base64ToBytes(string3).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes(string3).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding) encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer2.prototype.swap16 = function swap16() {
        const len = this.length;
        if (len % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer2.prototype.swap32 = function swap32() {
        const len = this.length;
        if (len % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer2.prototype.swap64 = function swap64() {
        const len = this.length;
        if (len % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer2.prototype.toString = function toString() {
        const length2 = this.length;
        if (length2 === 0) return "";
        if (arguments.length === 0) return utf8Slice(this, 0, length2);
        return slowToString.apply(this, arguments);
      };
      Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
      Buffer2.prototype.equals = function equals3(b) {
        if (!Buffer2.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return Buffer2.compare(this, b) === 0;
      };
      Buffer2.prototype.inspect = function inspect() {
        let str = "";
        const max = exports.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max) str += " ... ";
        return "<Buffer " + str + ">";
      };
      if (customInspectSymbol) {
        Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
      }
      Buffer2.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (isInstance(target, Uint8Array)) {
          target = Buffer2.from(target, target.offset, target.byteLength);
        }
        if (!Buffer2.isBuffer(target)) {
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
          );
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target ? target.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target.slice(start, end);
        for (let i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0) return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer.length - 1;
        }
        if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          else byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0;
          else return -1;
        }
        if (typeof val === "string") {
          val = Buffer2.from(val, encoding);
        }
        if (Buffer2.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read2(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read2(arr, i) === read2(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i;
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1) i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read2(arr, i + j) !== read2(val, j)) {
                found = false;
                break;
              }
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string3, offset, length2) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length2) {
          length2 = remaining;
        } else {
          length2 = Number(length2);
          if (length2 > remaining) {
            length2 = remaining;
          }
        }
        const strLen = string3.length;
        if (length2 > strLen / 2) {
          length2 = strLen / 2;
        }
        let i;
        for (i = 0; i < length2; ++i) {
          const parsed = parseInt(string3.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string3, offset, length2) {
        return blitBuffer(utf8ToBytes(string3, buf.length - offset), buf, offset, length2);
      }
      function asciiWrite(buf, string3, offset, length2) {
        return blitBuffer(asciiToBytes(string3), buf, offset, length2);
      }
      function base64Write(buf, string3, offset, length2) {
        return blitBuffer(base64ToBytes(string3), buf, offset, length2);
      }
      function ucs2Write(buf, string3, offset, length2) {
        return blitBuffer(utf16leToBytes(string3, buf.length - offset), buf, offset, length2);
      }
      Buffer2.prototype.write = function write(string3, offset, length2, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length2 = this.length;
          offset = 0;
        } else if (length2 === void 0 && typeof offset === "string") {
          encoding = offset;
          length2 = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length2)) {
            length2 = length2 >>> 0;
            if (encoding === void 0) encoding = "utf8";
          } else {
            encoding = length2;
            length2 = void 0;
          }
        } else {
          throw new Error(
            "Buffer.write(string, encoding, offset[, length]) is no longer supported"
          );
        }
        const remaining = this.length - offset;
        if (length2 === void 0 || length2 > remaining) length2 = remaining;
        if (string3.length > 0 && (length2 < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding) encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string3, offset, length2);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string3, offset, length2);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string3, offset, length2);
            case "base64":
              return base64Write(this, string3, offset, length2);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string3, offset, length2);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer2.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          );
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len) end = len;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer2.prototype.slice = function slice(start, end) {
        const len = this.length;
        start = ~~start;
        end = end === void 0 ? len : ~~end;
        if (start < 0) {
          start += len;
          if (start < 0) start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0) end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start) end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer2.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length2) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length2) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128)) return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer2.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
        if (value < 0) value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0) value = 4294967295 + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer2.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer2.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer2.isBuffer(target)) throw new TypeError("argument should be a Buffer");
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          );
        }
        return len;
      };
      Buffer2.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val) val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
          const len = bytes.length;
          if (len === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
          }
        }
        return this;
      };
      var errors = {};
      function E(sym, getMessage, Base) {
        errors[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E(
        "ERR_BUFFER_OUT_OF_BOUNDS",
        function(name) {
          if (name) {
            return `${name} is outside of buffer bounds`;
          }
          return "Attempt to access memory outside buffer bounds";
        },
        RangeError
      );
      E(
        "ERR_INVALID_ARG_TYPE",
        function(name, actual) {
          return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
        },
        TypeError
      );
      E(
        "ERR_OUT_OF_RANGE",
        function(str, range, input) {
          let msg = `The value of "${str}" is out of range.`;
          let received = input;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          }
          msg += ` It must be ${range}. Received ${received}`;
          return msg;
        },
        RangeError
      );
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value, min, max, buf, offset, byteLength2) {
        if (value > max || value < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range;
          if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
              range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
          }
          throw new errors.ERR_OUT_OF_RANGE("value", range, value);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value, name) {
        if (typeof value !== "number") {
          throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
      }
      function boundsError(value, length2, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
        }
        if (length2 < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(
          type || "offset",
          `>= ${type ? 1 : 0} and <= ${length2}`,
          value
        );
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes(string3, units) {
        units = units || Infinity;
        let codePoint;
        const length2 = string3.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length2; ++i) {
          codePoint = string3.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length2) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(
              codePoint >> 6 | 192,
              codePoint & 63 | 128
            );
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(
              codePoint >> 12 | 224,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) break;
            bytes.push(
              codePoint >> 18 | 240,
              codePoint >> 12 & 63 | 128,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          byteArray.push(str.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src2, dst, offset, length2) {
        let i;
        for (i = 0; i < length2; ++i) {
          if (i + offset >= dst.length || i >= src2.length) break;
          dst[i + offset] = src2[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      var hexSliceLookupTable = function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      }();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    }
  });

  // (disabled):crypto
  var require_crypto = __commonJS({
    "(disabled):crypto"() {
    }
  });

  // node_modules/tweetnacl/nacl-fast.js
  var require_nacl_fast = __commonJS({
    "node_modules/tweetnacl/nacl-fast.js"(exports, module) {
      (function(nacl2) {
        "use strict";
        var gf = function(init2) {
          var i, r = new Float64Array(16);
          if (init2) for (i = 0; i < init2.length; i++) r[i] = init2[i];
          return r;
        };
        var randombytes = function() {
          throw new Error("no PRNG");
        };
        var _0 = new Uint8Array(16);
        var _9 = new Uint8Array(32);
        _9[0] = 9;
        var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
        function ts64(x, i, h, l) {
          x[i] = h >> 24 & 255;
          x[i + 1] = h >> 16 & 255;
          x[i + 2] = h >> 8 & 255;
          x[i + 3] = h & 255;
          x[i + 4] = l >> 24 & 255;
          x[i + 5] = l >> 16 & 255;
          x[i + 6] = l >> 8 & 255;
          x[i + 7] = l & 255;
        }
        function vn(x, xi, y, yi, n) {
          var i, d = 0;
          for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
          return (1 & d - 1 >>> 8) - 1;
        }
        function crypto_verify_16(x, xi, y, yi) {
          return vn(x, xi, y, yi, 16);
        }
        function crypto_verify_32(x, xi, y, yi) {
          return vn(x, xi, y, yi, 32);
        }
        function core_salsa20(o, p, k, c) {
          var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
          var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
          for (var i = 0; i < 20; i += 2) {
            u = x0 + x12 | 0;
            x4 ^= u << 7 | u >>> 32 - 7;
            u = x4 + x0 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x4 | 0;
            x12 ^= u << 13 | u >>> 32 - 13;
            u = x12 + x8 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x1 | 0;
            x9 ^= u << 7 | u >>> 32 - 7;
            u = x9 + x5 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x9 | 0;
            x1 ^= u << 13 | u >>> 32 - 13;
            u = x1 + x13 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x6 | 0;
            x14 ^= u << 7 | u >>> 32 - 7;
            u = x14 + x10 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x14 | 0;
            x6 ^= u << 13 | u >>> 32 - 13;
            u = x6 + x2 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x11 | 0;
            x3 ^= u << 7 | u >>> 32 - 7;
            u = x3 + x15 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x3 | 0;
            x11 ^= u << 13 | u >>> 32 - 13;
            u = x11 + x7 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
            u = x0 + x3 | 0;
            x1 ^= u << 7 | u >>> 32 - 7;
            u = x1 + x0 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x1 | 0;
            x3 ^= u << 13 | u >>> 32 - 13;
            u = x3 + x2 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x4 | 0;
            x6 ^= u << 7 | u >>> 32 - 7;
            u = x6 + x5 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x6 | 0;
            x4 ^= u << 13 | u >>> 32 - 13;
            u = x4 + x7 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x9 | 0;
            x11 ^= u << 7 | u >>> 32 - 7;
            u = x11 + x10 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x11 | 0;
            x9 ^= u << 13 | u >>> 32 - 13;
            u = x9 + x8 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x14 | 0;
            x12 ^= u << 7 | u >>> 32 - 7;
            u = x12 + x15 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x12 | 0;
            x14 ^= u << 13 | u >>> 32 - 13;
            u = x14 + x13 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
          }
          x0 = x0 + j0 | 0;
          x1 = x1 + j1 | 0;
          x2 = x2 + j2 | 0;
          x3 = x3 + j3 | 0;
          x4 = x4 + j4 | 0;
          x5 = x5 + j5 | 0;
          x6 = x6 + j6 | 0;
          x7 = x7 + j7 | 0;
          x8 = x8 + j8 | 0;
          x9 = x9 + j9 | 0;
          x10 = x10 + j10 | 0;
          x11 = x11 + j11 | 0;
          x12 = x12 + j12 | 0;
          x13 = x13 + j13 | 0;
          x14 = x14 + j14 | 0;
          x15 = x15 + j15 | 0;
          o[0] = x0 >>> 0 & 255;
          o[1] = x0 >>> 8 & 255;
          o[2] = x0 >>> 16 & 255;
          o[3] = x0 >>> 24 & 255;
          o[4] = x1 >>> 0 & 255;
          o[5] = x1 >>> 8 & 255;
          o[6] = x1 >>> 16 & 255;
          o[7] = x1 >>> 24 & 255;
          o[8] = x2 >>> 0 & 255;
          o[9] = x2 >>> 8 & 255;
          o[10] = x2 >>> 16 & 255;
          o[11] = x2 >>> 24 & 255;
          o[12] = x3 >>> 0 & 255;
          o[13] = x3 >>> 8 & 255;
          o[14] = x3 >>> 16 & 255;
          o[15] = x3 >>> 24 & 255;
          o[16] = x4 >>> 0 & 255;
          o[17] = x4 >>> 8 & 255;
          o[18] = x4 >>> 16 & 255;
          o[19] = x4 >>> 24 & 255;
          o[20] = x5 >>> 0 & 255;
          o[21] = x5 >>> 8 & 255;
          o[22] = x5 >>> 16 & 255;
          o[23] = x5 >>> 24 & 255;
          o[24] = x6 >>> 0 & 255;
          o[25] = x6 >>> 8 & 255;
          o[26] = x6 >>> 16 & 255;
          o[27] = x6 >>> 24 & 255;
          o[28] = x7 >>> 0 & 255;
          o[29] = x7 >>> 8 & 255;
          o[30] = x7 >>> 16 & 255;
          o[31] = x7 >>> 24 & 255;
          o[32] = x8 >>> 0 & 255;
          o[33] = x8 >>> 8 & 255;
          o[34] = x8 >>> 16 & 255;
          o[35] = x8 >>> 24 & 255;
          o[36] = x9 >>> 0 & 255;
          o[37] = x9 >>> 8 & 255;
          o[38] = x9 >>> 16 & 255;
          o[39] = x9 >>> 24 & 255;
          o[40] = x10 >>> 0 & 255;
          o[41] = x10 >>> 8 & 255;
          o[42] = x10 >>> 16 & 255;
          o[43] = x10 >>> 24 & 255;
          o[44] = x11 >>> 0 & 255;
          o[45] = x11 >>> 8 & 255;
          o[46] = x11 >>> 16 & 255;
          o[47] = x11 >>> 24 & 255;
          o[48] = x12 >>> 0 & 255;
          o[49] = x12 >>> 8 & 255;
          o[50] = x12 >>> 16 & 255;
          o[51] = x12 >>> 24 & 255;
          o[52] = x13 >>> 0 & 255;
          o[53] = x13 >>> 8 & 255;
          o[54] = x13 >>> 16 & 255;
          o[55] = x13 >>> 24 & 255;
          o[56] = x14 >>> 0 & 255;
          o[57] = x14 >>> 8 & 255;
          o[58] = x14 >>> 16 & 255;
          o[59] = x14 >>> 24 & 255;
          o[60] = x15 >>> 0 & 255;
          o[61] = x15 >>> 8 & 255;
          o[62] = x15 >>> 16 & 255;
          o[63] = x15 >>> 24 & 255;
        }
        function core_hsalsa20(o, p, k, c) {
          var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
          var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
          for (var i = 0; i < 20; i += 2) {
            u = x0 + x12 | 0;
            x4 ^= u << 7 | u >>> 32 - 7;
            u = x4 + x0 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x4 | 0;
            x12 ^= u << 13 | u >>> 32 - 13;
            u = x12 + x8 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x1 | 0;
            x9 ^= u << 7 | u >>> 32 - 7;
            u = x9 + x5 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x9 | 0;
            x1 ^= u << 13 | u >>> 32 - 13;
            u = x1 + x13 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x6 | 0;
            x14 ^= u << 7 | u >>> 32 - 7;
            u = x14 + x10 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x14 | 0;
            x6 ^= u << 13 | u >>> 32 - 13;
            u = x6 + x2 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x11 | 0;
            x3 ^= u << 7 | u >>> 32 - 7;
            u = x3 + x15 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x3 | 0;
            x11 ^= u << 13 | u >>> 32 - 13;
            u = x11 + x7 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
            u = x0 + x3 | 0;
            x1 ^= u << 7 | u >>> 32 - 7;
            u = x1 + x0 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x1 | 0;
            x3 ^= u << 13 | u >>> 32 - 13;
            u = x3 + x2 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x4 | 0;
            x6 ^= u << 7 | u >>> 32 - 7;
            u = x6 + x5 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x6 | 0;
            x4 ^= u << 13 | u >>> 32 - 13;
            u = x4 + x7 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x9 | 0;
            x11 ^= u << 7 | u >>> 32 - 7;
            u = x11 + x10 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x11 | 0;
            x9 ^= u << 13 | u >>> 32 - 13;
            u = x9 + x8 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x14 | 0;
            x12 ^= u << 7 | u >>> 32 - 7;
            u = x12 + x15 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x12 | 0;
            x14 ^= u << 13 | u >>> 32 - 13;
            u = x14 + x13 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
          }
          o[0] = x0 >>> 0 & 255;
          o[1] = x0 >>> 8 & 255;
          o[2] = x0 >>> 16 & 255;
          o[3] = x0 >>> 24 & 255;
          o[4] = x5 >>> 0 & 255;
          o[5] = x5 >>> 8 & 255;
          o[6] = x5 >>> 16 & 255;
          o[7] = x5 >>> 24 & 255;
          o[8] = x10 >>> 0 & 255;
          o[9] = x10 >>> 8 & 255;
          o[10] = x10 >>> 16 & 255;
          o[11] = x10 >>> 24 & 255;
          o[12] = x15 >>> 0 & 255;
          o[13] = x15 >>> 8 & 255;
          o[14] = x15 >>> 16 & 255;
          o[15] = x15 >>> 24 & 255;
          o[16] = x6 >>> 0 & 255;
          o[17] = x6 >>> 8 & 255;
          o[18] = x6 >>> 16 & 255;
          o[19] = x6 >>> 24 & 255;
          o[20] = x7 >>> 0 & 255;
          o[21] = x7 >>> 8 & 255;
          o[22] = x7 >>> 16 & 255;
          o[23] = x7 >>> 24 & 255;
          o[24] = x8 >>> 0 & 255;
          o[25] = x8 >>> 8 & 255;
          o[26] = x8 >>> 16 & 255;
          o[27] = x8 >>> 24 & 255;
          o[28] = x9 >>> 0 & 255;
          o[29] = x9 >>> 8 & 255;
          o[30] = x9 >>> 16 & 255;
          o[31] = x9 >>> 24 & 255;
        }
        function crypto_core_salsa20(out, inp, k, c) {
          core_salsa20(out, inp, k, c);
        }
        function crypto_core_hsalsa20(out, inp, k, c) {
          core_hsalsa20(out, inp, k, c);
        }
        var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
        function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
          var z = new Uint8Array(16), x = new Uint8Array(64);
          var u, i;
          for (i = 0; i < 16; i++) z[i] = 0;
          for (i = 0; i < 8; i++) z[i] = n[i];
          while (b >= 64) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < 64; i++) c[cpos + i] = m[mpos + i] ^ x[i];
            u = 1;
            for (i = 8; i < 16; i++) {
              u = u + (z[i] & 255) | 0;
              z[i] = u & 255;
              u >>>= 8;
            }
            b -= 64;
            cpos += 64;
            mpos += 64;
          }
          if (b > 0) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < b; i++) c[cpos + i] = m[mpos + i] ^ x[i];
          }
          return 0;
        }
        function crypto_stream_salsa20(c, cpos, b, n, k) {
          var z = new Uint8Array(16), x = new Uint8Array(64);
          var u, i;
          for (i = 0; i < 16; i++) z[i] = 0;
          for (i = 0; i < 8; i++) z[i] = n[i];
          while (b >= 64) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < 64; i++) c[cpos + i] = x[i];
            u = 1;
            for (i = 8; i < 16; i++) {
              u = u + (z[i] & 255) | 0;
              z[i] = u & 255;
              u >>>= 8;
            }
            b -= 64;
            cpos += 64;
          }
          if (b > 0) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < b; i++) c[cpos + i] = x[i];
          }
          return 0;
        }
        function crypto_stream(c, cpos, d, n, k) {
          var s = new Uint8Array(32);
          crypto_core_hsalsa20(s, n, k, sigma);
          var sn = new Uint8Array(8);
          for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
          return crypto_stream_salsa20(c, cpos, d, sn, s);
        }
        function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
          var s = new Uint8Array(32);
          crypto_core_hsalsa20(s, n, k, sigma);
          var sn = new Uint8Array(8);
          for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
          return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
        }
        var poly1305 = function(key) {
          this.buffer = new Uint8Array(16);
          this.r = new Uint16Array(10);
          this.h = new Uint16Array(10);
          this.pad = new Uint16Array(8);
          this.leftover = 0;
          this.fin = 0;
          var t0, t1, t2, t3, t4, t5, t6, t7;
          t0 = key[0] & 255 | (key[1] & 255) << 8;
          this.r[0] = t0 & 8191;
          t1 = key[2] & 255 | (key[3] & 255) << 8;
          this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
          t2 = key[4] & 255 | (key[5] & 255) << 8;
          this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
          t3 = key[6] & 255 | (key[7] & 255) << 8;
          this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
          t4 = key[8] & 255 | (key[9] & 255) << 8;
          this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
          this.r[5] = t4 >>> 1 & 8190;
          t5 = key[10] & 255 | (key[11] & 255) << 8;
          this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
          t6 = key[12] & 255 | (key[13] & 255) << 8;
          this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
          t7 = key[14] & 255 | (key[15] & 255) << 8;
          this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
          this.r[9] = t7 >>> 5 & 127;
          this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
          this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
          this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
          this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
          this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
          this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
          this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
          this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
        };
        poly1305.prototype.blocks = function(m, mpos, bytes) {
          var hibit = this.fin ? 0 : 1 << 11;
          var t0, t1, t2, t3, t4, t5, t6, t7, c;
          var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
          var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
          var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
          while (bytes >= 16) {
            t0 = m[mpos + 0] & 255 | (m[mpos + 1] & 255) << 8;
            h0 += t0 & 8191;
            t1 = m[mpos + 2] & 255 | (m[mpos + 3] & 255) << 8;
            h1 += (t0 >>> 13 | t1 << 3) & 8191;
            t2 = m[mpos + 4] & 255 | (m[mpos + 5] & 255) << 8;
            h2 += (t1 >>> 10 | t2 << 6) & 8191;
            t3 = m[mpos + 6] & 255 | (m[mpos + 7] & 255) << 8;
            h3 += (t2 >>> 7 | t3 << 9) & 8191;
            t4 = m[mpos + 8] & 255 | (m[mpos + 9] & 255) << 8;
            h4 += (t3 >>> 4 | t4 << 12) & 8191;
            h5 += t4 >>> 1 & 8191;
            t5 = m[mpos + 10] & 255 | (m[mpos + 11] & 255) << 8;
            h6 += (t4 >>> 14 | t5 << 2) & 8191;
            t6 = m[mpos + 12] & 255 | (m[mpos + 13] & 255) << 8;
            h7 += (t5 >>> 11 | t6 << 5) & 8191;
            t7 = m[mpos + 14] & 255 | (m[mpos + 15] & 255) << 8;
            h8 += (t6 >>> 8 | t7 << 8) & 8191;
            h9 += t7 >>> 5 | hibit;
            c = 0;
            d0 = c;
            d0 += h0 * r0;
            d0 += h1 * (5 * r9);
            d0 += h2 * (5 * r8);
            d0 += h3 * (5 * r7);
            d0 += h4 * (5 * r6);
            c = d0 >>> 13;
            d0 &= 8191;
            d0 += h5 * (5 * r5);
            d0 += h6 * (5 * r4);
            d0 += h7 * (5 * r3);
            d0 += h8 * (5 * r2);
            d0 += h9 * (5 * r1);
            c += d0 >>> 13;
            d0 &= 8191;
            d1 = c;
            d1 += h0 * r1;
            d1 += h1 * r0;
            d1 += h2 * (5 * r9);
            d1 += h3 * (5 * r8);
            d1 += h4 * (5 * r7);
            c = d1 >>> 13;
            d1 &= 8191;
            d1 += h5 * (5 * r6);
            d1 += h6 * (5 * r5);
            d1 += h7 * (5 * r4);
            d1 += h8 * (5 * r3);
            d1 += h9 * (5 * r2);
            c += d1 >>> 13;
            d1 &= 8191;
            d2 = c;
            d2 += h0 * r2;
            d2 += h1 * r1;
            d2 += h2 * r0;
            d2 += h3 * (5 * r9);
            d2 += h4 * (5 * r8);
            c = d2 >>> 13;
            d2 &= 8191;
            d2 += h5 * (5 * r7);
            d2 += h6 * (5 * r6);
            d2 += h7 * (5 * r5);
            d2 += h8 * (5 * r4);
            d2 += h9 * (5 * r3);
            c += d2 >>> 13;
            d2 &= 8191;
            d3 = c;
            d3 += h0 * r3;
            d3 += h1 * r2;
            d3 += h2 * r1;
            d3 += h3 * r0;
            d3 += h4 * (5 * r9);
            c = d3 >>> 13;
            d3 &= 8191;
            d3 += h5 * (5 * r8);
            d3 += h6 * (5 * r7);
            d3 += h7 * (5 * r6);
            d3 += h8 * (5 * r5);
            d3 += h9 * (5 * r4);
            c += d3 >>> 13;
            d3 &= 8191;
            d4 = c;
            d4 += h0 * r4;
            d4 += h1 * r3;
            d4 += h2 * r2;
            d4 += h3 * r1;
            d4 += h4 * r0;
            c = d4 >>> 13;
            d4 &= 8191;
            d4 += h5 * (5 * r9);
            d4 += h6 * (5 * r8);
            d4 += h7 * (5 * r7);
            d4 += h8 * (5 * r6);
            d4 += h9 * (5 * r5);
            c += d4 >>> 13;
            d4 &= 8191;
            d5 = c;
            d5 += h0 * r5;
            d5 += h1 * r4;
            d5 += h2 * r3;
            d5 += h3 * r2;
            d5 += h4 * r1;
            c = d5 >>> 13;
            d5 &= 8191;
            d5 += h5 * r0;
            d5 += h6 * (5 * r9);
            d5 += h7 * (5 * r8);
            d5 += h8 * (5 * r7);
            d5 += h9 * (5 * r6);
            c += d5 >>> 13;
            d5 &= 8191;
            d6 = c;
            d6 += h0 * r6;
            d6 += h1 * r5;
            d6 += h2 * r4;
            d6 += h3 * r3;
            d6 += h4 * r2;
            c = d6 >>> 13;
            d6 &= 8191;
            d6 += h5 * r1;
            d6 += h6 * r0;
            d6 += h7 * (5 * r9);
            d6 += h8 * (5 * r8);
            d6 += h9 * (5 * r7);
            c += d6 >>> 13;
            d6 &= 8191;
            d7 = c;
            d7 += h0 * r7;
            d7 += h1 * r6;
            d7 += h2 * r5;
            d7 += h3 * r4;
            d7 += h4 * r3;
            c = d7 >>> 13;
            d7 &= 8191;
            d7 += h5 * r2;
            d7 += h6 * r1;
            d7 += h7 * r0;
            d7 += h8 * (5 * r9);
            d7 += h9 * (5 * r8);
            c += d7 >>> 13;
            d7 &= 8191;
            d8 = c;
            d8 += h0 * r8;
            d8 += h1 * r7;
            d8 += h2 * r6;
            d8 += h3 * r5;
            d8 += h4 * r4;
            c = d8 >>> 13;
            d8 &= 8191;
            d8 += h5 * r3;
            d8 += h6 * r2;
            d8 += h7 * r1;
            d8 += h8 * r0;
            d8 += h9 * (5 * r9);
            c += d8 >>> 13;
            d8 &= 8191;
            d9 = c;
            d9 += h0 * r9;
            d9 += h1 * r8;
            d9 += h2 * r7;
            d9 += h3 * r6;
            d9 += h4 * r5;
            c = d9 >>> 13;
            d9 &= 8191;
            d9 += h5 * r4;
            d9 += h6 * r3;
            d9 += h7 * r2;
            d9 += h8 * r1;
            d9 += h9 * r0;
            c += d9 >>> 13;
            d9 &= 8191;
            c = (c << 2) + c | 0;
            c = c + d0 | 0;
            d0 = c & 8191;
            c = c >>> 13;
            d1 += c;
            h0 = d0;
            h1 = d1;
            h2 = d2;
            h3 = d3;
            h4 = d4;
            h5 = d5;
            h6 = d6;
            h7 = d7;
            h8 = d8;
            h9 = d9;
            mpos += 16;
            bytes -= 16;
          }
          this.h[0] = h0;
          this.h[1] = h1;
          this.h[2] = h2;
          this.h[3] = h3;
          this.h[4] = h4;
          this.h[5] = h5;
          this.h[6] = h6;
          this.h[7] = h7;
          this.h[8] = h8;
          this.h[9] = h9;
        };
        poly1305.prototype.finish = function(mac, macpos) {
          var g = new Uint16Array(10);
          var c, mask, f, i;
          if (this.leftover) {
            i = this.leftover;
            this.buffer[i++] = 1;
            for (; i < 16; i++) this.buffer[i] = 0;
            this.fin = 1;
            this.blocks(this.buffer, 0, 16);
          }
          c = this.h[1] >>> 13;
          this.h[1] &= 8191;
          for (i = 2; i < 10; i++) {
            this.h[i] += c;
            c = this.h[i] >>> 13;
            this.h[i] &= 8191;
          }
          this.h[0] += c * 5;
          c = this.h[0] >>> 13;
          this.h[0] &= 8191;
          this.h[1] += c;
          c = this.h[1] >>> 13;
          this.h[1] &= 8191;
          this.h[2] += c;
          g[0] = this.h[0] + 5;
          c = g[0] >>> 13;
          g[0] &= 8191;
          for (i = 1; i < 10; i++) {
            g[i] = this.h[i] + c;
            c = g[i] >>> 13;
            g[i] &= 8191;
          }
          g[9] -= 1 << 13;
          mask = (c ^ 1) - 1;
          for (i = 0; i < 10; i++) g[i] &= mask;
          mask = ~mask;
          for (i = 0; i < 10; i++) this.h[i] = this.h[i] & mask | g[i];
          this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
          this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
          this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
          this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
          this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
          this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
          this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
          this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
          f = this.h[0] + this.pad[0];
          this.h[0] = f & 65535;
          for (i = 1; i < 8; i++) {
            f = (this.h[i] + this.pad[i] | 0) + (f >>> 16) | 0;
            this.h[i] = f & 65535;
          }
          mac[macpos + 0] = this.h[0] >>> 0 & 255;
          mac[macpos + 1] = this.h[0] >>> 8 & 255;
          mac[macpos + 2] = this.h[1] >>> 0 & 255;
          mac[macpos + 3] = this.h[1] >>> 8 & 255;
          mac[macpos + 4] = this.h[2] >>> 0 & 255;
          mac[macpos + 5] = this.h[2] >>> 8 & 255;
          mac[macpos + 6] = this.h[3] >>> 0 & 255;
          mac[macpos + 7] = this.h[3] >>> 8 & 255;
          mac[macpos + 8] = this.h[4] >>> 0 & 255;
          mac[macpos + 9] = this.h[4] >>> 8 & 255;
          mac[macpos + 10] = this.h[5] >>> 0 & 255;
          mac[macpos + 11] = this.h[5] >>> 8 & 255;
          mac[macpos + 12] = this.h[6] >>> 0 & 255;
          mac[macpos + 13] = this.h[6] >>> 8 & 255;
          mac[macpos + 14] = this.h[7] >>> 0 & 255;
          mac[macpos + 15] = this.h[7] >>> 8 & 255;
        };
        poly1305.prototype.update = function(m, mpos, bytes) {
          var i, want;
          if (this.leftover) {
            want = 16 - this.leftover;
            if (want > bytes)
              want = bytes;
            for (i = 0; i < want; i++)
              this.buffer[this.leftover + i] = m[mpos + i];
            bytes -= want;
            mpos += want;
            this.leftover += want;
            if (this.leftover < 16)
              return;
            this.blocks(this.buffer, 0, 16);
            this.leftover = 0;
          }
          if (bytes >= 16) {
            want = bytes - bytes % 16;
            this.blocks(m, mpos, want);
            mpos += want;
            bytes -= want;
          }
          if (bytes) {
            for (i = 0; i < bytes; i++)
              this.buffer[this.leftover + i] = m[mpos + i];
            this.leftover += bytes;
          }
        };
        function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
          var s = new poly1305(k);
          s.update(m, mpos, n);
          s.finish(out, outpos);
          return 0;
        }
        function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
          var x = new Uint8Array(16);
          crypto_onetimeauth(x, 0, m, mpos, n, k);
          return crypto_verify_16(h, hpos, x, 0);
        }
        function crypto_secretbox(c, m, d, n, k) {
          var i;
          if (d < 32) return -1;
          crypto_stream_xor(c, 0, m, 0, d, n, k);
          crypto_onetimeauth(c, 16, c, 32, d - 32, c);
          for (i = 0; i < 16; i++) c[i] = 0;
          return 0;
        }
        function crypto_secretbox_open(m, c, d, n, k) {
          var i;
          var x = new Uint8Array(32);
          if (d < 32) return -1;
          crypto_stream(x, 0, 32, n, k);
          if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0) return -1;
          crypto_stream_xor(m, 0, c, 0, d, n, k);
          for (i = 0; i < 32; i++) m[i] = 0;
          return 0;
        }
        function set25519(r, a) {
          var i;
          for (i = 0; i < 16; i++) r[i] = a[i] | 0;
        }
        function car25519(o) {
          var i, v, c = 1;
          for (i = 0; i < 16; i++) {
            v = o[i] + c + 65535;
            c = Math.floor(v / 65536);
            o[i] = v - c * 65536;
          }
          o[0] += c - 1 + 37 * (c - 1);
        }
        function sel25519(p, q, b) {
          var t, c = ~(b - 1);
          for (var i = 0; i < 16; i++) {
            t = c & (p[i] ^ q[i]);
            p[i] ^= t;
            q[i] ^= t;
          }
        }
        function pack25519(o, n) {
          var i, j, b;
          var m = gf(), t = gf();
          for (i = 0; i < 16; i++) t[i] = n[i];
          car25519(t);
          car25519(t);
          car25519(t);
          for (j = 0; j < 2; j++) {
            m[0] = t[0] - 65517;
            for (i = 1; i < 15; i++) {
              m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
              m[i - 1] &= 65535;
            }
            m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
            b = m[15] >> 16 & 1;
            m[14] &= 65535;
            sel25519(t, m, 1 - b);
          }
          for (i = 0; i < 16; i++) {
            o[2 * i] = t[i] & 255;
            o[2 * i + 1] = t[i] >> 8;
          }
        }
        function neq25519(a, b) {
          var c = new Uint8Array(32), d = new Uint8Array(32);
          pack25519(c, a);
          pack25519(d, b);
          return crypto_verify_32(c, 0, d, 0);
        }
        function par25519(a) {
          var d = new Uint8Array(32);
          pack25519(d, a);
          return d[0] & 1;
        }
        function unpack25519(o, n) {
          var i;
          for (i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
          o[15] &= 32767;
        }
        function A(o, a, b) {
          for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
        }
        function Z(o, a, b) {
          for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
        }
        function M(o, a, b) {
          var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
          v = a[0];
          t0 += v * b0;
          t1 += v * b1;
          t2 += v * b2;
          t3 += v * b3;
          t4 += v * b4;
          t5 += v * b5;
          t6 += v * b6;
          t7 += v * b7;
          t8 += v * b8;
          t9 += v * b9;
          t10 += v * b10;
          t11 += v * b11;
          t12 += v * b12;
          t13 += v * b13;
          t14 += v * b14;
          t15 += v * b15;
          v = a[1];
          t1 += v * b0;
          t2 += v * b1;
          t3 += v * b2;
          t4 += v * b3;
          t5 += v * b4;
          t6 += v * b5;
          t7 += v * b6;
          t8 += v * b7;
          t9 += v * b8;
          t10 += v * b9;
          t11 += v * b10;
          t12 += v * b11;
          t13 += v * b12;
          t14 += v * b13;
          t15 += v * b14;
          t16 += v * b15;
          v = a[2];
          t2 += v * b0;
          t3 += v * b1;
          t4 += v * b2;
          t5 += v * b3;
          t6 += v * b4;
          t7 += v * b5;
          t8 += v * b6;
          t9 += v * b7;
          t10 += v * b8;
          t11 += v * b9;
          t12 += v * b10;
          t13 += v * b11;
          t14 += v * b12;
          t15 += v * b13;
          t16 += v * b14;
          t17 += v * b15;
          v = a[3];
          t3 += v * b0;
          t4 += v * b1;
          t5 += v * b2;
          t6 += v * b3;
          t7 += v * b4;
          t8 += v * b5;
          t9 += v * b6;
          t10 += v * b7;
          t11 += v * b8;
          t12 += v * b9;
          t13 += v * b10;
          t14 += v * b11;
          t15 += v * b12;
          t16 += v * b13;
          t17 += v * b14;
          t18 += v * b15;
          v = a[4];
          t4 += v * b0;
          t5 += v * b1;
          t6 += v * b2;
          t7 += v * b3;
          t8 += v * b4;
          t9 += v * b5;
          t10 += v * b6;
          t11 += v * b7;
          t12 += v * b8;
          t13 += v * b9;
          t14 += v * b10;
          t15 += v * b11;
          t16 += v * b12;
          t17 += v * b13;
          t18 += v * b14;
          t19 += v * b15;
          v = a[5];
          t5 += v * b0;
          t6 += v * b1;
          t7 += v * b2;
          t8 += v * b3;
          t9 += v * b4;
          t10 += v * b5;
          t11 += v * b6;
          t12 += v * b7;
          t13 += v * b8;
          t14 += v * b9;
          t15 += v * b10;
          t16 += v * b11;
          t17 += v * b12;
          t18 += v * b13;
          t19 += v * b14;
          t20 += v * b15;
          v = a[6];
          t6 += v * b0;
          t7 += v * b1;
          t8 += v * b2;
          t9 += v * b3;
          t10 += v * b4;
          t11 += v * b5;
          t12 += v * b6;
          t13 += v * b7;
          t14 += v * b8;
          t15 += v * b9;
          t16 += v * b10;
          t17 += v * b11;
          t18 += v * b12;
          t19 += v * b13;
          t20 += v * b14;
          t21 += v * b15;
          v = a[7];
          t7 += v * b0;
          t8 += v * b1;
          t9 += v * b2;
          t10 += v * b3;
          t11 += v * b4;
          t12 += v * b5;
          t13 += v * b6;
          t14 += v * b7;
          t15 += v * b8;
          t16 += v * b9;
          t17 += v * b10;
          t18 += v * b11;
          t19 += v * b12;
          t20 += v * b13;
          t21 += v * b14;
          t22 += v * b15;
          v = a[8];
          t8 += v * b0;
          t9 += v * b1;
          t10 += v * b2;
          t11 += v * b3;
          t12 += v * b4;
          t13 += v * b5;
          t14 += v * b6;
          t15 += v * b7;
          t16 += v * b8;
          t17 += v * b9;
          t18 += v * b10;
          t19 += v * b11;
          t20 += v * b12;
          t21 += v * b13;
          t22 += v * b14;
          t23 += v * b15;
          v = a[9];
          t9 += v * b0;
          t10 += v * b1;
          t11 += v * b2;
          t12 += v * b3;
          t13 += v * b4;
          t14 += v * b5;
          t15 += v * b6;
          t16 += v * b7;
          t17 += v * b8;
          t18 += v * b9;
          t19 += v * b10;
          t20 += v * b11;
          t21 += v * b12;
          t22 += v * b13;
          t23 += v * b14;
          t24 += v * b15;
          v = a[10];
          t10 += v * b0;
          t11 += v * b1;
          t12 += v * b2;
          t13 += v * b3;
          t14 += v * b4;
          t15 += v * b5;
          t16 += v * b6;
          t17 += v * b7;
          t18 += v * b8;
          t19 += v * b9;
          t20 += v * b10;
          t21 += v * b11;
          t22 += v * b12;
          t23 += v * b13;
          t24 += v * b14;
          t25 += v * b15;
          v = a[11];
          t11 += v * b0;
          t12 += v * b1;
          t13 += v * b2;
          t14 += v * b3;
          t15 += v * b4;
          t16 += v * b5;
          t17 += v * b6;
          t18 += v * b7;
          t19 += v * b8;
          t20 += v * b9;
          t21 += v * b10;
          t22 += v * b11;
          t23 += v * b12;
          t24 += v * b13;
          t25 += v * b14;
          t26 += v * b15;
          v = a[12];
          t12 += v * b0;
          t13 += v * b1;
          t14 += v * b2;
          t15 += v * b3;
          t16 += v * b4;
          t17 += v * b5;
          t18 += v * b6;
          t19 += v * b7;
          t20 += v * b8;
          t21 += v * b9;
          t22 += v * b10;
          t23 += v * b11;
          t24 += v * b12;
          t25 += v * b13;
          t26 += v * b14;
          t27 += v * b15;
          v = a[13];
          t13 += v * b0;
          t14 += v * b1;
          t15 += v * b2;
          t16 += v * b3;
          t17 += v * b4;
          t18 += v * b5;
          t19 += v * b6;
          t20 += v * b7;
          t21 += v * b8;
          t22 += v * b9;
          t23 += v * b10;
          t24 += v * b11;
          t25 += v * b12;
          t26 += v * b13;
          t27 += v * b14;
          t28 += v * b15;
          v = a[14];
          t14 += v * b0;
          t15 += v * b1;
          t16 += v * b2;
          t17 += v * b3;
          t18 += v * b4;
          t19 += v * b5;
          t20 += v * b6;
          t21 += v * b7;
          t22 += v * b8;
          t23 += v * b9;
          t24 += v * b10;
          t25 += v * b11;
          t26 += v * b12;
          t27 += v * b13;
          t28 += v * b14;
          t29 += v * b15;
          v = a[15];
          t15 += v * b0;
          t16 += v * b1;
          t17 += v * b2;
          t18 += v * b3;
          t19 += v * b4;
          t20 += v * b5;
          t21 += v * b6;
          t22 += v * b7;
          t23 += v * b8;
          t24 += v * b9;
          t25 += v * b10;
          t26 += v * b11;
          t27 += v * b12;
          t28 += v * b13;
          t29 += v * b14;
          t30 += v * b15;
          t0 += 38 * t16;
          t1 += 38 * t17;
          t2 += 38 * t18;
          t3 += 38 * t19;
          t4 += 38 * t20;
          t5 += 38 * t21;
          t6 += 38 * t22;
          t7 += 38 * t23;
          t8 += 38 * t24;
          t9 += 38 * t25;
          t10 += 38 * t26;
          t11 += 38 * t27;
          t12 += 38 * t28;
          t13 += 38 * t29;
          t14 += 38 * t30;
          c = 1;
          v = t0 + c + 65535;
          c = Math.floor(v / 65536);
          t0 = v - c * 65536;
          v = t1 + c + 65535;
          c = Math.floor(v / 65536);
          t1 = v - c * 65536;
          v = t2 + c + 65535;
          c = Math.floor(v / 65536);
          t2 = v - c * 65536;
          v = t3 + c + 65535;
          c = Math.floor(v / 65536);
          t3 = v - c * 65536;
          v = t4 + c + 65535;
          c = Math.floor(v / 65536);
          t4 = v - c * 65536;
          v = t5 + c + 65535;
          c = Math.floor(v / 65536);
          t5 = v - c * 65536;
          v = t6 + c + 65535;
          c = Math.floor(v / 65536);
          t6 = v - c * 65536;
          v = t7 + c + 65535;
          c = Math.floor(v / 65536);
          t7 = v - c * 65536;
          v = t8 + c + 65535;
          c = Math.floor(v / 65536);
          t8 = v - c * 65536;
          v = t9 + c + 65535;
          c = Math.floor(v / 65536);
          t9 = v - c * 65536;
          v = t10 + c + 65535;
          c = Math.floor(v / 65536);
          t10 = v - c * 65536;
          v = t11 + c + 65535;
          c = Math.floor(v / 65536);
          t11 = v - c * 65536;
          v = t12 + c + 65535;
          c = Math.floor(v / 65536);
          t12 = v - c * 65536;
          v = t13 + c + 65535;
          c = Math.floor(v / 65536);
          t13 = v - c * 65536;
          v = t14 + c + 65535;
          c = Math.floor(v / 65536);
          t14 = v - c * 65536;
          v = t15 + c + 65535;
          c = Math.floor(v / 65536);
          t15 = v - c * 65536;
          t0 += c - 1 + 37 * (c - 1);
          c = 1;
          v = t0 + c + 65535;
          c = Math.floor(v / 65536);
          t0 = v - c * 65536;
          v = t1 + c + 65535;
          c = Math.floor(v / 65536);
          t1 = v - c * 65536;
          v = t2 + c + 65535;
          c = Math.floor(v / 65536);
          t2 = v - c * 65536;
          v = t3 + c + 65535;
          c = Math.floor(v / 65536);
          t3 = v - c * 65536;
          v = t4 + c + 65535;
          c = Math.floor(v / 65536);
          t4 = v - c * 65536;
          v = t5 + c + 65535;
          c = Math.floor(v / 65536);
          t5 = v - c * 65536;
          v = t6 + c + 65535;
          c = Math.floor(v / 65536);
          t6 = v - c * 65536;
          v = t7 + c + 65535;
          c = Math.floor(v / 65536);
          t7 = v - c * 65536;
          v = t8 + c + 65535;
          c = Math.floor(v / 65536);
          t8 = v - c * 65536;
          v = t9 + c + 65535;
          c = Math.floor(v / 65536);
          t9 = v - c * 65536;
          v = t10 + c + 65535;
          c = Math.floor(v / 65536);
          t10 = v - c * 65536;
          v = t11 + c + 65535;
          c = Math.floor(v / 65536);
          t11 = v - c * 65536;
          v = t12 + c + 65535;
          c = Math.floor(v / 65536);
          t12 = v - c * 65536;
          v = t13 + c + 65535;
          c = Math.floor(v / 65536);
          t13 = v - c * 65536;
          v = t14 + c + 65535;
          c = Math.floor(v / 65536);
          t14 = v - c * 65536;
          v = t15 + c + 65535;
          c = Math.floor(v / 65536);
          t15 = v - c * 65536;
          t0 += c - 1 + 37 * (c - 1);
          o[0] = t0;
          o[1] = t1;
          o[2] = t2;
          o[3] = t3;
          o[4] = t4;
          o[5] = t5;
          o[6] = t6;
          o[7] = t7;
          o[8] = t8;
          o[9] = t9;
          o[10] = t10;
          o[11] = t11;
          o[12] = t12;
          o[13] = t13;
          o[14] = t14;
          o[15] = t15;
        }
        function S(o, a) {
          M(o, a, a);
        }
        function inv25519(o, i) {
          var c = gf();
          var a;
          for (a = 0; a < 16; a++) c[a] = i[a];
          for (a = 253; a >= 0; a--) {
            S(c, c);
            if (a !== 2 && a !== 4) M(c, c, i);
          }
          for (a = 0; a < 16; a++) o[a] = c[a];
        }
        function pow2523(o, i) {
          var c = gf();
          var a;
          for (a = 0; a < 16; a++) c[a] = i[a];
          for (a = 250; a >= 0; a--) {
            S(c, c);
            if (a !== 1) M(c, c, i);
          }
          for (a = 0; a < 16; a++) o[a] = c[a];
        }
        function crypto_scalarmult(q, n, p) {
          var z = new Uint8Array(32);
          var x = new Float64Array(80), r, i;
          var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
          for (i = 0; i < 31; i++) z[i] = n[i];
          z[31] = n[31] & 127 | 64;
          z[0] &= 248;
          unpack25519(x, p);
          for (i = 0; i < 16; i++) {
            b[i] = x[i];
            d[i] = a[i] = c[i] = 0;
          }
          a[0] = d[0] = 1;
          for (i = 254; i >= 0; --i) {
            r = z[i >>> 3] >>> (i & 7) & 1;
            sel25519(a, b, r);
            sel25519(c, d, r);
            A(e, a, c);
            Z(a, a, c);
            A(c, b, d);
            Z(b, b, d);
            S(d, e);
            S(f, a);
            M(a, c, a);
            M(c, b, e);
            A(e, a, c);
            Z(a, a, c);
            S(b, a);
            Z(c, d, f);
            M(a, c, _121665);
            A(a, a, d);
            M(c, c, a);
            M(a, d, f);
            M(d, b, x);
            S(b, e);
            sel25519(a, b, r);
            sel25519(c, d, r);
          }
          for (i = 0; i < 16; i++) {
            x[i + 16] = a[i];
            x[i + 32] = c[i];
            x[i + 48] = b[i];
            x[i + 64] = d[i];
          }
          var x32 = x.subarray(32);
          var x16 = x.subarray(16);
          inv25519(x32, x32);
          M(x16, x16, x32);
          pack25519(q, x16);
          return 0;
        }
        function crypto_scalarmult_base(q, n) {
          return crypto_scalarmult(q, n, _9);
        }
        function crypto_box_keypair(y, x) {
          randombytes(x, 32);
          return crypto_scalarmult_base(y, x);
        }
        function crypto_box_beforenm(k, y, x) {
          var s = new Uint8Array(32);
          crypto_scalarmult(s, x, y);
          return crypto_core_hsalsa20(k, _0, s, sigma);
        }
        var crypto_box_afternm = crypto_secretbox;
        var crypto_box_open_afternm = crypto_secretbox_open;
        function crypto_box(c, m, d, n, y, x) {
          var k = new Uint8Array(32);
          crypto_box_beforenm(k, y, x);
          return crypto_box_afternm(c, m, d, n, k);
        }
        function crypto_box_open(m, c, d, n, y, x) {
          var k = new Uint8Array(32);
          crypto_box_beforenm(k, y, x);
          return crypto_box_open_afternm(m, c, d, n, k);
        }
        var K = [
          1116352408,
          3609767458,
          1899447441,
          602891725,
          3049323471,
          3964484399,
          3921009573,
          2173295548,
          961987163,
          4081628472,
          1508970993,
          3053834265,
          2453635748,
          2937671579,
          2870763221,
          3664609560,
          3624381080,
          2734883394,
          310598401,
          1164996542,
          607225278,
          1323610764,
          1426881987,
          3590304994,
          1925078388,
          4068182383,
          2162078206,
          991336113,
          2614888103,
          633803317,
          3248222580,
          3479774868,
          3835390401,
          2666613458,
          4022224774,
          944711139,
          264347078,
          2341262773,
          604807628,
          2007800933,
          770255983,
          1495990901,
          1249150122,
          1856431235,
          1555081692,
          3175218132,
          1996064986,
          2198950837,
          2554220882,
          3999719339,
          2821834349,
          766784016,
          2952996808,
          2566594879,
          3210313671,
          3203337956,
          3336571891,
          1034457026,
          3584528711,
          2466948901,
          113926993,
          3758326383,
          338241895,
          168717936,
          666307205,
          1188179964,
          773529912,
          1546045734,
          1294757372,
          1522805485,
          1396182291,
          2643833823,
          1695183700,
          2343527390,
          1986661051,
          1014477480,
          2177026350,
          1206759142,
          2456956037,
          344077627,
          2730485921,
          1290863460,
          2820302411,
          3158454273,
          3259730800,
          3505952657,
          3345764771,
          106217008,
          3516065817,
          3606008344,
          3600352804,
          1432725776,
          4094571909,
          1467031594,
          275423344,
          851169720,
          430227734,
          3100823752,
          506948616,
          1363258195,
          659060556,
          3750685593,
          883997877,
          3785050280,
          958139571,
          3318307427,
          1322822218,
          3812723403,
          1537002063,
          2003034995,
          1747873779,
          3602036899,
          1955562222,
          1575990012,
          2024104815,
          1125592928,
          2227730452,
          2716904306,
          2361852424,
          442776044,
          2428436474,
          593698344,
          2756734187,
          3733110249,
          3204031479,
          2999351573,
          3329325298,
          3815920427,
          3391569614,
          3928383900,
          3515267271,
          566280711,
          3940187606,
          3454069534,
          4118630271,
          4000239992,
          116418474,
          1914138554,
          174292421,
          2731055270,
          289380356,
          3203993006,
          460393269,
          320620315,
          685471733,
          587496836,
          852142971,
          1086792851,
          1017036298,
          365543100,
          1126000580,
          2618297676,
          1288033470,
          3409855158,
          1501505948,
          4234509866,
          1607167915,
          987167468,
          1816402316,
          1246189591
        ];
        function crypto_hashblocks_hl(hh, hl, m, n) {
          var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
          var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
          var pos = 0;
          while (n >= 128) {
            for (i = 0; i < 16; i++) {
              j = 8 * i + pos;
              wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
              wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
            }
            for (i = 0; i < 80; i++) {
              bh0 = ah0;
              bh1 = ah1;
              bh2 = ah2;
              bh3 = ah3;
              bh4 = ah4;
              bh5 = ah5;
              bh6 = ah6;
              bh7 = ah7;
              bl0 = al0;
              bl1 = al1;
              bl2 = al2;
              bl3 = al3;
              bl4 = al4;
              bl5 = al5;
              bl6 = al6;
              bl7 = al7;
              h = ah7;
              l = al7;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
              l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = ah4 & ah5 ^ ~ah4 & ah6;
              l = al4 & al5 ^ ~al4 & al6;
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = K[i * 2];
              l = K[i * 2 + 1];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = wh[i % 16];
              l = wl[i % 16];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              th = c & 65535 | d << 16;
              tl = a & 65535 | b << 16;
              h = th;
              l = tl;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
              l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
              l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              bh7 = c & 65535 | d << 16;
              bl7 = a & 65535 | b << 16;
              h = bh3;
              l = bl3;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = th;
              l = tl;
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              bh3 = c & 65535 | d << 16;
              bl3 = a & 65535 | b << 16;
              ah1 = bh0;
              ah2 = bh1;
              ah3 = bh2;
              ah4 = bh3;
              ah5 = bh4;
              ah6 = bh5;
              ah7 = bh6;
              ah0 = bh7;
              al1 = bl0;
              al2 = bl1;
              al3 = bl2;
              al4 = bl3;
              al5 = bl4;
              al6 = bl5;
              al7 = bl6;
              al0 = bl7;
              if (i % 16 === 15) {
                for (j = 0; j < 16; j++) {
                  h = wh[j];
                  l = wl[j];
                  a = l & 65535;
                  b = l >>> 16;
                  c = h & 65535;
                  d = h >>> 16;
                  h = wh[(j + 9) % 16];
                  l = wl[(j + 9) % 16];
                  a += l & 65535;
                  b += l >>> 16;
                  c += h & 65535;
                  d += h >>> 16;
                  th = wh[(j + 1) % 16];
                  tl = wl[(j + 1) % 16];
                  h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                  l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                  a += l & 65535;
                  b += l >>> 16;
                  c += h & 65535;
                  d += h >>> 16;
                  th = wh[(j + 14) % 16];
                  tl = wl[(j + 14) % 16];
                  h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                  l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                  a += l & 65535;
                  b += l >>> 16;
                  c += h & 65535;
                  d += h >>> 16;
                  b += a >>> 16;
                  c += b >>> 16;
                  d += c >>> 16;
                  wh[j] = c & 65535 | d << 16;
                  wl[j] = a & 65535 | b << 16;
                }
              }
            }
            h = ah0;
            l = al0;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[0];
            l = hl[0];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[0] = ah0 = c & 65535 | d << 16;
            hl[0] = al0 = a & 65535 | b << 16;
            h = ah1;
            l = al1;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[1];
            l = hl[1];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[1] = ah1 = c & 65535 | d << 16;
            hl[1] = al1 = a & 65535 | b << 16;
            h = ah2;
            l = al2;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[2];
            l = hl[2];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[2] = ah2 = c & 65535 | d << 16;
            hl[2] = al2 = a & 65535 | b << 16;
            h = ah3;
            l = al3;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[3];
            l = hl[3];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[3] = ah3 = c & 65535 | d << 16;
            hl[3] = al3 = a & 65535 | b << 16;
            h = ah4;
            l = al4;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[4];
            l = hl[4];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[4] = ah4 = c & 65535 | d << 16;
            hl[4] = al4 = a & 65535 | b << 16;
            h = ah5;
            l = al5;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[5];
            l = hl[5];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[5] = ah5 = c & 65535 | d << 16;
            hl[5] = al5 = a & 65535 | b << 16;
            h = ah6;
            l = al6;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[6];
            l = hl[6];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[6] = ah6 = c & 65535 | d << 16;
            hl[6] = al6 = a & 65535 | b << 16;
            h = ah7;
            l = al7;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[7];
            l = hl[7];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[7] = ah7 = c & 65535 | d << 16;
            hl[7] = al7 = a & 65535 | b << 16;
            pos += 128;
            n -= 128;
          }
          return n;
        }
        function crypto_hash(out, m, n) {
          var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
          hh[0] = 1779033703;
          hh[1] = 3144134277;
          hh[2] = 1013904242;
          hh[3] = 2773480762;
          hh[4] = 1359893119;
          hh[5] = 2600822924;
          hh[6] = 528734635;
          hh[7] = 1541459225;
          hl[0] = 4089235720;
          hl[1] = 2227873595;
          hl[2] = 4271175723;
          hl[3] = 1595750129;
          hl[4] = 2917565137;
          hl[5] = 725511199;
          hl[6] = 4215389547;
          hl[7] = 327033209;
          crypto_hashblocks_hl(hh, hl, m, n);
          n %= 128;
          for (i = 0; i < n; i++) x[i] = m[b - n + i];
          x[n] = 128;
          n = 256 - 128 * (n < 112 ? 1 : 0);
          x[n - 9] = 0;
          ts64(x, n - 8, b / 536870912 | 0, b << 3);
          crypto_hashblocks_hl(hh, hl, x, n);
          for (i = 0; i < 8; i++) ts64(out, 8 * i, hh[i], hl[i]);
          return 0;
        }
        function add(p, q) {
          var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
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
          var i;
          for (i = 0; i < 4; i++) {
            sel25519(p[i], q[i], b);
          }
        }
        function pack(r, p) {
          var tx = gf(), ty = gf(), zi = gf();
          inv25519(zi, p[2]);
          M(tx, p[0], zi);
          M(ty, p[1], zi);
          pack25519(r, ty);
          r[31] ^= par25519(tx) << 7;
        }
        function scalarmult(p, q, s) {
          var b, i;
          set25519(p[0], gf0);
          set25519(p[1], gf1);
          set25519(p[2], gf1);
          set25519(p[3], gf0);
          for (i = 255; i >= 0; --i) {
            b = s[i / 8 | 0] >> (i & 7) & 1;
            cswap(p, q, b);
            add(q, p);
            add(p, p);
            cswap(p, q, b);
          }
        }
        function scalarbase(p, s) {
          var q = [gf(), gf(), gf(), gf()];
          set25519(q[0], X);
          set25519(q[1], Y);
          set25519(q[2], gf1);
          M(q[3], X, Y);
          scalarmult(p, q, s);
        }
        function crypto_sign_keypair(pk, sk, seeded) {
          var d = new Uint8Array(64);
          var p = [gf(), gf(), gf(), gf()];
          var i;
          if (!seeded) randombytes(sk, 32);
          crypto_hash(d, sk, 32);
          d[0] &= 248;
          d[31] &= 127;
          d[31] |= 64;
          scalarbase(p, d);
          pack(pk, p);
          for (i = 0; i < 32; i++) sk[i + 32] = pk[i];
          return 0;
        }
        var L2 = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
        function modL(r, x) {
          var carry, i, j, k;
          for (i = 63; i >= 32; --i) {
            carry = 0;
            for (j = i - 32, k = i - 12; j < k; ++j) {
              x[j] += carry - 16 * x[i] * L2[j - (i - 32)];
              carry = Math.floor((x[j] + 128) / 256);
              x[j] -= carry * 256;
            }
            x[j] += carry;
            x[i] = 0;
          }
          carry = 0;
          for (j = 0; j < 32; j++) {
            x[j] += carry - (x[31] >> 4) * L2[j];
            carry = x[j] >> 8;
            x[j] &= 255;
          }
          for (j = 0; j < 32; j++) x[j] -= carry * L2[j];
          for (i = 0; i < 32; i++) {
            x[i + 1] += x[i] >> 8;
            r[i] = x[i] & 255;
          }
        }
        function reduce(r) {
          var x = new Float64Array(64), i;
          for (i = 0; i < 64; i++) x[i] = r[i];
          for (i = 0; i < 64; i++) r[i] = 0;
          modL(r, x);
        }
        function crypto_sign(sm, m, n, sk) {
          var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
          var i, j, x = new Float64Array(64);
          var p = [gf(), gf(), gf(), gf()];
          crypto_hash(d, sk, 32);
          d[0] &= 248;
          d[31] &= 127;
          d[31] |= 64;
          var smlen = n + 64;
          for (i = 0; i < n; i++) sm[64 + i] = m[i];
          for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
          crypto_hash(r, sm.subarray(32), n + 32);
          reduce(r);
          scalarbase(p, r);
          pack(sm, p);
          for (i = 32; i < 64; i++) sm[i] = sk[i];
          crypto_hash(h, sm, n + 64);
          reduce(h);
          for (i = 0; i < 64; i++) x[i] = 0;
          for (i = 0; i < 32; i++) x[i] = r[i];
          for (i = 0; i < 32; i++) {
            for (j = 0; j < 32; j++) {
              x[i + j] += h[i] * d[j];
            }
          }
          modL(sm.subarray(32), x);
          return smlen;
        }
        function unpackneg(r, p) {
          var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
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
          if (neq25519(chk, num)) M(r[0], r[0], I);
          S(chk, r[0]);
          M(chk, chk, den);
          if (neq25519(chk, num)) return -1;
          if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
          M(r[3], r[0], r[1]);
          return 0;
        }
        function crypto_sign_open(m, sm, n, pk) {
          var i;
          var t = new Uint8Array(32), h = new Uint8Array(64);
          var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
          if (n < 64) return -1;
          if (unpackneg(q, pk)) return -1;
          for (i = 0; i < n; i++) m[i] = sm[i];
          for (i = 0; i < 32; i++) m[i + 32] = pk[i];
          crypto_hash(h, m, n);
          reduce(h);
          scalarmult(p, q, h);
          scalarbase(q, sm.subarray(32));
          add(p, q);
          pack(t, p);
          n -= 64;
          if (crypto_verify_32(sm, 0, t, 0)) {
            for (i = 0; i < n; i++) m[i] = 0;
            return -1;
          }
          for (i = 0; i < n; i++) m[i] = sm[i + 64];
          return n;
        }
        var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
        nacl2.lowlevel = {
          crypto_core_hsalsa20,
          crypto_stream_xor,
          crypto_stream,
          crypto_stream_salsa20_xor,
          crypto_stream_salsa20,
          crypto_onetimeauth,
          crypto_onetimeauth_verify,
          crypto_verify_16,
          crypto_verify_32,
          crypto_secretbox,
          crypto_secretbox_open,
          crypto_scalarmult,
          crypto_scalarmult_base,
          crypto_box_beforenm,
          crypto_box_afternm,
          crypto_box,
          crypto_box_open,
          crypto_box_keypair,
          crypto_hash,
          crypto_sign,
          crypto_sign_keypair,
          crypto_sign_open,
          crypto_secretbox_KEYBYTES,
          crypto_secretbox_NONCEBYTES,
          crypto_secretbox_ZEROBYTES,
          crypto_secretbox_BOXZEROBYTES,
          crypto_scalarmult_BYTES,
          crypto_scalarmult_SCALARBYTES,
          crypto_box_PUBLICKEYBYTES,
          crypto_box_SECRETKEYBYTES,
          crypto_box_BEFORENMBYTES,
          crypto_box_NONCEBYTES,
          crypto_box_ZEROBYTES,
          crypto_box_BOXZEROBYTES,
          crypto_sign_BYTES,
          crypto_sign_PUBLICKEYBYTES,
          crypto_sign_SECRETKEYBYTES,
          crypto_sign_SEEDBYTES,
          crypto_hash_BYTES,
          gf,
          D,
          L: L2,
          pack25519,
          unpack25519,
          M,
          A,
          S,
          Z,
          pow2523,
          add,
          set25519,
          modL,
          scalarmult,
          scalarbase
        };
        function checkLengths(k, n) {
          if (k.length !== crypto_secretbox_KEYBYTES) throw new Error("bad key size");
          if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error("bad nonce size");
        }
        function checkBoxLengths(pk, sk) {
          if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error("bad public key size");
          if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error("bad secret key size");
        }
        function checkArrayTypes() {
          for (var i = 0; i < arguments.length; i++) {
            if (!(arguments[i] instanceof Uint8Array))
              throw new TypeError("unexpected type, use Uint8Array");
          }
        }
        function cleanup(arr) {
          for (var i = 0; i < arr.length; i++) arr[i] = 0;
        }
        nacl2.randomBytes = function(n) {
          var b = new Uint8Array(n);
          randombytes(b, n);
          return b;
        };
        nacl2.secretbox = function(msg, nonce, key) {
          checkArrayTypes(msg, nonce, key);
          checkLengths(key, nonce);
          var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
          var c = new Uint8Array(m.length);
          for (var i = 0; i < msg.length; i++) m[i + crypto_secretbox_ZEROBYTES] = msg[i];
          crypto_secretbox(c, m, m.length, nonce, key);
          return c.subarray(crypto_secretbox_BOXZEROBYTES);
        };
        nacl2.secretbox.open = function(box, nonce, key) {
          checkArrayTypes(box, nonce, key);
          checkLengths(key, nonce);
          var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
          var m = new Uint8Array(c.length);
          for (var i = 0; i < box.length; i++) c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
          if (c.length < 32) return null;
          if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
          return m.subarray(crypto_secretbox_ZEROBYTES);
        };
        nacl2.secretbox.keyLength = crypto_secretbox_KEYBYTES;
        nacl2.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
        nacl2.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
        nacl2.scalarMult = function(n, p) {
          checkArrayTypes(n, p);
          if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
          if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
          var q = new Uint8Array(crypto_scalarmult_BYTES);
          crypto_scalarmult(q, n, p);
          return q;
        };
        nacl2.scalarMult.base = function(n) {
          checkArrayTypes(n);
          if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
          var q = new Uint8Array(crypto_scalarmult_BYTES);
          crypto_scalarmult_base(q, n);
          return q;
        };
        nacl2.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
        nacl2.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
        nacl2.box = function(msg, nonce, publicKey, secretKey) {
          var k = nacl2.box.before(publicKey, secretKey);
          return nacl2.secretbox(msg, nonce, k);
        };
        nacl2.box.before = function(publicKey, secretKey) {
          checkArrayTypes(publicKey, secretKey);
          checkBoxLengths(publicKey, secretKey);
          var k = new Uint8Array(crypto_box_BEFORENMBYTES);
          crypto_box_beforenm(k, publicKey, secretKey);
          return k;
        };
        nacl2.box.after = nacl2.secretbox;
        nacl2.box.open = function(msg, nonce, publicKey, secretKey) {
          var k = nacl2.box.before(publicKey, secretKey);
          return nacl2.secretbox.open(msg, nonce, k);
        };
        nacl2.box.open.after = nacl2.secretbox.open;
        nacl2.box.keyPair = function() {
          var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
          crypto_box_keypair(pk, sk);
          return { publicKey: pk, secretKey: sk };
        };
        nacl2.box.keyPair.fromSecretKey = function(secretKey) {
          checkArrayTypes(secretKey);
          if (secretKey.length !== crypto_box_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
          crypto_scalarmult_base(pk, secretKey);
          return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
        };
        nacl2.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
        nacl2.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
        nacl2.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
        nacl2.box.nonceLength = crypto_box_NONCEBYTES;
        nacl2.box.overheadLength = nacl2.secretbox.overheadLength;
        nacl2.sign = function(msg, secretKey) {
          checkArrayTypes(msg, secretKey);
          if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
          crypto_sign(signedMsg, msg, msg.length, secretKey);
          return signedMsg;
        };
        nacl2.sign.open = function(signedMsg, publicKey) {
          checkArrayTypes(signedMsg, publicKey);
          if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          var tmp = new Uint8Array(signedMsg.length);
          var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
          if (mlen < 0) return null;
          var m = new Uint8Array(mlen);
          for (var i = 0; i < m.length; i++) m[i] = tmp[i];
          return m;
        };
        nacl2.sign.detached = function(msg, secretKey) {
          var signedMsg = nacl2.sign(msg, secretKey);
          var sig = new Uint8Array(crypto_sign_BYTES);
          for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
          return sig;
        };
        nacl2.sign.detached.verify = function(msg, sig, publicKey) {
          checkArrayTypes(msg, sig, publicKey);
          if (sig.length !== crypto_sign_BYTES)
            throw new Error("bad signature size");
          if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
          var m = new Uint8Array(crypto_sign_BYTES + msg.length);
          var i;
          for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
          for (i = 0; i < msg.length; i++) sm[i + crypto_sign_BYTES] = msg[i];
          return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
        };
        nacl2.sign.keyPair = function() {
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
          crypto_sign_keypair(pk, sk);
          return { publicKey: pk, secretKey: sk };
        };
        nacl2.sign.keyPair.fromSecretKey = function(secretKey) {
          checkArrayTypes(secretKey);
          if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32 + i];
          return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
        };
        nacl2.sign.keyPair.fromSeed = function(seed) {
          checkArrayTypes(seed);
          if (seed.length !== crypto_sign_SEEDBYTES)
            throw new Error("bad seed size");
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
          for (var i = 0; i < 32; i++) sk[i] = seed[i];
          crypto_sign_keypair(pk, sk, true);
          return { publicKey: pk, secretKey: sk };
        };
        nacl2.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
        nacl2.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
        nacl2.sign.seedLength = crypto_sign_SEEDBYTES;
        nacl2.sign.signatureLength = crypto_sign_BYTES;
        nacl2.hash = function(msg) {
          checkArrayTypes(msg);
          var h = new Uint8Array(crypto_hash_BYTES);
          crypto_hash(h, msg, msg.length);
          return h;
        };
        nacl2.hash.hashLength = crypto_hash_BYTES;
        nacl2.verify = function(x, y) {
          checkArrayTypes(x, y);
          if (x.length === 0 || y.length === 0) return false;
          if (x.length !== y.length) return false;
          return vn(x, 0, y, 0, x.length) === 0 ? true : false;
        };
        nacl2.setPRNG = function(fn) {
          randombytes = fn;
        };
        (function() {
          var crypto2 = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
          if (crypto2 && crypto2.getRandomValues) {
            var QUOTA = 65536;
            nacl2.setPRNG(function(x, n) {
              var i, v = new Uint8Array(n);
              for (i = 0; i < n; i += QUOTA) {
                crypto2.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
              }
              for (i = 0; i < n; i++) x[i] = v[i];
              cleanup(v);
            });
          } else if (typeof __require !== "undefined") {
            crypto2 = require_crypto();
            if (crypto2 && crypto2.randomBytes) {
              nacl2.setPRNG(function(x, n) {
                var i, v = crypto2.randomBytes(n);
                for (i = 0; i < n; i++) x[i] = v[i];
                cleanup(v);
              });
            }
          }
        })();
      })(typeof module !== "undefined" && module.exports ? module.exports : self.nacl = self.nacl || {});
    }
  });

  // node_modules/scrypt-async/scrypt-async.js
  var require_scrypt_async = __commonJS({
    "node_modules/scrypt-async/scrypt-async.js"(exports, module) {
      function scrypt2(password, salt, logN, r, dkLen, interruptStep, callback, encoding) {
        "use strict";
        function SHA256(m) {
          var K = [
            1116352408,
            1899447441,
            3049323471,
            3921009573,
            961987163,
            1508970993,
            2453635748,
            2870763221,
            3624381080,
            310598401,
            607225278,
            1426881987,
            1925078388,
            2162078206,
            2614888103,
            3248222580,
            3835390401,
            4022224774,
            264347078,
            604807628,
            770255983,
            1249150122,
            1555081692,
            1996064986,
            2554220882,
            2821834349,
            2952996808,
            3210313671,
            3336571891,
            3584528711,
            113926993,
            338241895,
            666307205,
            773529912,
            1294757372,
            1396182291,
            1695183700,
            1986661051,
            2177026350,
            2456956037,
            2730485921,
            2820302411,
            3259730800,
            3345764771,
            3516065817,
            3600352804,
            4094571909,
            275423344,
            430227734,
            506948616,
            659060556,
            883997877,
            958139571,
            1322822218,
            1537002063,
            1747873779,
            1955562222,
            2024104815,
            2227730452,
            2361852424,
            2428436474,
            2756734187,
            3204031479,
            3329325298
          ];
          var h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762, h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225, w = new Array(64);
          function blocks(p3) {
            var off = 0, len = p3.length;
            while (len >= 64) {
              var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7, u, i2, j, t1, t2;
              for (i2 = 0; i2 < 16; i2++) {
                j = off + i2 * 4;
                w[i2] = (p3[j] & 255) << 24 | (p3[j + 1] & 255) << 16 | (p3[j + 2] & 255) << 8 | p3[j + 3] & 255;
              }
              for (i2 = 16; i2 < 64; i2++) {
                u = w[i2 - 2];
                t1 = (u >>> 17 | u << 32 - 17) ^ (u >>> 19 | u << 32 - 19) ^ u >>> 10;
                u = w[i2 - 15];
                t2 = (u >>> 7 | u << 32 - 7) ^ (u >>> 18 | u << 32 - 18) ^ u >>> 3;
                w[i2] = (t1 + w[i2 - 7] | 0) + (t2 + w[i2 - 16] | 0) | 0;
              }
              for (i2 = 0; i2 < 64; i2++) {
                t1 = (((e >>> 6 | e << 32 - 6) ^ (e >>> 11 | e << 32 - 11) ^ (e >>> 25 | e << 32 - 25)) + (e & f ^ ~e & g) | 0) + (h + (K[i2] + w[i2] | 0) | 0) | 0;
                t2 = ((a >>> 2 | a << 32 - 2) ^ (a >>> 13 | a << 32 - 13) ^ (a >>> 22 | a << 32 - 22)) + (a & b ^ a & c ^ b & c) | 0;
                h = g;
                g = f;
                f = e;
                e = d + t1 | 0;
                d = c;
                c = b;
                b = a;
                a = t1 + t2 | 0;
              }
              h0 = h0 + a | 0;
              h1 = h1 + b | 0;
              h2 = h2 + c | 0;
              h3 = h3 + d | 0;
              h4 = h4 + e | 0;
              h5 = h5 + f | 0;
              h6 = h6 + g | 0;
              h7 = h7 + h | 0;
              off += 64;
              len -= 64;
            }
          }
          blocks(m);
          var i, bytesLeft = m.length % 64, bitLenHi = m.length / 536870912 | 0, bitLenLo = m.length << 3, numZeros = bytesLeft < 56 ? 56 : 120, p2 = m.slice(m.length - bytesLeft, m.length);
          p2.push(128);
          for (i = bytesLeft + 1; i < numZeros; i++) p2.push(0);
          p2.push(bitLenHi >>> 24 & 255);
          p2.push(bitLenHi >>> 16 & 255);
          p2.push(bitLenHi >>> 8 & 255);
          p2.push(bitLenHi >>> 0 & 255);
          p2.push(bitLenLo >>> 24 & 255);
          p2.push(bitLenLo >>> 16 & 255);
          p2.push(bitLenLo >>> 8 & 255);
          p2.push(bitLenLo >>> 0 & 255);
          blocks(p2);
          return [
            h0 >>> 24 & 255,
            h0 >>> 16 & 255,
            h0 >>> 8 & 255,
            h0 >>> 0 & 255,
            h1 >>> 24 & 255,
            h1 >>> 16 & 255,
            h1 >>> 8 & 255,
            h1 >>> 0 & 255,
            h2 >>> 24 & 255,
            h2 >>> 16 & 255,
            h2 >>> 8 & 255,
            h2 >>> 0 & 255,
            h3 >>> 24 & 255,
            h3 >>> 16 & 255,
            h3 >>> 8 & 255,
            h3 >>> 0 & 255,
            h4 >>> 24 & 255,
            h4 >>> 16 & 255,
            h4 >>> 8 & 255,
            h4 >>> 0 & 255,
            h5 >>> 24 & 255,
            h5 >>> 16 & 255,
            h5 >>> 8 & 255,
            h5 >>> 0 & 255,
            h6 >>> 24 & 255,
            h6 >>> 16 & 255,
            h6 >>> 8 & 255,
            h6 >>> 0 & 255,
            h7 >>> 24 & 255,
            h7 >>> 16 & 255,
            h7 >>> 8 & 255,
            h7 >>> 0 & 255
          ];
        }
        function PBKDF2_HMAC_SHA256_OneIter(password2, salt2, dkLen2) {
          if (password2.length > 64) {
            password2 = SHA256(password2.push ? password2 : Array.prototype.slice.call(password2, 0));
          }
          var i, innerLen = 64 + salt2.length + 4, inner = new Array(innerLen), outerKey = new Array(64), dk = [];
          for (i = 0; i < 64; i++) inner[i] = 54;
          for (i = 0; i < password2.length; i++) inner[i] ^= password2[i];
          for (i = 0; i < salt2.length; i++) inner[64 + i] = salt2[i];
          for (i = innerLen - 4; i < innerLen; i++) inner[i] = 0;
          for (i = 0; i < 64; i++) outerKey[i] = 92;
          for (i = 0; i < password2.length; i++) outerKey[i] ^= password2[i];
          function incrementCounter() {
            for (var i2 = innerLen - 1; i2 >= innerLen - 4; i2--) {
              inner[i2]++;
              if (inner[i2] <= 255) return;
              inner[i2] = 0;
            }
          }
          while (dkLen2 >= 32) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
            dkLen2 -= 32;
          }
          if (dkLen2 > 0) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen2));
          }
          return dk;
        }
        function salsaXOR(tmp2, B2, bin, bout) {
          var j0 = tmp2[0] ^ B2[bin++], j1 = tmp2[1] ^ B2[bin++], j2 = tmp2[2] ^ B2[bin++], j3 = tmp2[3] ^ B2[bin++], j4 = tmp2[4] ^ B2[bin++], j5 = tmp2[5] ^ B2[bin++], j6 = tmp2[6] ^ B2[bin++], j7 = tmp2[7] ^ B2[bin++], j8 = tmp2[8] ^ B2[bin++], j9 = tmp2[9] ^ B2[bin++], j10 = tmp2[10] ^ B2[bin++], j11 = tmp2[11] ^ B2[bin++], j12 = tmp2[12] ^ B2[bin++], j13 = tmp2[13] ^ B2[bin++], j14 = tmp2[14] ^ B2[bin++], j15 = tmp2[15] ^ B2[bin++], u, i;
          var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15;
          for (i = 0; i < 8; i += 2) {
            u = x0 + x12;
            x4 ^= u << 7 | u >>> 32 - 7;
            u = x4 + x0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x4;
            x12 ^= u << 13 | u >>> 32 - 13;
            u = x12 + x8;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x1;
            x9 ^= u << 7 | u >>> 32 - 7;
            u = x9 + x5;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x9;
            x1 ^= u << 13 | u >>> 32 - 13;
            u = x1 + x13;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x6;
            x14 ^= u << 7 | u >>> 32 - 7;
            u = x14 + x10;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x14;
            x6 ^= u << 13 | u >>> 32 - 13;
            u = x6 + x2;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x11;
            x3 ^= u << 7 | u >>> 32 - 7;
            u = x3 + x15;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x3;
            x11 ^= u << 13 | u >>> 32 - 13;
            u = x11 + x7;
            x15 ^= u << 18 | u >>> 32 - 18;
            u = x0 + x3;
            x1 ^= u << 7 | u >>> 32 - 7;
            u = x1 + x0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x1;
            x3 ^= u << 13 | u >>> 32 - 13;
            u = x3 + x2;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x4;
            x6 ^= u << 7 | u >>> 32 - 7;
            u = x6 + x5;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x6;
            x4 ^= u << 13 | u >>> 32 - 13;
            u = x4 + x7;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x9;
            x11 ^= u << 7 | u >>> 32 - 7;
            u = x11 + x10;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x11;
            x9 ^= u << 13 | u >>> 32 - 13;
            u = x9 + x8;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x14;
            x12 ^= u << 7 | u >>> 32 - 7;
            u = x12 + x15;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x12;
            x14 ^= u << 13 | u >>> 32 - 13;
            u = x14 + x13;
            x15 ^= u << 18 | u >>> 32 - 18;
          }
          B2[bout++] = tmp2[0] = x0 + j0 | 0;
          B2[bout++] = tmp2[1] = x1 + j1 | 0;
          B2[bout++] = tmp2[2] = x2 + j2 | 0;
          B2[bout++] = tmp2[3] = x3 + j3 | 0;
          B2[bout++] = tmp2[4] = x4 + j4 | 0;
          B2[bout++] = tmp2[5] = x5 + j5 | 0;
          B2[bout++] = tmp2[6] = x6 + j6 | 0;
          B2[bout++] = tmp2[7] = x7 + j7 | 0;
          B2[bout++] = tmp2[8] = x8 + j8 | 0;
          B2[bout++] = tmp2[9] = x9 + j9 | 0;
          B2[bout++] = tmp2[10] = x10 + j10 | 0;
          B2[bout++] = tmp2[11] = x11 + j11 | 0;
          B2[bout++] = tmp2[12] = x12 + j12 | 0;
          B2[bout++] = tmp2[13] = x13 + j13 | 0;
          B2[bout++] = tmp2[14] = x14 + j14 | 0;
          B2[bout++] = tmp2[15] = x15 + j15 | 0;
        }
        function blockCopy(dst, di, src2, si, len) {
          while (len--) dst[di++] = src2[si++];
        }
        function blockXOR(dst, di, src2, si, len) {
          while (len--) dst[di++] ^= src2[si++];
        }
        function blockMix(tmp2, B2, bin, bout, r2) {
          blockCopy(tmp2, 0, B2, bin + (2 * r2 - 1) * 16, 16);
          for (var i = 0; i < 2 * r2; i += 2) {
            salsaXOR(tmp2, B2, bin + i * 16, bout + i * 8);
            salsaXOR(tmp2, B2, bin + i * 16 + 16, bout + i * 8 + r2 * 16);
          }
        }
        function integerify(B2, bi, r2) {
          return B2[bi + (2 * r2 - 1) * 16];
        }
        function stringToUTF8Bytes(s) {
          var arr = [];
          for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c < 128) {
              arr.push(c);
            } else if (c < 2048) {
              arr.push(192 | c >> 6);
              arr.push(128 | c & 63);
            } else if (c < 55296) {
              arr.push(224 | c >> 12);
              arr.push(128 | c >> 6 & 63);
              arr.push(128 | c & 63);
            } else {
              if (i >= s.length - 1) {
                throw new Error("invalid string");
              }
              i++;
              c = (c & 1023) << 10;
              c |= s.charCodeAt(i) & 1023;
              c += 65536;
              arr.push(240 | c >> 18);
              arr.push(128 | c >> 12 & 63);
              arr.push(128 | c >> 6 & 63);
              arr.push(128 | c & 63);
            }
          }
          return arr;
        }
        function bytesToHex(p2) {
          var enc = "0123456789abcdef".split("");
          var len = p2.length, arr = [], i = 0;
          for (; i < len; i++) {
            arr.push(enc[p2[i] >>> 4 & 15]);
            arr.push(enc[p2[i] >>> 0 & 15]);
          }
          return arr.join("");
        }
        function bytesToBase64(p2) {
          var enc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
          var len = p2.length, arr = [], i = 0, a, b, c, t;
          while (i < len) {
            a = i < len ? p2[i++] : 0;
            b = i < len ? p2[i++] : 0;
            c = i < len ? p2[i++] : 0;
            t = (a << 16) + (b << 8) + c;
            arr.push(enc[t >>> 3 * 6 & 63]);
            arr.push(enc[t >>> 2 * 6 & 63]);
            arr.push(enc[t >>> 1 * 6 & 63]);
            arr.push(enc[t >>> 0 * 6 & 63]);
          }
          if (len % 3 > 0) {
            arr[arr.length - 1] = "=";
            if (len % 3 === 1) arr[arr.length - 2] = "=";
          }
          return arr.join("");
        }
        var MAX_UINT = -1 >>> 0, p = 1;
        if (typeof logN === "object") {
          if (arguments.length > 4) {
            throw new Error("scrypt: incorrect number of arguments");
          }
          var opts = logN;
          callback = r;
          logN = opts.logN;
          if (typeof logN === "undefined") {
            if (typeof opts.N !== "undefined") {
              if (opts.N < 2 || opts.N > MAX_UINT)
                throw new Error("scrypt: N is out of range");
              if ((opts.N & opts.N - 1) !== 0)
                throw new Error("scrypt: N is not a power of 2");
              logN = Math.log(opts.N) / Math.LN2;
            } else {
              throw new Error("scrypt: missing N parameter");
            }
          }
          p = opts.p || 1;
          r = opts.r;
          dkLen = opts.dkLen || 32;
          interruptStep = opts.interruptStep || 0;
          encoding = opts.encoding;
        }
        if (p < 1)
          throw new Error("scrypt: invalid p");
        if (r <= 0)
          throw new Error("scrypt: invalid r");
        if (logN < 1 || logN > 31)
          throw new Error("scrypt: logN must be between 1 and 31");
        var N = 1 << logN >>> 0, XY, V, B, tmp;
        if (r * p >= 1 << 30 || r > MAX_UINT / 128 / p || r > MAX_UINT / 256 || N > MAX_UINT / 128 / r)
          throw new Error("scrypt: parameters are too large");
        if (typeof password === "string")
          password = stringToUTF8Bytes(password);
        if (typeof salt === "string")
          salt = stringToUTF8Bytes(salt);
        if (typeof Int32Array !== "undefined") {
          XY = new Int32Array(64 * r);
          V = new Int32Array(32 * N * r);
          tmp = new Int32Array(16);
        } else {
          XY = [];
          V = [];
          tmp = new Array(16);
        }
        B = PBKDF2_HMAC_SHA256_OneIter(password, salt, p * 128 * r);
        var xi = 0, yi = 32 * r;
        function smixStart(pos) {
          for (var i = 0; i < 32 * r; i++) {
            var j = pos + i * 4;
            XY[xi + i] = (B[j + 3] & 255) << 24 | (B[j + 2] & 255) << 16 | (B[j + 1] & 255) << 8 | (B[j + 0] & 255) << 0;
          }
        }
        function smixStep1(start, end) {
          for (var i = start; i < end; i += 2) {
            blockCopy(V, i * (32 * r), XY, xi, 32 * r);
            blockMix(tmp, XY, xi, yi, r);
            blockCopy(V, (i + 1) * (32 * r), XY, yi, 32 * r);
            blockMix(tmp, XY, yi, xi, r);
          }
        }
        function smixStep2(start, end) {
          for (var i = start; i < end; i += 2) {
            var j = integerify(XY, xi, r) & N - 1;
            blockXOR(XY, xi, V, j * (32 * r), 32 * r);
            blockMix(tmp, XY, xi, yi, r);
            j = integerify(XY, yi, r) & N - 1;
            blockXOR(XY, yi, V, j * (32 * r), 32 * r);
            blockMix(tmp, XY, yi, xi, r);
          }
        }
        function smixFinish(pos) {
          for (var i = 0; i < 32 * r; i++) {
            var j = XY[xi + i];
            B[pos + i * 4 + 0] = j >>> 0 & 255;
            B[pos + i * 4 + 1] = j >>> 8 & 255;
            B[pos + i * 4 + 2] = j >>> 16 & 255;
            B[pos + i * 4 + 3] = j >>> 24 & 255;
          }
        }
        var nextTick = typeof setImmediate !== "undefined" ? setImmediate : setTimeout;
        function interruptedFor(start, end, step, fn, donefn) {
          (function performStep() {
            nextTick(function() {
              fn(start, start + step < end ? start + step : end);
              start += step;
              if (start < end)
                performStep();
              else
                donefn();
            });
          })();
        }
        function getResult(enc) {
          var result = PBKDF2_HMAC_SHA256_OneIter(password, B, dkLen);
          if (enc === "base64")
            return bytesToBase64(result);
          else if (enc === "hex")
            return bytesToHex(result);
          else if (enc === "binary")
            return new Uint8Array(result);
          else
            return result;
        }
        function calculateSync() {
          for (var i = 0; i < p; i++) {
            smixStart(i * 128 * r);
            smixStep1(0, N);
            smixStep2(0, N);
            smixFinish(i * 128 * r);
          }
          callback(getResult(encoding));
        }
        function calculateAsync(i) {
          smixStart(i * 128 * r);
          interruptedFor(0, N, interruptStep * 2, smixStep1, function() {
            interruptedFor(0, N, interruptStep * 2, smixStep2, function() {
              smixFinish(i * 128 * r);
              if (i + 1 < p) {
                nextTick(function() {
                  calculateAsync(i + 1);
                });
              } else {
                callback(getResult(encoding));
              }
            });
          });
        }
        if (typeof interruptStep === "function") {
          encoding = callback;
          callback = interruptStep;
          interruptStep = 1e3;
        }
        if (interruptStep <= 0) {
          calculateSync();
        } else {
          calculateAsync(0);
        }
      }
      if (typeof module !== "undefined") module.exports = scrypt2;
    }
  });

  // frontend/common/translations.js
  var import_sbp = __toESM(__require("@sbp/sbp"));

  // frontend/common/stringTemplate.js
  var nargs = /\{([0-9a-zA-Z_]+)\}/g;
  function template(string3, ...args) {
    const firstArg = args[0];
    const replacementsByKey = typeof firstArg === "object" && firstArg !== null ? firstArg : args;
    return string3.replace(nargs, function replaceArg(match, capture, index) {
      if (string3[index - 1] === "{" && string3[index + match.length] === "}") {
        return capture;
      }
      const maybeReplacement = (
        // Avoid accessing inherited properties of the replacement table.
        // $FlowFixMe
        Object.prototype.hasOwnProperty.call(replacementsByKey, capture) ? replacementsByKey[capture] : void 0
      );
      if (maybeReplacement === null || maybeReplacement === void 0) {
        return "";
      }
      return String(maybeReplacement);
    });
  }

  // frontend/common/translations.js
  var defaultLanguage = "en-US";
  var defaultLanguageCode = "en";
  var defaultTranslationTable = {};
  var currentLanguage = defaultLanguage;
  var currentLanguageCode = defaultLanguage.split("-")[0];
  var currentTranslationTable = defaultTranslationTable;
  var translations_default = (0, import_sbp.default)("sbp/selectors/register", {
    "translations/init": async function init(language) {
      const [languageCode] = language.toLowerCase().split("-");
      if (language.toLowerCase() === currentLanguage.toLowerCase()) return;
      if (languageCode === currentLanguageCode) return;
      if (languageCode === defaultLanguageCode) {
        currentLanguage = defaultLanguage;
        currentLanguageCode = defaultLanguageCode;
        currentTranslationTable = defaultTranslationTable;
        return;
      }
      try {
        currentTranslationTable = await (0, import_sbp.default)("backend/translations/get", language) || defaultTranslationTable;
        currentLanguage = language;
        currentLanguageCode = languageCode;
      } catch (error) {
        console.error(error);
      }
    }
  });
  function L(key, args) {
    return template(currentTranslationTable[key] || key, args).replace(/\s(?=[;:?!])/g, "\xA0");
  }

  // frontend/common/errors.js
  var errors_exports = {};
  __export(errors_exports, {
    GIErrorIgnoreAndBan: () => GIErrorIgnoreAndBan,
    GIErrorMissingSigningKeyError: () => GIErrorMissingSigningKeyError,
    GIErrorUIRuntimeError: () => GIErrorUIRuntimeError
  });

  // shared/domains/chelonia/errors.js
  var ChelErrorGenerator = (name, base2 = Error) => class extends base2 {
    constructor(...params) {
      super(...params);
      this.name = name;
      if (params[1]?.cause !== this.cause) {
        Object.defineProperty(this, "cause", { configurable: true, writable: true, value: params[1].cause });
      }
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  };
  var ChelErrorWarning = ChelErrorGenerator("ChelErrorWarning");
  var ChelErrorAlreadyProcessed = ChelErrorGenerator("ChelErrorAlreadyProcessed");
  var ChelErrorDBBadPreviousHEAD = ChelErrorGenerator("ChelErrorDBBadPreviousHEAD");
  var ChelErrorDBConnection = ChelErrorGenerator("ChelErrorDBConnection");
  var ChelErrorUnexpected = ChelErrorGenerator("ChelErrorUnexpected");
  var ChelErrorKeyAlreadyExists = ChelErrorGenerator("ChelErrorKeyAlreadyExists");
  var ChelErrorUnrecoverable = ChelErrorGenerator("ChelErrorUnrecoverable");
  var ChelErrorForkedChain = ChelErrorGenerator("ChelErrorForkedChain");
  var ChelErrorDecryptionError = ChelErrorGenerator("ChelErrorDecryptionError");
  var ChelErrorDecryptionKeyNotFound = ChelErrorGenerator("ChelErrorDecryptionKeyNotFound", ChelErrorDecryptionError);
  var ChelErrorSignatureError = ChelErrorGenerator("ChelErrorSignatureError");
  var ChelErrorSignatureKeyUnauthorized = ChelErrorGenerator("ChelErrorSignatureKeyUnauthorized", ChelErrorSignatureError);
  var ChelErrorSignatureKeyNotFound = ChelErrorGenerator("ChelErrorSignatureKeyNotFound", ChelErrorSignatureError);
  var ChelErrorFetchServerTimeFailed = ChelErrorGenerator("ChelErrorFetchServerTimeFailed");

  // frontend/common/errors.js
  var GIErrorIgnoreAndBan = ChelErrorGenerator("GIErrorIgnoreAndBan");
  var GIErrorUIRuntimeError = ChelErrorGenerator("GIErrorUIRuntimeError");
  var GIErrorMissingSigningKeyError = ChelErrorGenerator("GIErrorMissingSigningKeyError");

  // frontend/model/contracts/group.js
  var import_sbp7 = __toESM(__require("@sbp/sbp"));

  // frontend/utils/events.js
  var JOINED_GROUP = "joined-group";
  var ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST = "error-group-non-existent-#general";
  var LEFT_CHATROOM = "left-chatroom";
  var DELETED_CHATROOM = "deleted-chatroom";
  var ERROR_JOINING_CHATROOM = "error-joining-chatroom";

  // frontend/model/contracts/misc/flowTyper.js
  var EMPTY_VALUE = Symbol("@@empty");
  var isEmpty = (v) => v === EMPTY_VALUE;
  var isNil = (v) => v === null;
  var isUndef = (v) => typeof v === "undefined";
  var isBoolean = (v) => typeof v === "boolean";
  var isNumber = (v) => typeof v === "number";
  var isString = (v) => typeof v === "string";
  var isObject = (v) => !isNil(v) && typeof v === "object";
  var isFunction = (v) => typeof v === "function";
  var getType = (typeFn, _options) => {
    if (isFunction(typeFn.type)) return typeFn.type(_options);
    return typeFn.name || "?";
  };
  var TypeValidatorError = class _TypeValidatorError extends Error {
    expectedType;
    valueType;
    value;
    typeScope;
    sourceFile;
    constructor(message, expectedType, valueType, value, typeName = "", typeScope = "") {
      const errMessage = message || `invalid "${valueType}" value type; ${typeName || expectedType} type expected`;
      super(errMessage);
      this.expectedType = expectedType;
      this.valueType = valueType;
      this.value = value;
      this.typeScope = typeScope || "";
      this.sourceFile = this.getSourceFile();
      this.message = `${errMessage}
${this.getErrorInfo()}`;
      this.name = this.constructor.name;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, _TypeValidatorError);
      }
    }
    getSourceFile() {
      const fileNames = this.stack.match(/(\/[\w_\-.]+)+(\.\w+:\d+:\d+)/g) || [];
      return fileNames.find((fileName) => fileName.indexOf("/flowTyper-js/dist/") === -1) || "";
    }
    getErrorInfo() {
      return `
    file     ${this.sourceFile}
    scope    ${this.typeScope}
    expected ${this.expectedType.replace(/\n/g, "")}
    type     ${this.valueType}
    value    ${this.value}
`;
    }
  };
  var validatorError = (typeFn, value, scope, message, expectedType, valueType) => {
    return new TypeValidatorError(
      message,
      expectedType || getType(typeFn),
      valueType || typeof value,
      JSON.stringify(value),
      typeFn.name,
      scope
    );
  };
  var arrayOf = (typeFn, _scope = "Array") => {
    function array(value) {
      if (isEmpty(value)) return [typeFn(value)];
      if (Array.isArray(value)) {
        let index = 0;
        return value.map((v) => typeFn(v, `${_scope}[${index++}]`));
      }
      throw validatorError(array, value, _scope);
    }
    array.type = () => `Array<${getType(typeFn)}>`;
    return array;
  };
  var literalOf = (primitive) => {
    function literal(value, _scope = "") {
      if (isEmpty(value) || value === primitive) return primitive;
      throw validatorError(literal, value, _scope);
    }
    literal.type = () => {
      if (isBoolean(primitive)) return `${primitive ? "true" : "false"}`;
      else return `"${primitive}"`;
    };
    return literal;
  };
  var mapOf = (keyTypeFn, typeFn) => {
    function mapOf2(value) {
      if (isEmpty(value)) return {};
      const o = object(value);
      const reducer = (acc, key) => Object.assign(
        acc,
        {
          // $FlowFixMe
          [keyTypeFn(key, "Map[_]")]: typeFn(o[key], `Map.${key}`)
        }
      );
      return Object.keys(o).reduce(reducer, {});
    }
    mapOf2.type = () => `{ [_:${getType(keyTypeFn)}]: ${getType(typeFn)} }`;
    return mapOf2;
  };
  var object = function(value) {
    if (isEmpty(value)) return {};
    if (isObject(value) && !Array.isArray(value)) {
      return Object.assign({}, value);
    }
    throw validatorError(object, value);
  };
  var objectOf = (typeObj, _scope = "Object") => {
    function object2(value) {
      const o = object(value);
      const typeAttrs = Object.keys(typeObj);
      const unknownAttr = Object.keys(o).find((attr) => !typeAttrs.includes(attr));
      if (unknownAttr) {
        throw validatorError(
          object2,
          value,
          _scope,
          `missing object property '${unknownAttr}' in ${_scope} type`
        );
      }
      const undefAttr = typeAttrs.find((property) => {
        const propertyTypeFn = typeObj[property];
        return propertyTypeFn.name.includes("maybe") && !o.hasOwnProperty(property);
      });
      if (undefAttr) {
        throw validatorError(
          object2,
          o[undefAttr],
          `${_scope}.${undefAttr}`,
          `empty object property '${undefAttr}' for ${_scope} type`,
          `void | null | ${getType(typeObj[undefAttr]).substr(1)}`,
          "-"
        );
      }
      const reducer = isEmpty(value) ? (acc, key) => Object.assign(acc, { [key]: typeObj[key](value) }) : (acc, key) => {
        const typeFn = typeObj[key];
        if (typeFn.name.includes("optional") && !o.hasOwnProperty(key)) {
          return Object.assign(acc, {});
        } else {
          return Object.assign(acc, { [key]: typeFn(o[key], `${_scope}.${key}`) });
        }
      };
      return typeAttrs.reduce(reducer, {});
    }
    object2.type = () => {
      const props = Object.keys(typeObj).map(
        (key) => {
          const ret = typeObj[key].name.includes("optional") ? `${key}?: ${getType(typeObj[key], { noVoid: true })}` : `${key}: ${getType(typeObj[key])}`;
          return ret;
        }
      );
      return `{|
 ${props.join(",\n  ")} 
|}`;
    };
    return object2;
  };
  function objectMaybeOf(validations, _scope = "Object") {
    return function(data) {
      object(data);
      for (const key in data) {
        validations[key]?.(data[key], `${_scope}.${key}`);
      }
      return data;
    };
  }
  var optional = (typeFn) => {
    const unionFn = unionOf(typeFn, undef);
    function optional2(v) {
      return unionFn(v);
    }
    optional2.type = ({ noVoid }) => !noVoid ? getType(unionFn) : getType(typeFn);
    return optional2;
  };
  function undef(value, _scope = "") {
    if (isEmpty(value) || isUndef(value)) return void 0;
    throw validatorError(undef, value, _scope);
  }
  undef.type = () => "void";
  var boolean = function boolean2(value, _scope = "") {
    if (isEmpty(value)) return false;
    if (isBoolean(value)) return value;
    throw validatorError(boolean2, value, _scope);
  };
  var number = function number2(value, _scope = "") {
    if (isEmpty(value)) return 0;
    if (isNumber(value)) return value;
    throw validatorError(number2, value, _scope);
  };
  var numberRange = (from3, to, key = "") => {
    if (!isNumber(from3) || !isNumber(to)) {
      throw new TypeError("Params for numberRange must be numbers");
    }
    if (from3 >= to) {
      throw new TypeError('Params "to" should be bigger than "from"');
    }
    function numberRange2(value, _scope = "") {
      number(value, _scope);
      if (value >= from3 && value <= to) return value;
      throw validatorError(
        numberRange2,
        value,
        _scope,
        key ? `number type '${key}' must be within the range of [${from3}, ${to}]` : `must be within the range of [${from3}, ${to}]`
      );
    }
    numberRange2.type = `number(range: [${from3}, ${to}])`;
    return numberRange2;
  };
  var string = function string2(value, _scope = "") {
    if (isEmpty(value)) return "";
    if (isString(value)) return value;
    throw validatorError(string2, value, _scope);
  };
  var stringMax = (numChar, key = "") => {
    if (!isNumber(numChar)) {
      throw new Error("param for stringMax must be number");
    }
    function stringMax2(value, _scope = "") {
      string(value, _scope);
      if (value.length <= numChar) return value;
      throw validatorError(
        stringMax2,
        value,
        _scope,
        key ? `string type '${key}' cannot exceed ${numChar} characters` : `cannot exceed ${numChar} characters`
      );
    }
    stringMax2.type = () => `string(max: ${numChar})`;
    return stringMax2;
  };
  function tupleOf_(...typeFuncs) {
    function tuple(value, _scope = "") {
      const cardinality = typeFuncs.length;
      if (isEmpty(value)) return typeFuncs.map((fn) => fn(value));
      if (Array.isArray(value) && value.length === cardinality) {
        const tupleValue = [];
        for (let i = 0; i < cardinality; i += 1) {
          tupleValue.push(typeFuncs[i](value[i], _scope));
        }
        return tupleValue;
      }
      throw validatorError(tuple, value, _scope);
    }
    tuple.type = () => `[${typeFuncs.map((fn) => getType(fn)).join(", ")}]`;
    return tuple;
  }
  var tupleOf = tupleOf_;
  function unionOf_(...typeFuncs) {
    function union(value, _scope = "") {
      for (const typeFn of typeFuncs) {
        try {
          return typeFn(value, _scope);
        } catch (_) {
        }
      }
      throw validatorError(union, value, _scope);
    }
    union.type = () => `(${typeFuncs.map((fn) => getType(fn)).join(" | ")})`;
    return union;
  }
  var unionOf = unionOf_;
  var actionRequireInnerSignature = (next) => (data, props) => {
    const innerSigningContractID = props.message.innerSigningContractID;
    if (!innerSigningContractID || innerSigningContractID === props.contractID) {
      throw new Error("Missing inner signature");
    }
    return next(data, props);
  };
  var validatorFrom = (fn) => {
    function customType(value, _scope = "") {
      if (!fn(value)) {
        throw validatorError(customType, value, _scope);
      }
      return value;
    }
    return customType;
  };

  // shared/domains/chelonia/utils.js
  var import_sbp4 = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/giLodash.js
  function omit(o, props) {
    const x = {};
    for (const k in o) {
      if (!props.includes(k)) {
        x[k] = o[k];
      }
    }
    return x;
  }
  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function isMergeableObject(val) {
    const nonNullObject = val && typeof val === "object";
    return nonNullObject && Object.prototype.toString.call(val) !== "[object RegExp]" && Object.prototype.toString.call(val) !== "[object Date]";
  }
  function merge(obj, src2) {
    for (const key in src2) {
      const clone = isMergeableObject(src2[key]) ? cloneDeep(src2[key]) : void 0;
      if (clone && isMergeableObject(obj[key])) {
        merge(obj[key], clone);
        continue;
      }
      obj[key] = clone || src2[key];
    }
    return obj;
  }
  function deepEqualJSONType(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== typeof b) return false;
    if (typeof a !== "object") return a === b;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
    } else if (a.constructor.name !== "Object") {
      throw new Error(`not JSON type: ${a}`);
    }
    for (const key in a) {
      if (!deepEqualJSONType(a[key], b[key])) return false;
    }
    return true;
  }
  var has = (
    // $FlowFixMe
    Function.prototype.call.bind(Object.prototype.hasOwnProperty)
  );

  // shared/blake2bstream.js
  var import_blakejs = __toESM(require_blakejs());

  // shared/multiformats/bytes.js
  var empty = new Uint8Array(0);
  function equals(aa, bb) {
    if (aa === bb) {
      return true;
    }
    if (aa.byteLength !== bb.byteLength) {
      return false;
    }
    for (let ii = 0; ii < aa.byteLength; ii++) {
      if (aa[ii] !== bb[ii]) {
        return false;
      }
    }
    return true;
  }
  function coerce(o) {
    if (o instanceof Uint8Array && o.constructor.name === "Uint8Array") {
      return o;
    }
    if (o instanceof ArrayBuffer) {
      return new Uint8Array(o);
    }
    if (ArrayBuffer.isView(o)) {
      return new Uint8Array(o.buffer, o.byteOffset, o.byteLength);
    }
    throw new Error("Unknown type, must be binary type");
  }

  // shared/multiformats/vendor/varint.js
  var encode_1 = encode;
  var MSB = 128;
  var REST = 127;
  var MSBALL = ~REST;
  var INT = Math.pow(2, 31);
  function encode(num, out, offset) {
    out = out || [];
    offset = offset || 0;
    var oldOffset = offset;
    while (num >= INT) {
      out[offset++] = num & 255 | MSB;
      num /= 128;
    }
    while (num & MSBALL) {
      out[offset++] = num & 255 | MSB;
      num >>>= 7;
    }
    out[offset] = num | 0;
    encode.bytes = offset - oldOffset + 1;
    return out;
  }
  var decode = read;
  var MSB$1 = 128;
  var REST$1 = 127;
  function read(buf, offset) {
    var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf.length;
    do {
      if (counter >= l) {
        read.bytes = 0;
        throw new RangeError("Could not decode varint");
      }
      b = buf[counter++];
      res += shift < 28 ? (b & REST$1) << shift : (b & REST$1) * Math.pow(2, shift);
      shift += 7;
    } while (b >= MSB$1);
    read.bytes = counter - offset;
    return res;
  }
  var N1 = Math.pow(2, 7);
  var N2 = Math.pow(2, 14);
  var N3 = Math.pow(2, 21);
  var N4 = Math.pow(2, 28);
  var N5 = Math.pow(2, 35);
  var N6 = Math.pow(2, 42);
  var N7 = Math.pow(2, 49);
  var N8 = Math.pow(2, 56);
  var N9 = Math.pow(2, 63);
  var length = function(value) {
    return value < N1 ? 1 : value < N2 ? 2 : value < N3 ? 3 : value < N4 ? 4 : value < N5 ? 5 : value < N6 ? 6 : value < N7 ? 7 : value < N8 ? 8 : value < N9 ? 9 : 10;
  };
  var varint = {
    encode: encode_1,
    decode,
    encodingLength: length
  };
  var _brrp_varint = varint;
  var varint_default = _brrp_varint;

  // shared/multiformats/varint.js
  function decode2(data, offset = 0) {
    const code = varint_default.decode(data, offset);
    return [code, varint_default.decode.bytes];
  }
  function encodeTo(int, target, offset = 0) {
    varint_default.encode(int, target, offset);
    return target;
  }
  function encodingLength(int) {
    return varint_default.encodingLength(int);
  }

  // shared/multiformats/hashes/digest.js
  function create(code, digest) {
    const size = digest.byteLength;
    const sizeOffset = encodingLength(code);
    const digestOffset = sizeOffset + encodingLength(size);
    const bytes = new Uint8Array(digestOffset + size);
    encodeTo(code, bytes, 0);
    encodeTo(size, bytes, sizeOffset);
    bytes.set(digest, digestOffset);
    return new Digest(code, size, digest, bytes);
  }
  function decode3(multihash) {
    const bytes = coerce(multihash);
    const [code, sizeOffset] = decode2(bytes);
    const [size, digestOffset] = decode2(bytes.subarray(sizeOffset));
    const digest = bytes.subarray(sizeOffset + digestOffset);
    if (digest.byteLength !== size) {
      throw new Error("Incorrect length");
    }
    return new Digest(code, size, digest, bytes);
  }
  function equals2(a, b) {
    if (a === b) {
      return true;
    } else {
      const data = b;
      return a.code === data.code && a.size === data.size && data.bytes instanceof Uint8Array && equals(a.bytes, data.bytes);
    }
  }
  var Digest = class {
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
  };

  // shared/multiformats/hasher.js
  function from({ name, code, encode: encode3 }) {
    return new Hasher(name, code, encode3);
  }
  var Hasher = class {
    name;
    code;
    encode;
    constructor(name, code, encode3) {
      this.name = name;
      this.code = code;
      this.encode = encode3;
    }
    digest(input) {
      if (input instanceof Uint8Array || input instanceof ReadableStream) {
        const result = this.encode(input);
        return result instanceof Uint8Array ? create(this.code, result) : result.then((digest) => create(this.code, digest));
      } else {
        throw Error("Unknown type, must be binary type");
      }
    }
  };

  // shared/blake2bstream.js
  var { blake2b, blake2bInit, blake2bUpdate, blake2bFinal } = import_blakejs.default;
  var blake2b256stream = from({
    name: "blake2b-256",
    code: 45600,
    encode: async (input) => {
      if (input instanceof ReadableStream) {
        const ctx = blake2bInit(32);
        const reader = input.getReader();
        for (; ; ) {
          const result = await reader.read();
          if (result.done) break;
          blake2bUpdate(ctx, coerce(result.value));
        }
        return blake2bFinal(ctx);
      } else {
        return coerce(blake2b(input, void 0, 32));
      }
    }
  });

  // shared/multiformats/base-x.js
  function base(ALPHABET, name) {
    if (ALPHABET.length >= 255) {
      throw new TypeError("Alphabet too long");
    }
    var BASE_MAP = new Uint8Array(256);
    for (var j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }
    for (var i = 0; i < ALPHABET.length; i++) {
      var x = ALPHABET.charAt(i);
      var xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + " is ambiguous");
      }
      BASE_MAP[xc] = i;
    }
    var BASE = ALPHABET.length;
    var LEADER = ALPHABET.charAt(0);
    var FACTOR = Math.log(BASE) / Math.log(256);
    var iFACTOR = Math.log(256) / Math.log(BASE);
    function encode3(source) {
      if (source instanceof Uint8Array)
        ;
      else if (ArrayBuffer.isView(source)) {
        source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
      } else if (Array.isArray(source)) {
        source = Uint8Array.from(source);
      }
      if (!(source instanceof Uint8Array)) {
        throw new TypeError("Expected Uint8Array");
      }
      if (source.length === 0) {
        return "";
      }
      var zeroes = 0;
      var length2 = 0;
      var pbegin = 0;
      var pend = source.length;
      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }
      var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      var b58 = new Uint8Array(size);
      while (pbegin !== pend) {
        var carry = source[pbegin];
        var i2 = 0;
        for (var it1 = size - 1; (carry !== 0 || i2 < length2) && it1 !== -1; it1--, i2++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i2;
        pbegin++;
      }
      var it2 = size - length2;
      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }
      var str = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str += ALPHABET.charAt(b58[it2]);
      }
      return str;
    }
    function decodeUnsafe(source) {
      if (typeof source !== "string") {
        throw new TypeError("Expected String");
      }
      if (source.length === 0) {
        return new Uint8Array();
      }
      var psz = 0;
      if (source[psz] === " ") {
        return;
      }
      var zeroes = 0;
      var length2 = 0;
      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }
      var size = (source.length - psz) * FACTOR + 1 >>> 0;
      var b256 = new Uint8Array(size);
      while (source[psz]) {
        var carry = BASE_MAP[source.charCodeAt(psz)];
        if (carry === 255) {
          return;
        }
        var i2 = 0;
        for (var it3 = size - 1; (carry !== 0 || i2 < length2) && it3 !== -1; it3--, i2++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i2;
        psz++;
      }
      if (source[psz] === " ") {
        return;
      }
      var it4 = size - length2;
      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }
      var vch = new Uint8Array(zeroes + (size - it4));
      var j2 = zeroes;
      while (it4 !== size) {
        vch[j2++] = b256[it4++];
      }
      return vch;
    }
    function decode5(string3) {
      var buffer = decodeUnsafe(string3);
      if (buffer) {
        return buffer;
      }
      throw new Error(`Non-${name} character`);
    }
    return {
      encode: encode3,
      decodeUnsafe,
      decode: decode5
    };
  }
  var src = base;
  var _brrp__multiformats_scope_baseX = src;
  var base_x_default = _brrp__multiformats_scope_baseX;

  // shared/multiformats/bases/base.js
  var Encoder = class {
    name;
    prefix;
    baseEncode;
    constructor(name, prefix, baseEncode) {
      this.name = name;
      this.prefix = prefix;
      this.baseEncode = baseEncode;
    }
    encode(bytes) {
      if (bytes instanceof Uint8Array) {
        return `${this.prefix}${this.baseEncode(bytes)}`;
      } else {
        throw Error("Unknown type, must be binary type");
      }
    }
  };
  var Decoder = class {
    name;
    prefix;
    baseDecode;
    prefixCodePoint;
    constructor(name, prefix, baseDecode) {
      this.name = name;
      this.prefix = prefix;
      if (prefix.codePointAt(0) === void 0) {
        throw new Error("Invalid prefix character");
      }
      this.prefixCodePoint = prefix.codePointAt(0);
      this.baseDecode = baseDecode;
    }
    decode(text) {
      if (typeof text === "string") {
        if (text.codePointAt(0) !== this.prefixCodePoint) {
          throw Error(`Unable to decode multibase string ${JSON.stringify(text)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
        }
        return this.baseDecode(text.slice(this.prefix.length));
      } else {
        throw Error("Can only multibase decode strings");
      }
    }
    or(decoder) {
      return or(this, decoder);
    }
  };
  var ComposedDecoder = class {
    decoders;
    constructor(decoders) {
      this.decoders = decoders;
    }
    or(decoder) {
      return or(this, decoder);
    }
    decode(input) {
      const prefix = input[0];
      const decoder = this.decoders[prefix];
      if (decoder != null) {
        return decoder.decode(input);
      } else {
        throw RangeError(`Unable to decode multibase string ${JSON.stringify(input)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
      }
    }
  };
  function or(left, right) {
    return new ComposedDecoder({
      ...left.decoders ?? { [left.prefix]: left },
      ...right.decoders ?? { [right.prefix]: right }
    });
  }
  var Codec = class {
    name;
    prefix;
    baseEncode;
    baseDecode;
    encoder;
    decoder;
    constructor(name, prefix, baseEncode, baseDecode) {
      this.name = name;
      this.prefix = prefix;
      this.baseEncode = baseEncode;
      this.baseDecode = baseDecode;
      this.encoder = new Encoder(name, prefix, baseEncode);
      this.decoder = new Decoder(name, prefix, baseDecode);
    }
    encode(input) {
      return this.encoder.encode(input);
    }
    decode(input) {
      return this.decoder.decode(input);
    }
  };
  function from2({ name, prefix, encode: encode3, decode: decode5 }) {
    return new Codec(name, prefix, encode3, decode5);
  }
  function baseX({ name, prefix, alphabet }) {
    const { encode: encode3, decode: decode5 } = base_x_default(alphabet, name);
    return from2({
      prefix,
      name,
      encode: encode3,
      decode: (text) => coerce(decode5(text))
    });
  }
  function decode4(string3, alphabet, bitsPerChar, name) {
    const codes = {};
    for (let i = 0; i < alphabet.length; ++i) {
      codes[alphabet[i]] = i;
    }
    let end = string3.length;
    while (string3[end - 1] === "=") {
      --end;
    }
    const out = new Uint8Array(end * bitsPerChar / 8 | 0);
    let bits = 0;
    let buffer = 0;
    let written = 0;
    for (let i = 0; i < end; ++i) {
      const value = codes[string3[i]];
      if (value === void 0) {
        throw new SyntaxError(`Non-${name} character`);
      }
      buffer = buffer << bitsPerChar | value;
      bits += bitsPerChar;
      if (bits >= 8) {
        bits -= 8;
        out[written++] = 255 & buffer >> bits;
      }
    }
    if (bits >= bitsPerChar || (255 & buffer << 8 - bits) !== 0) {
      throw new SyntaxError("Unexpected end of data");
    }
    return out;
  }
  function encode2(data, alphabet, bitsPerChar) {
    const pad = alphabet[alphabet.length - 1] === "=";
    const mask = (1 << bitsPerChar) - 1;
    let out = "";
    let bits = 0;
    let buffer = 0;
    for (let i = 0; i < data.length; ++i) {
      buffer = buffer << 8 | data[i];
      bits += 8;
      while (bits > bitsPerChar) {
        bits -= bitsPerChar;
        out += alphabet[mask & buffer >> bits];
      }
    }
    if (bits !== 0) {
      out += alphabet[mask & buffer << bitsPerChar - bits];
    }
    if (pad) {
      while ((out.length * bitsPerChar & 7) !== 0) {
        out += "=";
      }
    }
    return out;
  }
  function rfc4648({ name, prefix, bitsPerChar, alphabet }) {
    return from2({
      prefix,
      name,
      encode(input) {
        return encode2(input, alphabet, bitsPerChar);
      },
      decode(input) {
        return decode4(input, alphabet, bitsPerChar, name);
      }
    });
  }

  // shared/multiformats/bases/base58.js
  var base58btc = baseX({
    name: "base58btc",
    prefix: "z",
    alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  });
  var base58flickr = baseX({
    name: "base58flickr",
    prefix: "Z",
    alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"
  });

  // shared/multiformats/blake2b.js
  var import_blakejs2 = __toESM(require_blakejs());
  var { blake2b: blake2b2 } = import_blakejs2.default;
  var blake2b8 = from({
    name: "blake2b-8",
    code: 45569,
    encode: (input) => coerce(blake2b2(input, void 0, 1))
  });
  var blake2b16 = from({
    name: "blake2b-16",
    code: 45570,
    encode: (input) => coerce(blake2b2(input, void 0, 2))
  });
  var blake2b24 = from({
    name: "blake2b-24",
    code: 45571,
    encode: (input) => coerce(blake2b2(input, void 0, 3))
  });
  var blake2b32 = from({
    name: "blake2b-32",
    code: 45572,
    encode: (input) => coerce(blake2b2(input, void 0, 4))
  });
  var blake2b40 = from({
    name: "blake2b-40",
    code: 45573,
    encode: (input) => coerce(blake2b2(input, void 0, 5))
  });
  var blake2b48 = from({
    name: "blake2b-48",
    code: 45574,
    encode: (input) => coerce(blake2b2(input, void 0, 6))
  });
  var blake2b56 = from({
    name: "blake2b-56",
    code: 45575,
    encode: (input) => coerce(blake2b2(input, void 0, 7))
  });
  var blake2b64 = from({
    name: "blake2b-64",
    code: 45576,
    encode: (input) => coerce(blake2b2(input, void 0, 8))
  });
  var blake2b72 = from({
    name: "blake2b-72",
    code: 45577,
    encode: (input) => coerce(blake2b2(input, void 0, 9))
  });
  var blake2b80 = from({
    name: "blake2b-80",
    code: 45578,
    encode: (input) => coerce(blake2b2(input, void 0, 10))
  });
  var blake2b88 = from({
    name: "blake2b-88",
    code: 45579,
    encode: (input) => coerce(blake2b2(input, void 0, 11))
  });
  var blake2b96 = from({
    name: "blake2b-96",
    code: 45580,
    encode: (input) => coerce(blake2b2(input, void 0, 12))
  });
  var blake2b104 = from({
    name: "blake2b-104",
    code: 45581,
    encode: (input) => coerce(blake2b2(input, void 0, 13))
  });
  var blake2b112 = from({
    name: "blake2b-112",
    code: 45582,
    encode: (input) => coerce(blake2b2(input, void 0, 14))
  });
  var blake2b120 = from({
    name: "blake2b-120",
    code: 45583,
    encode: (input) => coerce(blake2b2(input, void 0, 15))
  });
  var blake2b128 = from({
    name: "blake2b-128",
    code: 45584,
    encode: (input) => coerce(blake2b2(input, void 0, 16))
  });
  var blake2b136 = from({
    name: "blake2b-136",
    code: 45585,
    encode: (input) => coerce(blake2b2(input, void 0, 17))
  });
  var blake2b144 = from({
    name: "blake2b-144",
    code: 45586,
    encode: (input) => coerce(blake2b2(input, void 0, 18))
  });
  var blake2b152 = from({
    name: "blake2b-152",
    code: 45587,
    encode: (input) => coerce(blake2b2(input, void 0, 19))
  });
  var blake2b160 = from({
    name: "blake2b-160",
    code: 45588,
    encode: (input) => coerce(blake2b2(input, void 0, 20))
  });
  var blake2b168 = from({
    name: "blake2b-168",
    code: 45589,
    encode: (input) => coerce(blake2b2(input, void 0, 21))
  });
  var blake2b176 = from({
    name: "blake2b-176",
    code: 45590,
    encode: (input) => coerce(blake2b2(input, void 0, 22))
  });
  var blake2b184 = from({
    name: "blake2b-184",
    code: 45591,
    encode: (input) => coerce(blake2b2(input, void 0, 23))
  });
  var blake2b192 = from({
    name: "blake2b-192",
    code: 45592,
    encode: (input) => coerce(blake2b2(input, void 0, 24))
  });
  var blake2b200 = from({
    name: "blake2b-200",
    code: 45593,
    encode: (input) => coerce(blake2b2(input, void 0, 25))
  });
  var blake2b208 = from({
    name: "blake2b-208",
    code: 45594,
    encode: (input) => coerce(blake2b2(input, void 0, 26))
  });
  var blake2b216 = from({
    name: "blake2b-216",
    code: 45595,
    encode: (input) => coerce(blake2b2(input, void 0, 27))
  });
  var blake2b224 = from({
    name: "blake2b-224",
    code: 45596,
    encode: (input) => coerce(blake2b2(input, void 0, 28))
  });
  var blake2b232 = from({
    name: "blake2b-232",
    code: 45597,
    encode: (input) => coerce(blake2b2(input, void 0, 29))
  });
  var blake2b240 = from({
    name: "blake2b-240",
    code: 45598,
    encode: (input) => coerce(blake2b2(input, void 0, 30))
  });
  var blake2b248 = from({
    name: "blake2b-248",
    code: 45599,
    encode: (input) => coerce(blake2b2(input, void 0, 31))
  });
  var blake2b256 = from({
    name: "blake2b-256",
    code: 45600,
    encode: (input) => coerce(blake2b2(input, void 0, 32))
  });
  var blake2b264 = from({
    name: "blake2b-264",
    code: 45601,
    encode: (input) => coerce(blake2b2(input, void 0, 33))
  });
  var blake2b272 = from({
    name: "blake2b-272",
    code: 45602,
    encode: (input) => coerce(blake2b2(input, void 0, 34))
  });
  var blake2b280 = from({
    name: "blake2b-280",
    code: 45603,
    encode: (input) => coerce(blake2b2(input, void 0, 35))
  });
  var blake2b288 = from({
    name: "blake2b-288",
    code: 45604,
    encode: (input) => coerce(blake2b2(input, void 0, 36))
  });
  var blake2b296 = from({
    name: "blake2b-296",
    code: 45605,
    encode: (input) => coerce(blake2b2(input, void 0, 37))
  });
  var blake2b304 = from({
    name: "blake2b-304",
    code: 45606,
    encode: (input) => coerce(blake2b2(input, void 0, 38))
  });
  var blake2b312 = from({
    name: "blake2b-312",
    code: 45607,
    encode: (input) => coerce(blake2b2(input, void 0, 39))
  });
  var blake2b320 = from({
    name: "blake2b-320",
    code: 45608,
    encode: (input) => coerce(blake2b2(input, void 0, 40))
  });
  var blake2b328 = from({
    name: "blake2b-328",
    code: 45609,
    encode: (input) => coerce(blake2b2(input, void 0, 41))
  });
  var blake2b336 = from({
    name: "blake2b-336",
    code: 45610,
    encode: (input) => coerce(blake2b2(input, void 0, 42))
  });
  var blake2b344 = from({
    name: "blake2b-344",
    code: 45611,
    encode: (input) => coerce(blake2b2(input, void 0, 43))
  });
  var blake2b352 = from({
    name: "blake2b-352",
    code: 45612,
    encode: (input) => coerce(blake2b2(input, void 0, 44))
  });
  var blake2b360 = from({
    name: "blake2b-360",
    code: 45613,
    encode: (input) => coerce(blake2b2(input, void 0, 45))
  });
  var blake2b368 = from({
    name: "blake2b-368",
    code: 45614,
    encode: (input) => coerce(blake2b2(input, void 0, 46))
  });
  var blake2b376 = from({
    name: "blake2b-376",
    code: 45615,
    encode: (input) => coerce(blake2b2(input, void 0, 47))
  });
  var blake2b384 = from({
    name: "blake2b-384",
    code: 45616,
    encode: (input) => coerce(blake2b2(input, void 0, 48))
  });
  var blake2b392 = from({
    name: "blake2b-392",
    code: 45617,
    encode: (input) => coerce(blake2b2(input, void 0, 49))
  });
  var blake2b400 = from({
    name: "blake2b-400",
    code: 45618,
    encode: (input) => coerce(blake2b2(input, void 0, 50))
  });
  var blake2b408 = from({
    name: "blake2b-408",
    code: 45619,
    encode: (input) => coerce(blake2b2(input, void 0, 51))
  });
  var blake2b416 = from({
    name: "blake2b-416",
    code: 45620,
    encode: (input) => coerce(blake2b2(input, void 0, 52))
  });
  var blake2b424 = from({
    name: "blake2b-424",
    code: 45621,
    encode: (input) => coerce(blake2b2(input, void 0, 53))
  });
  var blake2b432 = from({
    name: "blake2b-432",
    code: 45622,
    encode: (input) => coerce(blake2b2(input, void 0, 54))
  });
  var blake2b440 = from({
    name: "blake2b-440",
    code: 45623,
    encode: (input) => coerce(blake2b2(input, void 0, 55))
  });
  var blake2b448 = from({
    name: "blake2b-448",
    code: 45624,
    encode: (input) => coerce(blake2b2(input, void 0, 56))
  });
  var blake2b456 = from({
    name: "blake2b-456",
    code: 45625,
    encode: (input) => coerce(blake2b2(input, void 0, 57))
  });
  var blake2b464 = from({
    name: "blake2b-464",
    code: 45626,
    encode: (input) => coerce(blake2b2(input, void 0, 58))
  });
  var blake2b472 = from({
    name: "blake2b-472",
    code: 45627,
    encode: (input) => coerce(blake2b2(input, void 0, 59))
  });
  var blake2b480 = from({
    name: "blake2b-480",
    code: 45628,
    encode: (input) => coerce(blake2b2(input, void 0, 60))
  });
  var blake2b488 = from({
    name: "blake2b-488",
    code: 45629,
    encode: (input) => coerce(blake2b2(input, void 0, 61))
  });
  var blake2b496 = from({
    name: "blake2b-496",
    code: 45630,
    encode: (input) => coerce(blake2b2(input, void 0, 62))
  });
  var blake2b504 = from({
    name: "blake2b-504",
    code: 45631,
    encode: (input) => coerce(blake2b2(input, void 0, 63))
  });
  var blake2b512 = from({
    name: "blake2b-512",
    code: 45632,
    encode: (input) => coerce(blake2b2(input, void 0, 64))
  });

  // shared/multiformats/bases/base32.js
  var base32 = rfc4648({
    prefix: "b",
    name: "base32",
    alphabet: "abcdefghijklmnopqrstuvwxyz234567",
    bitsPerChar: 5
  });
  var base32upper = rfc4648({
    prefix: "B",
    name: "base32upper",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    bitsPerChar: 5
  });
  var base32pad = rfc4648({
    prefix: "c",
    name: "base32pad",
    alphabet: "abcdefghijklmnopqrstuvwxyz234567=",
    bitsPerChar: 5
  });
  var base32padupper = rfc4648({
    prefix: "C",
    name: "base32padupper",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=",
    bitsPerChar: 5
  });
  var base32hex = rfc4648({
    prefix: "v",
    name: "base32hex",
    alphabet: "0123456789abcdefghijklmnopqrstuv",
    bitsPerChar: 5
  });
  var base32hexupper = rfc4648({
    prefix: "V",
    name: "base32hexupper",
    alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
    bitsPerChar: 5
  });
  var base32hexpad = rfc4648({
    prefix: "t",
    name: "base32hexpad",
    alphabet: "0123456789abcdefghijklmnopqrstuv=",
    bitsPerChar: 5
  });
  var base32hexpadupper = rfc4648({
    prefix: "T",
    name: "base32hexpadupper",
    alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=",
    bitsPerChar: 5
  });
  var base32z = rfc4648({
    prefix: "h",
    name: "base32z",
    alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769",
    bitsPerChar: 5
  });

  // shared/multiformats/cid.js
  function format(link, base2) {
    const { bytes, version } = link;
    switch (version) {
      case 0:
        return toStringV0(bytes, baseCache(link), base2 ?? base58btc.encoder);
      default:
        return toStringV1(bytes, baseCache(link), base2 ?? base32.encoder);
    }
  }
  var cache = /* @__PURE__ */ new WeakMap();
  function baseCache(cid) {
    const baseCache2 = cache.get(cid);
    if (baseCache2 == null) {
      const baseCache3 = /* @__PURE__ */ new Map();
      cache.set(cid, baseCache3);
      return baseCache3;
    }
    return baseCache2;
  }
  var CID = class _CID {
    code;
    version;
    multihash;
    bytes;
    "/";
    /**
     * @param version - Version of the CID
     * @param code - Code of the codec content is encoded in, see https://github.com/multiformats/multicodec/blob/master/table.csv
     * @param multihash - (Multi)hash of the of the content.
     */
    constructor(version, code, multihash, bytes) {
      this.code = code;
      this.version = version;
      this.multihash = multihash;
      this.bytes = bytes;
      this["/"] = bytes;
    }
    /**
     * Signalling `cid.asCID === cid` has been replaced with `cid['/'] === cid.bytes`
     * please either use `CID.asCID(cid)` or switch to new signalling mechanism
     *
     * @deprecated
     */
    get asCID() {
      return this;
    }
    // ArrayBufferView
    get byteOffset() {
      return this.bytes.byteOffset;
    }
    // ArrayBufferView
    get byteLength() {
      return this.bytes.byteLength;
    }
    toV0() {
      switch (this.version) {
        case 0: {
          return this;
        }
        case 1: {
          const { code, multihash } = this;
          if (code !== DAG_PB_CODE) {
            throw new Error("Cannot convert a non dag-pb CID to CIDv0");
          }
          if (multihash.code !== SHA_256_CODE) {
            throw new Error("Cannot convert non sha2-256 multihash CID to CIDv0");
          }
          return _CID.createV0(multihash);
        }
        default: {
          throw Error(`Can not convert CID version ${this.version} to version 0. This is a bug please report`);
        }
      }
    }
    toV1() {
      switch (this.version) {
        case 0: {
          const { code, digest } = this.multihash;
          const multihash = create(code, digest);
          return _CID.createV1(this.code, multihash);
        }
        case 1: {
          return this;
        }
        default: {
          throw Error(`Can not convert CID version ${this.version} to version 1. This is a bug please report`);
        }
      }
    }
    equals(other) {
      return _CID.equals(this, other);
    }
    static equals(self2, other) {
      const unknown = other;
      return unknown != null && self2.code === unknown.code && self2.version === unknown.version && equals2(self2.multihash, unknown.multihash);
    }
    toString(base2) {
      return format(this, base2);
    }
    toJSON() {
      return { "/": format(this) };
    }
    link() {
      return this;
    }
    [Symbol.toStringTag] = "CID";
    // Legacy
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return `CID(${this.toString()})`;
    }
    /**
     * Takes any input `value` and returns a `CID` instance if it was
     * a `CID` otherwise returns `null`. If `value` is instanceof `CID`
     * it will return value back. If `value` is not instance of this CID
     * class, but is compatible CID it will return new instance of this
     * `CID` class. Otherwise returns null.
     *
     * This allows two different incompatible versions of CID library to
     * co-exist and interop as long as binary interface is compatible.
     */
    static asCID(input) {
      if (input == null) {
        return null;
      }
      const value = input;
      if (value instanceof _CID) {
        return value;
      } else if (value["/"] != null && value["/"] === value.bytes || value.asCID === value) {
        const { version, code, multihash, bytes } = value;
        return new _CID(version, code, multihash, bytes ?? encodeCID(version, code, multihash.bytes));
      } else if (value[cidSymbol] === true) {
        const { version, multihash, code } = value;
        const digest = decode3(multihash);
        return _CID.create(version, code, digest);
      } else {
        return null;
      }
    }
    /**
     * @param version - Version of the CID
     * @param code - Code of the codec content is encoded in, see https://github.com/multiformats/multicodec/blob/master/table.csv
     * @param digest - (Multi)hash of the of the content.
     */
    static create(version, code, digest) {
      if (typeof code !== "number") {
        throw new Error("String codecs are no longer supported");
      }
      if (!(digest.bytes instanceof Uint8Array)) {
        throw new Error("Invalid digest");
      }
      switch (version) {
        case 0: {
          if (code !== DAG_PB_CODE) {
            throw new Error(`Version 0 CID must use dag-pb (code: ${DAG_PB_CODE}) block encoding`);
          } else {
            return new _CID(version, code, digest, digest.bytes);
          }
        }
        case 1: {
          const bytes = encodeCID(version, code, digest.bytes);
          return new _CID(version, code, digest, bytes);
        }
        default: {
          throw new Error("Invalid version");
        }
      }
    }
    /**
     * Simplified version of `create` for CIDv0.
     */
    static createV0(digest) {
      return _CID.create(0, DAG_PB_CODE, digest);
    }
    /**
     * Simplified version of `create` for CIDv1.
     *
     * @param code - Content encoding format code.
     * @param digest - Multihash of the content.
     */
    static createV1(code, digest) {
      return _CID.create(1, code, digest);
    }
    /**
     * Decoded a CID from its binary representation. The byte array must contain
     * only the CID with no additional bytes.
     *
     * An error will be thrown if the bytes provided do not contain a valid
     * binary representation of a CID.
     */
    static decode(bytes) {
      const [cid, remainder] = _CID.decodeFirst(bytes);
      if (remainder.length !== 0) {
        throw new Error("Incorrect length");
      }
      return cid;
    }
    /**
     * Decoded a CID from its binary representation at the beginning of a byte
     * array.
     *
     * Returns an array with the first element containing the CID and the second
     * element containing the remainder of the original byte array. The remainder
     * will be a zero-length byte array if the provided bytes only contained a
     * binary CID representation.
     */
    static decodeFirst(bytes) {
      const specs = _CID.inspectBytes(bytes);
      const prefixSize = specs.size - specs.multihashSize;
      const multihashBytes = coerce(bytes.subarray(prefixSize, prefixSize + specs.multihashSize));
      if (multihashBytes.byteLength !== specs.multihashSize) {
        throw new Error("Incorrect length");
      }
      const digestBytes = multihashBytes.subarray(specs.multihashSize - specs.digestSize);
      const digest = new Digest(specs.multihashCode, specs.digestSize, digestBytes, multihashBytes);
      const cid = specs.version === 0 ? _CID.createV0(digest) : _CID.createV1(specs.codec, digest);
      return [cid, bytes.subarray(specs.size)];
    }
    /**
     * Inspect the initial bytes of a CID to determine its properties.
     *
     * Involves decoding up to 4 varints. Typically this will require only 4 to 6
     * bytes but for larger multicodec code values and larger multihash digest
     * lengths these varints can be quite large. It is recommended that at least
     * 10 bytes be made available in the `initialBytes` argument for a complete
     * inspection.
     */
    static inspectBytes(initialBytes) {
      let offset = 0;
      const next = () => {
        const [i, length2] = decode2(initialBytes.subarray(offset));
        offset += length2;
        return i;
      };
      let version = next();
      let codec = DAG_PB_CODE;
      if (version === 18) {
        version = 0;
        offset = 0;
      } else {
        codec = next();
      }
      if (version !== 0 && version !== 1) {
        throw new RangeError(`Invalid CID version ${version}`);
      }
      const prefixSize = offset;
      const multihashCode = next();
      const digestSize = next();
      const size = offset + digestSize;
      const multihashSize = size - prefixSize;
      return { version, codec, multihashCode, digestSize, multihashSize, size };
    }
    /**
     * Takes cid in a string representation and creates an instance. If `base`
     * decoder is not provided will use a default from the configuration. It will
     * throw an error if encoding of the CID is not compatible with supplied (or
     * a default decoder).
     */
    static parse(source, base2) {
      const [prefix, bytes] = parseCIDtoBytes(source, base2);
      const cid = _CID.decode(bytes);
      if (cid.version === 0 && source[0] !== "Q") {
        throw Error("Version 0 CID string must not include multibase prefix");
      }
      baseCache(cid).set(prefix, source);
      return cid;
    }
  };
  function parseCIDtoBytes(source, base2) {
    switch (source[0]) {
      // CIDv0 is parsed differently
      case "Q": {
        const decoder = base2 ?? base58btc;
        return [
          base58btc.prefix,
          decoder.decode(`${base58btc.prefix}${source}`)
        ];
      }
      case base58btc.prefix: {
        const decoder = base2 ?? base58btc;
        return [base58btc.prefix, decoder.decode(source)];
      }
      case base32.prefix: {
        const decoder = base2 ?? base32;
        return [base32.prefix, decoder.decode(source)];
      }
      default: {
        if (base2 == null) {
          throw Error("To parse non base32 or base58btc encoded CID multibase decoder must be provided");
        }
        return [source[0], base2.decode(source)];
      }
    }
  }
  function toStringV0(bytes, cache2, base2) {
    const { prefix } = base2;
    if (prefix !== base58btc.prefix) {
      throw Error(`Cannot string encode V0 in ${base2.name} encoding`);
    }
    const cid = cache2.get(prefix);
    if (cid == null) {
      const cid2 = base2.encode(bytes).slice(1);
      cache2.set(prefix, cid2);
      return cid2;
    } else {
      return cid;
    }
  }
  function toStringV1(bytes, cache2, base2) {
    const { prefix } = base2;
    const cid = cache2.get(prefix);
    if (cid == null) {
      const cid2 = base2.encode(bytes);
      cache2.set(prefix, cid2);
      return cid2;
    } else {
      return cid;
    }
  }
  var DAG_PB_CODE = 112;
  var SHA_256_CODE = 18;
  function encodeCID(version, code, multihash) {
    const codeOffset = encodingLength(version);
    const hashOffset = codeOffset + encodingLength(code);
    const bytes = new Uint8Array(hashOffset + multihash.byteLength);
    encodeTo(version, bytes, 0);
    encodeTo(code, bytes, codeOffset);
    bytes.set(multihash, hashOffset);
    return bytes;
  }
  var cidSymbol = Symbol.for("@ipld/js-cid/CID");

  // shared/functions.js
  var multicodes = { JSON: 512, RAW: 0 };
  if (typeof globalThis === "object" && !has(globalThis, "Buffer")) {
    const { Buffer: Buffer2 } = require_buffer();
    globalThis.Buffer = Buffer2;
  }
  function createCID(data, multicode = multicodes.RAW) {
    const uint8array = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const digest = blake2b256.digest(uint8array);
    return CID.create(1, multicode, digest).toString(base58btc.encoder);
  }
  function blake32Hash(data) {
    const uint8array = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const digest = blake2b256.digest(uint8array);
    return base58btc.encode(digest.bytes);
  }
  var b64ToBuf = (b64) => Buffer.from(b64, "base64");
  var strToBuf = (str) => Buffer.from(str, "utf8");
  var bytesToB64 = (ary) => Buffer.from(ary).toString("base64");

  // shared/domains/chelonia/crypto.js
  var import_tweetnacl = __toESM(require_nacl_fast());
  var import_scrypt_async = __toESM(require_scrypt_async());
  var EDWARDS25519SHA512BATCH = "edwards25519sha512batch";
  var CURVE25519XSALSA20POLY1305 = "curve25519xsalsa20poly1305";
  var XSALSA20POLY1305 = "xsalsa20poly1305";
  if (false) {
    throw new Error("ENABLE_UNSAFE_NULL_CRYPTO cannot be enabled in production mode");
  }
  var bytesOrObjectToB64 = (ary) => {
    if (!(ary instanceof Uint8Array)) {
      throw Error("Unsupported type");
    }
    return bytesToB64(ary);
  };
  var serializeKey = (key, saveSecretKey) => {
    if (false) {
      return JSON.stringify([
        key.type,
        saveSecretKey ? null : key.publicKey,
        saveSecretKey ? key.secretKey : null
      ], void 0, 0);
    }
    if (key.type === EDWARDS25519SHA512BATCH || key.type === CURVE25519XSALSA20POLY1305) {
      if (!saveSecretKey) {
        if (!key.publicKey) {
          throw new Error("Unsupported operation: no public key to export");
        }
        return JSON.stringify([
          key.type,
          bytesOrObjectToB64(key.publicKey),
          null
        ], void 0, 0);
      }
      if (!key.secretKey) {
        throw new Error("Unsupported operation: no secret key to export");
      }
      return JSON.stringify([
        key.type,
        null,
        bytesOrObjectToB64(key.secretKey)
      ], void 0, 0);
    } else if (key.type === XSALSA20POLY1305) {
      if (!saveSecretKey) {
        throw new Error("Unsupported operation: no public key to export");
      }
      if (!key.secretKey) {
        throw new Error("Unsupported operation: no secret key to export");
      }
      return JSON.stringify([
        key.type,
        null,
        bytesOrObjectToB64(key.secretKey)
      ], void 0, 0);
    }
    throw new Error("Unsupported key type");
  };
  var deserializeKey = (data) => {
    const keyData = JSON.parse(data);
    if (!keyData || keyData.length !== 3) {
      throw new Error("Invalid key object");
    }
    if (false) {
      const res = {
        type: keyData[0]
      };
      if (keyData[2]) {
        Object.defineProperty(res, "secretKey", { value: keyData[2] });
        res.publicKey = keyData[2];
      } else {
        res.publicKey = keyData[1];
      }
      return res;
    }
    if (keyData[0] === EDWARDS25519SHA512BATCH) {
      if (keyData[2]) {
        const key = import_tweetnacl.default.sign.keyPair.fromSecretKey(b64ToBuf(keyData[2]));
        const res = {
          type: keyData[0],
          publicKey: key.publicKey
        };
        Object.defineProperty(res, "secretKey", { value: key.secretKey });
        return res;
      } else if (keyData[1]) {
        return {
          type: keyData[0],
          publicKey: new Uint8Array(b64ToBuf(keyData[1]))
        };
      }
      throw new Error("Missing secret or public key");
    } else if (keyData[0] === CURVE25519XSALSA20POLY1305) {
      if (keyData[2]) {
        const key = import_tweetnacl.default.box.keyPair.fromSecretKey(b64ToBuf(keyData[2]));
        const res = {
          type: keyData[0],
          publicKey: key.publicKey
        };
        Object.defineProperty(res, "secretKey", { value: key.secretKey });
        return res;
      } else if (keyData[1]) {
        return {
          type: keyData[0],
          publicKey: new Uint8Array(b64ToBuf(keyData[1]))
        };
      }
      throw new Error("Missing secret or public key");
    } else if (keyData[0] === XSALSA20POLY1305) {
      if (!keyData[2]) {
        throw new Error("Secret key missing");
      }
      const res = {
        type: keyData[0]
      };
      Object.defineProperty(res, "secretKey", { value: new Uint8Array(b64ToBuf(keyData[2])) });
      return res;
    }
    throw new Error("Unsupported key type");
  };
  var keyId = (inKey) => {
    const key = Object(inKey) instanceof String ? deserializeKey(inKey) : inKey;
    const serializedKey = serializeKey(key, !key.publicKey);
    return blake32Hash(serializedKey);
  };
  var verifySignature = (inKey, data, signature) => {
    const key = Object(inKey) instanceof String ? deserializeKey(inKey) : inKey;
    if (false) {
      if (!key.publicKey) {
        throw new Error("Public key missing");
      }
      if (key.publicKey + ";" + blake32Hash(data) !== signature) {
        throw new Error("Invalid signature");
      }
      return;
    }
    if (key.type !== EDWARDS25519SHA512BATCH) {
      throw new Error("Unsupported algorithm");
    }
    if (!key.publicKey) {
      throw new Error("Public key missing");
    }
    const decodedSignature = b64ToBuf(signature);
    const messageUint8 = strToBuf(data);
    const result = import_tweetnacl.default.sign.detached.verify(messageUint8, decodedSignature, key.publicKey);
    if (!result) {
      throw new Error("Invalid signature");
    }
  };
  var decrypt = (inKey, data, ad) => {
    const key = Object(inKey) instanceof String ? deserializeKey(inKey) : inKey;
    if (false) {
      if (!key.secretKey) {
        throw new Error("Secret key missing");
      }
      if (!data.startsWith(key.secretKey + ";") || !data.endsWith(";" + (ad ?? ""))) {
        throw new Error("Additional data mismatch");
      }
      return data.slice(String(key.secretKey).length + 1, data.length - 1 - (ad ?? "").length);
    }
    if (key.type === XSALSA20POLY1305) {
      if (!key.secretKey) {
        throw new Error("Secret key missing");
      }
      const messageWithNonceAsUint8Array = b64ToBuf(data);
      const nonce = messageWithNonceAsUint8Array.slice(0, import_tweetnacl.default.secretbox.nonceLength);
      const message = messageWithNonceAsUint8Array.slice(
        import_tweetnacl.default.secretbox.nonceLength,
        messageWithNonceAsUint8Array.length
      );
      if (ad) {
        const adHash = import_tweetnacl.default.hash(strToBuf(ad));
        const len = Math.min(adHash.length, nonce.length);
        for (let i = 0; i < len; i++) {
          nonce[i] ^= adHash[i];
        }
      }
      const decrypted = import_tweetnacl.default.secretbox.open(message, nonce, key.secretKey);
      if (!decrypted) {
        throw new Error("Could not decrypt message");
      }
      return Buffer.from(decrypted).toString("utf-8");
    } else if (key.type === CURVE25519XSALSA20POLY1305) {
      if (!key.secretKey) {
        throw new Error("Secret key missing");
      }
      const messageWithNonceAsUint8Array = b64ToBuf(data);
      const ephemeralPublicKey = messageWithNonceAsUint8Array.slice(0, import_tweetnacl.default.box.publicKeyLength);
      const nonce = messageWithNonceAsUint8Array.slice(import_tweetnacl.default.box.publicKeyLength, import_tweetnacl.default.box.publicKeyLength + import_tweetnacl.default.box.nonceLength);
      const message = messageWithNonceAsUint8Array.slice(
        import_tweetnacl.default.box.publicKeyLength + import_tweetnacl.default.box.nonceLength
      );
      if (ad) {
        const adHash = import_tweetnacl.default.hash(strToBuf(ad));
        const len = Math.min(adHash.length, nonce.length);
        for (let i = 0; i < len; i++) {
          nonce[i] ^= adHash[i];
        }
      }
      const decrypted = import_tweetnacl.default.box.open(message, nonce, ephemeralPublicKey, key.secretKey);
      if (!decrypted) {
        throw new Error("Could not decrypt message");
      }
      return Buffer.from(decrypted).toString("utf-8");
    }
    throw new Error("Unsupported algorithm");
  };

  // shared/domains/chelonia/encryptedData.js
  var import_sbp3 = __toESM(__require("@sbp/sbp"));

  // shared/domains/chelonia/signedData.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));
  var rootStateFn = () => (0, import_sbp2.default)("chelonia/rootState");
  var proto = Object.create(null, {
    _isSignedData: {
      value: true
    }
  });
  var wrapper = (o) => {
    return Object.setPrototypeOf(o, proto);
  };
  var isSignedData = (o) => {
    return !!o && !!Object.getPrototypeOf(o)?._isSignedData;
  };
  var verifySignatureData = function(height, data, additionalData) {
    if (!this) {
      throw new ChelErrorSignatureError("Missing contract state");
    }
    if (!isRawSignedData(data)) {
      throw new ChelErrorSignatureError("Invalid message format");
    }
    if (!Number.isSafeInteger(height) || height < 0) {
      throw new ChelErrorSignatureError(`Height ${height} is invalid or out of range`);
    }
    const [serializedMessage, sKeyId, signature] = data._signedData;
    const designatedKey = this._vm?.authorizedKeys?.[sKeyId];
    if (!designatedKey || height > designatedKey._notAfterHeight || height < designatedKey._notBeforeHeight || !designatedKey.purpose.includes(
      "sig"
    )) {
      if ("") {
        console.error(`Key ${sKeyId} is unauthorized or expired for the current contract`, { designatedKey, height, state: JSON.parse(JSON.stringify((0, import_sbp2.default)("state/vuex/state"))) });
        Promise.reject(new ChelErrorSignatureKeyUnauthorized(
          `Key ${sKeyId} is unauthorized or expired for the current contract`
        ));
      }
      throw new ChelErrorSignatureKeyUnauthorized(
        `Key ${sKeyId} is unauthorized or expired for the current contract`
      );
    }
    const deserializedKey = designatedKey.data;
    const payloadToSign = blake32Hash(`${blake32Hash(additionalData)}${blake32Hash(serializedMessage)}`);
    try {
      verifySignature(deserializedKey, payloadToSign, signature);
      const message = JSON.parse(serializedMessage);
      return [sKeyId, message];
    } catch (e) {
      throw new ChelErrorSignatureError(e?.message || e);
    }
  };
  var signedIncomingData = (contractID, state, data, height, additionalData, mapperFn) => {
    const stringValueFn = () => data;
    let verifySignedValue;
    const verifySignedValueFn = () => {
      if (verifySignedValue) {
        return verifySignedValue[1];
      }
      verifySignedValue = verifySignatureData.call(state || rootStateFn()[contractID], height, data, additionalData);
      if (mapperFn) verifySignedValue[1] = mapperFn(verifySignedValue[1]);
      return verifySignedValue[1];
    };
    return wrapper({
      get signingKeyId() {
        if (verifySignedValue) return verifySignedValue[0];
        return signedDataKeyId(data);
      },
      get serialize() {
        return stringValueFn;
      },
      get context() {
        return [contractID, data, height, additionalData];
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return verifySignedValueFn;
      },
      get toJSON() {
        return this.serialize;
      },
      get get() {
        return (k) => k !== "_signedData" ? data[k] : void 0;
      }
    });
  };
  var signedDataKeyId = (data) => {
    if (!isRawSignedData(data)) {
      throw new ChelErrorSignatureError("Invalid message format");
    }
    return data._signedData[1];
  };
  var isRawSignedData = (data) => {
    if (!data || typeof data !== "object" || !has(data, "_signedData") || !Array.isArray(data._signedData) || data._signedData.length !== 3 || data._signedData.map((v) => typeof v).filter((v) => v !== "string").length !== 0) {
      return false;
    }
    return true;
  };
  var rawSignedIncomingData = (data) => {
    if (!isRawSignedData(data)) {
      throw new ChelErrorSignatureError("Invalid message format");
    }
    const stringValueFn = () => data;
    let verifySignedValue;
    const verifySignedValueFn = () => {
      if (verifySignedValue) {
        return verifySignedValue[1];
      }
      verifySignedValue = [data._signedData[1], JSON.parse(data._signedData[0])];
      return verifySignedValue[1];
    };
    return wrapper({
      get signingKeyId() {
        if (verifySignedValue) return verifySignedValue[0];
        return signedDataKeyId(data);
      },
      get serialize() {
        return stringValueFn;
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return verifySignedValueFn;
      },
      get toJSON() {
        return this.serialize;
      },
      get get() {
        return (k) => k !== "_signedData" ? data[k] : void 0;
      }
    });
  };

  // shared/domains/chelonia/encryptedData.js
  var rootStateFn2 = () => (0, import_sbp3.default)("chelonia/rootState");
  var proto2 = Object.create(null, {
    _isEncryptedData: {
      value: true
    }
  });
  var wrapper2 = (o) => {
    return Object.setPrototypeOf(o, proto2);
  };
  var isEncryptedData = (o) => {
    return !!o && !!Object.getPrototypeOf(o)?._isEncryptedData;
  };
  var decryptData = function(height, data, additionalKeys, additionalData, validatorFn) {
    if (!this) {
      throw new ChelErrorDecryptionError("Missing contract state");
    }
    if (typeof data.valueOf === "function") data = data.valueOf();
    if (!isRawEncryptedData(data)) {
      throw new ChelErrorDecryptionError("Invalid message format");
    }
    const [eKeyId, message] = data;
    const key = additionalKeys[eKeyId];
    if (!key) {
      throw new ChelErrorDecryptionKeyNotFound(`Key ${eKeyId} not found`, { cause: eKeyId });
    }
    const designatedKey = this._vm?.authorizedKeys?.[eKeyId];
    if (!designatedKey || height > designatedKey._notAfterHeight || height < designatedKey._notBeforeHeight || !designatedKey.purpose.includes(
      "enc"
    )) {
      throw new ChelErrorUnexpected(
        `Key ${eKeyId} is unauthorized or expired for the current contract`
      );
    }
    const deserializedKey = typeof key === "string" ? deserializeKey(key) : key;
    try {
      const result = JSON.parse(decrypt(deserializedKey, message, additionalData));
      if (typeof validatorFn === "function") validatorFn(result, eKeyId);
      return result;
    } catch (e) {
      throw new ChelErrorDecryptionError(e?.message || e);
    }
  };
  var encryptedIncomingData = (contractID, state, data, height, additionalKeys, additionalData, validatorFn) => {
    let decryptedValue;
    const decryptedValueFn = () => {
      if (decryptedValue) {
        return decryptedValue;
      }
      if (!state || !additionalKeys) {
        const rootState = rootStateFn2();
        state = state || rootState[contractID];
        additionalKeys = additionalKeys ?? rootState.secretKeys;
      }
      decryptedValue = decryptData.call(state, height, data, additionalKeys, additionalData || "", validatorFn);
      if (isRawSignedData(decryptedValue)) {
        decryptedValue = signedIncomingData(contractID, state, decryptedValue, height, additionalData || "");
      }
      return decryptedValue;
    };
    return wrapper2({
      get encryptionKeyId() {
        return encryptedDataKeyId(data);
      },
      get serialize() {
        return () => data;
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return decryptedValueFn;
      },
      get toJSON() {
        return this.serialize;
      }
    });
  };
  var encryptedIncomingForeignData = (contractID, _0, data, _1, additionalKeys, additionalData, validatorFn) => {
    let decryptedValue;
    const decryptedValueFn = () => {
      if (decryptedValue) {
        return decryptedValue;
      }
      const rootState = rootStateFn2();
      const state = rootState[contractID];
      decryptedValue = decryptData.call(state, NaN, data, additionalKeys ?? rootState.secretKeys, additionalData || "", validatorFn);
      if (isRawSignedData(decryptedValue)) {
        return signedIncomingData(contractID, state, decryptedValue, NaN, additionalData || "");
      }
      return decryptedValue;
    };
    return wrapper2({
      get encryptionKeyId() {
        return encryptedDataKeyId(data);
      },
      get serialize() {
        return () => data;
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return decryptedValueFn;
      },
      get toJSON() {
        return this.serialize;
      }
    });
  };
  var encryptedDataKeyId = (data) => {
    if (!isRawEncryptedData(data)) {
      throw new ChelErrorDecryptionError("Invalid message format");
    }
    return data[0];
  };
  var isRawEncryptedData = (data) => {
    if (!Array.isArray(data) || data.length !== 2 || data.map((v) => typeof v).filter((v) => v !== "string").length !== 0) {
      return false;
    }
    return true;
  };
  var unwrapMaybeEncryptedData = (data) => {
    if (isEncryptedData(data)) {
      if (false) return;
      try {
        return {
          encryptionKeyId: data.encryptionKeyId,
          data: data.valueOf()
        };
      } catch (e) {
        console.warn("unwrapMaybeEncryptedData: Unable to decrypt", e);
      }
    } else {
      return {
        encryptionKeyId: null,
        data
      };
    }
  };
  var maybeEncryptedIncomingData = (contractID, state, data, height, additionalKeys, additionalData, validatorFn) => {
    if (isRawEncryptedData(data)) {
      return encryptedIncomingData(contractID, state, data, height, additionalKeys, additionalData, validatorFn);
    } else {
      validatorFn?.(data, "");
      return data;
    }
  };

  // shared/serdes/index.js
  var raw = Symbol("raw");
  var serdesTagSymbol = Symbol("tag");
  var serdesSerializeSymbol = Symbol("serialize");
  var serdesDeserializeSymbol = Symbol("deserialize");
  var rawResult = (obj) => {
    Object.defineProperty(obj, raw, { value: true });
    return obj;
  };
  var serializer = (data) => {
    const verbatim = [];
    const transferables = /* @__PURE__ */ new Set();
    const revokables = /* @__PURE__ */ new Set();
    const result = JSON.parse(JSON.stringify(data, (_key, value) => {
      if (value && value[raw]) return value;
      if (value === void 0) return rawResult(["_", "_"]);
      if (!value) return value;
      if (Array.isArray(value) && value[0] === "_") return rawResult(["_", "_", ...value]);
      if (value instanceof Map) {
        return rawResult(["_", "Map", Array.from(value.entries())]);
      }
      if (value instanceof Set) {
        return rawResult(["_", "Set", Array.from(value.entries())]);
      }
      if (value instanceof Blob || value instanceof File) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        return rawResult(["_", "_ref", pos]);
      }
      if (value instanceof Error) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        if (value.cause) {
          value.cause = serializer(value.cause).data;
        }
        return rawResult(["_", "_err", rawResult(["_", "_ref", pos]), value.name]);
      }
      if (value instanceof MessagePort || value instanceof ReadableStream || value instanceof WritableStream || value instanceof ArrayBuffer) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        transferables.add(value);
        return rawResult(["_", "_ref", pos]);
      }
      if (ArrayBuffer.isView(value)) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        transferables.add(value.buffer);
        return rawResult(["_", "_ref", pos]);
      }
      if (typeof value === "function") {
        const mc = new MessageChannel();
        mc.port1.onmessage = async (ev) => {
          try {
            try {
              const result2 = await value(...deserializer(ev.data[1]));
              const { data: data2, transferables: transferables2 } = serializer(result2);
              ev.data[0].postMessage([true, data2], transferables2);
            } catch (e) {
              const { data: data2, transferables: transferables2 } = serializer(e);
              ev.data[0].postMessage([false, data2], transferables2);
            }
          } catch (e) {
            console.error("Async error on onmessage handler", e);
          }
        };
        transferables.add(mc.port2);
        revokables.add(mc.port1);
        return rawResult(["_", "_fn", mc.port2]);
      }
      const proto3 = Object.getPrototypeOf(value);
      if (proto3?.constructor?.[serdesTagSymbol] && proto3.constructor[serdesSerializeSymbol]) {
        return rawResult(["_", "_custom", proto3.constructor[serdesTagSymbol], proto3.constructor[serdesSerializeSymbol](value)]);
      }
      return value;
    }), (_key, value) => {
      if (Array.isArray(value) && value[0] === "_" && value[1] === "_ref") {
        return verbatim[value[2]];
      }
      return value;
    });
    return {
      data: result,
      transferables: Array.from(transferables),
      revokables: Array.from(revokables)
    };
  };
  var deserializerTable = /* @__PURE__ */ Object.create(null);
  var deserializer = (data) => {
    const verbatim = [];
    return JSON.parse(JSON.stringify(data, (_key, value) => {
      if (value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        return rawResult(["_", "_ref", pos]);
      }
      return value;
    }), (_key, value) => {
      if (Array.isArray(value) && value[0] === "_") {
        switch (value[1]) {
          case "_":
            if (value.length >= 3) {
              return value.slice(2);
            } else {
              return void 0;
            }
          // Map input (reconstruct Map)
          case "Map":
            return new Map(value[2]);
          // Set input (reconstruct Set)
          case "Set":
            return new Set(value[2]);
          // Custom object type (reconstruct if possible, otherwise throw an error)
          case "_custom":
            if (deserializerTable[value[2]]) {
              return deserializerTable[value[2]](value[3]);
            } else {
              throw new Error("Invalid or unknown tag: " + value[2]);
            }
          // These are literal values, return them
          case "_ref":
            return verbatim[value[2]];
          case "_err": {
            if (value[2].name !== value[3]) {
              value[2].name = value[3];
            }
            if (value[2].cause) {
              value[2].cause = deserializer(value[2].cause);
            }
            return value[2];
          }
          // These were functions converted to a MessagePort. Convert them on this
          // end back into functions using that port.
          case "_fn": {
            const mp = value[2];
            return (...args) => {
              return new Promise((resolve, reject) => {
                const mc = new MessageChannel();
                const { data: data2, transferables } = serializer(args);
                mc.port1.onmessage = (ev) => {
                  if (ev.data[0]) {
                    resolve(deserializer(ev.data[1]));
                  } else {
                    reject(deserializer(ev.data[1]));
                  }
                };
                mp.postMessage([mc.port2, data2], [mc.port2, ...transferables]);
              });
            };
          }
        }
      }
      return value;
    });
  };
  deserializer.register = (y) => {
    if (typeof y === "function" && typeof y[serdesTagSymbol] === "string" && typeof y[serdesDeserializeSymbol] === "function") {
      deserializerTable[y[serdesTagSymbol]] = y[serdesDeserializeSymbol].bind(y);
    }
  };

  // shared/domains/chelonia/GIMessage.js
  var decryptedAndVerifiedDeserializedMessage = (head, headJSON, contractID, parsedMessage, additionalKeys, state) => {
    const op = head.op;
    const height = head.height;
    const message = op === GIMessage.OP_ACTION_ENCRYPTED ? encryptedIncomingData(contractID, state, parsedMessage, height, additionalKeys, headJSON, void 0) : parsedMessage;
    if ([GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_UPDATE].includes(op)) {
      return message.map((key) => {
        return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, (key2, eKeyId) => {
          if (key2.meta?.private?.content) {
            key2.meta.private.content = encryptedIncomingData(contractID, state, key2.meta.private.content, height, additionalKeys, headJSON, (value) => {
              const computedKeyId = keyId(value);
              if (computedKeyId !== key2.id) {
                throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key2.id} but got ${computedKeyId}`);
              }
            });
          }
          if (key2.meta?.keyRequest?.reference) {
            try {
              key2.meta.keyRequest.reference = maybeEncryptedIncomingData(contractID, state, key2.meta.keyRequest.reference, height, additionalKeys, headJSON)?.valueOf();
            } catch {
              delete key2.meta.keyRequest.reference;
            }
          }
          if (key2.meta?.keyRequest?.contractID) {
            try {
              key2.meta.keyRequest.contractID = maybeEncryptedIncomingData(contractID, state, key2.meta.keyRequest.contractID, height, additionalKeys, headJSON)?.valueOf();
            } catch {
              delete key2.meta.keyRequest.contractID;
            }
          }
        });
      });
    }
    if (op === GIMessage.OP_CONTRACT) {
      message.keys = message.keys?.map((key, eKeyId) => {
        return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, (key2) => {
          if (!key2.meta?.private?.content) return;
          const decryptionFn = message.foreignContractID ? encryptedIncomingForeignData : encryptedIncomingData;
          const decryptionContract = message.foreignContractID ? message.foreignContractID : contractID;
          key2.meta.private.content = decryptionFn(decryptionContract, state, key2.meta.private.content, height, additionalKeys, headJSON, (value) => {
            const computedKeyId = keyId(value);
            if (computedKeyId !== key2.id) {
              throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key2.id} but got ${computedKeyId}`);
            }
          });
        });
      });
    }
    if (op === GIMessage.OP_KEY_SHARE) {
      return maybeEncryptedIncomingData(contractID, state, message, height, additionalKeys, headJSON, (message2) => {
        message2.keys?.forEach((key) => {
          if (!key.meta?.private?.content) return;
          const decryptionFn = message2.foreignContractID ? encryptedIncomingForeignData : encryptedIncomingData;
          const decryptionContract = message2.foreignContractID || contractID;
          key.meta.private.content = decryptionFn(decryptionContract, state, key.meta.private.content, height, additionalKeys, headJSON, (value) => {
            const computedKeyId = keyId(value);
            if (computedKeyId !== key.id) {
              throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`);
            }
          });
        });
      });
    }
    if (op === GIMessage.OP_KEY_REQUEST) {
      return maybeEncryptedIncomingData(contractID, state, message, height, additionalKeys, headJSON, (msg) => {
        msg.replyWith = signedIncomingData(msg.contractID, void 0, msg.replyWith, msg.height, headJSON);
      });
    }
    if (op === GIMessage.OP_ACTION_UNENCRYPTED && isRawSignedData(message)) {
      return signedIncomingData(contractID, state, message, height, headJSON);
    }
    if (op === GIMessage.OP_ACTION_ENCRYPTED) {
      return message;
    }
    if (op === GIMessage.OP_KEY_DEL) {
      return message.map((key) => {
        return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, void 0);
      });
    }
    if (op === GIMessage.OP_KEY_REQUEST_SEEN) {
      return maybeEncryptedIncomingData(contractID, state, parsedMessage, height, additionalKeys, headJSON, void 0);
    }
    if (op === GIMessage.OP_ATOMIC) {
      return message.map(
        ([opT, opV]) => [
          opT,
          decryptedAndVerifiedDeserializedMessage({ ...head, op: opT }, headJSON, contractID, opV, additionalKeys, state)
        ]
      );
    }
    return message;
  };
  var GIMessage = class _GIMessage {
    // flow type annotations to make flow happy
    _mapping;
    _head;
    _message;
    _signedMessageData;
    _direction;
    _decryptedValue;
    _innerSigningKeyId;
    static OP_CONTRACT = "c";
    static OP_ACTION_ENCRYPTED = "ae";
    // e2e-encrypted action
    static OP_ACTION_UNENCRYPTED = "au";
    // publicly readable action
    static OP_KEY_ADD = "ka";
    // add this key to the list of keys allowed to write to this contract, or update an existing key
    static OP_KEY_DEL = "kd";
    // remove this key from authorized keys
    static OP_KEY_UPDATE = "ku";
    // update key in authorized keys
    static OP_PROTOCOL_UPGRADE = "pu";
    static OP_PROP_SET = "ps";
    // set a public key/value pair
    static OP_PROP_DEL = "pd";
    // delete a public key/value pair
    static OP_CONTRACT_AUTH = "ca";
    // authorize a contract
    static OP_CONTRACT_DEAUTH = "cd";
    // deauthorize a contract
    static OP_ATOMIC = "a";
    // atomic op
    static OP_KEY_SHARE = "ks";
    // key share
    static OP_KEY_REQUEST = "kr";
    // key request
    static OP_KEY_REQUEST_SEEN = "krs";
    // key request response
    // eslint-disable-next-line camelcase
    static createV1_0({
      contractID,
      previousHEAD = null,
      // Height will be automatically set to the correct value when sending
      // The reason to set it to Number.MAX_SAFE_INTEGER is so that we can
      // temporarily process outgoing messages with signature validation
      // still working
      height = Number.MAX_SAFE_INTEGER,
      op,
      manifest
    }) {
      const head = {
        version: "1.0.0",
        previousHEAD,
        height,
        contractID,
        op: op[0],
        manifest
      };
      return new this(messageToParams(head, op[1]));
    }
    // GIMessage.cloneWith could be used when make a GIMessage object having the same id()
    // https://github.com/okTurtles/group-income/issues/1503
    static cloneWith(targetHead, targetOp, sources) {
      const head = Object.assign({}, targetHead, sources);
      return new this(messageToParams(head, targetOp[1]));
    }
    static deserialize(value, additionalKeys, state) {
      if (!value) throw new Error(`deserialize bad value: ${value}`);
      const { head: headJSON, ...parsedValue } = JSON.parse(value);
      const head = JSON.parse(headJSON);
      const contractID = head.op === _GIMessage.OP_CONTRACT ? createCID(value) : head.contractID;
      if (!state?._vm?.authorizedKeys && head.op === _GIMessage.OP_CONTRACT) {
        const value2 = rawSignedIncomingData(parsedValue);
        const authorizedKeys = Object.fromEntries(value2.valueOf()?.keys.map((k) => [k.id, k]));
        state = {
          _vm: {
            authorizedKeys
          }
        };
      }
      const signedMessageData = signedIncomingData(
        contractID,
        state,
        parsedValue,
        head.height,
        headJSON,
        (message) => decryptedAndVerifiedDeserializedMessage(head, headJSON, contractID, message, additionalKeys, state)
      );
      return new this({
        direction: "incoming",
        mapping: { key: createCID(value), value },
        head,
        signedMessageData
      });
    }
    static deserializeHEAD(value) {
      if (!value) throw new Error(`deserialize bad value: ${value}`);
      let head, hash;
      const result = {
        get head() {
          if (head === void 0) {
            head = JSON.parse(JSON.parse(value).head);
          }
          return head;
        },
        get hash() {
          if (!hash) {
            hash = createCID(value);
          }
          return hash;
        },
        get contractID() {
          return result.head?.contractID ?? result.hash;
        },
        description() {
          const type = this.head.op;
          return `<op_${type}|${this.hash} of ${this.contractID}>`;
        },
        get isFirstMessage() {
          return !result.head?.contractID;
        }
      };
      return result;
    }
    constructor(params) {
      this._direction = params.direction;
      this._mapping = params.mapping;
      this._head = params.head;
      this._signedMessageData = params.signedMessageData;
      const type = this.opType();
      let atomicTopLevel = true;
      const validate = (type2, message) => {
        switch (type2) {
          case _GIMessage.OP_CONTRACT:
            if (!this.isFirstMessage() || !atomicTopLevel) throw new Error("OP_CONTRACT: must be first message");
            break;
          case _GIMessage.OP_ATOMIC:
            if (!atomicTopLevel) {
              throw new Error("OP_ATOMIC not allowed inside of OP_ATOMIC");
            }
            if (!Array.isArray(message)) {
              throw new TypeError("OP_ATOMIC must be of an array type");
            }
            atomicTopLevel = false;
            message.forEach(([t, m]) => validate(t, m));
            break;
          case _GIMessage.OP_KEY_ADD:
          case _GIMessage.OP_KEY_DEL:
          case _GIMessage.OP_KEY_UPDATE:
            if (!Array.isArray(message)) throw new TypeError("OP_KEY_{ADD|DEL|UPDATE} must be of an array type");
            break;
          case _GIMessage.OP_KEY_SHARE:
          case _GIMessage.OP_KEY_REQUEST:
          case _GIMessage.OP_KEY_REQUEST_SEEN:
          case _GIMessage.OP_ACTION_ENCRYPTED:
          case _GIMessage.OP_ACTION_UNENCRYPTED:
            break;
          default:
            throw new Error(`unsupported op: ${type2}`);
        }
      };
      Object.defineProperty(this, "_message", {
        get: /* @__PURE__ */ ((validated) => () => {
          const message = this._signedMessageData.valueOf();
          if (!validated) {
            validate(type, message);
            validated = true;
          }
          return message;
        })()
      });
    }
    decryptedValue() {
      if (this._decryptedValue) return this._decryptedValue;
      try {
        const value = this.message();
        const data = unwrapMaybeEncryptedData(value);
        if (data?.data) {
          if (isSignedData(data.data)) {
            this._innerSigningKeyId = data.data.signingKeyId;
            this._decryptedValue = data.data.valueOf();
          } else {
            this._decryptedValue = data.data;
          }
        }
        return this._decryptedValue;
      } catch {
        return void 0;
      }
    }
    innerSigningKeyId() {
      if (!this._decryptedValue) {
        this.decryptedValue();
      }
      return this._innerSigningKeyId;
    }
    head() {
      return this._head;
    }
    message() {
      return this._message;
    }
    op() {
      return [this.head().op, this.message()];
    }
    rawOp() {
      return [this.head().op, this._signedMessageData];
    }
    opType() {
      return this.head().op;
    }
    opValue() {
      return this.message();
    }
    signingKeyId() {
      return this._signedMessageData.signingKeyId;
    }
    manifest() {
      return this.head().manifest;
    }
    description() {
      const type = this.opType();
      let desc = `<op_${type}`;
      if (type === _GIMessage.OP_ACTION_UNENCRYPTED) {
        const value = this.opValue();
        if (typeof value.type === "string") {
          desc += `|${value.type}`;
        }
      }
      return `${desc}|${this.hash()} of ${this.contractID()}>`;
    }
    isFirstMessage() {
      return !this.head().contractID;
    }
    contractID() {
      return this.head().contractID || this.hash();
    }
    serialize() {
      return this._mapping.value;
    }
    hash() {
      return this._mapping.key;
    }
    height() {
      return this._head.height;
    }
    id() {
      throw new Error("GIMessage.id() was called but it has been removed");
    }
    direction() {
      return this._direction;
    }
    // $FlowFixMe[unsupported-syntax]
    static get [serdesTagSymbol]() {
      return "GIMessage";
    }
    // $FlowFixMe[unsupported-syntax]
    static [serdesSerializeSymbol](m) {
      return [m.serialize(), m.direction(), m.decryptedValue(), m.innerSigningKeyId()];
    }
    // $FlowFixMe[unsupported-syntax]
    static [serdesDeserializeSymbol]([serialized, direction, decryptedValue, innerSigningKeyId]) {
      const m = _GIMessage.deserialize(serialized);
      m._direction = direction;
      m._decryptedValue = decryptedValue;
      m._innerSigningKeyId = innerSigningKeyId;
      return m;
    }
  };
  function messageToParams(head, message) {
    let mapping;
    return {
      direction: has(message, "recreate") ? "outgoing" : "incoming",
      // Lazy computation of mapping to prevent us from serializing outgoing
      // atomic operations
      get mapping() {
        if (!mapping) {
          const headJSON = JSON.stringify(head);
          const messageJSON = { ...message.serialize(headJSON), head: headJSON };
          const value = JSON.stringify(messageJSON);
          mapping = {
            key: createCID(value),
            value
          };
        }
        return mapping;
      },
      head,
      signedMessageData: message
    };
  }

  // shared/domains/chelonia/Secret.js
  var wm = /* @__PURE__ */ new WeakMap();
  var Secret = class {
    // $FlowFixMe[unsupported-syntax]
    static [serdesDeserializeSymbol](secret) {
      return new this(secret);
    }
    // $FlowFixMe[unsupported-syntax]
    static [serdesSerializeSymbol](secret) {
      return wm.get(secret);
    }
    // $FlowFixMe[unsupported-syntax]
    static get [serdesTagSymbol]() {
      return "__chelonia_Secret";
    }
    constructor(value) {
      wm.set(this, value);
    }
    valueOf() {
      return wm.get(this);
    }
  };

  // shared/domains/chelonia/constants.js
  var INVITE_STATUS = {
    REVOKED: "revoked",
    VALID: "valid",
    USED: "used"
  };

  // shared/domains/chelonia/utils.js
  var MAX_EVENTS_AFTER = Number.parseInt("", 10) || Infinity;
  var findKeyIdByName = (state, name) => state._vm?.authorizedKeys && Object.values(state._vm.authorizedKeys).find((k) => k.name === name && k._notAfterHeight == null)?.id;
  var findForeignKeysByContractID = (state, contractID) => state._vm?.authorizedKeys && Object.values(state._vm.authorizedKeys).filter((k) => k._notAfterHeight == null && k.foreignKey?.includes(contractID)).map((k) => k.id);

  // frontend/model/contracts/shared/constants.js
  var MAX_HASH_LEN = 300;
  var MAX_MEMO_LEN = 4096;
  var INVITE_INITIAL_CREATOR = "invite-initial-creator";
  var PROFILE_STATUS = {
    ACTIVE: "active",
    // confirmed group join
    PENDING: "pending",
    // shortly after being approved to join the group
    REMOVED: "removed"
  };
  var GROUP_NAME_MAX_CHAR = 50;
  var GROUP_DESCRIPTION_MAX_CHAR = 500;
  var GROUP_PAYMENT_METHOD_MAX_CHAR = 1024;
  var GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR = 150;
  var GROUP_CURRENCY_MAX_CHAR = 10;
  var GROUP_MAX_PLEDGE_AMOUNT = 1e9;
  var GROUP_MINCOME_MAX = 1e9;
  var GROUP_DISTRIBUTION_PERIOD_MAX_DAYS = 365;
  var PROPOSAL_RESULT = "proposal-result";
  var PROPOSAL_INVITE_MEMBER = "invite-member";
  var PROPOSAL_REMOVE_MEMBER = "remove-member";
  var PROPOSAL_GROUP_SETTING_CHANGE = "group-setting-change";
  var PROPOSAL_PROPOSAL_SETTING_CHANGE = "proposal-setting-change";
  var PROPOSAL_GENERIC = "generic";
  var PROPOSAL_ARCHIVED = "proposal-archived";
  var MAX_ARCHIVED_PROPOSALS = 100;
  var PAYMENTS_ARCHIVED = "payments-archived";
  var MAX_ARCHIVED_PERIODS = 100;
  var MAX_SAVED_PERIODS = 2;
  var STATUS_OPEN = "open";
  var STATUS_PASSED = "passed";
  var STATUS_FAILED = "failed";
  var STATUS_EXPIRING = "expiring";
  var STATUS_EXPIRED = "expired";
  var STATUS_CANCELLED = "cancelled";
  var CHATROOM_GENERAL_NAME = "general";
  var CHATROOM_NAME_LIMITS_IN_CHARS = 50;
  var CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280;
  var CHATROOM_TYPES = {
    DIRECT_MESSAGE: "direct-message",
    GROUP: "group"
  };
  var CHATROOM_PRIVACY_LEVEL = {
    GROUP: "group",
    PRIVATE: "private",
    PUBLIC: "public"
  };
  var MESSAGE_TYPES = {
    POLL: "poll",
    TEXT: "text",
    INTERACTIVE: "interactive",
    NOTIFICATION: "notification"
  };
  var INVITE_EXPIRES_IN_DAYS = {
    ON_BOARDING: null,
    // No expiration
    PROPOSAL: 7
  };
  var MESSAGE_NOTIFICATIONS = {
    ADD_MEMBER: "add-member",
    JOIN_MEMBER: "join-member",
    LEAVE_MEMBER: "leave-member",
    KICK_MEMBER: "kick-member",
    UPDATE_DESCRIPTION: "update-description",
    UPDATE_NAME: "update-name"
  };
  var POLL_TYPES = {
    SINGLE_CHOICE: "single-vote",
    // allows only 1 choice per member
    MULTIPLE_CHOICES: "multiple-votes"
    // allows multiple choices on the poll
  };

  // frontend/model/contracts/shared/distribution/mincome-proportional.js
  function mincomeProportional(haveNeeds) {
    let totalHave = 0;
    let totalNeed = 0;
    const havers = [];
    const needers = [];
    for (const haveNeed of haveNeeds) {
      if (haveNeed.haveNeed > 0) {
        havers.push(haveNeed);
        totalHave += haveNeed.haveNeed;
      } else if (haveNeed.haveNeed < 0) {
        needers.push(haveNeed);
        totalNeed += Math.abs(haveNeed.haveNeed);
      }
    }
    const totalPercent = Math.min(1, totalNeed / totalHave);
    const payments = [];
    for (const haver of havers) {
      const distributionAmount = totalPercent * haver.haveNeed;
      for (const needer of needers) {
        const belowPercentage = Math.abs(needer.haveNeed) / totalNeed;
        payments.push({
          amount: distributionAmount * belowPercentage,
          fromMemberID: haver.memberID,
          toMemberID: needer.memberID
        });
      }
    }
    return payments;
  }

  // frontend/model/contracts/shared/distribution/payments-minimizer.js
  function minimizeTotalPaymentsCount(distribution) {
    const neederTotalReceived = {};
    const haverTotalHave = {};
    const haversSorted = [];
    const needersSorted = [];
    const minimizedDistribution = [];
    for (const todo of distribution) {
      neederTotalReceived[todo.toMemberID] = (neederTotalReceived[todo.toMemberID] || 0) + todo.amount;
      haverTotalHave[todo.fromMemberID] = (haverTotalHave[todo.fromMemberID] || 0) + todo.amount;
    }
    for (const memberID in haverTotalHave) {
      haversSorted.push({ memberID, amount: haverTotalHave[memberID] });
    }
    for (const memberID in neederTotalReceived) {
      needersSorted.push({ memberID, amount: neederTotalReceived[memberID] });
    }
    haversSorted.sort((a, b) => b.amount - a.amount);
    needersSorted.sort((a, b) => b.amount - a.amount);
    while (haversSorted.length > 0 && needersSorted.length > 0) {
      const mostHaver = haversSorted.pop();
      const mostNeeder = needersSorted.pop();
      const diff = mostHaver.amount - mostNeeder.amount;
      if (diff < 0) {
        minimizedDistribution.push({ amount: mostHaver.amount, fromMemberID: mostHaver.memberID, toMemberID: mostNeeder.memberID });
        mostNeeder.amount -= mostHaver.amount;
        needersSorted.push(mostNeeder);
      } else if (diff > 0) {
        minimizedDistribution.push({ amount: mostNeeder.amount, fromMemberID: mostHaver.memberID, toMemberID: mostNeeder.memberID });
        mostHaver.amount -= mostNeeder.amount;
        haversSorted.push(mostHaver);
      } else {
        minimizedDistribution.push({ amount: mostNeeder.amount, fromMemberID: mostHaver.memberID, toMemberID: mostNeeder.memberID });
      }
    }
    return minimizedDistribution;
  }

  // frontend/model/contracts/shared/currencies.js
  var DECIMALS_MAX = 8;
  function commaToDots(value) {
    return typeof value === "string" ? value.replace(/,/, ".") : value.toString();
  }
  function isNumeric(nr) {
    return !isNaN(nr - parseFloat(nr));
  }
  function isInDecimalsLimit(nr, decimalsMax) {
    const decimals = nr.split(".")[1];
    return !decimals || decimals.length <= decimalsMax;
  }
  function validateMincome(value, decimalsMax) {
    const nr = commaToDots(value);
    return isNumeric(nr) && isInDecimalsLimit(nr, decimalsMax);
  }
  function decimalsOrInt(num, decimalsMax) {
    return num.toFixed(decimalsMax).replace(/\.0+$/, "");
  }
  function saferFloat(value) {
    return parseFloat(value.toFixed(DECIMALS_MAX));
  }
  function makeCurrency(options) {
    const { symbol, symbolWithCode, decimalsMax, formatCurrency } = options;
    return {
      symbol,
      symbolWithCode,
      decimalsMax,
      displayWithCurrency: (n) => formatCurrency(decimalsOrInt(n, decimalsMax)),
      displayWithoutCurrency: (n) => decimalsOrInt(n, decimalsMax),
      validate: (n) => validateMincome(n, decimalsMax)
    };
  }
  var currencies = {
    USD: makeCurrency({
      symbol: "$",
      symbolWithCode: "$ USD",
      decimalsMax: 2,
      formatCurrency: (amount) => "$" + amount
    }),
    EUR: makeCurrency({
      symbol: "\u20AC",
      symbolWithCode: "\u20AC EUR",
      decimalsMax: 2,
      formatCurrency: (amount) => "\u20AC" + amount
    }),
    BTC: makeCurrency({
      symbol: "\u0243",
      symbolWithCode: "\u0243 BTC",
      decimalsMax: DECIMALS_MAX,
      formatCurrency: (amount) => amount + "\u0243"
    })
  };
  var currencies_default = currencies;

  // frontend/model/contracts/shared/distribution/distribution.js
  var tinyNum = 1 / Math.pow(10, DECIMALS_MAX);
  function unadjustedDistribution({ haveNeeds = [], minimize = true }) {
    const distribution = mincomeProportional(haveNeeds);
    return minimize ? minimizeTotalPaymentsCount(distribution) : distribution;
  }
  function adjustedDistribution({ distribution, payments, dueOn }) {
    distribution = cloneDeep(distribution);
    for (const todo of distribution) {
      todo.total = todo.amount;
    }
    distribution = subtractDistributions(distribution, payments).filter((todo) => todo.amount >= tinyNum);
    for (const todo of distribution) {
      todo.amount = saferFloat(todo.amount);
      todo.total = saferFloat(todo.total);
      todo.partial = todo.total !== todo.amount;
      todo.isLate = false;
      todo.dueOn = dueOn;
    }
    return distribution;
  }
  function reduceDistribution(payments) {
    payments = cloneDeep(payments);
    for (let i = 0; i < payments.length; i++) {
      const paymentA = payments[i];
      for (let j = i + 1; j < payments.length; j++) {
        const paymentB = payments[j];
        if (paymentA.fromMemberID === paymentB.fromMemberID && paymentA.toMemberID === paymentB.toMemberID || paymentA.toMemberID === paymentB.fromMemberID && paymentA.fromMemberID === paymentB.toMemberID) {
          paymentA.amount += (paymentA.fromMemberID === paymentB.fromMemberID ? 1 : -1) * paymentB.amount;
          paymentA.total += (paymentA.fromMemberID === paymentB.fromMemberID ? 1 : -1) * paymentB.total;
          payments.splice(j, 1);
          j--;
        }
      }
    }
    return payments;
  }
  function addDistributions(paymentsA, paymentsB) {
    return reduceDistribution([...paymentsA, ...paymentsB]);
  }
  function subtractDistributions(paymentsA, paymentsB) {
    paymentsB = cloneDeep(paymentsB);
    for (const p of paymentsB) {
      p.amount *= -1;
      p.total *= -1;
    }
    return addDistributions(paymentsA, paymentsB);
  }

  // frontend/model/contracts/shared/functions.js
  var import_sbp5 = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/time.js
  var MINS_MILLIS = 6e4;
  var HOURS_MILLIS = 60 * MINS_MILLIS;
  var DAYS_MILLIS = 24 * HOURS_MILLIS;
  var MONTHS_MILLIS = 30 * DAYS_MILLIS;
  var YEARS_MILLIS = 365 * DAYS_MILLIS;
  var plusOnePeriodLength = (timestamp, periodLength) => dateToPeriodStamp(addTimeToDate(timestamp, periodLength));
  var minusOnePeriodLength = (timestamp, periodLength) => dateToPeriodStamp(addTimeToDate(timestamp, -periodLength));
  function periodStampsForDate(date, { knownSortedStamps, periodLength, guess }) {
    if (!(isIsoString(date) || Object.prototype.toString.call(date) === "[object Date]")) {
      throw new TypeError("must be ISO string or Date object");
    }
    const timestamp = typeof date === "string" ? date : date.toISOString();
    let previous, current, next;
    if (knownSortedStamps.length) {
      const latest = knownSortedStamps[knownSortedStamps.length - 1];
      const earliest = knownSortedStamps[0];
      if (timestamp >= latest) {
        current = periodStampGivenDate({ recentDate: timestamp, periodStart: latest, periodLength });
        next = plusOnePeriodLength(current, periodLength);
        previous = current > latest ? minusOnePeriodLength(current, periodLength) : knownSortedStamps[knownSortedStamps.length - 2];
      } else if (guess && timestamp < earliest) {
        current = periodStampGivenDate({ recentDate: timestamp, periodStart: earliest, periodLength });
        next = plusOnePeriodLength(current, periodLength);
        previous = minusOnePeriodLength(current, periodLength);
      } else {
        for (let i = knownSortedStamps.length - 2; i >= 0; i--) {
          if (timestamp >= knownSortedStamps[i]) {
            current = knownSortedStamps[i];
            next = knownSortedStamps[i + 1];
            previous = i > 0 ? knownSortedStamps[i - 1] : guess ? minusOnePeriodLength(current, periodLength) : void 0;
            break;
          }
        }
      }
    }
    return { previous, current, next };
  }
  function dateToPeriodStamp(date) {
    return new Date(date).toISOString();
  }
  function dateFromPeriodStamp(daystamp) {
    return new Date(daystamp);
  }
  function periodStampGivenDate({ recentDate, periodStart, periodLength }) {
    const periodStartDate = dateFromPeriodStamp(periodStart);
    let nextPeriod = addTimeToDate(periodStartDate, periodLength);
    const curDate = new Date(recentDate);
    let curPeriod;
    if (curDate < nextPeriod) {
      if (curDate >= periodStartDate) {
        return periodStart;
      } else {
        curPeriod = periodStartDate;
        do {
          curPeriod = addTimeToDate(curPeriod, -periodLength);
        } while (curDate < curPeriod);
      }
    } else {
      do {
        curPeriod = nextPeriod;
        nextPeriod = addTimeToDate(nextPeriod, periodLength);
      } while (curDate >= nextPeriod);
    }
    return dateToPeriodStamp(curPeriod);
  }
  function dateIsWithinPeriod({ date, periodStart, periodLength }) {
    const dateObj = new Date(date);
    const start = dateFromPeriodStamp(periodStart);
    return dateObj > start && dateObj < addTimeToDate(start, periodLength);
  }
  function addTimeToDate(date, timeMillis) {
    const d = new Date(date);
    d.setTime(d.getTime() + timeMillis);
    return d;
  }
  function comparePeriodStamps(periodA, periodB) {
    return dateFromPeriodStamp(periodA).getTime() - dateFromPeriodStamp(periodB).getTime();
  }
  function isPeriodStamp(arg) {
    return isIsoString(arg);
  }
  function isIsoString(arg) {
    return typeof arg === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(arg);
  }

  // frontend/model/contracts/shared/functions.js
  function paymentHashesFromPaymentPeriod(periodPayments) {
    let hashes = [];
    if (periodPayments) {
      const { paymentsFrom } = periodPayments;
      for (const fromMemberID in paymentsFrom) {
        for (const toMemberID in paymentsFrom[fromMemberID]) {
          hashes = hashes.concat(paymentsFrom[fromMemberID][toMemberID]);
        }
      }
    }
    return hashes;
  }
  function createPaymentInfo(paymentHash, payment) {
    return {
      fromMemberID: payment.data.fromMemberID,
      toMemberID: payment.data.toMemberID,
      hash: paymentHash,
      amount: payment.data.amount,
      isLate: !!payment.data.isLate,
      when: payment.data.completedDate
    };
  }
  var referenceTally = (selector) => {
    const delta = {
      "retain": 1,
      "release": -1
    };
    return {
      [selector]: (parentContractID, childContractIDs, op) => {
        if (!Array.isArray(childContractIDs)) childContractIDs = [childContractIDs];
        if (op !== "retain" && op !== "release") throw new Error("Invalid operation");
        for (const childContractID of childContractIDs) {
          const key = `${selector}-${parentContractID}-${childContractID}`;
          const count = (0, import_sbp5.default)("okTurtles.data/get", key);
          (0, import_sbp5.default)("okTurtles.data/set", key, (count || 0) + delta[op]);
          if (count != null) return;
          (0, import_sbp5.default)("chelonia/queueInvocation", parentContractID, () => {
            const count2 = (0, import_sbp5.default)("okTurtles.data/get", key);
            (0, import_sbp5.default)("okTurtles.data/delete", key);
            if (count2 && count2 !== Math.sign(count2)) {
              console.warn(`[${selector}] Unexpected value`, parentContractID, childContractID, count2);
              if ("") {
                Promise.reject(new Error(`[${selector}] Unexpected value ${parentContractID} ${childContractID}: ${count2}`));
              }
            }
            switch (Math.sign(count2)) {
              case -1:
                (0, import_sbp5.default)("chelonia/contract/release", childContractID).catch((e) => {
                  console.error(`[${selector}] Error calling release`, parentContractID, childContractID, e);
                });
                break;
              case 1:
                (0, import_sbp5.default)("chelonia/contract/retain", childContractID).catch((e) => console.error(`[${selector}] Error calling retain`, parentContractID, childContractID, e));
                break;
            }
          }).catch((e) => {
            console.error(`[${selector}] Error in queued invocation`, parentContractID, childContractID, e);
          });
        }
      }
    };
  };

  // frontend/model/contracts/shared/payments/index.js
  var PAYMENT_PENDING = "pending";
  var PAYMENT_CANCELLED = "cancelled";
  var PAYMENT_ERROR = "error";
  var PAYMENT_NOT_RECEIVED = "not-received";
  var PAYMENT_COMPLETED = "completed";
  var paymentStatusType = unionOf(...[PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_NOT_RECEIVED, PAYMENT_COMPLETED].map((k) => literalOf(k)));
  var PAYMENT_TYPE_MANUAL = "manual";
  var PAYMENT_TYPE_BITCOIN = "bitcoin";
  var PAYMENT_TYPE_PAYPAL = "paypal";
  var paymentType = unionOf(...[PAYMENT_TYPE_MANUAL, PAYMENT_TYPE_BITCOIN, PAYMENT_TYPE_PAYPAL].map((k) => literalOf(k)));

  // frontend/model/contracts/shared/getters/group.js
  var group_default = {
    currentGroupOwnerID(state, getters) {
      return getters.currentGroupState.groupOwnerID;
    },
    groupSettingsForGroup(state, getters) {
      return (state2) => state2.settings || {};
    },
    groupSettings(state, getters) {
      return getters.groupSettingsForGroup(getters.currentGroupState);
    },
    profileActive(state, getters) {
      return (member) => {
        const profiles = getters.currentGroupState.profiles;
        return profiles?.[member]?.status === PROFILE_STATUS.ACTIVE;
      };
    },
    pendingAccept(state, getters) {
      return (member) => {
        const profiles = getters.currentGroupState.profiles;
        return profiles?.[member]?.status === PROFILE_STATUS.PENDING;
      };
    },
    groupProfileForGroup(state, getters) {
      return (state2, member) => {
        const profiles = state2.profiles;
        return profiles && profiles[member] && {
          ...profiles[member],
          get lastLoggedIn() {
            return getters.currentGroupLastLoggedIn[member] || this.joinedDate;
          }
        };
      };
    },
    groupProfile(state, getters) {
      return (member) => getters.groupProfileForGroup(getters.currentGroupState, member);
    },
    groupProfilesForGroup(state, getters) {
      return (state2) => {
        const profiles = {};
        for (const member in state2.profiles || {}) {
          const profile = getters.groupProfileForGroup(state2, member);
          if (profile.status === PROFILE_STATUS.ACTIVE) {
            profiles[member] = profile;
          }
        }
        return profiles;
      };
    },
    groupProfiles(state, getters) {
      return getters.groupProfilesForGroup(getters.currentGroupState);
    },
    groupCreatedDate(state, getters) {
      return getters.groupProfile(getters.currentGroupOwnerID).joinedDate;
    },
    groupMincomeAmountForGroup(state, getters) {
      return (state2) => getters.groupSettingsForGroup(state2).mincomeAmount;
    },
    groupMincomeAmount(state, getters) {
      return getters.groupMincomeAmountForGroup(getters.currentGroupState);
    },
    groupMincomeCurrency(state, getters) {
      return getters.groupSettings.mincomeCurrency;
    },
    // Oldest period key first.
    groupSortedPeriodKeysForGroup(state, getters) {
      return (state2) => {
        const { distributionDate, distributionPeriodLength } = getters.groupSettingsForGroup(state2);
        if (!distributionDate) return [];
        const keys = Object.keys(getters.groupPeriodPaymentsForGroup(state2)).sort();
        if (!keys.length && MAX_SAVED_PERIODS > 0) {
          keys.push(dateToPeriodStamp(addTimeToDate(distributionDate, -distributionPeriodLength)));
        }
        if (keys[keys.length - 1] !== distributionDate) {
          keys.push(distributionDate);
        }
        return keys;
      };
    },
    groupSortedPeriodKeys(state, getters) {
      return getters.groupSortedPeriodKeysForGroup(getters.currentGroupState);
    },
    // paymentTotalfromMembertoMemberID (state, getters) {
    // // this code was removed in https://github.com/okTurtles/group-income/pull/1691
    // // because it was unused. feel free to bring it back if needed.
    // },
    //
    // The following three getters return either a known period stamp for the given date,
    // or a predicted one according to the period length.
    // They may also return 'undefined', in which case the caller should check archived data.
    periodStampGivenDateForGroup(state, getters) {
      return (state2, date, periods) => {
        return periodStampsForDate(date, {
          knownSortedStamps: periods || getters.groupSortedPeriodKeysForGroup(state2),
          periodLength: getters.groupSettingsForGroup(state2).distributionPeriodLength
        }).current;
      };
    },
    periodStampGivenDate(state, getters) {
      return (date, periods) => {
        return getters.periodStampGivenDateForGroup(getters.currentGroupState, date, periods);
      };
    },
    periodBeforePeriodForGroup(state, getters) {
      return (groupState, periodStamp, periods) => {
        return periodStampsForDate(periodStamp, {
          knownSortedStamps: periods || getters.groupSortedPeriodKeysForGroup(groupState),
          periodLength: getters.groupSettingsForGroup(groupState).distributionPeriodLength
        }).previous;
      };
    },
    periodBeforePeriod(state, getters) {
      return (periodStamp, periods) => getters.periodBeforePeriodForGroup(getters.currentGroupState, periodStamp, periods);
    },
    periodAfterPeriodForGroup(state, getters) {
      return (groupState, periodStamp, periods) => {
        return periodStampsForDate(periodStamp, {
          knownSortedStamps: periods || getters.groupSortedPeriodKeysForGroup(groupState),
          periodLength: getters.groupSettingsForGroup(groupState).distributionPeriodLength
        }).next;
      };
    },
    periodAfterPeriod(state, getters) {
      return (periodStamp, periods) => getters.periodAfterPeriodForGroup(getters.currentGroupState, periodStamp, periods);
    },
    dueDateForPeriodForGroup(state, getters) {
      return (state2, periodStamp, periods) => {
        return getters.periodAfterPeriodForGroup(state2, periodStamp, periods);
      };
    },
    dueDateForPeriod(state, getters) {
      return (periodStamp, periods) => {
        return getters.dueDateForPeriodForGroup(getters.currentGroupState, periodStamp, periods);
      };
    },
    paymentHashesForPeriodForGroup(state, getters) {
      return (state2, periodStamp) => {
        const periodPayments = getters.groupPeriodPaymentsForGroup(state2)[periodStamp];
        if (periodPayments) {
          return paymentHashesFromPaymentPeriod(periodPayments);
        }
      };
    },
    paymentHashesForPeriod(state, getters) {
      return (periodStamp) => {
        return getters.paymentHashesForPeriodForGroup(getters.currentGroupState, periodStamp);
      };
    },
    groupMembersByContractID(state, getters) {
      return Object.keys(getters.groupProfiles);
    },
    groupMembersCount(state, getters) {
      return getters.groupMembersByContractID.length;
    },
    groupMembersPending(state, getters) {
      const invites = getters.currentGroupState.invites;
      const vmInvites = getters.currentGroupState._vm.invites;
      const pendingMembers = /* @__PURE__ */ Object.create(null);
      for (const inviteKeyId in invites) {
        if (vmInvites[inviteKeyId].status === INVITE_STATUS.VALID && invites[inviteKeyId].creatorID !== INVITE_INITIAL_CREATOR) {
          pendingMembers[inviteKeyId] = {
            displayName: invites[inviteKeyId].invitee,
            invitedBy: invites[inviteKeyId].creatorID,
            expires: vmInvites[inviteKeyId].expires
          };
        }
      }
      return pendingMembers;
    },
    groupShouldPropose(state, getters) {
      return getters.groupMembersCount >= 3;
    },
    groupDistributionStarted(state, getters) {
      return (currentDate) => currentDate >= getters.groupSettings?.distributionDate;
    },
    groupProposalSettings(state, getters) {
      return (proposalType2 = PROPOSAL_GENERIC) => {
        return getters.groupSettings.proposals?.[proposalType2];
      };
    },
    groupCurrency(state, getters) {
      const mincomeCurrency = getters.groupMincomeCurrency;
      return mincomeCurrency && currencies_default[mincomeCurrency];
    },
    groupMincomeFormatted(state, getters) {
      return getters.withGroupCurrency?.(getters.groupMincomeAmount);
    },
    groupMincomeSymbolWithCode(state, getters) {
      return getters.groupCurrency?.symbolWithCode;
    },
    groupPeriodPaymentsForGroup(state, getters) {
      return (state2) => {
        return state2.paymentsByPeriod || {};
      };
    },
    groupPeriodPayments(state, getters) {
      return getters.groupPeriodPaymentsForGroup(getters.currentGroupState);
    },
    groupThankYousFrom(state, getters) {
      return getters.currentGroupState.thankYousFrom || {};
    },
    groupStreaks(state, getters) {
      return getters.currentGroupState.streaks || {};
    },
    groupTotalPledgeAmount(state, getters) {
      return getters.currentGroupState.totalPledgeAmount || 0;
    },
    withGroupCurrency(state, getters) {
      return getters.groupCurrency?.displayWithCurrency;
    },
    groupChatRooms(state, getters) {
      return getters.currentGroupState.chatRooms;
    },
    groupGeneralChatRoomId(state, getters) {
      return getters.currentGroupState.generalChatRoomId;
    },
    // getter is named haveNeedsForThisPeriod instead of haveNeedsForPeriod because it uses
    // getters.groupProfiles - and that is always based on the most recent values. we still
    // pass in the current period because it's used to set the "when" property
    haveNeedsForThisPeriodForGroup(state, getters) {
      return (state2, currentPeriod) => {
        const groupProfiles = getters.groupProfilesForGroup(state2);
        const haveNeeds = [];
        for (const memberID in groupProfiles) {
          const { incomeDetailsType, joinedDate } = groupProfiles[memberID];
          if (incomeDetailsType) {
            const amount = groupProfiles[memberID][incomeDetailsType];
            const haveNeed = incomeDetailsType === "incomeAmount" ? amount - getters.groupMincomeAmountForGroup(state2) : amount;
            let when = dateFromPeriodStamp(currentPeriod).toISOString();
            if (dateIsWithinPeriod({
              date: joinedDate,
              periodStart: currentPeriod,
              periodLength: getters.groupSettingsForGroup(state2).distributionPeriodLength
            })) {
              when = joinedDate;
            }
            haveNeeds.push({ memberID, haveNeed, when });
          }
        }
        return haveNeeds;
      };
    },
    haveNeedsForThisPeriod(state, getters) {
      return (currentPeriod) => {
        return getters.haveNeedsForThisPeriodForGroup(getters.currentGroupState, currentPeriod);
      };
    },
    paymentsForPeriodForGroup(state, getters) {
      return (state2, periodStamp) => {
        const hashes = getters.paymentHashesForPeriodForGroup(state2, periodStamp);
        const events = [];
        if (hashes && hashes.length > 0) {
          const payments = state2.payments;
          for (const paymentHash of hashes) {
            const payment = payments[paymentHash];
            if (payment.data.status === PAYMENT_COMPLETED) {
              events.push(createPaymentInfo(paymentHash, payment));
            }
          }
        }
        return events;
      };
    },
    paymentsForPeriod(state, getters) {
      return (periodStamp) => {
        return getters.paymentsForPeriodForGroup(getters.currentGroupState, periodStamp);
      };
    }
    // distributionEventsForMonth (state, getters) {
    //   return (monthstamp) => {
    //     // NOTE: if we ever switch back to the "real-time" adjusted distribution
    //     // algorithm, make sure that this function also handles userExitsGroupEvent
    //     const distributionEvents = getters.haveNeedEventsForMonth(monthstamp)
    //     const paymentEvents = getters.paymentEventsForMonth(monthstamp)
    //     distributionEvents.splice(distributionEvents.length, 0, paymentEvents)
    //     return distributionEvents.sort((a, b) => compareISOTimestamps(a.data.when, b.data.when))
    //   }
    // }
  };

  // frontend/model/contracts/shared/types.js
  var inviteType = objectOf({
    inviteKeyId: string,
    creatorID: string,
    invitee: optional(string)
  });
  var chatRoomAttributesType = objectOf({
    name: stringMax(CHATROOM_NAME_LIMITS_IN_CHARS),
    description: stringMax(CHATROOM_DESCRIPTION_LIMITS_IN_CHARS),
    // NOTE: creatorID is optional parameter which is not being used
    //       in group contract function gi.actions/group/addChatRoom
    creatorID: optional(string),
    adminIDs: optional(arrayOf(string)),
    type: unionOf(...Object.values(CHATROOM_TYPES).map((v) => literalOf(v))),
    privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map((v) => literalOf(v)))
  });
  var messageType = objectMaybeOf({
    type: unionOf(...Object.values(MESSAGE_TYPES).map((v) => literalOf(v))),
    text: string,
    proposal: objectOf({
      proposalId: string,
      proposalType: string,
      proposalData: object,
      expires_date_ms: number,
      createdDate: string,
      creatorID: string,
      status: unionOf(...[
        STATUS_OPEN,
        STATUS_PASSED,
        STATUS_FAILED,
        STATUS_EXPIRING,
        STATUS_EXPIRED,
        STATUS_CANCELLED
      ].map((v) => literalOf(v)))
    }),
    notification: objectMaybeOf({
      type: unionOf(...Object.values(MESSAGE_NOTIFICATIONS).map((v) => literalOf(v))),
      params: mapOf(string, string)
      // { username }
    }),
    attachments: optional(
      arrayOf(objectOf({
        name: string,
        mimeType: string,
        size: numberRange(1, Number.MAX_SAFE_INTEGER),
        dimension: optional(objectOf({
          width: number,
          height: number
        })),
        downloadData: objectOf({
          manifestCid: string,
          downloadParams: optional(object)
        })
      }))
    ),
    replyingMessage: objectOf({
      hash: string,
      // scroll to the original message and highlight
      text: string
      // display text(if too long, truncate)
    }),
    pollData: objectOf({
      question: string,
      options: arrayOf(objectOf({ id: string, value: string })),
      expires_date_ms: number,
      hideVoters: boolean,
      pollType: unionOf(...Object.values(POLL_TYPES).map((v) => literalOf(v)))
    }),
    onlyVisibleTo: arrayOf(string)
    // list of usernames, only necessary when type is NOTIFICATION
  });

  // frontend/model/contracts/shared/voting/proposals.js
  var import_sbp6 = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/voting/rules.js
  var VOTE_AGAINST = ":against";
  var VOTE_INDIFFERENT = ":indifferent";
  var VOTE_UNDECIDED = ":undecided";
  var VOTE_FOR = ":for";
  var RULE_PERCENTAGE = "percentage";
  var RULE_DISAGREEMENT = "disagreement";
  var RULE_MULTI_CHOICE = "multi-choice";
  var getPopulation = (state) => Object.keys(state.profiles).filter((p) => state.profiles[p].status === PROFILE_STATUS.ACTIVE).length;
  var rules = {
    [RULE_PERCENTAGE]: function(state, proposalType2, votes) {
      votes = Object.values(votes);
      let population = getPopulation(state);
      if (proposalType2 === PROPOSAL_REMOVE_MEMBER) population -= 1;
      const defaultThreshold = state.settings.proposals[proposalType2].ruleSettings[RULE_PERCENTAGE].threshold;
      const threshold = getThresholdAdjusted(RULE_PERCENTAGE, defaultThreshold, population);
      const totalIndifferent = votes.filter((x) => x === VOTE_INDIFFERENT).length;
      const totalFor = votes.filter((x) => x === VOTE_FOR).length;
      const totalAgainst = votes.filter((x) => x === VOTE_AGAINST).length;
      const totalForOrAgainst = totalFor + totalAgainst;
      const turnout = totalForOrAgainst + totalIndifferent;
      const absent = population - turnout;
      const neededToPass = Math.ceil(threshold * (population - totalIndifferent));
      console.debug(`votingRule ${RULE_PERCENTAGE} for ${proposalType2}:`, { neededToPass, totalFor, totalAgainst, totalIndifferent, threshold, absent, turnout, population });
      if (totalFor >= neededToPass) {
        return VOTE_FOR;
      }
      return totalFor + absent < neededToPass ? VOTE_AGAINST : VOTE_UNDECIDED;
    },
    [RULE_DISAGREEMENT]: function(state, proposalType2, votes) {
      votes = Object.values(votes);
      const population = getPopulation(state);
      const minimumMax = proposalType2 === PROPOSAL_REMOVE_MEMBER ? 2 : 1;
      const thresholdOriginal = Math.max(state.settings.proposals[proposalType2].ruleSettings[RULE_DISAGREEMENT].threshold, minimumMax);
      const threshold = getThresholdAdjusted(RULE_DISAGREEMENT, thresholdOriginal, population);
      const totalFor = votes.filter((x) => x === VOTE_FOR).length;
      const totalAgainst = votes.filter((x) => x === VOTE_AGAINST).length;
      const turnout = votes.length;
      const absent = population - turnout;
      console.debug(`votingRule ${RULE_DISAGREEMENT} for ${proposalType2}:`, { totalFor, totalAgainst, threshold, turnout, population, absent });
      if (totalAgainst >= threshold) {
        return VOTE_AGAINST;
      }
      return totalAgainst + absent < threshold ? VOTE_FOR : VOTE_UNDECIDED;
    },
    [RULE_MULTI_CHOICE]: function(state, proposalType2, votes) {
      throw new Error("unimplemented!");
    }
  };
  var rules_default = rules;
  var ruleType = unionOf(...Object.keys(rules).map((k) => literalOf(k)));
  var voteType = unionOf(...[VOTE_AGAINST, VOTE_INDIFFERENT, VOTE_UNDECIDED, VOTE_FOR].map((v) => literalOf(v)));
  var getThresholdAdjusted = (rule, threshold, groupSize) => {
    const groupSizeVoting = Math.max(3, groupSize);
    return {
      [RULE_DISAGREEMENT]: () => {
        return Math.min(groupSizeVoting - 1, threshold);
      },
      [RULE_PERCENTAGE]: () => {
        const minThreshold = 2 / groupSizeVoting;
        return Math.max(minThreshold, threshold);
      }
    }[rule]();
  };

  // frontend/model/contracts/shared/voting/proposals.js
  function notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height }) {
    delete state.proposals[proposalHash];
    (0, import_sbp6.default)(
      "gi.contracts/group/pushSideEffect",
      contractID,
      ["gi.contracts/group/makeNotificationWhenProposalClosed", state, contractID, meta, height, proposalHash, proposal]
    );
    (0, import_sbp6.default)(
      "gi.contracts/group/pushSideEffect",
      contractID,
      ["gi.contracts/group/archiveProposal", contractID, proposalHash, proposal]
    );
  }
  var proposalSettingsType = objectOf({
    rule: ruleType,
    expires_ms: number,
    ruleSettings: objectOf({
      [RULE_PERCENTAGE]: objectOf({ threshold: number }),
      [RULE_DISAGREEMENT]: objectOf({ threshold: number })
    })
  });
  function voteAgainst(state, { meta, data, contractID, height }) {
    const { proposalHash } = data;
    const proposal = state.proposals[proposalHash];
    proposal.status = STATUS_FAILED;
    (0, import_sbp6.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_AGAINST, data);
    notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height });
  }
  var proposalDefaults = {
    rule: RULE_PERCENTAGE,
    expires_ms: 14 * DAYS_MILLIS,
    ruleSettings: {
      [RULE_PERCENTAGE]: { threshold: 0.66 },
      [RULE_DISAGREEMENT]: { threshold: 1 }
    }
  };
  var proposals = {
    [PROPOSAL_INVITE_MEMBER]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: async function(state, message) {
        const { data, contractID, meta, height } = message;
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.payload = data.passPayload;
        proposal.status = STATUS_PASSED;
        const forMessage = { ...message, data: data.passPayload };
        await (0, import_sbp6.default)("gi.contracts/group/invite/process", forMessage, state);
        (0, import_sbp6.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
        notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_REMOVE_MEMBER]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: async function(state, message) {
        const { data, contractID, meta, height } = message;
        const { proposalHash, passPayload } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        proposal.payload = passPayload;
        const messageData = proposal.data.proposalData;
        const forMessage = { ...message, data: messageData, proposalHash };
        await (0, import_sbp6.default)("gi.contracts/group/removeMember/process", forMessage, state);
        (0, import_sbp6.default)(
          "gi.contracts/group/pushSideEffect",
          contractID,
          ["gi.contracts/group/removeMember/sideEffect", forMessage]
        );
        notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_GROUP_SETTING_CHANGE]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: async function(state, message) {
        const { data, contractID, meta, height } = message;
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        const { setting, proposedValue } = proposal.data.proposalData;
        const forMessage = {
          ...message,
          data: { [setting]: proposedValue },
          proposalHash
        };
        await (0, import_sbp6.default)("gi.contracts/group/updateSettings/process", forMessage, state);
        (0, import_sbp6.default)(
          "gi.contracts/group/pushSideEffect",
          contractID,
          ["gi.contracts/group/updateSettings/sideEffect", forMessage]
        );
        notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: async function(state, message) {
        const { data, contractID, meta, height } = message;
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        const forMessage = {
          ...message,
          data: proposal.data.proposalData,
          proposalHash
        };
        await (0, import_sbp6.default)("gi.contracts/group/updateAllVotingRules/process", forMessage, state);
        notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height });
      },
      [VOTE_AGAINST]: voteAgainst
    },
    [PROPOSAL_GENERIC]: {
      defaults: proposalDefaults,
      [VOTE_FOR]: function(state, { data, contractID, meta, height }) {
        const { proposalHash } = data;
        const proposal = state.proposals[proposalHash];
        proposal.status = STATUS_PASSED;
        (0, import_sbp6.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
        notifyAndArchiveProposal({ state, proposalHash, proposal, contractID, meta, height });
      },
      [VOTE_AGAINST]: voteAgainst
    }
  };
  var proposals_default = proposals;
  var proposalType = unionOf(...Object.keys(proposals).map((k) => literalOf(k)));

  // frontend/model/contracts/group.js
  function fetchInitKV(obj, key, initialValue) {
    let value = obj[key];
    if (!value) {
      obj[key] = initialValue;
      value = obj[key];
    }
    return value;
  }
  function initGroupProfile(joinedDate, joinedHeight, reference) {
    return {
      globalUsername: "",
      // TODO: this? e.g. groupincome:greg / namecoin:bob / ens:alice
      joinedDate,
      joinedHeight,
      reference,
      nonMonetaryContributions: [],
      status: PROFILE_STATUS.ACTIVE,
      departedDate: null,
      incomeDetailsLastUpdatedDate: null
    };
  }
  function initPaymentPeriod({ meta, getters }) {
    const start = getters.periodStampGivenDate(meta.createdDate);
    return {
      start,
      end: plusOnePeriodLength(start, getters.groupSettings.distributionPeriodLength),
      // this saved so that it can be used when creating a new payment
      initialCurrency: getters.groupMincomeCurrency,
      // TODO: should we also save the first period's currency exchange rate..?
      // all payments during the period use this to set their exchangeRate
      // see notes and code in groupIncomeAdjustedDistribution for details.
      // TODO: for the currency change proposal, have it update the mincomeExchangeRate
      //       using .mincomeExchangeRate *= proposal.exchangeRate
      mincomeExchangeRate: 1,
      // modified by proposals to change mincome currency
      paymentsFrom: {},
      // fromMemberID => toMemberID => Array<paymentHash>
      // snapshot of adjusted distribution after each completed payment
      // yes, it is possible a payment began in one period and completed in another
      // in which case lastAdjustedDistribution for the previous period will be updated
      lastAdjustedDistribution: null,
      // snapshot of haveNeeds. made only when there are no payments
      haveNeedsSnapshot: null
    };
  }
  function clearOldPayments({ contractID, state, getters }) {
    const sortedPeriodKeys = Object.keys(state.paymentsByPeriod).sort();
    const archivingPayments = { paymentsByPeriod: {}, payments: {} };
    while (sortedPeriodKeys.length > MAX_SAVED_PERIODS) {
      const period = sortedPeriodKeys.shift();
      archivingPayments.paymentsByPeriod[period] = cloneDeep(state.paymentsByPeriod[period]);
      for (const paymentHash of getters.paymentHashesForPeriod(period)) {
        archivingPayments.payments[paymentHash] = cloneDeep(state.payments[paymentHash]);
        delete state.payments[paymentHash];
      }
      delete state.paymentsByPeriod[period];
    }
    delete archivingPayments.paymentsByPeriod[state.waitingPeriod];
    (0, import_sbp7.default)(
      "gi.contracts/group/pushSideEffect",
      contractID,
      ["gi.contracts/group/archivePayments", contractID, archivingPayments]
    );
  }
  function initFetchPeriodPayments({ contractID, meta, state, getters }) {
    const period = getters.periodStampGivenDate(meta.createdDate);
    const periodPayments = fetchInitKV(state.paymentsByPeriod, period, initPaymentPeriod({ meta, getters }));
    const previousPeriod = getters.periodBeforePeriod(period);
    if (previousPeriod in state.paymentsByPeriod) {
      state.paymentsByPeriod[previousPeriod].end = period;
    }
    clearOldPayments({ contractID, state, getters });
    return periodPayments;
  }
  function initGroupStreaks() {
    return {
      lastStreakPeriod: null,
      fullMonthlyPledges: 0,
      // group streaks for 100% monthly payments - every pledging members have completed their payments
      fullMonthlySupport: 0,
      // group streaks for 100% monthly supports - total amount of pledges done is equal to the group's monthly contribution goal
      onTimePayments: {},
      // { memberID: number, ... }
      missedPayments: {},
      // { memberID: number, ... }
      noVotes: {}
      // { memberID: number, ... }
    };
  }
  function updateCurrentDistribution({ contractID, meta, state, getters }) {
    const curPeriodPayments = initFetchPeriodPayments({ contractID, meta, state, getters });
    const period = getters.periodStampGivenDate(meta.createdDate);
    const noPayments = Object.keys(curPeriodPayments.paymentsFrom).length === 0;
    if (comparePeriodStamps(period, getters.groupSettings.distributionDate) > 0) {
      updateGroupStreaks({ state, getters });
      getters.groupSettings.distributionDate = period;
    }
    if (noPayments || !curPeriodPayments.haveNeedsSnapshot) {
      curPeriodPayments.haveNeedsSnapshot = getters.haveNeedsForThisPeriod(period);
    }
    if (!noPayments) {
      updateAdjustedDistribution({ period, getters });
    }
  }
  function updateAdjustedDistribution({ period, getters }) {
    const payments = getters.groupPeriodPayments[period];
    if (payments && payments.haveNeedsSnapshot) {
      const minimize = getters.groupSettings.minimizeDistribution;
      payments.lastAdjustedDistribution = adjustedDistribution({
        distribution: unadjustedDistribution({ haveNeeds: payments.haveNeedsSnapshot, minimize }),
        payments: getters.paymentsForPeriod(period),
        dueOn: getters.dueDateForPeriod(period)
      }).filter((todo) => {
        return getters.groupProfile(todo.toMemberID).status === PROFILE_STATUS.ACTIVE;
      });
    }
  }
  function memberLeaves({ memberID, dateLeft, heightLeft, ourselvesLeaving }, { contractID, meta, state, getters }) {
    if (!state.profiles[memberID] || state.profiles[memberID].status !== PROFILE_STATUS.ACTIVE) {
      throw new Error(`[gi.contracts/group memberLeaves] Can't remove non-exisiting member ${memberID}`);
    }
    state.profiles[memberID].status = PROFILE_STATUS.REMOVED;
    state.profiles[memberID].departedDate = dateLeft;
    state.profiles[memberID].departedHeight = heightLeft;
    updateCurrentDistribution({ contractID, meta, state, getters });
    Object.keys(state.chatRooms).forEach((chatroomID) => {
      removeGroupChatroomProfile(state, chatroomID, memberID, ourselvesLeaving);
    });
  }
  function isActionNewerThanUserJoinedDate(height, userProfile) {
    if (!userProfile) {
      return false;
    }
    return userProfile.status === PROFILE_STATUS.ACTIVE && userProfile.joinedHeight < height;
  }
  function updateGroupStreaks({ state, getters }) {
    const streaks = fetchInitKV(state, "streaks", initGroupStreaks());
    const cPeriod = getters.groupSettings.distributionDate;
    const thisPeriodPayments = getters.groupPeriodPayments[cPeriod];
    const noPaymentsAtAll = !thisPeriodPayments;
    if (streaks.lastStreakPeriod === cPeriod) return;
    else {
      streaks["lastStreakPeriod"] = cPeriod;
    }
    const thisPeriodDistribution = thisPeriodPayments?.lastAdjustedDistribution || adjustedDistribution({
      distribution: unadjustedDistribution({
        haveNeeds: getters.haveNeedsForThisPeriod(cPeriod),
        minimize: getters.groupSettings.minimizeDistribution
      }) || [],
      payments: getters.paymentsForPeriod(cPeriod),
      dueOn: getters.dueDateForPeriod(cPeriod)
    }).filter((todo) => {
      return getters.groupProfile(todo.toMemberID).status === PROFILE_STATUS.ACTIVE;
    });
    streaks["fullMonthlyPledges"] = noPaymentsAtAll ? 0 : thisPeriodDistribution.length === 0 ? streaks.fullMonthlyPledges + 1 : 0;
    const thisPeriodPaymentDetails = getters.paymentsForPeriod(cPeriod);
    const thisPeriodHaveNeeds = thisPeriodPayments?.haveNeedsSnapshot || getters.haveNeedsForThisPeriod(cPeriod);
    const filterMyItems = (array, member) => array.filter((item) => item.fromMemberID === member);
    const isPledgingMember = (member) => thisPeriodHaveNeeds.some((entry) => entry.memberID === member && entry.haveNeed > 0);
    const totalContributionGoal = thisPeriodHaveNeeds.reduce(
      (total, item) => item.haveNeed < 0 ? total + -1 * item.haveNeed : total,
      0
    );
    const totalPledgesDone = thisPeriodPaymentDetails.reduce(
      (total, paymentItem) => paymentItem.amount + total,
      0
    );
    const fullMonthlySupportCurrent = fetchInitKV(streaks, "fullMonthlySupport", 0);
    streaks["fullMonthlySupport"] = totalPledgesDone > 0 && totalPledgesDone >= totalContributionGoal ? fullMonthlySupportCurrent + 1 : 0;
    for (const memberID in getters.groupProfiles) {
      if (!isPledgingMember(memberID)) continue;
      const myMissedPaymentsInThisPeriod = filterMyItems(thisPeriodDistribution, memberID);
      const userCurrentStreak = fetchInitKV(streaks.onTimePayments, memberID, 0);
      streaks.onTimePayments[memberID] = noPaymentsAtAll ? 0 : myMissedPaymentsInThisPeriod.length === 0 && filterMyItems(thisPeriodPaymentDetails, memberID).every((p) => p.isLate === false) ? userCurrentStreak + 1 : 0;
      const myMissedPaymentsStreak = fetchInitKV(streaks.missedPayments, memberID, 0);
      streaks.missedPayments[memberID] = noPaymentsAtAll ? myMissedPaymentsStreak + 1 : myMissedPaymentsInThisPeriod.length >= 1 ? myMissedPaymentsStreak + 1 : 0;
    }
  }
  var removeGroupChatroomProfile = (state, chatRoomID, memberID, ourselvesLeaving) => {
    if (!state.chatRooms[chatRoomID].members[memberID]) return;
    state.chatRooms[chatRoomID].members[memberID].status = PROFILE_STATUS.REMOVED;
  };
  var leaveChatRoomAction = async (groupID, state, chatRoomID, memberID, actorID, leavingGroup) => {
    const sendingData = leavingGroup || actorID !== memberID ? { memberID } : {};
    if (state?.chatRooms?.[chatRoomID]?.members?.[memberID]?.status !== PROFILE_STATUS.REMOVED) {
      return;
    }
    const extraParams = {};
    if (leavingGroup) {
      const encryptionKeyId = await (0, import_sbp7.default)("chelonia/contract/currentKeyIdByName", state, "cek", true);
      const signingKeyId = await (0, import_sbp7.default)("chelonia/contract/currentKeyIdByName", state, "csk", true);
      if (!signingKeyId) {
        return;
      }
      extraParams.encryptionKeyId = encryptionKeyId;
      extraParams.signingKeyId = signingKeyId;
      extraParams.innerSigningContractID = null;
    }
    (0, import_sbp7.default)("gi.actions/chatroom/leave", {
      contractID: chatRoomID,
      data: sendingData,
      ...extraParams
    }).catch((e) => {
      if (leavingGroup && (e?.name === "ChelErrorSignatureKeyNotFound" || e?.name === "GIErrorUIRuntimeError" && (["ChelErrorSignatureKeyNotFound", "GIErrorMissingSigningKeyError"].includes(e?.cause?.name) || e?.cause?.name === "GIChatroomNotMemberError"))) {
        return;
      }
      console.warn("[gi.contracts/group] Error sending chatroom leave action", e);
    });
  };
  var leaveAllChatRoomsUponLeaving = (groupID, state, memberID, actorID) => {
    const chatRooms = state.chatRooms;
    return Promise.all(
      Object.keys(chatRooms).filter((cID) => chatRooms[cID].members?.[memberID]?.status === PROFILE_STATUS.REMOVED).map((chatRoomID) => leaveChatRoomAction(
        groupID,
        state,
        chatRoomID,
        memberID,
        actorID,
        true
      ))
    );
  };
  var actionRequireActiveMember = (next) => (data, props) => {
    const innerSigningContractID = props.message.innerSigningContractID;
    if (!innerSigningContractID || innerSigningContractID === props.contractID) {
      throw new Error("Missing inner signature");
    }
    return next(data, props);
  };
  var GIGroupAlreadyJoinedError = ChelErrorGenerator("GIGroupAlreadyJoinedError");
  var GIGroupNotJoinedError = ChelErrorGenerator("GIGroupNotJoinedError");
  (0, import_sbp7.default)("chelonia/defineContract", {
    name: "gi.contracts/group",
    metadata: {
      validate: objectOf({
        createdDate: string
      }),
      async create() {
        return {
          createdDate: await fetchServerTime()
        };
      }
    },
    // These getters are restricted only to the contract's state.
    // Do not access state outside the contract state inside of them.
    // For example, if the getter you use tries to access `state.loggedIn`,
    // that will break the `latestContractState` function in state.js.
    // It is only safe to access state outside of the contract in a contract action's
    // `sideEffect` function (as long as it doesn't modify contract state)
    getters: {
      // we define `currentGroupState` here so that we can redefine it in state.js
      // so that we can re-use these getter definitions in state.js since they are
      // compatible with Vuex getter definitions.
      // Here `state` refers to the individual group contract's state, the equivalent
      // of `vuexRootState[someGroupContractID]`.
      currentGroupState(state) {
        return state;
      },
      currentGroupLastLoggedIn() {
        return {};
      },
      ...group_default
    },
    // NOTE: All mutations must be atomic in their edits of the contract state.
    //       THEY ARE NOT to farm out any further mutations through the async actions!
    actions: {
      // this is the constructor
      "gi.contracts/group": {
        validate: objectMaybeOf({
          settings: objectMaybeOf({
            // TODO: add 'groupPubkey'
            groupName: stringMax(GROUP_NAME_MAX_CHAR, "groupName"),
            groupPicture: unionOf(string, objectOf({
              manifestCid: stringMax(MAX_HASH_LEN, "manifestCid"),
              downloadParams: optional(object)
            })),
            sharedValues: stringMax(GROUP_DESCRIPTION_MAX_CHAR, "sharedValues"),
            mincomeAmount: numberRange(1, GROUP_MINCOME_MAX),
            mincomeCurrency: stringMax(GROUP_CURRENCY_MAX_CHAR, "mincomeCurrency"),
            distributionDate: validatorFrom(isPeriodStamp),
            distributionPeriodLength: numberRange(1 * DAYS_MILLIS, GROUP_DISTRIBUTION_PERIOD_MAX_DAYS * DAYS_MILLIS),
            minimizeDistribution: boolean,
            proposals: objectOf({
              [PROPOSAL_INVITE_MEMBER]: proposalSettingsType,
              [PROPOSAL_REMOVE_MEMBER]: proposalSettingsType,
              [PROPOSAL_GROUP_SETTING_CHANGE]: proposalSettingsType,
              [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposalSettingsType,
              [PROPOSAL_GENERIC]: proposalSettingsType
            })
          })
        }),
        process({ data, meta, contractID }, { state, getters }) {
          const initialState = merge({
            payments: {},
            paymentsByPeriod: {},
            thankYousFrom: {},
            // { fromMember1: { toMember1: msg1, toMember2: msg2, ... }, fromMember2: {}, ...  }
            invites: {},
            proposals: {},
            // hashes => {} TODO: this, see related TODOs in GroupProposal
            settings: {
              distributionPeriodLength: 30 * DAYS_MILLIS,
              inviteExpiryOnboarding: INVITE_EXPIRES_IN_DAYS.ON_BOARDING,
              inviteExpiryProposal: INVITE_EXPIRES_IN_DAYS.PROPOSAL,
              allowPublicChannels: false
            },
            streaks: initGroupStreaks(),
            profiles: {},
            chatRooms: {},
            totalPledgeAmount: 0
          }, data);
          for (const key in initialState) {
            state[key] = initialState[key];
          }
          initFetchPeriodPayments({ contractID, meta, state, getters });
          state.waitingPeriod = getters.periodStampGivenDate(meta.createdDate);
        },
        sideEffect({ contractID }, { state }) {
          if (!state.generalChatRoomId) {
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, async () => {
              const state2 = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
              if (!state2 || state2.generalChatRoomId) return;
              const CSKid = findKeyIdByName(state2, "csk");
              const CEKid = findKeyIdByName(state2, "cek");
              (0, import_sbp7.default)("gi.actions/group/addChatRoom", {
                contractID,
                data: {
                  attributes: {
                    name: CHATROOM_GENERAL_NAME,
                    type: CHATROOM_TYPES.GROUP,
                    description: "",
                    privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP
                  }
                },
                signingKeyId: CSKid,
                encryptionKeyId: CEKid,
                // The #General chatroom does not have an inner signature as it's part
                // of the group creation process
                innerSigningContractID: null
              }).catch((e) => {
                console.error(`[gi.contracts/group/sideEffect] Error creating #General chatroom for ${contractID} (unable to send action)`, e);
              });
            }).catch((e) => {
              console.error(`[gi.contracts/group/sideEffect] Error creating #General chatroom for ${contractID}`, e);
            });
          }
        }
      },
      "gi.contracts/group/payment": {
        validate: actionRequireActiveMember(objectMaybeOf({
          // TODO: how to handle donations to okTurtles?
          // TODO: how to handle payments to groups or users outside of this group?
          toMemberID: stringMax(MAX_HASH_LEN, "toMemberID"),
          amount: numberRange(0, GROUP_MINCOME_MAX),
          currencyFromTo: tupleOf(string, string),
          // must be one of the keys in currencies.js (e.g. USD, EUR, etc.) TODO: handle old clients not having one of these keys, see OP_PROTOCOL_UPGRADE https://github.com/okTurtles/group-income/issues/603
          // multiply 'amount' by 'exchangeRate', which must always be
          // based on the initialCurrency of the period in which this payment was created.
          // it is then further multiplied by the period's 'mincomeExchangeRate', which
          // is modified if any proposals pass to change the mincomeCurrency
          exchangeRate: numberRange(0, GROUP_MINCOME_MAX),
          txid: stringMax(MAX_HASH_LEN, "txid"),
          status: paymentStatusType,
          paymentType,
          details: optional(object),
          memo: optional(stringMax(MAX_MEMO_LEN, "memo"))
        })),
        process({ data, meta, hash, contractID, height, innerSigningContractID }, { state, getters }) {
          if (data.status === PAYMENT_COMPLETED) {
            console.error(`payment: payment ${hash} cannot have status = 'completed'!`, { data, meta, hash });
            throw new errors_exports.GIErrorIgnoreAndBan("payments cannot be instantly completed!");
          }
          state.payments[hash] = {
            data: {
              ...data,
              fromMemberID: innerSigningContractID,
              groupMincome: getters.groupMincomeAmount
            },
            height,
            meta,
            history: [[meta.createdDate, hash]]
          };
          const { paymentsFrom } = initFetchPeriodPayments({ contractID, meta, state, getters });
          const fromMemberID = fetchInitKV(paymentsFrom, innerSigningContractID, {});
          const toMemberID = fetchInitKV(fromMemberID, data.toMemberID, []);
          toMemberID.push(hash);
        }
      },
      "gi.contracts/group/paymentUpdate": {
        validate: actionRequireActiveMember(objectMaybeOf({
          paymentHash: stringMax(MAX_HASH_LEN, "paymentHash"),
          updatedProperties: objectMaybeOf({
            status: paymentStatusType,
            details: object,
            memo: stringMax(MAX_MEMO_LEN, "memo")
          })
        })),
        process({ data, meta, hash, contractID, innerSigningContractID }, { state, getters }) {
          const payment = state.payments[data.paymentHash];
          if (!payment) {
            console.error(`paymentUpdate: no payment ${data.paymentHash}`, { data, meta, hash });
            throw new errors_exports.GIErrorIgnoreAndBan("paymentUpdate without existing payment");
          }
          if (innerSigningContractID !== payment.data.fromMemberID && innerSigningContractID !== payment.data.toMemberID) {
            console.error(`paymentUpdate: bad member ${innerSigningContractID} != ${payment.data.fromMemberID} != ${payment.data.toMemberID}`, { data, meta, hash });
            throw new errors_exports.GIErrorIgnoreAndBan("paymentUpdate from bad user!");
          }
          payment.history.push([meta.createdDate, hash]);
          merge(payment.data, data.updatedProperties);
          if (data.updatedProperties.status === PAYMENT_COMPLETED) {
            payment.data.completedDate = meta.createdDate;
            const updatePeriodStamp = getters.periodStampGivenDate(meta.createdDate);
            const paymentPeriodStamp = getters.periodStampGivenDate(payment.meta.createdDate);
            if (comparePeriodStamps(updatePeriodStamp, paymentPeriodStamp) > 0) {
              updateAdjustedDistribution({ period: paymentPeriodStamp, getters });
            } else {
              updateCurrentDistribution({ contractID, meta, state, getters });
            }
            const currentTotalPledgeAmount = fetchInitKV(state, "totalPledgeAmount", 0);
            state.totalPledgeAmount = currentTotalPledgeAmount + payment.data.amount;
          }
        },
        sideEffect({ meta, contractID, height, data, innerSigningContractID }, { state, getters }) {
          if (data.updatedProperties.status === PAYMENT_COMPLETED) {
            const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
            const payment = state.payments[data.paymentHash];
            if (loggedIn.identityContractID === payment.data.toMemberID) {
              const myProfile = getters.groupProfile(loggedIn.identityContractID);
              if (isActionNewerThanUserJoinedDate(height, myProfile)) {
                (0, import_sbp7.default)("gi.notifications/emit", "PAYMENT_RECEIVED", {
                  createdDate: meta.createdDate,
                  groupID: contractID,
                  creatorID: innerSigningContractID,
                  paymentHash: data.paymentHash,
                  amount: getters.withGroupCurrency(payment.data.amount)
                });
              }
            }
          }
        }
      },
      "gi.contracts/group/sendPaymentThankYou": {
        validate: actionRequireActiveMember(objectOf({
          toMemberID: stringMax(MAX_HASH_LEN, "toMemberID"),
          memo: stringMax(MAX_MEMO_LEN, "memo")
        })),
        process({ data, innerSigningContractID }, { state }) {
          const fromMemberID = fetchInitKV(state.thankYousFrom, innerSigningContractID, {});
          fromMemberID[data.toMemberID] = data.memo;
        },
        sideEffect({ contractID, meta, height, data, innerSigningContractID }, { getters }) {
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
          if (data.toMemberID === loggedIn.identityContractID) {
            const myProfile = getters.groupProfile(loggedIn.identityContractID);
            if (isActionNewerThanUserJoinedDate(height, myProfile)) {
              (0, import_sbp7.default)("gi.notifications/emit", "PAYMENT_THANKYOU_SENT", {
                createdDate: meta.createdDate,
                groupID: contractID,
                fromMemberID: innerSigningContractID,
                toMemberID: data.toMemberID
              });
            }
          }
        }
      },
      "gi.contracts/group/proposal": {
        validate: actionRequireActiveMember((data, { state }) => {
          objectOf({
            proposalType,
            proposalData: object,
            // data for Vue widgets
            votingRule: ruleType,
            expires_date_ms: numberRange(0, Number.MAX_SAFE_INTEGER)
            // calculate by grabbing proposal expiry from group properties and add to `meta.createdDate`
          })(data);
          const dataToCompare = omit(data.proposalData, ["reason"]);
          for (const hash in state.proposals) {
            const prop = state.proposals[hash];
            if (prop.status !== STATUS_OPEN || prop.data.proposalType !== data.proposalType) {
              continue;
            }
            if (deepEqualJSONType(omit(prop.data.proposalData, ["reason"]), dataToCompare)) {
              throw new TypeError(L("There is an identical open proposal."));
            }
          }
        }),
        process({ data, meta, hash, height, innerSigningContractID }, { state }) {
          state.proposals[hash] = {
            data,
            meta,
            height,
            creatorID: innerSigningContractID,
            votes: { [innerSigningContractID]: VOTE_FOR },
            status: STATUS_OPEN,
            notifiedBeforeExpire: false,
            payload: null
            // set later by group/proposalVote
          };
        },
        sideEffect({ contractID, meta, hash, data, height, innerSigningContractID }, { getters }) {
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
          const typeToSubTypeMap = {
            [PROPOSAL_INVITE_MEMBER]: "ADD_MEMBER",
            [PROPOSAL_REMOVE_MEMBER]: "REMOVE_MEMBER",
            [PROPOSAL_GROUP_SETTING_CHANGE]: {
              mincomeAmount: "CHANGE_MINCOME",
              distributionDate: "CHANGE_DISTRIBUTION_DATE"
            }[data.proposalData.setting],
            [PROPOSAL_PROPOSAL_SETTING_CHANGE]: "CHANGE_VOTING_RULE",
            [PROPOSAL_GENERIC]: "GENERIC"
          };
          const myProfile = getters.groupProfile(loggedIn.identityContractID);
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            (0, import_sbp7.default)("gi.notifications/emit", "NEW_PROPOSAL", {
              createdDate: meta.createdDate,
              groupID: contractID,
              creatorID: innerSigningContractID,
              proposalHash: hash,
              subtype: typeToSubTypeMap[data.proposalType]
            });
          }
        }
      },
      "gi.contracts/group/proposalVote": {
        validate: actionRequireActiveMember(objectOf({
          proposalHash: stringMax(MAX_HASH_LEN, "proposalHash"),
          vote: voteType,
          passPayload: optional(unionOf(object, string))
          // TODO: this, somehow we need to send an OP_KEY_ADD GIMessage to add a generated once-only writeonly message public key to the contract, and (encrypted) include the corresponding invite link, also, we need all clients to verify that this message/operation was valid to prevent a hacked client from adding arbitrary OP_KEY_ADD messages, and automatically ban anyone generating such messages
        })),
        async process(message, { state, getters }) {
          const { data, hash, meta, innerSigningContractID } = message;
          const proposal = state.proposals[data.proposalHash];
          if (!proposal) {
            console.error(`proposalVote: no proposal for ${data.proposalHash}!`, { data, meta, hash });
            throw new errors_exports.GIErrorIgnoreAndBan("proposalVote without existing proposal");
          }
          proposal.votes[innerSigningContractID] = data.vote;
          if (new Date(meta.createdDate).getTime() > proposal.data.expires_date_ms) {
            console.warn("proposalVote: vote on expired proposal!", { proposal, data, meta });
            return;
          }
          const result = rules_default[proposal.data.votingRule](state, proposal.data.proposalType, proposal.votes);
          if (result === VOTE_FOR || result === VOTE_AGAINST) {
            proposal["dateClosed"] = meta.createdDate;
            await proposals_default[proposal.data.proposalType][result](state, message);
            const votedMemberIDs = Object.keys(proposal.votes);
            for (const memberID of getters.groupMembersByContractID) {
              const memberCurrentStreak = fetchInitKV(getters.groupStreaks.noVotes, memberID, 0);
              const memberHasVoted = votedMemberIDs.includes(memberID);
              getters.groupStreaks.noVotes[memberID] = memberHasVoted ? 0 : memberCurrentStreak + 1;
            }
          }
        }
      },
      "gi.contracts/group/proposalCancel": {
        validate: actionRequireActiveMember(objectOf({
          proposalHash: stringMax(MAX_HASH_LEN, "proposalHash")
        })),
        process({ data, meta, contractID, innerSigningContractID, height }, { state }) {
          const proposal = state.proposals[data.proposalHash];
          if (!proposal) {
            console.error(`proposalCancel: no proposal for ${data.proposalHash}!`, { data, meta });
            throw new errors_exports.GIErrorIgnoreAndBan("proposalVote without existing proposal");
          } else if (proposal.creatorID !== innerSigningContractID) {
            console.error(`proposalCancel: proposal ${data.proposalHash} belongs to ${proposal.creatorID} not ${innerSigningContractID}!`, { data, meta });
            throw new errors_exports.GIErrorIgnoreAndBan("proposalWithdraw for wrong user!");
          }
          proposal["status"] = STATUS_CANCELLED;
          proposal["dateClosed"] = meta.createdDate;
          notifyAndArchiveProposal({ state, proposalHash: data.proposalHash, proposal, contractID, meta, height });
        }
      },
      "gi.contracts/group/markProposalsExpired": {
        validate: actionRequireActiveMember(objectOf({
          proposalIds: arrayOf(stringMax(MAX_HASH_LEN))
        })),
        process({ data, meta, contractID, height }, { state }) {
          if (data.proposalIds.length) {
            for (const proposalId of data.proposalIds) {
              const proposal = state.proposals[proposalId];
              if (proposal) {
                proposal["status"] = STATUS_EXPIRED;
                proposal["dateClosed"] = meta.createdDate;
                notifyAndArchiveProposal({ state, proposalHash: proposalId, proposal, contractID, meta, height });
              }
            }
          }
        }
      },
      "gi.contracts/group/notifyExpiringProposals": {
        validate: actionRequireActiveMember(objectOf({
          proposalIds: arrayOf(string)
        })),
        process({ data }, { state }) {
          for (const proposalId of data.proposalIds) {
            state.proposals[proposalId]["notifiedBeforeExpire"] = true;
          }
        },
        sideEffect({ data, height, contractID }, { state, getters }) {
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
          const myProfile = getters.groupProfile(loggedIn.identityContractID);
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            for (const proposalId of data.proposalIds) {
              const proposal = state.proposals[proposalId];
              (0, import_sbp7.default)("gi.notifications/emit", "PROPOSAL_EXPIRING", {
                groupID: contractID,
                proposal,
                proposalId
              });
            }
          }
        }
      },
      "gi.contracts/group/removeMember": {
        validate: actionRequireActiveMember((data, { state, getters, message: { innerSigningContractID, proposalHash } }) => {
          objectOf({
            memberID: optional(stringMax(MAX_HASH_LEN)),
            // member to remove
            reason: optional(stringMax(GROUP_DESCRIPTION_MAX_CHAR)),
            automated: optional(boolean)
          })(data);
          const memberToRemove = data.memberID || innerSigningContractID;
          const membersCount = getters.groupMembersCount;
          const isGroupCreator = innerSigningContractID === getters.currentGroupOwnerID;
          if (!state.profiles[memberToRemove]) {
            throw new GIGroupNotJoinedError(L("Not part of the group."));
          }
          if (membersCount === 1) {
            throw new TypeError(L("Cannot remove the last member."));
          }
          if (memberToRemove === innerSigningContractID) {
            return true;
          }
          if (isGroupCreator) {
            return true;
          } else if (membersCount < 3) {
            throw new TypeError(L("Only the group creator can remove members."));
          } else {
            const proposal = state.proposals[proposalHash];
            if (!proposal) {
              throw new TypeError(L("Admin credentials needed and not implemented yet."));
            }
          }
        }),
        process({ data, meta, contractID, height, innerSigningContractID }, { state, getters }) {
          const memberID = data.memberID || innerSigningContractID;
          const identityContractID = (0, import_sbp7.default)("state/vuex/state").loggedIn?.identityContractID;
          if (memberID === identityContractID) {
            const ourChatrooms = Object.entries(state?.chatRooms || {}).filter(([, state2]) => state2.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID);
            if (ourChatrooms.length) {
              (0, import_sbp7.default)(
                "gi.contracts/group/pushSideEffect",
                contractID,
                ["gi.contracts/group/referenceTally", contractID, ourChatrooms, "release"]
              );
            }
          }
          memberLeaves(
            { memberID, dateLeft: meta.createdDate, heightLeft: height, ourselvesLeaving: memberID === identityContractID },
            { contractID, meta, state, getters }
          );
        },
        sideEffect({ data, meta, contractID, height, innerSigningContractID, proposalHash }, { state, getters }) {
          const memberID = data.memberID || innerSigningContractID;
          (0, import_sbp7.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp7.default)("chelonia/contract/setPendingKeyRevocation", contractID, ["cek", "csk"]));
          (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, memberID, "release");
          (0, import_sbp7.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp7.default)("gi.contracts/group/leaveGroup", {
            data,
            meta,
            contractID,
            getters,
            height,
            innerSigningContractID,
            proposalHash
          })).catch((e) => {
            console.warn(`[gi.contracts/group/removeMember/sideEffect] Error ${e.name} during queueInvocation for ${contractID}`, e);
          });
        }
      },
      "gi.contracts/group/invite": {
        validate: actionRequireActiveMember(inviteType),
        process({ data }, { state }) {
          state.invites[data.inviteKeyId] = data;
        }
      },
      "gi.contracts/group/inviteAccept": {
        validate: actionRequireInnerSignature(objectOf({ reference: string })),
        process({ data, meta, height, innerSigningContractID }, { state }) {
          if (state.profiles[innerSigningContractID]?.status === PROFILE_STATUS.ACTIVE) {
            throw new Error(`[gi.contracts/group/inviteAccept] Existing members can't accept invites: ${innerSigningContractID}`);
          }
          state.profiles[innerSigningContractID] = initGroupProfile(meta.createdDate, height, data.reference);
        },
        // !! IMPORANT!!
        // Actions here MUST NOT modify contract state!
        // They MUST NOT call 'commit'!
        // They should only coordinate the actions of outside contracts.
        // Otherwise `latestContractState` and `handleEvent` will not produce same state!
        sideEffect({ meta, contractID, height, innerSigningContractID }) {
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
          (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, innerSigningContractID, "retain");
          (0, import_sbp7.default)("chelonia/queueInvocation", contractID, async () => {
            const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
            if (!state) {
              console.info(`[gi.contracts/group/inviteAccept] Contract ${contractID} has been removed`);
              return;
            }
            const { profiles = {} } = state;
            if (profiles[innerSigningContractID].status !== PROFILE_STATUS.ACTIVE) {
              return;
            }
            const userID = loggedIn.identityContractID;
            if (innerSigningContractID === userID) {
              await (0, import_sbp7.default)("gi.actions/identity/addJoinDirectMessageKey", userID, contractID, "csk");
              const generalChatRoomId = state.generalChatRoomId;
              if (generalChatRoomId) {
                if (state.chatRooms[generalChatRoomId]?.members?.[userID]?.status !== PROFILE_STATUS.ACTIVE) {
                  (0, import_sbp7.default)("gi.actions/group/joinChatRoom", {
                    contractID,
                    data: { chatRoomID: generalChatRoomId }
                  }).catch((e) => {
                    if (e?.name === "GIErrorUIRuntimeError" && e.cause?.name === "GIGroupAlreadyJoinedError") return;
                    console.error("Error while joining the #General chatroom", e);
                    (0, import_sbp7.default)("okTurtles.events/emit", ERROR_JOINING_CHATROOM, { identityContractID: userID, groupContractID: contractID, chatRoomID: generalChatRoomId });
                  });
                }
              } else {
                console.error("Couldn't join the chatroom in the group. Doesn't exist.", { chatroomName: CHATROOM_GENERAL_NAME });
                (0, import_sbp7.default)("okTurtles.events/emit", ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST, { identityContractID: userID, groupContractID: contractID });
              }
              (0, import_sbp7.default)("okTurtles.events/emit", JOINED_GROUP, { identityContractID: userID, groupContractID: contractID });
            } else if (isActionNewerThanUserJoinedDate(height, state?.profiles?.[userID])) {
              (0, import_sbp7.default)("gi.notifications/emit", "MEMBER_ADDED", {
                createdDate: meta.createdDate,
                groupID: contractID,
                memberID: innerSigningContractID
              });
            }
          }).catch((e) => {
            console.error("[gi.contracts/group/inviteAccept/sideEffect]: An error occurred", e);
          });
        }
      },
      "gi.contracts/group/inviteRevoke": {
        validate: actionRequireActiveMember((data, { state }) => {
          objectOf({
            inviteKeyId: stringMax(MAX_HASH_LEN, "inviteKeyId")
          })(data);
          if (!state._vm.invites[data.inviteKeyId]) {
            throw new TypeError(L("The link does not exist."));
          }
        }),
        process() {
        }
      },
      "gi.contracts/group/updateSettings": {
        // OPTIMIZE: Make this custom validation function
        // reusable accross other future validators
        validate: actionRequireActiveMember((data, { getters, meta, message: { innerSigningContractID } }) => {
          objectMaybeOf({
            groupName: stringMax(GROUP_NAME_MAX_CHAR, "groupName"),
            groupPicture: unionOf(string, objectOf({
              manifestCid: stringMax(MAX_HASH_LEN, "manifestCid"),
              downloadParams: optional(object)
            })),
            sharedValues: stringMax(GROUP_DESCRIPTION_MAX_CHAR, "sharedValues"),
            mincomeAmount: numberRange(Number.EPSILON, Number.MAX_VALUE),
            mincomeCurrency: stringMax(GROUP_CURRENCY_MAX_CHAR, "mincomeCurrency"),
            distributionDate: string,
            allowPublicChannels: boolean
          })(data);
          const isGroupCreator = innerSigningContractID === getters.currentGroupOwnerID;
          if ("allowPublicChannels" in data && !isGroupCreator) {
            throw new TypeError(L("Only group creator can allow public channels."));
          } else if ("distributionDate" in data && !isGroupCreator) {
            throw new TypeError(L("Only group creator can update distribution date."));
          } else if ("distributionDate" in data && (getters.groupDistributionStarted(meta.createdDate) || Object.keys(getters.groupPeriodPayments).length > 1)) {
            throw new TypeError(L("Can't change distribution date because distribution period has already started."));
          }
        }),
        process({ contractID, meta, data, height, innerSigningContractID, proposalHash }, { state, getters }) {
          const mincomeCache = "mincomeAmount" in data ? state.settings.mincomeAmount : null;
          for (const key in data) {
            state.settings[key] = data[key];
          }
          if ("distributionDate" in data) {
            state["paymentsByPeriod"] = {};
            initFetchPeriodPayments({ contractID, meta, state, getters });
          }
          if (mincomeCache !== null && !proposalHash) {
            (0, import_sbp7.default)(
              "gi.contracts/group/pushSideEffect",
              contractID,
              [
                "gi.contracts/group/sendMincomeChangedNotification",
                contractID,
                meta,
                {
                  toAmount: data.mincomeAmount,
                  fromAmount: mincomeCache
                },
                height,
                innerSigningContractID
              ]
            );
          }
        }
      },
      "gi.contracts/group/groupProfileUpdate": {
        validate: actionRequireActiveMember(objectMaybeOf({
          incomeDetailsType: validatorFrom((x) => ["incomeAmount", "pledgeAmount"].includes(x)),
          incomeAmount: numberRange(0, Number.MAX_VALUE),
          pledgeAmount: numberRange(0, GROUP_MAX_PLEDGE_AMOUNT, "pledgeAmount"),
          nonMonetaryAdd: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "nonMonetaryAdd"),
          nonMonetaryEdit: objectOf({
            replace: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "replace"),
            with: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "with")
          }),
          nonMonetaryRemove: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "nonMonetaryRemove"),
          nonMonetaryReplace: arrayOf(stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR)),
          paymentMethods: arrayOf(
            objectOf({
              name: stringMax(GROUP_NAME_MAX_CHAR),
              value: stringMax(GROUP_PAYMENT_METHOD_MAX_CHAR, "paymentMethods.value")
            })
          )
        })),
        process({ data, meta, contractID, height, innerSigningContractID }, { state, getters }) {
          const groupProfile = state.profiles[innerSigningContractID];
          const nonMonetary = groupProfile.nonMonetaryContributions;
          const isUpdatingNonMonetary = Object.keys(data).some(
            (key) => ["nonMonetaryAdd", "nonMonetaryRemove", "nonMonetaryEdit", "nonMonetaryReplace"].includes(key)
          );
          const prevNonMonetary = nonMonetary.slice();
          for (const key in data) {
            const value = data[key];
            switch (key) {
              case "nonMonetaryAdd":
                nonMonetary.push(value);
                break;
              case "nonMonetaryRemove":
                nonMonetary.splice(nonMonetary.indexOf(value), 1);
                break;
              case "nonMonetaryEdit":
                nonMonetary.splice(nonMonetary.indexOf(value.replace), 1, value.with);
                break;
              case "nonMonetaryReplace":
                groupProfile.nonMonetaryContributions = cloneDeep(value);
                break;
              default:
                groupProfile[key] = value;
            }
          }
          if (isUpdatingNonMonetary && (prevNonMonetary.length || groupProfile.nonMonetaryContributions.length)) {
            (0, import_sbp7.default)(
              "gi.contracts/group/pushSideEffect",
              contractID,
              ["gi.contracts/group/sendNonMonetaryUpdateNotification", {
                contractID,
                // group contractID
                innerSigningContractID,
                // identity contract ID of the group-member being updated
                meta,
                height,
                getters,
                updateData: {
                  prev: prevNonMonetary,
                  after: groupProfile.nonMonetaryContributions.slice()
                }
              }]
            );
          }
          if (data.incomeDetailsType) {
            groupProfile["incomeDetailsLastUpdatedDate"] = meta.createdDate;
            updateCurrentDistribution({ contractID, meta, state, getters });
          }
        }
      },
      "gi.contracts/group/updateAllVotingRules": {
        validate: actionRequireActiveMember(objectMaybeOf({
          ruleName: (x) => [RULE_PERCENTAGE, RULE_DISAGREEMENT].includes(x),
          ruleThreshold: number,
          expires_ms: number
        })),
        process({ data }, { state }) {
          if (data.ruleName && data.ruleThreshold) {
            for (const proposalSettings in state.settings.proposals) {
              state.settings.proposals[proposalSettings]["rule"] = data.ruleName;
              state.settings.proposals[proposalSettings].ruleSettings[data.ruleName]["threshold"] = data.ruleThreshold;
            }
          }
        }
      },
      "gi.contracts/group/addChatRoom": {
        // The #General chatroom is added without an inner signature
        validate: (data) => {
          objectOf({
            chatRoomID: stringMax(MAX_HASH_LEN, "chatRoomID"),
            attributes: chatRoomAttributesType
          })(data);
          const chatroomName = data.attributes.name;
          const nameValidationMap = {
            [L("Chatroom name cannot contain white-space")]: (v) => /\s/g.test(v),
            [L("Chatroom name must be lower-case only")]: (v) => /[A-Z]/g.test(v)
          };
          for (const key in nameValidationMap) {
            const check = nameValidationMap[key];
            if (check(chatroomName)) {
              throw new TypeError(key);
            }
          }
        },
        process({ data, contractID, innerSigningContractID }, { state }) {
          const { name, type, privacyLevel, description } = data.attributes;
          if (!!innerSigningContractID === (data.attributes.name === CHATROOM_GENERAL_NAME)) {
            throw new Error("All chatrooms other than #General must have an inner signature and the #General chatroom must have no inner signature");
          }
          state.chatRooms[data.chatRoomID] = {
            creatorID: innerSigningContractID || contractID,
            name,
            description,
            type,
            privacyLevel,
            deletedDate: null,
            members: {}
          };
          if (!state.generalChatRoomId) {
            state["generalChatRoomId"] = data.chatRoomID;
          }
        },
        sideEffect({ contractID, data }, { state }) {
          if (data.chatRoomID === state.generalChatRoomId) {
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, () => {
              const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
              if (state.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE && state.chatRooms?.[contractID]?.members[identityContractID]?.status !== PROFILE_STATUS.ACTIVE) {
                (0, import_sbp7.default)("gi.actions/group/joinChatRoom", {
                  contractID,
                  data: {
                    chatRoomID: data.chatRoomID
                  }
                }).catch((e) => {
                  console.error("Unable to add ourselves to the #General chatroom", e);
                });
              }
            });
          }
        }
      },
      "gi.contracts/group/deleteChatRoom": {
        validate: actionRequireActiveMember((data, { getters, message: { innerSigningContractID } }) => {
          objectOf({ chatRoomID: stringMax(MAX_HASH_LEN, "chatRoomID") })(data);
          if (getters.groupChatRooms[data.chatRoomID].creatorID !== innerSigningContractID) {
            throw new TypeError(L("Only the channel creator can delete channel."));
          }
        }),
        process({ contractID, data }, { state }) {
          const identityContractID = (0, import_sbp7.default)("state/vuex/state").loggedIn?.identityContractID;
          if (identityContractID && state?.chatRooms[data.chatRoomID]?.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE) {
            (0, import_sbp7.default)(
              "gi.contracts/group/pushSideEffect",
              contractID,
              ["gi.contracts/group/referenceTally", contractID, data.chatRoomID, "release"]
            );
          }
          delete state.chatRooms[data.chatRoomID];
        },
        sideEffect({ data, contractID, innerSigningContractID }) {
          (0, import_sbp7.default)("okTurtles.events/emit", DELETED_CHATROOM, { groupContractID: contractID, chatRoomID: data.chatRoomID });
          const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
          if (identityContractID === innerSigningContractID) {
            (0, import_sbp7.default)("gi.actions/chatroom/delete", { contractID: data.chatRoomID, data: {} }).catch((e) => {
              console.log(`Error sending chatroom removal action for ${data.chatRoomID}`, e);
            });
          }
        }
      },
      "gi.contracts/group/leaveChatRoom": {
        validate: actionRequireActiveMember(objectOf({
          chatRoomID: stringMax(MAX_HASH_LEN, "chatRoomID"),
          memberID: optional(stringMax(MAX_HASH_LEN), "memberID"),
          // `joinedHeight` is the height used in the corresponding join action
          joinedHeight: numberRange(1, Number.MAX_SAFE_INTEGER)
        })),
        process({ data, innerSigningContractID }, { state }) {
          if (!state.chatRooms[data.chatRoomID]) {
            throw new Error("Cannot leave a chatroom which isn't part of the group");
          }
          const memberID = data.memberID || innerSigningContractID;
          if (state.chatRooms[data.chatRoomID].members[memberID]?.status !== PROFILE_STATUS.ACTIVE || state.chatRooms[data.chatRoomID].members[memberID].joinedHeight !== data.joinedHeight) {
            throw new Error("Cannot leave a chatroom that you're not part of");
          }
          removeGroupChatroomProfile(state, data.chatRoomID, memberID);
        },
        sideEffect({ data, contractID, innerSigningContractID }, { state }) {
          const memberID = data.memberID || innerSigningContractID;
          const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
          if (innerSigningContractID === identityContractID) {
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, async () => {
              const state2 = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
              if (state2?.profiles?.[innerSigningContractID]?.status === PROFILE_STATUS.ACTIVE && state2.chatRooms?.[data.chatRoomID]?.members[memberID]?.status === PROFILE_STATUS.REMOVED && state2.chatRooms[data.chatRoomID].members[memberID].joinedHeight === data.joinedHeight) {
                await leaveChatRoomAction(contractID, state2, data.chatRoomID, memberID, innerSigningContractID);
              }
            }).catch((e) => {
              console.error(`[gi.contracts/group/leaveChatRoom/sideEffect] Error for ${contractID}`, { contractID, data, error: e });
            });
          }
          if (memberID === identityContractID) {
            (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, data.chatRoomID, "release");
            (0, import_sbp7.default)("okTurtles.events/emit", LEFT_CHATROOM, {
              identityContractID,
              groupContractID: contractID,
              chatRoomID: data.chatRoomID
            });
          }
        }
      },
      "gi.contracts/group/joinChatRoom": {
        validate: actionRequireActiveMember(objectMaybeOf({
          memberID: optional(stringMax(MAX_HASH_LEN, "memberID")),
          chatRoomID: stringMax(MAX_HASH_LEN, "chatRoomID")
        })),
        process({ data, height, innerSigningContractID }, { state }) {
          const memberID = data.memberID || innerSigningContractID;
          const { chatRoomID } = data;
          if (state.profiles[memberID]?.status !== PROFILE_STATUS.ACTIVE) {
            throw new Error("Cannot join a chatroom for a group you're not a member of");
          }
          if (!state.chatRooms[chatRoomID]) {
            throw new Error("Cannot join a chatroom which isn't part of the group");
          }
          if (state.chatRooms[chatRoomID].members[memberID]?.status === PROFILE_STATUS.ACTIVE) {
            throw new GIGroupAlreadyJoinedError("Cannot join a chatroom that you're already part of");
          }
          state.chatRooms[chatRoomID].members[memberID] = { status: PROFILE_STATUS.ACTIVE, joinedHeight: height };
        },
        sideEffect({ data, contractID, height, innerSigningContractID }) {
          const memberID = data.memberID || innerSigningContractID;
          const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
          if (memberID === identityContractID) {
            (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, data.chatRoomID, "retain");
          }
          if (innerSigningContractID === identityContractID) {
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp7.default)("gi.contracts/group/joinGroupChatrooms", contractID, data.chatRoomID, identityContractID, memberID, height)).catch((e) => {
              console.warn(`[gi.contracts/group/joinChatRoom/sideEffect] Error adding member to group chatroom for ${contractID}`, { e, data });
            });
          }
        }
      },
      "gi.contracts/group/renameChatRoom": {
        validate: actionRequireActiveMember(objectOf({
          chatRoomID: stringMax(MAX_HASH_LEN, "chatRoomID"),
          name: stringMax(CHATROOM_NAME_LIMITS_IN_CHARS, "name")
        })),
        process({ data }, { state }) {
          state.chatRooms[data.chatRoomID]["name"] = data.name;
        }
      },
      "gi.contracts/group/changeChatRoomDescription": {
        validate: actionRequireActiveMember(objectOf({
          chatRoomID: stringMax(MAX_HASH_LEN, "chatRoomID"),
          description: stringMax(CHATROOM_DESCRIPTION_LIMITS_IN_CHARS, "description")
        })),
        process({ data }, { state }) {
          state.chatRooms[data.chatRoomID]["description"] = data.description;
        }
      },
      "gi.contracts/group/updateDistributionDate": {
        validate: actionRequireActiveMember(optional),
        process({ meta }, { state, getters }) {
          const period = getters.periodStampGivenDate(meta.createdDate);
          const current = state.settings?.distributionDate;
          if (current !== period) {
            updateGroupStreaks({ state, getters });
            state.settings.distributionDate = period;
          }
        }
      },
      "gi.contracts/group/upgradeFrom1.0.7": {
        validate: actionRequireActiveMember(optional),
        process({ height }, { state }) {
          let changed = false;
          Object.values(state.chatRooms).forEach((chatroom) => {
            Object.values(chatroom.members).forEach((member) => {
              if (member.status === PROFILE_STATUS.ACTIVE && member.joinedHeight == null) {
                member.joinedHeight = height;
                changed = true;
              }
            });
          });
          if (!changed) {
            throw new Error("[gi.contracts/group/upgradeFrom1.0.7/process] Invalid or duplicate upgrade action");
          }
        }
      },
      ...""
      // TODO: remove group profile when leave group is implemented
    },
    // methods are SBP selectors that are version-tracked for each contract.
    // in other words, you can use them to define SBP selectors that will
    // contain functions that you can modify across different contract versions,
    // and when the contract calls them, it will use that specific version of the
    // method.
    //
    // They are useful when used in conjunction with pushSideEffect from process
    // functions.
    //
    // IMPORTANT: they MUST begin with the name of the contract.
    methods: {
      "gi.contracts/group/_cleanup": ({ contractID, state }) => {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const dependentContractIDs = [
          ...Object.entries(state?.profiles || {}).filter(([, state2]) => state2.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID),
          ...Object.entries(state?.chatRooms || {}).filter(([, state2]) => state2.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID)
        ];
        if (dependentContractIDs.length) {
          (0, import_sbp7.default)("chelonia/contract/release", dependentContractIDs).catch((e) => {
            console.error("[gi.contracts/group/_cleanup] Error calling release", contractID, e);
          });
        }
        Promise.all(
          [
            () => (0, import_sbp7.default)("gi.contracts/group/removeArchivedProposals", contractID),
            () => (0, import_sbp7.default)("gi.contracts/group/removeArchivedPayments", contractID)
          ]
        ).catch((e) => {
          console.error(`[gi.contracts/group/_cleanup] Error removing entries for archive for ${contractID}`, e);
        });
      },
      "gi.contracts/group/archiveProposal": async function(contractID, proposalHash, proposal) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const key = `proposals/${identityContractID}/${contractID}`;
        const proposals2 = await (0, import_sbp7.default)("gi.db/archive/load", key) || [];
        if (proposals2.some(([archivedProposalHash]) => archivedProposalHash === proposalHash)) {
          return;
        }
        proposals2.unshift([proposalHash, proposal]);
        while (proposals2.length > MAX_ARCHIVED_PROPOSALS) {
          proposals2.pop();
        }
        await (0, import_sbp7.default)("gi.db/archive/save", key, proposals2);
        (0, import_sbp7.default)("okTurtles.events/emit", PROPOSAL_ARCHIVED, contractID, proposalHash, proposal);
      },
      "gi.contracts/group/archivePayments": async function(contractID, archivingPayments) {
        const { paymentsByPeriod, payments } = archivingPayments;
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`;
        const archPaymentsByPeriod = await (0, import_sbp7.default)("gi.db/archive/load", archPaymentsByPeriodKey) || {};
        const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`;
        const archSentOrReceivedPayments = await (0, import_sbp7.default)("gi.db/archive/load", archSentOrReceivedPaymentsKey) || { sent: [], received: [] };
        const sortPayments = (payments2) => payments2.sort((f, l) => l.height - f.height);
        for (const period of Object.keys(paymentsByPeriod).sort()) {
          archPaymentsByPeriod[period] = paymentsByPeriod[period];
          const newSentOrReceivedPayments = { sent: [], received: [] };
          const { paymentsFrom } = paymentsByPeriod[period];
          for (const fromMemberID of Object.keys(paymentsFrom)) {
            for (const toMemberID of Object.keys(paymentsFrom[fromMemberID])) {
              if (toMemberID === identityContractID || fromMemberID === identityContractID) {
                const receivedOrSent = toMemberID === identityContractID ? "received" : "sent";
                for (const hash of paymentsFrom[fromMemberID][toMemberID]) {
                  const { data, meta, height } = payments[hash];
                  newSentOrReceivedPayments[receivedOrSent].push({ hash, period, height, data, meta, amount: data.amount });
                }
              }
            }
          }
          archSentOrReceivedPayments.sent = [...sortPayments(newSentOrReceivedPayments.sent), ...archSentOrReceivedPayments.sent];
          archSentOrReceivedPayments.received = [...sortPayments(newSentOrReceivedPayments.received), ...archSentOrReceivedPayments.received];
          const archPaymentsKey = `payments/${identityContractID}/${period}/${contractID}`;
          const hashes = paymentHashesFromPaymentPeriod(paymentsByPeriod[period]);
          const archPayments = Object.fromEntries(hashes.map((hash) => [hash, payments[hash]]));
          while (Object.keys(archPaymentsByPeriod).length > MAX_ARCHIVED_PERIODS) {
            const shouldBeDeletedPeriod = Object.keys(archPaymentsByPeriod).sort().shift();
            const paymentHashes = paymentHashesFromPaymentPeriod(archPaymentsByPeriod[shouldBeDeletedPeriod]);
            await (0, import_sbp7.default)("gi.db/archive/delete", `payments/${shouldBeDeletedPeriod}/${identityContractID}/${contractID}`);
            delete archPaymentsByPeriod[shouldBeDeletedPeriod];
            archSentOrReceivedPayments.sent = archSentOrReceivedPayments.sent.filter((payment) => !paymentHashes.includes(payment.hash));
            archSentOrReceivedPayments.received = archSentOrReceivedPayments.received.filter((payment) => !paymentHashes.includes(payment.hash));
          }
          await (0, import_sbp7.default)("gi.db/archive/save", archPaymentsKey, archPayments);
        }
        await (0, import_sbp7.default)("gi.db/archive/save", archPaymentsByPeriodKey, archPaymentsByPeriod);
        await (0, import_sbp7.default)("gi.db/archive/save", archSentOrReceivedPaymentsKey, archSentOrReceivedPayments);
        (0, import_sbp7.default)("okTurtles.events/emit", PAYMENTS_ARCHIVED, { paymentsByPeriod, payments });
      },
      "gi.contracts/group/removeArchivedProposals": async function(contractID) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const key = `proposals/${identityContractID}/${contractID}`;
        await (0, import_sbp7.default)("gi.db/archive/delete", key);
      },
      "gi.contracts/group/removeArchivedPayments": async function(contractID) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`;
        const periods = Object.keys(await (0, import_sbp7.default)("gi.db/archive/load", archPaymentsByPeriodKey) || {});
        const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`;
        for (const period of periods) {
          const archPaymentsKey = `payments/${identityContractID}/${period}/${contractID}`;
          await (0, import_sbp7.default)("gi.db/archive/delete", archPaymentsKey);
        }
        await (0, import_sbp7.default)("gi.db/archive/delete", archPaymentsByPeriodKey);
        await (0, import_sbp7.default)("gi.db/archive/delete", archSentOrReceivedPaymentsKey);
      },
      "gi.contracts/group/makeNotificationWhenProposalClosed": function(state, contractID, meta, height, proposalHash, proposal) {
        const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
        if (isActionNewerThanUserJoinedDate(height, state.profiles[loggedIn.identityContractID])) {
          (0, import_sbp7.default)("gi.notifications/emit", "PROPOSAL_CLOSED", { createdDate: meta.createdDate, groupID: contractID, proposalHash, proposal });
        }
      },
      "gi.contracts/group/sendMincomeChangedNotification": async function(contractID, meta, data, height, innerSigningContractID) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const myProfile = (await (0, import_sbp7.default)("chelonia/contract/state", contractID)).profiles[identityContractID];
        const { fromAmount, toAmount } = data;
        if (isActionNewerThanUserJoinedDate(height, myProfile) && myProfile.incomeDetailsType) {
          const memberType = myProfile.incomeDetailsType === "pledgeAmount" ? "pledging" : "receiving";
          const mincomeIncreased = toAmount > fromAmount;
          const actionNeeded = mincomeIncreased || memberType === "receiving" && !mincomeIncreased && myProfile.incomeAmount < fromAmount && myProfile.incomeAmount > toAmount;
          if (!actionNeeded) {
            return;
          }
          if (memberType === "receiving" && !mincomeIncreased) {
            await (0, import_sbp7.default)("gi.actions/group/groupProfileUpdate", {
              contractID,
              data: {
                incomeDetailsType: "pledgeAmount",
                pledgeAmount: 0
              }
            });
          }
          (0, import_sbp7.default)("gi.notifications/emit", "MINCOME_CHANGED", {
            createdDate: meta.createdDate,
            groupID: contractID,
            creatorID: innerSigningContractID,
            to: toAmount,
            memberType,
            increased: mincomeIncreased
          });
        }
      },
      "gi.contracts/group/joinGroupChatrooms": async function(contractID, chatRoomID, originalActorID, memberID, height) {
        const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
        const actorID = (0, import_sbp7.default)("state/vuex/state").loggedIn.identityContractID;
        if (actorID !== originalActorID) {
          console.info("[gi.contracts/group/joinGroupChatrooms] Session changed", {
            actorID,
            contractID,
            chatRoomID,
            originalActorID,
            memberID,
            height
          });
          return;
        }
        if (state?.profiles?.[actorID]?.status !== PROFILE_STATUS.ACTIVE || state?.profiles?.[memberID]?.status !== PROFILE_STATUS.ACTIVE || state?.chatRooms?.[chatRoomID]?.members[memberID]?.status !== PROFILE_STATUS.ACTIVE || state?.chatRooms?.[chatRoomID]?.members[memberID]?.joinedHeight !== height) {
          console.info("[gi.contracts/group/joinGroupChatrooms] Skipping outdated action", {
            actorID,
            contractID,
            chatRoomID,
            originalActorID,
            memberID,
            height,
            groupStatusActor: state?.profiles?.[actorID]?.status,
            groupSatusMember: state?.profiles?.[memberID]?.status,
            chatRoomStatus: state?.chatRooms?.[chatRoomID]?.members[memberID]?.status,
            chatRoomHeight: state?.chatRooms?.[chatRoomID]?.members[memberID]?.joinedHeight
          });
          return;
        }
        {
          await (0, import_sbp7.default)("chelonia/contract/retain", chatRoomID, { ephemeral: true });
          if (!await (0, import_sbp7.default)("chelonia/contract/hasKeysToPerformOperation", chatRoomID, "gi.contracts/chatroom/join")) {
            throw new Error(`Missing keys to join chatroom ${chatRoomID}`);
          }
          const encryptionKeyId = (0, import_sbp7.default)("chelonia/contract/currentKeyIdByName", state, "cek", true);
          (0, import_sbp7.default)("gi.actions/chatroom/join", {
            contractID: chatRoomID,
            data: actorID === memberID ? {} : { memberID },
            encryptionKeyId
          }).catch((e) => {
            if (e.name === "GIErrorUIRuntimeError" && e.cause?.name === "GIChatroomAlreadyMemberError") {
              return;
            }
            console.warn(`[gi.contracts/group/joinGroupChatrooms] Unable to join ${memberID} to chatroom ${chatRoomID} for group ${contractID}`, e);
          }).finally(() => {
            (0, import_sbp7.default)("chelonia/contract/release", chatRoomID, { ephemeral: true }).catch((e) => console.error("[gi.contracts/group/joinGroupChatrooms] Error during release", e));
          });
        }
      },
      // eslint-disable-next-line require-await
      "gi.contracts/group/leaveGroup": async ({ data, meta, contractID, height, getters, innerSigningContractID, proposalHash }) => {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const memberID = data.memberID || innerSigningContractID;
        const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
        if (!state) {
          console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: contract has been removed`);
          return;
        }
        if (state.profiles?.[memberID]?.status !== PROFILE_STATUS.REMOVED) {
          console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: member has not left`, { contractID, memberID, status: state.profiles?.[memberID]?.status });
          return;
        }
        if (memberID === identityContractID) {
          const areWeRejoining = async () => {
            const pendingKeyShares = await (0, import_sbp7.default)("chelonia/contract/waitingForKeyShareTo", state, identityContractID);
            if (pendingKeyShares) {
              console.info("[gi.contracts/group/leaveGroup] Not removing group contract because it has a pending key share for ourselves", contractID);
              return true;
            }
            const sentKeyShares = await (0, import_sbp7.default)("chelonia/contract/successfulKeySharesByContractID", state, identityContractID);
            if (sentKeyShares?.[identityContractID]?.[0].height > state.profiles[memberID].departedHeight) {
              console.info("[gi.contracts/group/leaveGroup] Not removing group contract because it has shared keys with ourselves after we left", contractID);
              return true;
            }
            return false;
          };
          if (await areWeRejoining()) {
            console.info("[gi.contracts/group/leaveGroup] aborting as we're rejoining", contractID);
            return;
          }
        }
        leaveAllChatRoomsUponLeaving(contractID, state, memberID, innerSigningContractID).catch((e) => {
          console.warn("[gi.contracts/group/leaveGroup]: Error while leaving all chatrooms", e);
        });
        if (memberID === identityContractID) {
          (0, import_sbp7.default)("gi.actions/identity/leaveGroup", {
            contractID: identityContractID,
            data: {
              groupContractID: contractID,
              reference: state.profiles[identityContractID].reference
            }
          }).catch((e) => {
            console.warn(`[gi.contracts/group/leaveGroup] ${e.name} thrown by gi.contracts/identity/leaveGroup ${identityContractID} for ${contractID}:`, e);
          });
        } else {
          const myProfile = getters.groupProfile(identityContractID);
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            if (!proposalHash) {
              const memberRemovedThemselves = memberID === innerSigningContractID;
              (0, import_sbp7.default)("gi.notifications/emit", memberRemovedThemselves ? "MEMBER_LEFT" : "MEMBER_REMOVED", {
                createdDate: meta.createdDate,
                groupID: contractID,
                memberID
              });
            }
            Promise.resolve().then(() => (0, import_sbp7.default)("gi.contracts/group/rotateKeys", contractID)).then(() => (0, import_sbp7.default)("gi.contracts/group/revokeGroupKeyAndRotateOurPEK", contractID)).catch((e) => {
              console.warn(`[gi.contracts/group/leaveGroup] for ${contractID}: Error rotating group keys or our PEK`, e);
            });
            (0, import_sbp7.default)("gi.contracts/group/removeForeignKeys", contractID, memberID, state);
          }
        }
      },
      "gi.contracts/group/rotateKeys": async (contractID) => {
        const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
        const pendingKeyRevocations = state?._volatile?.pendingKeyRevocations;
        if (!pendingKeyRevocations || Object.keys(pendingKeyRevocations).length === 0) {
          return;
        }
        (0, import_sbp7.default)("gi.actions/out/rotateKeys", contractID, "gi.contracts/group", "pending", "gi.actions/group/shareNewKeys").catch((e) => {
          console.warn(`rotateKeys: ${e.name} thrown:`, e);
        });
      },
      "gi.contracts/group/revokeGroupKeyAndRotateOurPEK": (groupContractID) => {
        const rootState = (0, import_sbp7.default)("state/vuex/state");
        const { identityContractID } = rootState.loggedIn;
        (0, import_sbp7.default)("chelonia/queueInvocation", identityContractID, async () => {
          await (0, import_sbp7.default)("chelonia/contract/setPendingKeyRevocation", identityContractID, ["pek"]);
          await (0, import_sbp7.default)("gi.actions/out/rotateKeys", identityContractID, "gi.contracts/identity", "pending", "gi.actions/identity/shareNewPEK");
        }).catch((e) => {
          console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e);
        });
      },
      "gi.contracts/group/removeForeignKeys": (contractID, userID, state) => {
        const keyIds = findForeignKeysByContractID(state, userID);
        if (!keyIds?.length) return;
        const CSKid = findKeyIdByName(state, "csk");
        (0, import_sbp7.default)("chelonia/out/keyDel", {
          contractID,
          contractName: "gi.contracts/group",
          data: keyIds,
          signingKeyId: CSKid
        }).catch((e) => {
          console.warn(`removeForeignKeys: ${e.name} error thrown:`, e);
        });
      },
      "gi.contracts/group/sendNonMonetaryUpdateNotification": ({
        contractID,
        // group contractID
        innerSigningContractID,
        // identity contractID of the group-member being updated
        meta,
        height,
        updateData,
        getters
      }) => {
        const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
        const isUpdatingMyself = loggedIn.identityContractID === innerSigningContractID;
        if (!isUpdatingMyself) {
          const myProfile = getters.groupProfile(loggedIn.identityContractID);
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            (0, import_sbp7.default)("gi.notifications/emit", "NONMONETARY_CONTRIBUTION_UPDATE", {
              createdDate: meta.createdDate,
              groupID: contractID,
              creatorID: innerSigningContractID,
              updateData
            });
          }
        }
      },
      ...referenceTally("gi.contracts/group/referenceTally")
    }
  });
})();
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)

scrypt-async/scrypt-async.js:
  (*!
   * Fast "async" scrypt implementation in JavaScript.
   * Copyright (c) 2013-2016 Dmitry Chestnykh | BSD License
   * https://github.com/dchest/scrypt-async-js
   *)
*/
