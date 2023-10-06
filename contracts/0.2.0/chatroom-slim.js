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
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw new Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

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
        if (validLen === -1)
          validLen = len2;
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
          parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
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
        console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
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
          if (!Buffer2.isBuffer(this))
            return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer2.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this))
            return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length) {
        if (length > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length);
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function Buffer2(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError('The "string" argument must be of type string. Received type number');
          }
          return allocUnsafe(arg);
        }
        return from(arg, encodingOrOffset, length);
      }
      Buffer2.poolSize = 8192;
      function from(value, encodingOrOffset, length) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof value === "number") {
          throw new TypeError('The "value" argument must not be of type number. Received type number');
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer2.from(valueOf, encodingOrOffset, length);
        }
        const b = fromObject(value);
        if (b)
          return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
        }
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
      }
      Buffer2.from = function(value, encodingOrOffset, length) {
        return from(value, encodingOrOffset, length);
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
        const length = byteLength(string3, encoding) | 0;
        let buf = createBuffer(length);
        const actual = buf.write(string3, encoding);
        if (actual !== length) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array) {
        const length = array.length < 0 ? 0 : checked(array.length) | 0;
        const buf = createBuffer(length);
        for (let i = 0; i < length; i += 1) {
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
      function fromArrayBuffer(array, byteOffset, length) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length === void 0) {
          buf = new Uint8Array(array);
        } else if (length === void 0) {
          buf = new Uint8Array(array, byteOffset);
        } else {
          buf = new Uint8Array(array, byteOffset, length);
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
      function checked(length) {
        if (length >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length | 0;
      }
      function SlowBuffer(length) {
        if (+length != length) {
          length = 0;
        }
        return Buffer2.alloc(+length);
      }
      Buffer2.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer2.prototype;
      };
      Buffer2.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array))
          a = Buffer2.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array))
          b = Buffer2.from(b, b.offset, b.byteLength);
        if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
          throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
        }
        if (a === b)
          return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y)
          return -1;
        if (y < x)
          return 1;
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
      Buffer2.concat = function concat(list, length) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer2.alloc(0);
        }
        let i;
        if (length === void 0) {
          length = 0;
          for (i = 0; i < list.length; ++i) {
            length += list[i].length;
          }
        }
        const buffer = Buffer2.allocUnsafe(length);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer2.isBuffer(buf))
                buf = Buffer2.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(buffer, buf, pos);
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
          throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string3);
        }
        const len = string3.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0)
          return 0;
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
        if (!encoding)
          encoding = "utf8";
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
              if (loweredCase)
                throw new TypeError("Unknown encoding: " + encoding);
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
        const length = this.length;
        if (length === 0)
          return "";
        if (arguments.length === 0)
          return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
      Buffer2.prototype.equals = function equals(b) {
        if (!Buffer2.isBuffer(b))
          throw new TypeError("Argument must be a Buffer");
        if (this === b)
          return true;
        return Buffer2.compare(this, b) === 0;
      };
      Buffer2.prototype.inspect = function inspect() {
        let str = "";
        const max = exports.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max)
          str += " ... ";
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
          throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target);
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
        if (this === target)
          return 0;
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
        if (x < y)
          return -1;
        if (y < x)
          return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0)
          return -1;
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
        if (byteOffset < 0)
          byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir)
            return -1;
          else
            byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir)
            byteOffset = 0;
          else
            return -1;
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
        function read(buf, i2) {
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
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1)
                foundIndex = i;
              if (i - foundIndex + 1 === valLength)
                return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1)
                i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength)
            byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read(arr, i + j) !== read(val, j)) {
                found = false;
                break;
              }
            }
            if (found)
              return i;
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
      function hexWrite(buf, string3, offset, length) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length) {
          length = remaining;
        } else {
          length = Number(length);
          if (length > remaining) {
            length = remaining;
          }
        }
        const strLen = string3.length;
        if (length > strLen / 2) {
          length = strLen / 2;
        }
        let i;
        for (i = 0; i < length; ++i) {
          const parsed = parseInt(string3.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed))
            return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string3, offset, length) {
        return blitBuffer(utf8ToBytes(string3, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string3, offset, length) {
        return blitBuffer(asciiToBytes(string3), buf, offset, length);
      }
      function base64Write(buf, string3, offset, length) {
        return blitBuffer(base64ToBytes(string3), buf, offset, length);
      }
      function ucs2Write(buf, string3, offset, length) {
        return blitBuffer(utf16leToBytes(string3, buf.length - offset), buf, offset, length);
      }
      Buffer2.prototype.write = function write(string3, offset, length, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (length === void 0 && typeof offset === "string") {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length)) {
            length = length >>> 0;
            if (encoding === void 0)
              encoding = "utf8";
          } else {
            encoding = length;
            length = void 0;
          }
        } else {
          throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        }
        const remaining = this.length - offset;
        if (length === void 0 || length > remaining)
          length = remaining;
        if (string3.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding)
          encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string3, offset, length);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string3, offset, length);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string3, offset, length);
            case "base64":
              return base64Write(this, string3, offset, length);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string3, offset, length);
            default:
              if (loweredCase)
                throw new TypeError("Unknown encoding: " + encoding);
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
          res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
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
        if (!start || start < 0)
          start = 0;
        if (!end || end < 0 || end > len)
          end = len;
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
          if (start < 0)
            start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0)
            end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start)
          end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer2.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0)
          throw new RangeError("offset is not uint");
        if (offset + ext > length)
          throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert)
          checkOffset(offset, byteLength2, this.length);
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
        if (!noAssert)
          checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
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
        if (!noAssert)
          checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul)
          val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert)
          checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul)
          val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128))
          return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
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
        const val = (first << 24) + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer2.isBuffer(buf))
          throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min)
          throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length)
          throw new RangeError("Index out of range");
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
        if (!noAssert)
          checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 4294967295, 0);
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
        if (!noAssert)
          checkInt(this, value, offset, 1, 127, -128);
        if (value < 0)
          value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0)
          value = 4294967295 + value + 1;
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
        if (offset + ext > buf.length)
          throw new RangeError("Index out of range");
        if (offset < 0)
          throw new RangeError("Index out of range");
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
        if (!Buffer2.isBuffer(target))
          throw new TypeError("argument should be a Buffer");
        if (!start)
          start = 0;
        if (!end && end !== 0)
          end = this.length;
        if (targetStart >= target.length)
          targetStart = target.length;
        if (!targetStart)
          targetStart = 0;
        if (end > 0 && end < start)
          end = start;
        if (end === start)
          return 0;
        if (target.length === 0 || this.length === 0)
          return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length)
          throw new RangeError("Index out of range");
        if (end < 0)
          throw new RangeError("sourceEnd out of bounds");
        if (end > this.length)
          end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
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
        if (!val)
          val = 0;
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
      E("ERR_BUFFER_OUT_OF_BOUNDS", function(name) {
        if (name) {
          return `${name} is outside of buffer bounds`;
        }
        return "Attempt to access memory outside buffer bounds";
      }, RangeError);
      E("ERR_INVALID_ARG_TYPE", function(name, actual) {
        return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
      }, TypeError);
      E("ERR_OUT_OF_RANGE", function(str, range, input) {
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
      }, RangeError);
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
      function boundsError(value, length, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
        }
        if (length < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length}`, value);
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2)
          return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes(string3, units) {
        units = units || Infinity;
        let codePoint;
        const length = string3.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length; ++i) {
          codePoint = string3.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1)
                  bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length) {
                if ((units -= 3) > -1)
                  bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1)
                bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1)
              bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0)
              break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0)
              break;
            bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0)
              break;
            bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0)
              break;
            bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
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
          if ((units -= 2) < 0)
            break;
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
      function blitBuffer(src, dst, offset, length) {
        let i;
        for (i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length)
            break;
          dst[i + offset] = src[i];
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

  // node_modules/safe-buffer/index.js
  var require_safe_buffer = __commonJS({
    "node_modules/safe-buffer/index.js"(exports, module) {
      var buffer = require_buffer();
      var Buffer2 = buffer.Buffer;
      function copyProps(src, dst) {
        for (var key in src) {
          dst[key] = src[key];
        }
      }
      if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
        module.exports = buffer;
      } else {
        copyProps(buffer, exports);
        exports.Buffer = SafeBuffer;
      }
      function SafeBuffer(arg, encodingOrOffset, length) {
        return Buffer2(arg, encodingOrOffset, length);
      }
      copyProps(Buffer2, SafeBuffer);
      SafeBuffer.from = function(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          throw new TypeError("Argument must not be a number");
        }
        return Buffer2(arg, encodingOrOffset, length);
      };
      SafeBuffer.alloc = function(size, fill, encoding) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        var buf = Buffer2(size);
        if (fill !== void 0) {
          if (typeof encoding === "string") {
            buf.fill(fill, encoding);
          } else {
            buf.fill(fill);
          }
        } else {
          buf.fill(0);
        }
        return buf;
      };
      SafeBuffer.allocUnsafe = function(size) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        return Buffer2(size);
      };
      SafeBuffer.allocUnsafeSlow = function(size) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        return buffer.SlowBuffer(size);
      };
    }
  });

  // node_modules/base-x/src/index.js
  var require_src = __commonJS({
    "node_modules/base-x/src/index.js"(exports, module) {
      "use strict";
      var _Buffer = require_safe_buffer().Buffer;
      function base(ALPHABET) {
        if (ALPHABET.length >= 255) {
          throw new TypeError("Alphabet too long");
        }
        var BASE_MAP = new Uint8Array(256);
        BASE_MAP.fill(255);
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
        function encode(source) {
          if (!_Buffer.isBuffer(source)) {
            throw new TypeError("Expected Buffer");
          }
          if (source.length === 0) {
            return "";
          }
          var zeroes = 0;
          var length = 0;
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
            for (var it1 = size - 1; (carry !== 0 || i2 < length) && it1 !== -1; it1--, i2++) {
              carry += 256 * b58[it1] >>> 0;
              b58[it1] = carry % BASE >>> 0;
              carry = carry / BASE >>> 0;
            }
            if (carry !== 0) {
              throw new Error("Non-zero carry");
            }
            length = i2;
            pbegin++;
          }
          var it2 = size - length;
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
            return _Buffer.alloc(0);
          }
          var psz = 0;
          if (source[psz] === " ") {
            return;
          }
          var zeroes = 0;
          var length = 0;
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
            for (var it3 = size - 1; (carry !== 0 || i2 < length) && it3 !== -1; it3--, i2++) {
              carry += BASE * b256[it3] >>> 0;
              b256[it3] = carry % 256 >>> 0;
              carry = carry / 256 >>> 0;
            }
            if (carry !== 0) {
              throw new Error("Non-zero carry");
            }
            length = i2;
            psz++;
          }
          if (source[psz] === " ") {
            return;
          }
          var it4 = size - length;
          while (it4 !== size && b256[it4] === 0) {
            it4++;
          }
          var vch = _Buffer.allocUnsafe(zeroes + (size - it4));
          vch.fill(0, 0, zeroes);
          var j = zeroes;
          while (it4 !== size) {
            vch[j++] = b256[it4++];
          }
          return vch;
        }
        function decode(string3) {
          var buffer = decodeUnsafe(string3);
          if (buffer) {
            return buffer;
          }
          throw new Error("Non-base" + BASE + " character");
        }
        return {
          encode,
          decodeUnsafe,
          decode
        };
      }
      module.exports = base;
    }
  });

  // node_modules/bs58/index.js
  var require_bs58 = __commonJS({
    "node_modules/bs58/index.js"(exports, module) {
      var basex = require_src();
      var ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      module.exports = basex(ALPHABET);
    }
  });

  // node_modules/multihashes/src/constants.js
  var require_constants = __commonJS({
    "node_modules/multihashes/src/constants.js"(exports) {
      "use strict";
      exports.names = Object.freeze({
        "identity": 0,
        "sha1": 17,
        "sha2-256": 18,
        "sha2-512": 19,
        "dbl-sha2-256": 86,
        "sha3-224": 23,
        "sha3-256": 22,
        "sha3-384": 21,
        "sha3-512": 20,
        "shake-128": 24,
        "shake-256": 25,
        "keccak-224": 26,
        "keccak-256": 27,
        "keccak-384": 28,
        "keccak-512": 29,
        "murmur3-128": 34,
        "murmur3-32": 35,
        "blake2b-8": 45569,
        "blake2b-16": 45570,
        "blake2b-24": 45571,
        "blake2b-32": 45572,
        "blake2b-40": 45573,
        "blake2b-48": 45574,
        "blake2b-56": 45575,
        "blake2b-64": 45576,
        "blake2b-72": 45577,
        "blake2b-80": 45578,
        "blake2b-88": 45579,
        "blake2b-96": 45580,
        "blake2b-104": 45581,
        "blake2b-112": 45582,
        "blake2b-120": 45583,
        "blake2b-128": 45584,
        "blake2b-136": 45585,
        "blake2b-144": 45586,
        "blake2b-152": 45587,
        "blake2b-160": 45588,
        "blake2b-168": 45589,
        "blake2b-176": 45590,
        "blake2b-184": 45591,
        "blake2b-192": 45592,
        "blake2b-200": 45593,
        "blake2b-208": 45594,
        "blake2b-216": 45595,
        "blake2b-224": 45596,
        "blake2b-232": 45597,
        "blake2b-240": 45598,
        "blake2b-248": 45599,
        "blake2b-256": 45600,
        "blake2b-264": 45601,
        "blake2b-272": 45602,
        "blake2b-280": 45603,
        "blake2b-288": 45604,
        "blake2b-296": 45605,
        "blake2b-304": 45606,
        "blake2b-312": 45607,
        "blake2b-320": 45608,
        "blake2b-328": 45609,
        "blake2b-336": 45610,
        "blake2b-344": 45611,
        "blake2b-352": 45612,
        "blake2b-360": 45613,
        "blake2b-368": 45614,
        "blake2b-376": 45615,
        "blake2b-384": 45616,
        "blake2b-392": 45617,
        "blake2b-400": 45618,
        "blake2b-408": 45619,
        "blake2b-416": 45620,
        "blake2b-424": 45621,
        "blake2b-432": 45622,
        "blake2b-440": 45623,
        "blake2b-448": 45624,
        "blake2b-456": 45625,
        "blake2b-464": 45626,
        "blake2b-472": 45627,
        "blake2b-480": 45628,
        "blake2b-488": 45629,
        "blake2b-496": 45630,
        "blake2b-504": 45631,
        "blake2b-512": 45632,
        "blake2s-8": 45633,
        "blake2s-16": 45634,
        "blake2s-24": 45635,
        "blake2s-32": 45636,
        "blake2s-40": 45637,
        "blake2s-48": 45638,
        "blake2s-56": 45639,
        "blake2s-64": 45640,
        "blake2s-72": 45641,
        "blake2s-80": 45642,
        "blake2s-88": 45643,
        "blake2s-96": 45644,
        "blake2s-104": 45645,
        "blake2s-112": 45646,
        "blake2s-120": 45647,
        "blake2s-128": 45648,
        "blake2s-136": 45649,
        "blake2s-144": 45650,
        "blake2s-152": 45651,
        "blake2s-160": 45652,
        "blake2s-168": 45653,
        "blake2s-176": 45654,
        "blake2s-184": 45655,
        "blake2s-192": 45656,
        "blake2s-200": 45657,
        "blake2s-208": 45658,
        "blake2s-216": 45659,
        "blake2s-224": 45660,
        "blake2s-232": 45661,
        "blake2s-240": 45662,
        "blake2s-248": 45663,
        "blake2s-256": 45664,
        "Skein256-8": 45825,
        "Skein256-16": 45826,
        "Skein256-24": 45827,
        "Skein256-32": 45828,
        "Skein256-40": 45829,
        "Skein256-48": 45830,
        "Skein256-56": 45831,
        "Skein256-64": 45832,
        "Skein256-72": 45833,
        "Skein256-80": 45834,
        "Skein256-88": 45835,
        "Skein256-96": 45836,
        "Skein256-104": 45837,
        "Skein256-112": 45838,
        "Skein256-120": 45839,
        "Skein256-128": 45840,
        "Skein256-136": 45841,
        "Skein256-144": 45842,
        "Skein256-152": 45843,
        "Skein256-160": 45844,
        "Skein256-168": 45845,
        "Skein256-176": 45846,
        "Skein256-184": 45847,
        "Skein256-192": 45848,
        "Skein256-200": 45849,
        "Skein256-208": 45850,
        "Skein256-216": 45851,
        "Skein256-224": 45852,
        "Skein256-232": 45853,
        "Skein256-240": 45854,
        "Skein256-248": 45855,
        "Skein256-256": 45856,
        "Skein512-8": 45857,
        "Skein512-16": 45858,
        "Skein512-24": 45859,
        "Skein512-32": 45860,
        "Skein512-40": 45861,
        "Skein512-48": 45862,
        "Skein512-56": 45863,
        "Skein512-64": 45864,
        "Skein512-72": 45865,
        "Skein512-80": 45866,
        "Skein512-88": 45867,
        "Skein512-96": 45868,
        "Skein512-104": 45869,
        "Skein512-112": 45870,
        "Skein512-120": 45871,
        "Skein512-128": 45872,
        "Skein512-136": 45873,
        "Skein512-144": 45874,
        "Skein512-152": 45875,
        "Skein512-160": 45876,
        "Skein512-168": 45877,
        "Skein512-176": 45878,
        "Skein512-184": 45879,
        "Skein512-192": 45880,
        "Skein512-200": 45881,
        "Skein512-208": 45882,
        "Skein512-216": 45883,
        "Skein512-224": 45884,
        "Skein512-232": 45885,
        "Skein512-240": 45886,
        "Skein512-248": 45887,
        "Skein512-256": 45888,
        "Skein512-264": 45889,
        "Skein512-272": 45890,
        "Skein512-280": 45891,
        "Skein512-288": 45892,
        "Skein512-296": 45893,
        "Skein512-304": 45894,
        "Skein512-312": 45895,
        "Skein512-320": 45896,
        "Skein512-328": 45897,
        "Skein512-336": 45898,
        "Skein512-344": 45899,
        "Skein512-352": 45900,
        "Skein512-360": 45901,
        "Skein512-368": 45902,
        "Skein512-376": 45903,
        "Skein512-384": 45904,
        "Skein512-392": 45905,
        "Skein512-400": 45906,
        "Skein512-408": 45907,
        "Skein512-416": 45908,
        "Skein512-424": 45909,
        "Skein512-432": 45910,
        "Skein512-440": 45911,
        "Skein512-448": 45912,
        "Skein512-456": 45913,
        "Skein512-464": 45914,
        "Skein512-472": 45915,
        "Skein512-480": 45916,
        "Skein512-488": 45917,
        "Skein512-496": 45918,
        "Skein512-504": 45919,
        "Skein512-512": 45920,
        "Skein1024-8": 45921,
        "Skein1024-16": 45922,
        "Skein1024-24": 45923,
        "Skein1024-32": 45924,
        "Skein1024-40": 45925,
        "Skein1024-48": 45926,
        "Skein1024-56": 45927,
        "Skein1024-64": 45928,
        "Skein1024-72": 45929,
        "Skein1024-80": 45930,
        "Skein1024-88": 45931,
        "Skein1024-96": 45932,
        "Skein1024-104": 45933,
        "Skein1024-112": 45934,
        "Skein1024-120": 45935,
        "Skein1024-128": 45936,
        "Skein1024-136": 45937,
        "Skein1024-144": 45938,
        "Skein1024-152": 45939,
        "Skein1024-160": 45940,
        "Skein1024-168": 45941,
        "Skein1024-176": 45942,
        "Skein1024-184": 45943,
        "Skein1024-192": 45944,
        "Skein1024-200": 45945,
        "Skein1024-208": 45946,
        "Skein1024-216": 45947,
        "Skein1024-224": 45948,
        "Skein1024-232": 45949,
        "Skein1024-240": 45950,
        "Skein1024-248": 45951,
        "Skein1024-256": 45952,
        "Skein1024-264": 45953,
        "Skein1024-272": 45954,
        "Skein1024-280": 45955,
        "Skein1024-288": 45956,
        "Skein1024-296": 45957,
        "Skein1024-304": 45958,
        "Skein1024-312": 45959,
        "Skein1024-320": 45960,
        "Skein1024-328": 45961,
        "Skein1024-336": 45962,
        "Skein1024-344": 45963,
        "Skein1024-352": 45964,
        "Skein1024-360": 45965,
        "Skein1024-368": 45966,
        "Skein1024-376": 45967,
        "Skein1024-384": 45968,
        "Skein1024-392": 45969,
        "Skein1024-400": 45970,
        "Skein1024-408": 45971,
        "Skein1024-416": 45972,
        "Skein1024-424": 45973,
        "Skein1024-432": 45974,
        "Skein1024-440": 45975,
        "Skein1024-448": 45976,
        "Skein1024-456": 45977,
        "Skein1024-464": 45978,
        "Skein1024-472": 45979,
        "Skein1024-480": 45980,
        "Skein1024-488": 45981,
        "Skein1024-496": 45982,
        "Skein1024-504": 45983,
        "Skein1024-512": 45984,
        "Skein1024-520": 45985,
        "Skein1024-528": 45986,
        "Skein1024-536": 45987,
        "Skein1024-544": 45988,
        "Skein1024-552": 45989,
        "Skein1024-560": 45990,
        "Skein1024-568": 45991,
        "Skein1024-576": 45992,
        "Skein1024-584": 45993,
        "Skein1024-592": 45994,
        "Skein1024-600": 45995,
        "Skein1024-608": 45996,
        "Skein1024-616": 45997,
        "Skein1024-624": 45998,
        "Skein1024-632": 45999,
        "Skein1024-640": 46e3,
        "Skein1024-648": 46001,
        "Skein1024-656": 46002,
        "Skein1024-664": 46003,
        "Skein1024-672": 46004,
        "Skein1024-680": 46005,
        "Skein1024-688": 46006,
        "Skein1024-696": 46007,
        "Skein1024-704": 46008,
        "Skein1024-712": 46009,
        "Skein1024-720": 46010,
        "Skein1024-728": 46011,
        "Skein1024-736": 46012,
        "Skein1024-744": 46013,
        "Skein1024-752": 46014,
        "Skein1024-760": 46015,
        "Skein1024-768": 46016,
        "Skein1024-776": 46017,
        "Skein1024-784": 46018,
        "Skein1024-792": 46019,
        "Skein1024-800": 46020,
        "Skein1024-808": 46021,
        "Skein1024-816": 46022,
        "Skein1024-824": 46023,
        "Skein1024-832": 46024,
        "Skein1024-840": 46025,
        "Skein1024-848": 46026,
        "Skein1024-856": 46027,
        "Skein1024-864": 46028,
        "Skein1024-872": 46029,
        "Skein1024-880": 46030,
        "Skein1024-888": 46031,
        "Skein1024-896": 46032,
        "Skein1024-904": 46033,
        "Skein1024-912": 46034,
        "Skein1024-920": 46035,
        "Skein1024-928": 46036,
        "Skein1024-936": 46037,
        "Skein1024-944": 46038,
        "Skein1024-952": 46039,
        "Skein1024-960": 46040,
        "Skein1024-968": 46041,
        "Skein1024-976": 46042,
        "Skein1024-984": 46043,
        "Skein1024-992": 46044,
        "Skein1024-1000": 46045,
        "Skein1024-1008": 46046,
        "Skein1024-1016": 46047,
        "Skein1024-1024": 46048
      });
      exports.codes = Object.freeze({
        0: "identity",
        17: "sha1",
        18: "sha2-256",
        19: "sha2-512",
        86: "dbl-sha2-256",
        23: "sha3-224",
        22: "sha3-256",
        21: "sha3-384",
        20: "sha3-512",
        24: "shake-128",
        25: "shake-256",
        26: "keccak-224",
        27: "keccak-256",
        28: "keccak-384",
        29: "keccak-512",
        34: "murmur3-128",
        35: "murmur3-32",
        45569: "blake2b-8",
        45570: "blake2b-16",
        45571: "blake2b-24",
        45572: "blake2b-32",
        45573: "blake2b-40",
        45574: "blake2b-48",
        45575: "blake2b-56",
        45576: "blake2b-64",
        45577: "blake2b-72",
        45578: "blake2b-80",
        45579: "blake2b-88",
        45580: "blake2b-96",
        45581: "blake2b-104",
        45582: "blake2b-112",
        45583: "blake2b-120",
        45584: "blake2b-128",
        45585: "blake2b-136",
        45586: "blake2b-144",
        45587: "blake2b-152",
        45588: "blake2b-160",
        45589: "blake2b-168",
        45590: "blake2b-176",
        45591: "blake2b-184",
        45592: "blake2b-192",
        45593: "blake2b-200",
        45594: "blake2b-208",
        45595: "blake2b-216",
        45596: "blake2b-224",
        45597: "blake2b-232",
        45598: "blake2b-240",
        45599: "blake2b-248",
        45600: "blake2b-256",
        45601: "blake2b-264",
        45602: "blake2b-272",
        45603: "blake2b-280",
        45604: "blake2b-288",
        45605: "blake2b-296",
        45606: "blake2b-304",
        45607: "blake2b-312",
        45608: "blake2b-320",
        45609: "blake2b-328",
        45610: "blake2b-336",
        45611: "blake2b-344",
        45612: "blake2b-352",
        45613: "blake2b-360",
        45614: "blake2b-368",
        45615: "blake2b-376",
        45616: "blake2b-384",
        45617: "blake2b-392",
        45618: "blake2b-400",
        45619: "blake2b-408",
        45620: "blake2b-416",
        45621: "blake2b-424",
        45622: "blake2b-432",
        45623: "blake2b-440",
        45624: "blake2b-448",
        45625: "blake2b-456",
        45626: "blake2b-464",
        45627: "blake2b-472",
        45628: "blake2b-480",
        45629: "blake2b-488",
        45630: "blake2b-496",
        45631: "blake2b-504",
        45632: "blake2b-512",
        45633: "blake2s-8",
        45634: "blake2s-16",
        45635: "blake2s-24",
        45636: "blake2s-32",
        45637: "blake2s-40",
        45638: "blake2s-48",
        45639: "blake2s-56",
        45640: "blake2s-64",
        45641: "blake2s-72",
        45642: "blake2s-80",
        45643: "blake2s-88",
        45644: "blake2s-96",
        45645: "blake2s-104",
        45646: "blake2s-112",
        45647: "blake2s-120",
        45648: "blake2s-128",
        45649: "blake2s-136",
        45650: "blake2s-144",
        45651: "blake2s-152",
        45652: "blake2s-160",
        45653: "blake2s-168",
        45654: "blake2s-176",
        45655: "blake2s-184",
        45656: "blake2s-192",
        45657: "blake2s-200",
        45658: "blake2s-208",
        45659: "blake2s-216",
        45660: "blake2s-224",
        45661: "blake2s-232",
        45662: "blake2s-240",
        45663: "blake2s-248",
        45664: "blake2s-256",
        45825: "Skein256-8",
        45826: "Skein256-16",
        45827: "Skein256-24",
        45828: "Skein256-32",
        45829: "Skein256-40",
        45830: "Skein256-48",
        45831: "Skein256-56",
        45832: "Skein256-64",
        45833: "Skein256-72",
        45834: "Skein256-80",
        45835: "Skein256-88",
        45836: "Skein256-96",
        45837: "Skein256-104",
        45838: "Skein256-112",
        45839: "Skein256-120",
        45840: "Skein256-128",
        45841: "Skein256-136",
        45842: "Skein256-144",
        45843: "Skein256-152",
        45844: "Skein256-160",
        45845: "Skein256-168",
        45846: "Skein256-176",
        45847: "Skein256-184",
        45848: "Skein256-192",
        45849: "Skein256-200",
        45850: "Skein256-208",
        45851: "Skein256-216",
        45852: "Skein256-224",
        45853: "Skein256-232",
        45854: "Skein256-240",
        45855: "Skein256-248",
        45856: "Skein256-256",
        45857: "Skein512-8",
        45858: "Skein512-16",
        45859: "Skein512-24",
        45860: "Skein512-32",
        45861: "Skein512-40",
        45862: "Skein512-48",
        45863: "Skein512-56",
        45864: "Skein512-64",
        45865: "Skein512-72",
        45866: "Skein512-80",
        45867: "Skein512-88",
        45868: "Skein512-96",
        45869: "Skein512-104",
        45870: "Skein512-112",
        45871: "Skein512-120",
        45872: "Skein512-128",
        45873: "Skein512-136",
        45874: "Skein512-144",
        45875: "Skein512-152",
        45876: "Skein512-160",
        45877: "Skein512-168",
        45878: "Skein512-176",
        45879: "Skein512-184",
        45880: "Skein512-192",
        45881: "Skein512-200",
        45882: "Skein512-208",
        45883: "Skein512-216",
        45884: "Skein512-224",
        45885: "Skein512-232",
        45886: "Skein512-240",
        45887: "Skein512-248",
        45888: "Skein512-256",
        45889: "Skein512-264",
        45890: "Skein512-272",
        45891: "Skein512-280",
        45892: "Skein512-288",
        45893: "Skein512-296",
        45894: "Skein512-304",
        45895: "Skein512-312",
        45896: "Skein512-320",
        45897: "Skein512-328",
        45898: "Skein512-336",
        45899: "Skein512-344",
        45900: "Skein512-352",
        45901: "Skein512-360",
        45902: "Skein512-368",
        45903: "Skein512-376",
        45904: "Skein512-384",
        45905: "Skein512-392",
        45906: "Skein512-400",
        45907: "Skein512-408",
        45908: "Skein512-416",
        45909: "Skein512-424",
        45910: "Skein512-432",
        45911: "Skein512-440",
        45912: "Skein512-448",
        45913: "Skein512-456",
        45914: "Skein512-464",
        45915: "Skein512-472",
        45916: "Skein512-480",
        45917: "Skein512-488",
        45918: "Skein512-496",
        45919: "Skein512-504",
        45920: "Skein512-512",
        45921: "Skein1024-8",
        45922: "Skein1024-16",
        45923: "Skein1024-24",
        45924: "Skein1024-32",
        45925: "Skein1024-40",
        45926: "Skein1024-48",
        45927: "Skein1024-56",
        45928: "Skein1024-64",
        45929: "Skein1024-72",
        45930: "Skein1024-80",
        45931: "Skein1024-88",
        45932: "Skein1024-96",
        45933: "Skein1024-104",
        45934: "Skein1024-112",
        45935: "Skein1024-120",
        45936: "Skein1024-128",
        45937: "Skein1024-136",
        45938: "Skein1024-144",
        45939: "Skein1024-152",
        45940: "Skein1024-160",
        45941: "Skein1024-168",
        45942: "Skein1024-176",
        45943: "Skein1024-184",
        45944: "Skein1024-192",
        45945: "Skein1024-200",
        45946: "Skein1024-208",
        45947: "Skein1024-216",
        45948: "Skein1024-224",
        45949: "Skein1024-232",
        45950: "Skein1024-240",
        45951: "Skein1024-248",
        45952: "Skein1024-256",
        45953: "Skein1024-264",
        45954: "Skein1024-272",
        45955: "Skein1024-280",
        45956: "Skein1024-288",
        45957: "Skein1024-296",
        45958: "Skein1024-304",
        45959: "Skein1024-312",
        45960: "Skein1024-320",
        45961: "Skein1024-328",
        45962: "Skein1024-336",
        45963: "Skein1024-344",
        45964: "Skein1024-352",
        45965: "Skein1024-360",
        45966: "Skein1024-368",
        45967: "Skein1024-376",
        45968: "Skein1024-384",
        45969: "Skein1024-392",
        45970: "Skein1024-400",
        45971: "Skein1024-408",
        45972: "Skein1024-416",
        45973: "Skein1024-424",
        45974: "Skein1024-432",
        45975: "Skein1024-440",
        45976: "Skein1024-448",
        45977: "Skein1024-456",
        45978: "Skein1024-464",
        45979: "Skein1024-472",
        45980: "Skein1024-480",
        45981: "Skein1024-488",
        45982: "Skein1024-496",
        45983: "Skein1024-504",
        45984: "Skein1024-512",
        45985: "Skein1024-520",
        45986: "Skein1024-528",
        45987: "Skein1024-536",
        45988: "Skein1024-544",
        45989: "Skein1024-552",
        45990: "Skein1024-560",
        45991: "Skein1024-568",
        45992: "Skein1024-576",
        45993: "Skein1024-584",
        45994: "Skein1024-592",
        45995: "Skein1024-600",
        45996: "Skein1024-608",
        45997: "Skein1024-616",
        45998: "Skein1024-624",
        45999: "Skein1024-632",
        46e3: "Skein1024-640",
        46001: "Skein1024-648",
        46002: "Skein1024-656",
        46003: "Skein1024-664",
        46004: "Skein1024-672",
        46005: "Skein1024-680",
        46006: "Skein1024-688",
        46007: "Skein1024-696",
        46008: "Skein1024-704",
        46009: "Skein1024-712",
        46010: "Skein1024-720",
        46011: "Skein1024-728",
        46012: "Skein1024-736",
        46013: "Skein1024-744",
        46014: "Skein1024-752",
        46015: "Skein1024-760",
        46016: "Skein1024-768",
        46017: "Skein1024-776",
        46018: "Skein1024-784",
        46019: "Skein1024-792",
        46020: "Skein1024-800",
        46021: "Skein1024-808",
        46022: "Skein1024-816",
        46023: "Skein1024-824",
        46024: "Skein1024-832",
        46025: "Skein1024-840",
        46026: "Skein1024-848",
        46027: "Skein1024-856",
        46028: "Skein1024-864",
        46029: "Skein1024-872",
        46030: "Skein1024-880",
        46031: "Skein1024-888",
        46032: "Skein1024-896",
        46033: "Skein1024-904",
        46034: "Skein1024-912",
        46035: "Skein1024-920",
        46036: "Skein1024-928",
        46037: "Skein1024-936",
        46038: "Skein1024-944",
        46039: "Skein1024-952",
        46040: "Skein1024-960",
        46041: "Skein1024-968",
        46042: "Skein1024-976",
        46043: "Skein1024-984",
        46044: "Skein1024-992",
        46045: "Skein1024-1000",
        46046: "Skein1024-1008",
        46047: "Skein1024-1016",
        46048: "Skein1024-1024"
      });
      exports.defaultLengths = Object.freeze({
        17: 20,
        18: 32,
        19: 64,
        86: 32,
        23: 28,
        22: 32,
        21: 48,
        20: 64,
        24: 32,
        25: 64,
        26: 28,
        27: 32,
        28: 48,
        29: 64,
        34: 32,
        45569: 1,
        45570: 2,
        45571: 3,
        45572: 4,
        45573: 5,
        45574: 6,
        45575: 7,
        45576: 8,
        45577: 9,
        45578: 10,
        45579: 11,
        45580: 12,
        45581: 13,
        45582: 14,
        45583: 15,
        45584: 16,
        45585: 17,
        45586: 18,
        45587: 19,
        45588: 20,
        45589: 21,
        45590: 22,
        45591: 23,
        45592: 24,
        45593: 25,
        45594: 26,
        45595: 27,
        45596: 28,
        45597: 29,
        45598: 30,
        45599: 31,
        45600: 32,
        45601: 33,
        45602: 34,
        45603: 35,
        45604: 36,
        45605: 37,
        45606: 38,
        45607: 39,
        45608: 40,
        45609: 41,
        45610: 42,
        45611: 43,
        45612: 44,
        45613: 45,
        45614: 46,
        45615: 47,
        45616: 48,
        45617: 49,
        45618: 50,
        45619: 51,
        45620: 52,
        45621: 53,
        45622: 54,
        45623: 55,
        45624: 56,
        45625: 57,
        45626: 58,
        45627: 59,
        45628: 60,
        45629: 61,
        45630: 62,
        45631: 63,
        45632: 64,
        45633: 1,
        45634: 2,
        45635: 3,
        45636: 4,
        45637: 5,
        45638: 6,
        45639: 7,
        45640: 8,
        45641: 9,
        45642: 10,
        45643: 11,
        45644: 12,
        45645: 13,
        45646: 14,
        45647: 15,
        45648: 16,
        45649: 17,
        45650: 18,
        45651: 19,
        45652: 20,
        45653: 21,
        45654: 22,
        45655: 23,
        45656: 24,
        45657: 25,
        45658: 26,
        45659: 27,
        45660: 28,
        45661: 29,
        45662: 30,
        45663: 31,
        45664: 32,
        45825: 1,
        45826: 2,
        45827: 3,
        45828: 4,
        45829: 5,
        45830: 6,
        45831: 7,
        45832: 8,
        45833: 9,
        45834: 10,
        45835: 11,
        45836: 12,
        45837: 13,
        45838: 14,
        45839: 15,
        45840: 16,
        45841: 17,
        45842: 18,
        45843: 19,
        45844: 20,
        45845: 21,
        45846: 22,
        45847: 23,
        45848: 24,
        45849: 25,
        45850: 26,
        45851: 27,
        45852: 28,
        45853: 29,
        45854: 30,
        45855: 31,
        45856: 32,
        45857: 1,
        45858: 2,
        45859: 3,
        45860: 4,
        45861: 5,
        45862: 6,
        45863: 7,
        45864: 8,
        45865: 9,
        45866: 10,
        45867: 11,
        45868: 12,
        45869: 13,
        45870: 14,
        45871: 15,
        45872: 16,
        45873: 17,
        45874: 18,
        45875: 19,
        45876: 20,
        45877: 21,
        45878: 22,
        45879: 23,
        45880: 24,
        45881: 25,
        45882: 26,
        45883: 27,
        45884: 28,
        45885: 29,
        45886: 30,
        45887: 31,
        45888: 32,
        45889: 33,
        45890: 34,
        45891: 35,
        45892: 36,
        45893: 37,
        45894: 38,
        45895: 39,
        45896: 40,
        45897: 41,
        45898: 42,
        45899: 43,
        45900: 44,
        45901: 45,
        45902: 46,
        45903: 47,
        45904: 48,
        45905: 49,
        45906: 50,
        45907: 51,
        45908: 52,
        45909: 53,
        45910: 54,
        45911: 55,
        45912: 56,
        45913: 57,
        45914: 58,
        45915: 59,
        45916: 60,
        45917: 61,
        45918: 62,
        45919: 63,
        45920: 64,
        45921: 1,
        45922: 2,
        45923: 3,
        45924: 4,
        45925: 5,
        45926: 6,
        45927: 7,
        45928: 8,
        45929: 9,
        45930: 10,
        45931: 11,
        45932: 12,
        45933: 13,
        45934: 14,
        45935: 15,
        45936: 16,
        45937: 17,
        45938: 18,
        45939: 19,
        45940: 20,
        45941: 21,
        45942: 22,
        45943: 23,
        45944: 24,
        45945: 25,
        45946: 26,
        45947: 27,
        45948: 28,
        45949: 29,
        45950: 30,
        45951: 31,
        45952: 32,
        45953: 33,
        45954: 34,
        45955: 35,
        45956: 36,
        45957: 37,
        45958: 38,
        45959: 39,
        45960: 40,
        45961: 41,
        45962: 42,
        45963: 43,
        45964: 44,
        45965: 45,
        45966: 46,
        45967: 47,
        45968: 48,
        45969: 49,
        45970: 50,
        45971: 51,
        45972: 52,
        45973: 53,
        45974: 54,
        45975: 55,
        45976: 56,
        45977: 57,
        45978: 58,
        45979: 59,
        45980: 60,
        45981: 61,
        45982: 62,
        45983: 63,
        45984: 64,
        45985: 65,
        45986: 66,
        45987: 67,
        45988: 68,
        45989: 69,
        45990: 70,
        45991: 71,
        45992: 72,
        45993: 73,
        45994: 74,
        45995: 75,
        45996: 76,
        45997: 77,
        45998: 78,
        45999: 79,
        46e3: 80,
        46001: 81,
        46002: 82,
        46003: 83,
        46004: 84,
        46005: 85,
        46006: 86,
        46007: 87,
        46008: 88,
        46009: 89,
        46010: 90,
        46011: 91,
        46012: 92,
        46013: 93,
        46014: 94,
        46015: 95,
        46016: 96,
        46017: 97,
        46018: 98,
        46019: 99,
        46020: 100,
        46021: 101,
        46022: 102,
        46023: 103,
        46024: 104,
        46025: 105,
        46026: 106,
        46027: 107,
        46028: 108,
        46029: 109,
        46030: 110,
        46031: 111,
        46032: 112,
        46033: 113,
        46034: 114,
        46035: 115,
        46036: 116,
        46037: 117,
        46038: 118,
        46039: 119,
        46040: 120,
        46041: 121,
        46042: 122,
        46043: 123,
        46044: 124,
        46045: 125,
        46046: 126,
        46047: 127,
        46048: 128
      });
    }
  });

  // node_modules/varint/encode.js
  var require_encode = __commonJS({
    "node_modules/varint/encode.js"(exports, module) {
      module.exports = encode;
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
    }
  });

  // node_modules/varint/decode.js
  var require_decode = __commonJS({
    "node_modules/varint/decode.js"(exports, module) {
      module.exports = read;
      var MSB = 128;
      var REST = 127;
      function read(buf, offset) {
        var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf.length;
        do {
          if (counter >= l) {
            read.bytes = 0;
            throw new RangeError("Could not decode varint");
          }
          b = buf[counter++];
          res += shift < 28 ? (b & REST) << shift : (b & REST) * Math.pow(2, shift);
          shift += 7;
        } while (b >= MSB);
        read.bytes = counter - offset;
        return res;
      }
    }
  });

  // node_modules/varint/length.js
  var require_length = __commonJS({
    "node_modules/varint/length.js"(exports, module) {
      var N1 = Math.pow(2, 7);
      var N2 = Math.pow(2, 14);
      var N3 = Math.pow(2, 21);
      var N4 = Math.pow(2, 28);
      var N5 = Math.pow(2, 35);
      var N6 = Math.pow(2, 42);
      var N7 = Math.pow(2, 49);
      var N8 = Math.pow(2, 56);
      var N9 = Math.pow(2, 63);
      module.exports = function(value) {
        return value < N1 ? 1 : value < N2 ? 2 : value < N3 ? 3 : value < N4 ? 4 : value < N5 ? 5 : value < N6 ? 6 : value < N7 ? 7 : value < N8 ? 8 : value < N9 ? 9 : 10;
      };
    }
  });

  // node_modules/varint/index.js
  var require_varint = __commonJS({
    "node_modules/varint/index.js"(exports, module) {
      module.exports = {
        encode: require_encode(),
        decode: require_decode(),
        encodingLength: require_length()
      };
    }
  });

  // node_modules/multihashes/src/index.js
  var require_src2 = __commonJS({
    "node_modules/multihashes/src/index.js"(exports) {
      "use strict";
      var bs58 = require_bs58();
      var cs = require_constants();
      exports.names = cs.names;
      exports.codes = cs.codes;
      exports.defaultLengths = cs.defaultLengths;
      var varint = require_varint();
      exports.toHexString = function toHexString(hash) {
        if (!Buffer.isBuffer(hash)) {
          throw new Error("must be passed a buffer");
        }
        return hash.toString("hex");
      };
      exports.fromHexString = function fromHexString(hash) {
        return Buffer.from(hash, "hex");
      };
      exports.toB58String = function toB58String(hash) {
        if (!Buffer.isBuffer(hash)) {
          throw new Error("must be passed a buffer");
        }
        return bs58.encode(hash);
      };
      exports.fromB58String = function fromB58String(hash) {
        let encoded = hash;
        if (Buffer.isBuffer(hash)) {
          encoded = hash.toString();
        }
        return Buffer.from(bs58.decode(encoded));
      };
      exports.decode = function decode(buf) {
        if (!Buffer.isBuffer(buf)) {
          throw new Error("multihash must be a Buffer");
        }
        if (buf.length < 3) {
          throw new Error("multihash too short. must be > 3 bytes.");
        }
        const code = varint.decode(buf);
        if (!exports.isValidCode(code)) {
          throw new Error(`multihash unknown function code: 0x${code.toString(16)}`);
        }
        buf = buf.slice(varint.decode.bytes);
        const len = varint.decode(buf);
        if (len < 1) {
          throw new Error(`multihash invalid length: 0x${len.toString(16)}`);
        }
        buf = buf.slice(varint.decode.bytes);
        if (buf.length !== len) {
          throw new Error(`multihash length inconsistent: 0x${buf.toString("hex")}`);
        }
        return {
          code,
          name: cs.codes[code],
          length: len,
          digest: buf
        };
      };
      exports.encode = function encode(digest, code, length) {
        if (!digest || code === void 0) {
          throw new Error("multihash encode requires at least two args: digest, code");
        }
        const hashfn = exports.coerceCode(code);
        if (!Buffer.isBuffer(digest)) {
          throw new Error("digest should be a Buffer");
        }
        if (length == null) {
          length = digest.length;
        }
        if (length && digest.length !== length) {
          throw new Error("digest length should be equal to specified length.");
        }
        return Buffer.concat([
          Buffer.from(varint.encode(hashfn)),
          Buffer.from(varint.encode(length)),
          digest
        ]);
      };
      exports.coerceCode = function coerceCode(name) {
        let code = name;
        if (typeof name === "string") {
          if (cs.names[name] === void 0) {
            throw new Error(`Unrecognized hash function named: ${name}`);
          }
          code = cs.names[name];
        }
        if (typeof code !== "number") {
          throw new Error(`Hash function code should be a number. Got: ${code}`);
        }
        if (cs.codes[code] === void 0 && !exports.isAppCode(code)) {
          throw new Error(`Unrecognized function code: ${code}`);
        }
        return code;
      };
      exports.isAppCode = function appCode(code) {
        return code > 0 && code < 16;
      };
      exports.isValidCode = function validCode(code) {
        if (exports.isAppCode(code)) {
          return true;
        }
        if (cs.codes[code]) {
          return true;
        }
        return false;
      };
      function validate(multihash2) {
        exports.decode(multihash2);
      }
      exports.validate = validate;
      exports.prefix = function prefix(multihash2) {
        validate(multihash2);
        return multihash2.slice(0, 2);
      };
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
      (function(nacl3) {
        "use strict";
        var gf = function(init) {
          var i, r = new Float64Array(16);
          if (init)
            for (i = 0; i < init.length; i++)
              r[i] = init[i];
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
          for (i = 0; i < n; i++)
            d |= x[xi + i] ^ y[yi + i];
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
          for (i = 0; i < 16; i++)
            z[i] = 0;
          for (i = 0; i < 8; i++)
            z[i] = n[i];
          while (b >= 64) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < 64; i++)
              c[cpos + i] = m[mpos + i] ^ x[i];
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
            for (i = 0; i < b; i++)
              c[cpos + i] = m[mpos + i] ^ x[i];
          }
          return 0;
        }
        function crypto_stream_salsa20(c, cpos, b, n, k) {
          var z = new Uint8Array(16), x = new Uint8Array(64);
          var u, i;
          for (i = 0; i < 16; i++)
            z[i] = 0;
          for (i = 0; i < 8; i++)
            z[i] = n[i];
          while (b >= 64) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < 64; i++)
              c[cpos + i] = x[i];
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
            for (i = 0; i < b; i++)
              c[cpos + i] = x[i];
          }
          return 0;
        }
        function crypto_stream(c, cpos, d, n, k) {
          var s = new Uint8Array(32);
          crypto_core_hsalsa20(s, n, k, sigma);
          var sn = new Uint8Array(8);
          for (var i = 0; i < 8; i++)
            sn[i] = n[i + 16];
          return crypto_stream_salsa20(c, cpos, d, sn, s);
        }
        function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
          var s = new Uint8Array(32);
          crypto_core_hsalsa20(s, n, k, sigma);
          var sn = new Uint8Array(8);
          for (var i = 0; i < 8; i++)
            sn[i] = n[i + 16];
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
            for (; i < 16; i++)
              this.buffer[i] = 0;
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
          for (i = 0; i < 10; i++)
            g[i] &= mask;
          mask = ~mask;
          for (i = 0; i < 10; i++)
            this.h[i] = this.h[i] & mask | g[i];
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
          if (d < 32)
            return -1;
          crypto_stream_xor(c, 0, m, 0, d, n, k);
          crypto_onetimeauth(c, 16, c, 32, d - 32, c);
          for (i = 0; i < 16; i++)
            c[i] = 0;
          return 0;
        }
        function crypto_secretbox_open(m, c, d, n, k) {
          var i;
          var x = new Uint8Array(32);
          if (d < 32)
            return -1;
          crypto_stream(x, 0, 32, n, k);
          if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0)
            return -1;
          crypto_stream_xor(m, 0, c, 0, d, n, k);
          for (i = 0; i < 32; i++)
            m[i] = 0;
          return 0;
        }
        function set25519(r, a) {
          var i;
          for (i = 0; i < 16; i++)
            r[i] = a[i] | 0;
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
          for (i = 0; i < 16; i++)
            t[i] = n[i];
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
          for (i = 0; i < 16; i++)
            o[i] = n[2 * i] + (n[2 * i + 1] << 8);
          o[15] &= 32767;
        }
        function A(o, a, b) {
          for (var i = 0; i < 16; i++)
            o[i] = a[i] + b[i];
        }
        function Z(o, a, b) {
          for (var i = 0; i < 16; i++)
            o[i] = a[i] - b[i];
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
          for (a = 0; a < 16; a++)
            c[a] = i[a];
          for (a = 253; a >= 0; a--) {
            S(c, c);
            if (a !== 2 && a !== 4)
              M(c, c, i);
          }
          for (a = 0; a < 16; a++)
            o[a] = c[a];
        }
        function pow2523(o, i) {
          var c = gf();
          var a;
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
        function crypto_scalarmult(q, n, p) {
          var z = new Uint8Array(32);
          var x = new Float64Array(80), r, i;
          var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
          for (i = 0; i < 31; i++)
            z[i] = n[i];
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
          for (i = 0; i < n; i++)
            x[i] = m[b - n + i];
          x[n] = 128;
          n = 256 - 128 * (n < 112 ? 1 : 0);
          x[n - 9] = 0;
          ts64(x, n - 8, b / 536870912 | 0, b << 3);
          crypto_hashblocks_hl(hh, hl, x, n);
          for (i = 0; i < 8; i++)
            ts64(out, 8 * i, hh[i], hl[i]);
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
          if (!seeded)
            randombytes(sk, 32);
          crypto_hash(d, sk, 32);
          d[0] &= 248;
          d[31] &= 127;
          d[31] |= 64;
          scalarbase(p, d);
          pack(pk, p);
          for (i = 0; i < 32; i++)
            sk[i + 32] = pk[i];
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
          for (j = 0; j < 32; j++)
            x[j] -= carry * L2[j];
          for (i = 0; i < 32; i++) {
            x[i + 1] += x[i] >> 8;
            r[i] = x[i] & 255;
          }
        }
        function reduce(r) {
          var x = new Float64Array(64), i;
          for (i = 0; i < 64; i++)
            x[i] = r[i];
          for (i = 0; i < 64; i++)
            r[i] = 0;
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
          for (i = 0; i < n; i++)
            sm[64 + i] = m[i];
          for (i = 0; i < 32; i++)
            sm[32 + i] = d[32 + i];
          crypto_hash(r, sm.subarray(32), n + 32);
          reduce(r);
          scalarbase(p, r);
          pack(sm, p);
          for (i = 32; i < 64; i++)
            sm[i] = sk[i];
          crypto_hash(h, sm, n + 64);
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
          if (neq25519(chk, num))
            M(r[0], r[0], I);
          S(chk, r[0]);
          M(chk, chk, den);
          if (neq25519(chk, num))
            return -1;
          if (par25519(r[0]) === p[31] >> 7)
            Z(r[0], gf0, r[0]);
          M(r[3], r[0], r[1]);
          return 0;
        }
        function crypto_sign_open(m, sm, n, pk) {
          var i;
          var t = new Uint8Array(32), h = new Uint8Array(64);
          var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
          if (n < 64)
            return -1;
          if (unpackneg(q, pk))
            return -1;
          for (i = 0; i < n; i++)
            m[i] = sm[i];
          for (i = 0; i < 32; i++)
            m[i + 32] = pk[i];
          crypto_hash(h, m, n);
          reduce(h);
          scalarmult(p, q, h);
          scalarbase(q, sm.subarray(32));
          add(p, q);
          pack(t, p);
          n -= 64;
          if (crypto_verify_32(sm, 0, t, 0)) {
            for (i = 0; i < n; i++)
              m[i] = 0;
            return -1;
          }
          for (i = 0; i < n; i++)
            m[i] = sm[i + 64];
          return n;
        }
        var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
        nacl3.lowlevel = {
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
          if (k.length !== crypto_secretbox_KEYBYTES)
            throw new Error("bad key size");
          if (n.length !== crypto_secretbox_NONCEBYTES)
            throw new Error("bad nonce size");
        }
        function checkBoxLengths(pk, sk) {
          if (pk.length !== crypto_box_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          if (sk.length !== crypto_box_SECRETKEYBYTES)
            throw new Error("bad secret key size");
        }
        function checkArrayTypes() {
          for (var i = 0; i < arguments.length; i++) {
            if (!(arguments[i] instanceof Uint8Array))
              throw new TypeError("unexpected type, use Uint8Array");
          }
        }
        function cleanup(arr) {
          for (var i = 0; i < arr.length; i++)
            arr[i] = 0;
        }
        nacl3.randomBytes = function(n) {
          var b = new Uint8Array(n);
          randombytes(b, n);
          return b;
        };
        nacl3.secretbox = function(msg, nonce, key) {
          checkArrayTypes(msg, nonce, key);
          checkLengths(key, nonce);
          var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
          var c = new Uint8Array(m.length);
          for (var i = 0; i < msg.length; i++)
            m[i + crypto_secretbox_ZEROBYTES] = msg[i];
          crypto_secretbox(c, m, m.length, nonce, key);
          return c.subarray(crypto_secretbox_BOXZEROBYTES);
        };
        nacl3.secretbox.open = function(box, nonce, key) {
          checkArrayTypes(box, nonce, key);
          checkLengths(key, nonce);
          var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
          var m = new Uint8Array(c.length);
          for (var i = 0; i < box.length; i++)
            c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
          if (c.length < 32)
            return null;
          if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0)
            return null;
          return m.subarray(crypto_secretbox_ZEROBYTES);
        };
        nacl3.secretbox.keyLength = crypto_secretbox_KEYBYTES;
        nacl3.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
        nacl3.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
        nacl3.scalarMult = function(n, p) {
          checkArrayTypes(n, p);
          if (n.length !== crypto_scalarmult_SCALARBYTES)
            throw new Error("bad n size");
          if (p.length !== crypto_scalarmult_BYTES)
            throw new Error("bad p size");
          var q = new Uint8Array(crypto_scalarmult_BYTES);
          crypto_scalarmult(q, n, p);
          return q;
        };
        nacl3.scalarMult.base = function(n) {
          checkArrayTypes(n);
          if (n.length !== crypto_scalarmult_SCALARBYTES)
            throw new Error("bad n size");
          var q = new Uint8Array(crypto_scalarmult_BYTES);
          crypto_scalarmult_base(q, n);
          return q;
        };
        nacl3.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
        nacl3.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
        nacl3.box = function(msg, nonce, publicKey, secretKey) {
          var k = nacl3.box.before(publicKey, secretKey);
          return nacl3.secretbox(msg, nonce, k);
        };
        nacl3.box.before = function(publicKey, secretKey) {
          checkArrayTypes(publicKey, secretKey);
          checkBoxLengths(publicKey, secretKey);
          var k = new Uint8Array(crypto_box_BEFORENMBYTES);
          crypto_box_beforenm(k, publicKey, secretKey);
          return k;
        };
        nacl3.box.after = nacl3.secretbox;
        nacl3.box.open = function(msg, nonce, publicKey, secretKey) {
          var k = nacl3.box.before(publicKey, secretKey);
          return nacl3.secretbox.open(msg, nonce, k);
        };
        nacl3.box.open.after = nacl3.secretbox.open;
        nacl3.box.keyPair = function() {
          var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
          crypto_box_keypair(pk, sk);
          return { publicKey: pk, secretKey: sk };
        };
        nacl3.box.keyPair.fromSecretKey = function(secretKey) {
          checkArrayTypes(secretKey);
          if (secretKey.length !== crypto_box_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
          crypto_scalarmult_base(pk, secretKey);
          return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
        };
        nacl3.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
        nacl3.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
        nacl3.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
        nacl3.box.nonceLength = crypto_box_NONCEBYTES;
        nacl3.box.overheadLength = nacl3.secretbox.overheadLength;
        nacl3.sign = function(msg, secretKey) {
          checkArrayTypes(msg, secretKey);
          if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
          crypto_sign(signedMsg, msg, msg.length, secretKey);
          return signedMsg;
        };
        nacl3.sign.open = function(signedMsg, publicKey) {
          checkArrayTypes(signedMsg, publicKey);
          if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          var tmp = new Uint8Array(signedMsg.length);
          var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
          if (mlen < 0)
            return null;
          var m = new Uint8Array(mlen);
          for (var i = 0; i < m.length; i++)
            m[i] = tmp[i];
          return m;
        };
        nacl3.sign.detached = function(msg, secretKey) {
          var signedMsg = nacl3.sign(msg, secretKey);
          var sig = new Uint8Array(crypto_sign_BYTES);
          for (var i = 0; i < sig.length; i++)
            sig[i] = signedMsg[i];
          return sig;
        };
        nacl3.sign.detached.verify = function(msg, sig, publicKey) {
          checkArrayTypes(msg, sig, publicKey);
          if (sig.length !== crypto_sign_BYTES)
            throw new Error("bad signature size");
          if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
          var m = new Uint8Array(crypto_sign_BYTES + msg.length);
          var i;
          for (i = 0; i < crypto_sign_BYTES; i++)
            sm[i] = sig[i];
          for (i = 0; i < msg.length; i++)
            sm[i + crypto_sign_BYTES] = msg[i];
          return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
        };
        nacl3.sign.keyPair = function() {
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
          crypto_sign_keypair(pk, sk);
          return { publicKey: pk, secretKey: sk };
        };
        nacl3.sign.keyPair.fromSecretKey = function(secretKey) {
          checkArrayTypes(secretKey);
          if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          for (var i = 0; i < pk.length; i++)
            pk[i] = secretKey[32 + i];
          return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
        };
        nacl3.sign.keyPair.fromSeed = function(seed) {
          checkArrayTypes(seed);
          if (seed.length !== crypto_sign_SEEDBYTES)
            throw new Error("bad seed size");
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
          for (var i = 0; i < 32; i++)
            sk[i] = seed[i];
          crypto_sign_keypair(pk, sk, true);
          return { publicKey: pk, secretKey: sk };
        };
        nacl3.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
        nacl3.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
        nacl3.sign.seedLength = crypto_sign_SEEDBYTES;
        nacl3.sign.signatureLength = crypto_sign_BYTES;
        nacl3.hash = function(msg) {
          checkArrayTypes(msg);
          var h = new Uint8Array(crypto_hash_BYTES);
          crypto_hash(h, msg, msg.length);
          return h;
        };
        nacl3.hash.hashLength = crypto_hash_BYTES;
        nacl3.verify = function(x, y) {
          checkArrayTypes(x, y);
          if (x.length === 0 || y.length === 0)
            return false;
          if (x.length !== y.length)
            return false;
          return vn(x, 0, y, 0, x.length) === 0 ? true : false;
        };
        nacl3.setPRNG = function(fn) {
          randombytes = fn;
        };
        (function() {
          var crypto2 = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
          if (crypto2 && crypto2.getRandomValues) {
            var QUOTA = 65536;
            nacl3.setPRNG(function(x, n) {
              var i, v = new Uint8Array(n);
              for (i = 0; i < n; i += QUOTA) {
                crypto2.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
              }
              for (i = 0; i < n; i++)
                x[i] = v[i];
              cleanup(v);
            });
          } else if (typeof __require !== "undefined") {
            crypto2 = require_crypto();
            if (crypto2 && crypto2.randomBytes) {
              nacl3.setPRNG(function(x, n) {
                var i, v = crypto2.randomBytes(n);
                for (i = 0; i < n; i++)
                  x[i] = v[i];
                cleanup(v);
              });
            }
          }
        })();
      })(typeof module !== "undefined" && module.exports ? module.exports : self.nacl = self.nacl || {});
    }
  });

  // node_modules/blakejs/util.js
  var require_util = __commonJS({
    "node_modules/blakejs/util.js"(exports, module) {
      var ERROR_MSG_INPUT = "Input must be an string, Buffer or Uint8Array";
      function normalizeInput(input) {
        var ret;
        if (input instanceof Uint8Array) {
          ret = input;
        } else if (input instanceof Buffer) {
          ret = new Uint8Array(input);
        } else if (typeof input === "string") {
          ret = new Uint8Array(Buffer.from(input, "utf8"));
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
        var msg = "\n" + label + " = ";
        for (var i = 0; i < arr.length; i += 2) {
          if (size === 32) {
            msg += uint32ToHex(arr[i]).toUpperCase();
            msg += " ";
            msg += uint32ToHex(arr[i + 1]).toUpperCase();
          } else if (size === 64) {
            msg += uint32ToHex(arr[i + 1]).toUpperCase();
            msg += uint32ToHex(arr[i]).toUpperCase();
          } else
            throw new Error("Invalid size " + size);
          if (i % 6 === 4) {
            msg += "\n" + new Array(label.length + 4).join(" ");
          } else if (i < arr.length - 2) {
            msg += " ";
          }
        }
        console.log(msg);
      }
      function testSpeed(hashFn, N, M) {
        var startMs = new Date().getTime();
        var input = new Uint8Array(N);
        for (var i = 0; i < N; i++) {
          input[i] = i % 256;
        }
        var genMs = new Date().getTime();
        console.log("Generated random input in " + (genMs - startMs) + "ms");
        startMs = genMs;
        for (i = 0; i < M; i++) {
          var hashHex = hashFn(input);
          var hashMs = new Date().getTime();
          var ms = hashMs - startMs;
          startMs = hashMs;
          console.log("Hashed in " + ms + "ms: " + hashHex.substring(0, 20) + "...");
          console.log(Math.round(N / (1 << 20) / (ms / 1e3) * 100) / 100 + " MB PER SECOND");
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
        var o0 = v2[a] + v2[b];
        var o1 = v2[a + 1] + v2[b + 1];
        if (o0 >= 4294967296) {
          o1++;
        }
        v2[a] = o0;
        v2[a + 1] = o1;
      }
      function ADD64AC(v2, a, b0, b1) {
        var o0 = v2[a] + b0;
        if (b0 < 0) {
          o0 += 4294967296;
        }
        var o1 = v2[a + 1] + b1;
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
        var x0 = m[ix];
        var x1 = m[ix + 1];
        var y0 = m[iy];
        var y1 = m[iy + 1];
        ADD64AA(v, a, b);
        ADD64AC(v, a, x0, x1);
        var xor0 = v[d] ^ v[a];
        var xor1 = v[d + 1] ^ v[a + 1];
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
      var SIGMA82 = new Uint8Array(SIGMA8.map(function(x) {
        return x * 2;
      }));
      var v = new Uint32Array(32);
      var m = new Uint32Array(32);
      function blake2bCompress(ctx, last) {
        var i = 0;
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
      function blake2bInit(outlen, key) {
        if (outlen === 0 || outlen > 64) {
          throw new Error("Illegal output length, expected 0 < length <= 64");
        }
        if (key && key.length > 64) {
          throw new Error("Illegal key, expected Uint8Array with 0 < length <= 64");
        }
        var ctx = {
          b: new Uint8Array(128),
          h: new Uint32Array(16),
          t: 0,
          c: 0,
          outlen
        };
        for (var i = 0; i < 16; i++) {
          ctx.h[i] = BLAKE2B_IV32[i];
        }
        var keylen = key ? key.length : 0;
        ctx.h[0] ^= 16842752 ^ keylen << 8 ^ outlen;
        if (key) {
          blake2bUpdate(ctx, key);
          ctx.c = 128;
        }
        return ctx;
      }
      function blake2bUpdate(ctx, input) {
        for (var i = 0; i < input.length; i++) {
          if (ctx.c === 128) {
            ctx.t += ctx.c;
            blake2bCompress(ctx, false);
            ctx.c = 0;
          }
          ctx.b[ctx.c++] = input[i];
        }
      }
      function blake2bFinal(ctx) {
        ctx.t += ctx.c;
        while (ctx.c < 128) {
          ctx.b[ctx.c++] = 0;
        }
        blake2bCompress(ctx, true);
        var out = new Uint8Array(ctx.outlen);
        for (var i = 0; i < ctx.outlen; i++) {
          out[i] = ctx.h[i >> 2] >> 8 * (i & 3);
        }
        return out;
      }
      function blake2b(input, key, outlen) {
        outlen = outlen || 64;
        input = util.normalizeInput(input);
        var ctx = blake2bInit(outlen, key);
        blake2bUpdate(ctx, input);
        return blake2bFinal(ctx);
      }
      function blake2bHex(input, key, outlen) {
        var output = blake2b(input, key, outlen);
        return util.toHex(output);
      }
      module.exports = {
        blake2b,
        blake2bHex,
        blake2bInit,
        blake2bUpdate,
        blake2bFinal
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
        var i = 0;
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
        var keylen = key ? key.length : 0;
        if (key && !(keylen > 0 && keylen <= 32)) {
          throw new Error("Incorrect key length, should be in [1, 32]");
        }
        var ctx = {
          h: new Uint32Array(BLAKE2S_IV),
          b: new Uint32Array(64),
          c: 0,
          t: 0,
          outlen
        };
        ctx.h[0] ^= 16842752 ^ keylen << 8 ^ outlen;
        if (keylen > 0) {
          blake2sUpdate(ctx, key);
          ctx.c = 64;
        }
        return ctx;
      }
      function blake2sUpdate(ctx, input) {
        for (var i = 0; i < input.length; i++) {
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
        var out = new Uint8Array(ctx.outlen);
        for (var i = 0; i < ctx.outlen; i++) {
          out[i] = ctx.h[i >> 2] >> 8 * (i & 3) & 255;
        }
        return out;
      }
      function blake2s(input, key, outlen) {
        outlen = outlen || 32;
        input = util.normalizeInput(input);
        var ctx = blake2sInit(outlen, key);
        blake2sUpdate(ctx, input);
        return blake2sFinal(ctx);
      }
      function blake2sHex(input, key, outlen) {
        var output = blake2s(input, key, outlen);
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
          for (i = bytesLeft + 1; i < numZeros; i++)
            p2.push(0);
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
          for (i = 0; i < 64; i++)
            inner[i] = 54;
          for (i = 0; i < password2.length; i++)
            inner[i] ^= password2[i];
          for (i = 0; i < salt2.length; i++)
            inner[64 + i] = salt2[i];
          for (i = innerLen - 4; i < innerLen; i++)
            inner[i] = 0;
          for (i = 0; i < 64; i++)
            outerKey[i] = 92;
          for (i = 0; i < password2.length; i++)
            outerKey[i] ^= password2[i];
          function incrementCounter() {
            for (var i2 = innerLen - 1; i2 >= innerLen - 4; i2--) {
              inner[i2]++;
              if (inner[i2] <= 255)
                return;
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
        function blockCopy(dst, di, src, si, len) {
          while (len--)
            dst[di++] = src[si++];
        }
        function blockXOR(dst, di, src, si, len) {
          while (len--)
            dst[di++] ^= src[si++];
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
            if (len % 3 === 1)
              arr[arr.length - 2] = "=";
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
      if (typeof module !== "undefined")
        module.exports = scrypt2;
    }
  });

  // frontend/model/contracts/chatroom.js
  var import_common = __require("@common/common.js");
  var import_sbp6 = __toESM(__require("@sbp/sbp"));

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
    if (isFunction(typeFn.type))
      return typeFn.type(_options);
    return typeFn.name || "?";
  };
  var TypeValidatorError = class extends Error {
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
        Error.captureStackTrace(this, TypeValidatorError);
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
    return new TypeValidatorError(message, expectedType || getType(typeFn), valueType || typeof value, JSON.stringify(value), typeFn.name, scope);
  };
  var arrayOf = (typeFn, _scope = "Array") => {
    function array(value) {
      if (isEmpty(value))
        return [typeFn(value)];
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
      if (isEmpty(value) || value === primitive)
        return primitive;
      throw validatorError(literal, value, _scope);
    }
    literal.type = () => {
      if (isBoolean(primitive))
        return `${primitive ? "true" : "false"}`;
      else
        return `"${primitive}"`;
    };
    return literal;
  };
  var mapOf = (keyTypeFn, typeFn) => {
    function mapOf2(value) {
      if (isEmpty(value))
        return {};
      const o = object(value);
      const reducer = (acc, key) => Object.assign(acc, {
        [keyTypeFn(key, "Map[_]")]: typeFn(o[key], `Map.${key}`)
      });
      return Object.keys(o).reduce(reducer, {});
    }
    mapOf2.type = () => `{ [_:${getType(keyTypeFn)}]: ${getType(typeFn)} }`;
    return mapOf2;
  };
  var object = function(value) {
    if (isEmpty(value))
      return {};
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
        throw validatorError(object2, value, _scope, `missing object property '${unknownAttr}' in ${_scope} type`);
      }
      const undefAttr = typeAttrs.find((property) => {
        const propertyTypeFn = typeObj[property];
        return propertyTypeFn.name.includes("maybe") && !o.hasOwnProperty(property);
      });
      if (undefAttr) {
        throw validatorError(object2, o[undefAttr], `${_scope}.${undefAttr}`, `empty object property '${undefAttr}' for ${_scope} type`, `void | null | ${getType(typeObj[undefAttr]).substr(1)}`, "-");
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
      const props = Object.keys(typeObj).map((key) => {
        const ret = typeObj[key].name.includes("optional") ? `${key}?: ${getType(typeObj[key], { noVoid: true })}` : `${key}: ${getType(typeObj[key])}`;
        return ret;
      });
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
    if (isEmpty(value) || isUndef(value))
      return void 0;
    throw validatorError(undef, value, _scope);
  }
  undef.type = () => "void";
  var number = function number2(value, _scope = "") {
    if (isEmpty(value))
      return 0;
    if (isNumber(value))
      return value;
    throw validatorError(number2, value, _scope);
  };
  var string = function string2(value, _scope = "") {
    if (isEmpty(value))
      return "";
    if (isString(value))
      return value;
    throw validatorError(string2, value, _scope);
  };
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

  // shared/domains/chelonia/utils.js
  var import_sbp3 = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/giLodash.js
  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function isMergeableObject(val) {
    const nonNullObject = val && typeof val === "object";
    return nonNullObject && Object.prototype.toString.call(val) !== "[object RegExp]" && Object.prototype.toString.call(val) !== "[object Date]";
  }
  function merge(obj, src) {
    for (const key in src) {
      const clone = isMergeableObject(src[key]) ? cloneDeep(src[key]) : void 0;
      if (clone && isMergeableObject(obj[key])) {
        merge(obj[key], clone);
        continue;
      }
      obj[key] = clone || src[key];
    }
    return obj;
  }
  var has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

  // shared/functions.js
  var import_multihashes = __toESM(require_src2());
  var import_tweetnacl = __toESM(require_nacl_fast());
  var import_blakejs = __toESM(require_blakejs());
  if (typeof window === "object" && typeof Buffer === "undefined") {
    const { Buffer: Buffer2 } = require_buffer();
    window.Buffer = Buffer2;
  }

  // shared/domains/chelonia/crypto.js
  var import_tweetnacl2 = __toESM(require_nacl_fast());
  var import_scrypt_async = __toESM(require_scrypt_async());

  // shared/domains/chelonia/encryptedData.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));

  // shared/domains/chelonia/errors.js
  var ChelErrorGenerator = (name, base = Error) => class extends base {
    constructor(...params) {
      super(...params);
      this.name = name;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  };
  var ChelErrorDBBadPreviousHEAD = ChelErrorGenerator("ChelErrorDBBadPreviousHEAD");
  var ChelErrorDBConnection = ChelErrorGenerator("ChelErrorDBConnection");
  var ChelErrorUnexpected = ChelErrorGenerator("ChelErrorUnexpected");
  var ChelErrorUnrecoverable = ChelErrorGenerator("ChelErrorUnrecoverable");
  var ChelErrorDecryptionError = ChelErrorGenerator("ChelErrorDecryptionError");
  var ChelErrorDecryptionKeyNotFound = ChelErrorGenerator("ChelErrorDecryptionKeyNotFound", ChelErrorDecryptionError);
  var ChelErrorSignatureError = ChelErrorGenerator("ChelErrorSignatureError");
  var ChelErrorSignatureKeyNotFound = ChelErrorGenerator("ChelErrorSignatureKeyNotFound", ChelErrorSignatureError);

  // shared/domains/chelonia/signedData.js
  var import_sbp = __toESM(__require("@sbp/sbp"));
  var proto = Object.create(null, {
    _isSignedData: {
      value: true
    }
  });

  // shared/domains/chelonia/encryptedData.js
  var proto2 = Object.create(null, {
    _isEncryptedData: {
      value: true
    }
  });

  // shared/domains/chelonia/utils.js
  var findKeyIdByName = (state, name) => state._vm?.authorizedKeys && Object.values(state._vm.authorizedKeys).find((k) => k.name === name && k._notAfterHeight === void 0)?.id;
  var findForeignKeysByContractID = (state, contractID) => state._vm?.authorizedKeys && Object.values(state._vm.authorizedKeys).filter((k) => k._notAfterHeight === void 0 && k.foreignKey?.includes(contractID)).map((k) => k.id);

  // frontend/model/contracts/shared/constants.js
  var CHATROOM_NAME_LIMITS_IN_CHARS = 50;
  var CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280;
  var CHATROOM_ACTIONS_PER_PAGE = 40;
  var CHATROOM_MESSAGE_ACTION = "chatroom-message-action";
  var MESSAGE_RECEIVE = "message-receive";
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
  var MESSAGE_NOTIFICATIONS = {
    ADD_MEMBER: "add-member",
    JOIN_MEMBER: "join-member",
    LEAVE_MEMBER: "leave-member",
    KICK_MEMBER: "kick-member",
    UPDATE_DESCRIPTION: "update-description",
    UPDATE_NAME: "update-name",
    DELETE_CHANNEL: "delete-channel",
    VOTE_ON_POLL: "vote-on-poll",
    CHANGE_VOTE_ON_POLL: "change-vote-on-poll"
  };
  var PROPOSAL_VARIANTS = {
    CREATED: "created",
    EXPIRING: "expiring",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    EXPIRED: "expired"
  };
  var MESSAGE_NOTIFY_SETTINGS = {
    ALL_MESSAGES: "all-messages",
    DIRECT_MESSAGES: "direct-messages",
    NOTHING: "nothing"
  };
  var POLL_STATUS = {
    ACTIVE: "active",
    CLOSED: "closed"
  };

  // frontend/model/contracts/shared/functions.js
  var import_sbp4 = __toESM(__require("@sbp/sbp"));

  // frontend/views/utils/misc.js
  function logExceptNavigationDuplicated(err) {
    err.name !== "NavigationDuplicated" && console.error(err);
  }

  // frontend/model/contracts/shared/functions.js
  function createMessage({ meta, data, hash, id, state }) {
    const { type, text, replyingMessage } = data;
    const { createdDate } = meta;
    let newMessage = {
      type,
      id,
      hash,
      from: meta.username,
      datetime: new Date(createdDate).toISOString()
    };
    if (type === MESSAGE_TYPES.TEXT) {
      newMessage = !replyingMessage ? { ...newMessage, text } : { ...newMessage, text, replyingMessage };
    } else if (type === MESSAGE_TYPES.POLL) {
      const pollData = data.pollData;
      newMessage = {
        ...newMessage,
        pollData: {
          ...pollData,
          creator: meta.username,
          status: POLL_STATUS.ACTIVE,
          options: pollData.options.map((opt) => ({ ...opt, voted: [] }))
        }
      };
    } else if (type === MESSAGE_TYPES.NOTIFICATION) {
      const params = {
        channelName: state?.attributes.name,
        channelDescription: state?.attributes.description,
        ...data.notification
      };
      delete params.type;
      newMessage = {
        ...newMessage,
        notification: { type: data.notification.type, params }
      };
    } else if (type === MESSAGE_TYPES.INTERACTIVE) {
      newMessage = {
        ...newMessage,
        proposal: data.proposal
      };
    }
    return newMessage;
  }
  async function leaveChatRoom({ contractID }) {
    const rootState = (0, import_sbp4.default)("state/vuex/state");
    const rootGetters = (0, import_sbp4.default)("state/vuex/getters");
    if (contractID === rootGetters.currentChatRoomId) {
      (0, import_sbp4.default)("state/vuex/commit", "setCurrentChatRoomId", {
        groupId: rootState.currentGroupId
      });
      const curRouteName = (0, import_sbp4.default)("controller/router").history.current.name;
      if (curRouteName === "GroupChat" || curRouteName === "GroupChatConversation") {
        await (0, import_sbp4.default)("controller/router").push({ name: "GroupChatConversation", params: { chatRoomId: rootGetters.currentChatRoomId } }).catch(logExceptNavigationDuplicated);
      }
    }
    (0, import_sbp4.default)("state/vuex/commit", "deleteChatRoomUnread", { chatRoomId: contractID });
    (0, import_sbp4.default)("state/vuex/commit", "deleteChatRoomScrollPosition", { chatRoomId: contractID });
    (0, import_sbp4.default)("chelonia/contract/remove", contractID).catch((e) => {
      console.error(`leaveChatRoom(${contractID}): remove threw ${e.name}:`, e);
    });
  }
  function findMessageIdx(hash, messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].hash === hash) {
        return i;
      }
    }
    return -1;
  }
  function makeMentionFromUsername(username) {
    return {
      me: `@${username}`,
      all: "@all"
    };
  }

  // frontend/model/contracts/shared/nativeNotification.js
  var import_sbp5 = __toESM(__require("@sbp/sbp"));
  function makeNotification({ title, body, icon, path }) {
    if (Notification?.permission === "granted" && (0, import_sbp5.default)("state/vuex/settings").notificationEnabled) {
      const notification = new Notification(title, { body, icon });
      if (path) {
        notification.onclick = function(event) {
          (0, import_sbp5.default)("controller/router").push({ path }).catch(console.warn);
        };
      }
    }
  }

  // frontend/model/contracts/shared/types.js
  var inviteType = objectOf({
    inviteKeyId: string,
    creator: string,
    invitee: optional(string)
  });
  var chatRoomAttributesType = objectOf({
    name: string,
    description: string,
    type: unionOf(...Object.values(CHATROOM_TYPES).map((v) => literalOf(v))),
    privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map((v) => literalOf(v))),
    groupContractID: optional(string)
  });
  var messageType = objectMaybeOf({
    type: unionOf(...Object.values(MESSAGE_TYPES).map((v) => literalOf(v))),
    text: string,
    proposal: objectMaybeOf({
      proposalId: string,
      proposalType: string,
      expires_date_ms: number,
      createdDate: string,
      creator: string,
      variant: unionOf(...Object.values(PROPOSAL_VARIANTS).map((v) => literalOf(v)))
    }),
    notification: objectMaybeOf({
      type: unionOf(...Object.values(MESSAGE_NOTIFICATIONS).map((v) => literalOf(v))),
      params: mapOf(string, string)
    }),
    replyingMessage: objectOf({
      hash: string,
      text: string
    }),
    emoticons: mapOf(string, arrayOf(string)),
    onlyVisibleTo: arrayOf(string)
  });

  // frontend/model/contracts/chatroom.js
  function createNotificationData(notificationType, moreParams = {}) {
    return {
      type: MESSAGE_TYPES.NOTIFICATION,
      notification: {
        type: notificationType,
        ...moreParams
      }
    };
  }
  function emitMessageEvent({ contractID, hash }) {
    if (!(0, import_sbp6.default)("chelonia/contract/isSyncing", contractID)) {
      (0, import_sbp6.default)("okTurtles.events/emit", `${CHATROOM_MESSAGE_ACTION}-${contractID}`, { hash });
    }
  }
  function setReadUntilWhileJoining({ contractID, hash, createdDate }) {
    if ((0, import_sbp6.default)("chelonia/contract/isSyncing", contractID, { firstSync: true })) {
      (0, import_sbp6.default)("state/vuex/commit", "setChatRoomReadUntil", {
        chatRoomId: contractID,
        messageHash: hash,
        createdDate
      });
    }
  }
  function messageReceivePostEffect({
    contractID,
    messageHash,
    datetime,
    text,
    isDMOrMention,
    messageType: messageType2,
    username,
    chatRoomName
  }) {
    if ((0, import_sbp6.default)("chelonia/contract/isSyncing", contractID)) {
      return;
    }
    const rootGetters = (0, import_sbp6.default)("state/vuex/getters");
    const isDirectMessage = rootGetters.isDirectMessage(contractID);
    const unreadMessageType = {
      [MESSAGE_TYPES.TEXT]: isDMOrMention ? MESSAGE_TYPES.TEXT : void 0,
      [MESSAGE_TYPES.INTERACTIVE]: MESSAGE_TYPES.INTERACTIVE,
      [MESSAGE_TYPES.POLL]: MESSAGE_TYPES.POLL
    }[messageType2];
    if (unreadMessageType) {
      (0, import_sbp6.default)("state/vuex/commit", "addChatRoomUnreadMessage", {
        chatRoomId: contractID,
        messageHash,
        createdDate: datetime,
        type: unreadMessageType
      });
    }
    let title = `# ${chatRoomName}`;
    let icon;
    if (isDirectMessage) {
      title = rootGetters.ourGroupDirectMessages[contractID].title;
      icon = rootGetters.ourGroupDirectMessages[contractID].picture;
    }
    const path = `/group-chat/${contractID}`;
    const chatNotificationSettings = rootGetters.chatNotificationSettings[contractID] || rootGetters.chatNotificationSettings.default;
    const { messageNotification, messageSound } = chatNotificationSettings;
    const shouldNotifyMessage = messageNotification === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES || messageNotification === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention;
    const shouldSoundMessage = messageSound === MESSAGE_NOTIFY_SETTINGS.ALL_MESSAGES || messageSound === MESSAGE_NOTIFY_SETTINGS.DIRECT_MESSAGES && isDMOrMention;
    shouldNotifyMessage && makeNotification({ title, body: text, icon, path });
    shouldSoundMessage && (0, import_sbp6.default)("okTurtles.events/emit", MESSAGE_RECEIVE);
  }
  (0, import_sbp6.default)("chelonia/defineContract", {
    name: "gi.contracts/chatroom",
    metadata: {
      validate: objectOf({
        createdDate: string,
        username: string,
        identityContractID: string
      }),
      async create() {
        const { username, identityContractID } = (0, import_sbp6.default)("state/vuex/state").loggedIn;
        return {
          createdDate: await fetchServerTime(),
          username,
          identityContractID
        };
      }
    },
    getters: {
      currentChatRoomState(state) {
        return state;
      },
      chatRoomSettings(state, getters) {
        return getters.currentChatRoomState.settings || {};
      },
      chatRoomAttributes(state, getters) {
        return getters.currentChatRoomState.attributes || {};
      },
      chatRoomUsers(state, getters) {
        return getters.currentChatRoomState.users || {};
      },
      chatRoomLatestMessages(state, getters) {
        return getters.currentChatRoomState.messages || [];
      }
    },
    actions: {
      "gi.contracts/chatroom": {
        validate: objectOf({
          attributes: chatRoomAttributesType
        }),
        process({ meta, data }, { state }) {
          const initialState = merge({
            settings: {
              actionsPerPage: CHATROOM_ACTIONS_PER_PAGE,
              maxNameLength: CHATROOM_NAME_LIMITS_IN_CHARS,
              maxDescriptionLength: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
            },
            attributes: {
              creator: meta.username,
              deletedDate: null
            },
            users: {},
            messages: []
          }, data);
          for (const key in initialState) {
            import_common.Vue.set(state, key, initialState[key]);
          }
        },
        sideEffect({ contractID }) {
          import_common.Vue.set((0, import_sbp6.default)("state/vuex/state").chatRoomUnread, contractID, {
            readUntil: void 0,
            messages: []
          });
        }
      },
      "gi.contracts/chatroom/join": {
        validate: objectOf({
          username: string
        }),
        process({ data, meta, hash, id }, { state }) {
          const { username } = data;
          if (!state.onlyRenderMessage && state.users[username]) {
            throw new Error(`Can not join the chatroom which ${username} is already part of`);
          }
          import_common.Vue.set(state.users, username, { joinedDate: meta.createdDate });
          if (!state.onlyRenderMessage || state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            return;
          }
          const notificationType = username === meta.username ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER;
          const notificationData = createNotificationData(notificationType, notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { username } : {});
          const newMessage = createMessage({ meta, hash, id, data: notificationData, state });
          state.messages.push(newMessage);
        },
        async sideEffect({ data, contractID, hash, meta }, { state }) {
          const rootGetters = (0, import_sbp6.default)("state/vuex/getters");
          const { username } = data;
          const loggedIn = (0, import_sbp6.default)("state/vuex/state").loggedIn;
          emitMessageEvent({ contractID, hash });
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate });
          if (username === loggedIn.username) {
            if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
              (0, import_sbp6.default)("state/vuex/commit", "deleteChatRoomReadUntil", {
                chatRoomId: contractID,
                deletedDate: meta.createdDate
              });
            }
            const lookupResult = await Promise.allSettled(Object.keys(state.users).filter((name) => !rootGetters.ourContactProfiles[name] && name !== loggedIn.username).map(async (name) => await (0, import_sbp6.default)("namespace/lookup", name).then((r) => {
              if (!r)
                throw new Error("Cannot lookup username: " + name);
              return r;
            })));
            const errors = lookupResult.filter(({ status }) => status === "rejected").map((r) => r.reason);
            await (0, import_sbp6.default)("chelonia/contract/sync", lookupResult.filter(({ status }) => status === "fulfilled").map((r) => r.value)).catch((e) => errors.push(e));
            if (errors.length) {
              const msg = `Encountered ${errors.length} errors while joining a chatroom`;
              console.error(msg, errors);
              throw new Error(msg);
            }
          } else {
            if (!rootGetters.ourContactProfiles[username]) {
              const contractID2 = await (0, import_sbp6.default)("namespace/lookup", username);
              if (!contractID2) {
                throw new Error("Cannot lookup username: " + username);
              }
              await (0, import_sbp6.default)("chelonia/contract/sync", contractID2);
            }
          }
        }
      },
      "gi.contracts/chatroom/rename": {
        validate: objectOf({
          name: string
        }),
        process({ data, meta, hash, id }, { state }) {
          import_common.Vue.set(state.attributes, "name", data.name);
          if (!state.onlyRenderMessage) {
            return;
          }
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {});
          const newMessage = createMessage({ meta, hash, id, data: notificationData, state });
          state.messages.push(newMessage);
        },
        sideEffect({ contractID, hash, meta }) {
          emitMessageEvent({ contractID, hash });
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate });
        }
      },
      "gi.contracts/chatroom/changeDescription": {
        validate: objectOf({
          description: string
        }),
        process({ data, meta, hash, id }, { state }) {
          import_common.Vue.set(state.attributes, "description", data.description);
          if (!state.onlyRenderMessage) {
            return;
          }
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {});
          const newMessage = createMessage({ meta, hash, id, data: notificationData, state });
          state.messages.push(newMessage);
        },
        sideEffect({ contractID, hash, meta }) {
          emitMessageEvent({ contractID, hash });
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate });
        }
      },
      "gi.contracts/chatroom/leave": {
        validate: objectOf({
          username: string,
          showKickedBy: optional(string)
        }),
        process({ data, meta, hash, id }, { state }) {
          const { username, showKickedBy } = data;
          const isKicked = showKickedBy && username !== showKickedBy;
          if (!state.onlyRenderMessage && !state.users[username]) {
            throw new Error(`Can not leave the chatroom which ${username} is not part of`);
          }
          import_common.Vue.delete(state.users, username);
          if (!state.onlyRenderMessage || state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            return;
          }
          const notificationType = isKicked ? MESSAGE_NOTIFICATIONS.KICK_MEMBER : MESSAGE_NOTIFICATIONS.LEAVE_MEMBER;
          const notificationData = createNotificationData(notificationType, isKicked ? { username } : {});
          const newMessage = createMessage({
            meta: { ...meta, username: showKickedBy || username },
            hash,
            id,
            data: notificationData,
            state
          });
          state.messages.push(newMessage);
        },
        sideEffect({ data, hash, contractID, meta }, { state }) {
          if (data.username === (0, import_sbp6.default)("state/vuex/state").loggedIn.username) {
            if ((0, import_sbp6.default)("chelonia/contract/isSyncing", contractID)) {
              return;
            }
            leaveChatRoom({ contractID });
          } else {
            emitMessageEvent({ contractID, hash });
            setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate });
            if (state.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE) {
              (0, import_sbp6.default)("gi.contracts/chatroom/rotateKeys", contractID, state);
            }
          }
          const rootGetters = (0, import_sbp6.default)("state/vuex/getters");
          const userID = rootGetters.ourContactProfiles[data.member]?.contractID;
          if (userID) {
            (0, import_sbp6.default)("gi.contracts/chatroom/removeForeignKeys", contractID, userID, state);
          }
        }
      },
      "gi.contracts/chatroom/delete": {
        validate: (data, { state, meta }) => {
          if (state.attributes.creator !== meta.username) {
            throw new TypeError((0, import_common.L)("Only the channel creator can delete channel."));
          }
        },
        process({ data, meta }, { state }) {
          import_common.Vue.set(state.attributes, "deletedDate", meta.createdDate);
          for (const username in state.users) {
            import_common.Vue.delete(state.users, username);
          }
        },
        sideEffect({ meta, contractID }, { state }) {
          if ((0, import_sbp6.default)("chelonia/contract/isSyncing", contractID)) {
            return;
          }
          leaveChatRoom({ contractID });
        }
      },
      "gi.contracts/chatroom/addMessage": {
        validate: messageType,
        process({ direction, data, meta, hash, id }, { state }) {
          if (!state.onlyRenderMessage) {
            return;
          }
          if (direction === "outgoing") {
            state.messages.push({ ...createMessage({ meta, data, hash, id, state }), pending: true });
            return;
          }
          const pendingMsg = state.messages.find((msg) => msg.id === id && msg.pending);
          if (pendingMsg) {
            delete pendingMsg.pending;
            pendingMsg.hash = hash;
          } else {
            state.messages.push(createMessage({ meta, data, hash, id, state }));
          }
        },
        sideEffect({ contractID, hash, id, meta, data }, { state, getters }) {
          emitMessageEvent({ contractID, hash });
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate });
          const me = (0, import_sbp6.default)("state/vuex/state").loggedIn.username;
          if (me === meta.username && data.type !== MESSAGE_TYPES.INTERACTIVE) {
            return;
          }
          const newMessage = createMessage({ meta, data, hash, id, state });
          const mentions = makeMentionFromUsername(me);
          const isMentionedMe = data.type === MESSAGE_TYPES.TEXT && (newMessage.text.includes(mentions.me) || newMessage.text.includes(mentions.all));
          messageReceivePostEffect({
            contractID,
            messageHash: newMessage.hash,
            datetime: newMessage.datetime,
            text: newMessage.text,
            isDMOrMention: isMentionedMe || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE,
            messageType: data.type,
            username: meta.username,
            chatRoomName: getters.chatRoomAttributes.name
          });
        }
      },
      "gi.contracts/chatroom/editMessage": {
        validate: objectOf({
          hash: string,
          createdDate: string,
          text: string
        }),
        process({ data, meta }, { state }) {
          if (!state.onlyRenderMessage) {
            return;
          }
          const msgIndex = findMessageIdx(data.hash, state.messages);
          if (msgIndex >= 0 && meta.username === state.messages[msgIndex].from) {
            state.messages[msgIndex].text = data.text;
            state.messages[msgIndex].updatedDate = meta.createdDate;
            if (state.onlyRenderMessage && state.messages[msgIndex].pending) {
              delete state.messages[msgIndex].pending;
            }
          }
        },
        sideEffect({ contractID, hash, meta, data }, { getters }) {
          emitMessageEvent({ contractID, hash });
          const rootState = (0, import_sbp6.default)("state/vuex/state");
          const me = rootState.loggedIn.username;
          if (me === meta.username || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            return;
          }
          const isAlreadyAdded = !!(0, import_sbp6.default)("state/vuex/getters").chatRoomUnreadMessages(contractID).find((m) => m.messageHash === data.hash);
          const mentions = makeMentionFromUsername(me);
          const isMentionedMe = data.text.includes(mentions.me) || data.text.includes(mentions.all);
          if (!isAlreadyAdded) {
            messageReceivePostEffect({
              contractID,
              messageHash: data.hash,
              datetime: data.createdDate,
              text: data.text,
              isDMOrMention: isMentionedMe,
              messageType: MESSAGE_TYPES.TEXT,
              username: meta.username,
              chatRoomName: getters.chatRoomAttributes.name
            });
          } else if (!isMentionedMe) {
            (0, import_sbp6.default)("state/vuex/commit", "deleteChatRoomUnreadMessage", {
              chatRoomId: contractID,
              messageHash: data.hash
            });
          }
        }
      },
      "gi.contracts/chatroom/deleteMessage": {
        validate: objectOf({ hash: string }),
        process({ data, meta }, { state }) {
          if (!state.onlyRenderMessage) {
            return;
          }
          const msgIndex = findMessageIdx(data.hash, state.messages);
          if (msgIndex >= 0) {
            state.messages.splice(msgIndex, 1);
          }
          for (const message of state.messages) {
            if (message.replyingMessage?.hash === data.hash) {
              message.replyingMessage.hash = null;
              message.replyingMessage.text = (0, import_common.L)("Original message was removed by {username}", {
                username: makeMentionFromUsername(meta.username).me
              });
            }
          }
        },
        sideEffect({ data, contractID, hash, meta }) {
          emitMessageEvent({ contractID, hash });
          const rootState = (0, import_sbp6.default)("state/vuex/state");
          const me = rootState.loggedIn.username;
          if (rootState.chatRoomScrollPosition[contractID] === data.hash) {
            (0, import_sbp6.default)("state/vuex/commit", "setChatRoomScrollPosition", {
              chatRoomId: contractID,
              messageHash: null
            });
          }
          if (rootState.chatRoomUnread[contractID].readUntil.messageHash === data.hash) {
            (0, import_sbp6.default)("state/vuex/commit", "deleteChatRoomReadUntil", {
              chatRoomId: contractID,
              deletedDate: meta.createdDate
            });
          }
          if (me === meta.username) {
            return;
          }
          (0, import_sbp6.default)("state/vuex/commit", "deleteChatRoomUnreadMessage", {
            chatRoomId: contractID,
            messageHash: data.hash
          });
        }
      },
      "gi.contracts/chatroom/makeEmotion": {
        validate: objectOf({
          hash: string,
          emoticon: string
        }),
        process({ data, meta, contractID }, { state }) {
          if (!state.onlyRenderMessage) {
            return;
          }
          const { hash, emoticon } = data;
          const msgIndex = findMessageIdx(hash, state.messages);
          if (msgIndex >= 0) {
            let emoticons = cloneDeep(state.messages[msgIndex].emoticons || {});
            if (emoticons[emoticon]) {
              const alreadyAdded = emoticons[emoticon].indexOf(meta.username);
              if (alreadyAdded >= 0) {
                emoticons[emoticon].splice(alreadyAdded, 1);
                if (!emoticons[emoticon].length) {
                  delete emoticons[emoticon];
                  if (!Object.keys(emoticons).length) {
                    emoticons = null;
                  }
                }
              } else {
                emoticons[emoticon].push(meta.username);
              }
            } else {
              emoticons[emoticon] = [meta.username];
            }
            if (emoticons) {
              import_common.Vue.set(state.messages[msgIndex], "emoticons", emoticons);
            } else {
              import_common.Vue.delete(state.messages[msgIndex], "emoticons");
            }
          }
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/voteOnPoll": {
        validate: objectOf({
          hash: string,
          votes: arrayOf(string),
          votesAsString: string
        }),
        process({ data, meta, hash, id }, { state }) {
          if (!state.onlyRenderMessage) {
            return;
          }
          const msgIndex = findMessageIdx(data.hash, state.messages);
          if (msgIndex >= 0) {
            const myVotes = data.votes;
            const pollData = state.messages[msgIndex].pollData;
            const optsCopy = cloneDeep(pollData.options);
            const votedOptNames = [];
            myVotes.forEach((optId) => {
              const foundOpt = optsCopy.find((x) => x.id === optId);
              if (foundOpt) {
                foundOpt.voted.push(meta.username);
                votedOptNames.push(`"${foundOpt.value}"`);
              }
            });
            import_common.Vue.set(state.messages[msgIndex], "pollData", { ...pollData, options: optsCopy });
          }
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.VOTE_ON_POLL, {
            votedOptions: data.votesAsString,
            pollMessageHash: data.hash
          });
          const newMessage = createMessage({ meta, hash, id, data: notificationData, state });
          state.messages.push(newMessage);
        },
        sideEffect({ contractID, hash, meta }) {
          emitMessageEvent({ contractID, hash });
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate });
        }
      },
      "gi.contracts/chatroom/changeVoteOnPoll": {
        validate: objectOf({
          hash: string,
          votes: arrayOf(string),
          votesAsString: string
        }),
        process({ data, meta, hash, id }, { state }) {
          if (!state.onlyRenderMessage) {
            return;
          }
          const msgIndex = findMessageIdx(data.hash, state.messages);
          if (msgIndex >= 0) {
            const me = meta.username;
            const myUpdatedVotes = data.votes;
            const pollData = state.messages[msgIndex].pollData;
            const optsCopy = cloneDeep(pollData.options);
            const votedOptNames = [];
            optsCopy.forEach((opt) => {
              opt.voted = opt.voted.filter((votername) => votername !== me);
            });
            myUpdatedVotes.forEach((optId) => {
              const foundOpt = optsCopy.find((x) => x.id === optId);
              if (foundOpt) {
                foundOpt.voted.push(me);
                votedOptNames.push(`"${foundOpt.value}"`);
              }
            });
            import_common.Vue.set(state.messages[msgIndex], "pollData", { ...pollData, options: optsCopy });
          }
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.CHANGE_VOTE_ON_POLL, {
            votedOptions: data.votesAsString,
            pollMessageHash: data.hash
          });
          const newMessage = createMessage({ meta, hash, id, data: notificationData, state });
          state.messages.push(newMessage);
        },
        sideEffect({ contractID, hash, meta }) {
          emitMessageEvent({ contractID, hash });
          setReadUntilWhileJoining({ contractID, hash, createdDate: meta.createdDate });
        }
      },
      "gi.contracts/chatroom/closePoll": {
        validate: objectOf({
          hash: string
        }),
        process({ data }, { state }) {
          if (!state.onlyRenderMessage) {
            return;
          }
          const msgIndex = findMessageIdx(data.hash, state.messages);
          if (msgIndex >= 0) {
            const pollData = state.messages[msgIndex].pollData;
            import_common.Vue.set(state.messages[msgIndex], "pollData", { ...pollData, status: POLL_STATUS.CLOSED });
          }
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      }
    },
    methods: {
      "gi.contracts/chatroom/rotateKeys": (contractID, state) => {
        if (!state._volatile)
          import_common.Vue.set(state, "_volatile", /* @__PURE__ */ Object.create(null));
        if (!state._volatile.pendingKeyRevocations)
          import_common.Vue.set(state._volatile, "pendingKeyRevocations", /* @__PURE__ */ Object.create(null));
        const CSKid = findKeyIdByName(state, "csk");
        const CEKid = findKeyIdByName(state, "cek");
        import_common.Vue.set(state._volatile.pendingKeyRevocations, CSKid, true);
        import_common.Vue.set(state._volatile.pendingKeyRevocations, CEKid, true);
        (0, import_sbp6.default)("chelonia/queueInvocation", contractID, ["gi.actions/out/rotateKeys", contractID, "gi.contracts/chatroom", "pending", "gi.actions/chatroom/shareNewKeys"]).catch((e) => {
          console.warn(`rotateKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e);
        });
      },
      "gi.contracts/chatroom/removeForeignKeys": (contractID, userID, state) => {
        const keyIds = findForeignKeysByContractID(state, userID);
        if (!keyIds?.length)
          return;
        const CSKid = findKeyIdByName(state, "csk");
        const CEKid = findKeyIdByName(state, "cek");
        if (!CEKid)
          throw new Error("Missing encryption key");
        (0, import_sbp6.default)("chelonia/queueInvocation", contractID, ["chelonia/out/keyDel", {
          contractID,
          contractName: "gi.contracts/chatroom",
          data: keyIds,
          signingKeyId: CSKid
        }]).catch((e) => {
          console.warn(`removeForeignKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e);
        });
      }
    }
  });
})();
/*!
 * Fast "async" scrypt implementation in JavaScript.
 * Copyright (c) 2013-2016 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/scrypt-async-js
 */
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
