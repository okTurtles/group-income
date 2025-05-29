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
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
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

  // shared/domains/chelonia/errors.js
  var ChelErrorGenerator = (name, base = Error) => class extends base {
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
  var ChelErrorUnexpectedHttpResponseCode = ChelErrorGenerator("ChelErrorUnexpectedHttpResponseCode");
  var ChelErrorResourceGone = ChelErrorGenerator("ChelErrorResourceGone", ChelErrorUnexpectedHttpResponseCode);

  // frontend/common/errors.js
  var GIErrorIgnoreAndBan = ChelErrorGenerator("GIErrorIgnoreAndBan");
  var GIErrorUIRuntimeError = ChelErrorGenerator("GIErrorUIRuntimeError");
  var GIErrorMissingSigningKeyError = ChelErrorGenerator("GIErrorMissingSigningKeyError");

  // frontend/model/contracts/identity.js
  var import_sbp3 = __toESM(__require("@sbp/sbp"));

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
  var validatorFrom = (fn) => {
    function customType(value, _scope = "") {
      if (!fn(value)) {
        throw validatorError(customType, value, _scope);
      }
      return value;
    }
    return customType;
  };

  // frontend/utils/events.js
  var LEFT_GROUP = "left-group";
  var DELETED_CHATROOM = "deleted-chatroom";

  // node_modules/@chelonia/serdes/dist/esm/index.js
  var serdesTagSymbol = Symbol("tag");
  var serdesSerializeSymbol = Symbol("serialize");
  var serdesDeserializeSymbol = Symbol("deserialize");
  var rawResult = (rawResultSet, obj) => {
    rawResultSet.add(obj);
    return obj;
  };
  var serializer = (data) => {
    const rawResultSet = /* @__PURE__ */ new WeakSet();
    const verbatim = [];
    const transferables = /* @__PURE__ */ new Set();
    const revokables = /* @__PURE__ */ new Set();
    const result = JSON.parse(JSON.stringify(data, (_key, value) => {
      if (value && typeof value === "object" && rawResultSet.has(value))
        return value;
      if (value === void 0)
        return rawResult(rawResultSet, ["_", "_"]);
      if (!value)
        return value;
      if (Array.isArray(value) && value[0] === "_")
        return rawResult(rawResultSet, ["_", "_", ...value]);
      if (value instanceof Map) {
        return rawResult(rawResultSet, ["_", "Map", Array.from(value.entries())]);
      }
      if (value instanceof Set) {
        return rawResult(rawResultSet, ["_", "Set", Array.from(value.values())]);
      }
      if (value instanceof Blob || value instanceof File) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        return rawResult(rawResultSet, ["_", "_ref", pos]);
      }
      if (value instanceof Error) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        if (value.cause) {
          value.cause = serializer(value.cause).data;
        }
        return rawResult(rawResultSet, ["_", "_err", rawResult(rawResultSet, ["_", "_ref", pos]), value.name]);
      }
      if (value instanceof MessagePort || value instanceof ReadableStream || value instanceof WritableStream || value instanceof ArrayBuffer) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        transferables.add(value);
        return rawResult(rawResultSet, ["_", "_ref", pos]);
      }
      if (ArrayBuffer.isView(value)) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        transferables.add(value.buffer);
        return rawResult(rawResultSet, ["_", "_ref", pos]);
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
        return rawResult(rawResultSet, ["_", "_fn", mc.port2]);
      }
      const proto = Object.getPrototypeOf(value);
      if (proto?.constructor?.[serdesTagSymbol] && proto.constructor[serdesSerializeSymbol]) {
        return rawResult(rawResultSet, ["_", "_custom", proto.constructor[serdesTagSymbol], proto.constructor[serdesSerializeSymbol](value)]);
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
    const rawResultSet = /* @__PURE__ */ new WeakSet();
    const verbatim = [];
    return JSON.parse(JSON.stringify(data, (_key, value) => {
      if (value && typeof value === "object" && !rawResultSet.has(value) && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        return rawResult(rawResultSet, ["_", "_ref", pos]);
      }
      return value;
    }), (_key, value) => {
      if (Array.isArray(value) && value[0] === "_") {
        switch (value[1]) {
          case "_":
            if (value.length >= 3) {
              return value.slice(2);
            } else {
              return;
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
  deserializer.register = (ctor) => {
    if (typeof ctor === "function" && typeof ctor[serdesTagSymbol] === "string" && typeof ctor[serdesDeserializeSymbol] === "function") {
      deserializerTable[ctor[serdesTagSymbol]] = ctor[serdesDeserializeSymbol].bind(ctor);
    }
  };

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

  // frontend/model/contracts/shared/constants.js
  var MAX_HASH_LEN = 300;
  var MAX_URL_LEN = 2048;
  var IDENTITY_USERNAME_MAX_CHARS = 80;
  var IDENTITY_EMAIL_MAX_CHARS = 320;
  var IDENTITY_BIO_MAX_CHARS = 500;
  var GROUP_PERMISSIONS = {
    VIEW_PERMISSIONS: "view-permissions",
    ASSIGN_DELEGATOR: "assign-delegator",
    DELEGATE_PERMISSIONS: "delegate-permissions",
    // add/edit/remove permissions
    REMOVE_MEMBER: "remove-member",
    REVOKE_INVITE: "revoke-invite",
    DELETE_CHANNEL: "delete-channel"
  };
  var GP = GROUP_PERMISSIONS;
  var GROUP_PERMISSIONS_PRESET = {
    ADMIN: [
      GP.VIEW_PERMISSIONS,
      GP.ASSIGN_DELEGATOR,
      GP.DELEGATE_PERMISSIONS,
      GP.REMOVE_MEMBER,
      GP.REVOKE_INVITE,
      GP.DELETE_CHANNEL
    ],
    MODERATOR_DELEGATOR: [
      GP.VIEW_PERMISSIONS,
      GP.DELEGATE_PERMISSIONS,
      GP.REMOVE_MEMBER,
      GP.REVOKE_INVITE,
      GP.DELETE_CHANNEL
    ],
    MODERATOR: [
      GP.VIEW_PERMISSIONS,
      GP.REMOVE_MEMBER,
      GP.REVOKE_INVITE,
      GP.DELETE_CHANNEL
    ]
  };

  // frontend/model/contracts/shared/functions.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/time.js
  var MINS_MILLIS = 6e4;
  var HOURS_MILLIS = 60 * MINS_MILLIS;
  var DAYS_MILLIS = 24 * HOURS_MILLIS;
  var MONTHS_MILLIS = 30 * DAYS_MILLIS;
  var YEARS_MILLIS = 365 * DAYS_MILLIS;

  // frontend/model/contracts/shared/functions.js
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
          const count = (0, import_sbp2.default)("okTurtles.data/get", key);
          (0, import_sbp2.default)("okTurtles.data/set", key, (count || 0) + delta[op]);
          if (count != null) return;
          (0, import_sbp2.default)("chelonia/queueInvocation", parentContractID, () => {
            const count2 = (0, import_sbp2.default)("okTurtles.data/get", key);
            (0, import_sbp2.default)("okTurtles.data/delete", key);
            if (count2 && count2 !== Math.sign(count2)) {
              console.warn(`[${selector}] Unexpected value`, parentContractID, childContractID, count2);
              if ("") {
                Promise.reject(new Error(`[${selector}] Unexpected value ${parentContractID} ${childContractID}: ${count2}`));
              }
            }
            switch (Math.sign(count2)) {
              case -1:
                (0, import_sbp2.default)("chelonia/contract/release", childContractID).catch((e) => {
                  console.error(`[${selector}] Error calling release`, parentContractID, childContractID, e);
                });
                break;
              case 1:
                (0, import_sbp2.default)("chelonia/contract/retain", childContractID).catch((e) => console.error(`[${selector}] Error calling retain`, parentContractID, childContractID, e));
                break;
            }
          }).catch((e) => {
            console.error(`[${selector}] Error in queued invocation`, parentContractID, childContractID, e);
          });
        }
      }
    };
  };

  // frontend/model/contracts/shared/getters/identity.js
  var identity_default = {
    loginState(state, getters) {
      return getters.currentIdentityState.loginState;
    },
    ourDirectMessages(state, getters) {
      return getters.currentIdentityState.chatRooms || {};
    }
  };

  // node_modules/turtledash/dist/esm/index.js
  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function isMergeableObject(val) {
    const nonNullObject = val && typeof val === "object";
    return nonNullObject && Object.prototype.toString.call(val) !== "[object RegExp]" && Object.prototype.toString.call(val) !== "[object Date]";
  }
  function merge(obj, src) {
    const res = obj;
    for (const key in src) {
      const clone = isMergeableObject(src[key]) ? cloneDeep(src[key]) : void 0;
      let x;
      if (clone && has(obj, key) && isMergeableObject(x = res[key])) {
        merge(x, clone);
        continue;
      }
      Object.defineProperty(res, key, {
        configurable: true,
        enumerable: true,
        value: clone || src[key],
        writable: true
      });
    }
    return res;
  }
  var has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

  // frontend/model/contracts/shared/validators.js
  var allowedUsernameCharacters = (value) => /^[\w-]*$/.test(value);
  var noConsecutiveHyphensOrUnderscores = (value) => !value.includes("--") && !value.includes("__");
  var noLeadingOrTrailingHyphen = (value) => !value.startsWith("-") && !value.endsWith("-");
  var noLeadingOrTrailingUnderscore = (value) => !value.startsWith("_") && !value.endsWith("_");
  var noUppercase = (value) => value.toLowerCase() === value;

  // frontend/model/contracts/identity.js
  var attributesType = objectMaybeOf({
    username: stringMax(IDENTITY_USERNAME_MAX_CHARS, "username"),
    displayName: optional(stringMax(IDENTITY_USERNAME_MAX_CHARS, "displayName")),
    // same char-limit as the username.
    email: optional(stringMax(IDENTITY_EMAIL_MAX_CHARS, "email")),
    // https://github.com/okTurtles/group-income/issues/2192
    bio: optional(stringMax(IDENTITY_BIO_MAX_CHARS, "bio")),
    picture: unionOf(stringMax(MAX_URL_LEN), objectOf({
      manifestCid: stringMax(MAX_HASH_LEN, "manifestCid"),
      downloadParams: optional(object)
    }))
  });
  var validateUsername = (username) => {
    if (!username) {
      throw new TypeError("A username is required");
    }
    if (!allowedUsernameCharacters(username)) {
      throw new TypeError("A username cannot contain disallowed characters.");
    }
    if (!noConsecutiveHyphensOrUnderscores(username)) {
      throw new TypeError("A username cannot contain two consecutive hyphens or underscores.");
    }
    if (!noLeadingOrTrailingHyphen(username)) {
      throw new TypeError("A username cannot start or end with a hyphen.");
    }
    if (!noLeadingOrTrailingUnderscore(username)) {
      throw new TypeError("A username cannot start or end with an underscore.");
    }
    if (!noUppercase(username)) {
      throw new TypeError("A username cannot contain uppercase letters.");
    }
  };
  var checkUsernameConsistency = async (contractID, username) => {
    const lookupResult = await (0, import_sbp3.default)("namespace/lookup", username, { skipCache: true });
    if (lookupResult === contractID) return;
    console.error(`Mismatched username. The lookup result was ${lookupResult} instead of ${contractID}`);
    (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
      const state = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
      if (!state) return;
      const username2 = state[contractID].attributes.username;
      if (await (0, import_sbp3.default)("namespace/lookupCached", username2) !== contractID) {
        (0, import_sbp3.default)("gi.notifications/emit", "WARNING", {
          contractID,
          message: L("Unable to confirm that the username {username} belongs to this identity contract", { username: username2 })
        });
      }
    });
  };
  (0, import_sbp3.default)("chelonia/defineContract", {
    name: "gi.contracts/identity",
    getters: {
      currentIdentityState(state) {
        return state;
      },
      ...identity_default
    },
    actions: {
      "gi.contracts/identity": {
        validate: (data) => {
          objectMaybeOf({
            attributes: attributesType
          })(data);
          const { username } = data.attributes;
          if (!username) {
            throw new TypeError("A username is required");
          }
          validateUsername(username);
        },
        process({ data }, { state }) {
          const initialState = merge({
            settings: {},
            attributes: {},
            chatRooms: {},
            groups: {},
            fileDeleteTokens: {}
          }, data);
          for (const key in initialState) {
            state[key] = initialState[key];
          }
        },
        async sideEffect({ contractID, data }) {
          await checkUsernameConsistency(contractID, data.attributes.username);
        }
      },
      "gi.contracts/identity/setAttributes": {
        validate: (data) => {
          attributesType(data);
          if (has(data, "username")) {
            validateUsername(data.username);
          }
        },
        process({ data }, { state }) {
          if (!state.attributes) {
            state.attributes = /* @__PURE__ */ Object.create(null);
          }
          for (const key in data) {
            state.attributes[key] = data[key];
          }
        },
        async sideEffect({ contractID, data }) {
          if (has(data, "username")) {
            await checkUsernameConsistency(contractID, data.username);
          }
        }
      },
      "gi.contracts/identity/deleteAttributes": {
        validate: (data) => {
          arrayOf(string)(data);
          if (data.includes("username")) {
            throw new Error("Username can't be deleted");
          }
        },
        process({ data }, { state }) {
          if (!state.attributes) {
            return;
          }
          for (const attribute of data) {
            delete state.attributes[attribute];
          }
        }
      },
      "gi.contracts/identity/updateSettings": {
        validate: object,
        process({ data }, { state }) {
          for (const key in data) {
            state.settings[key] = data[key];
          }
        }
      },
      "gi.contracts/identity/createDirectMessage": {
        validate: (data) => {
          objectOf({
            contractID: stringMax(MAX_HASH_LEN, "contractID")
            // NOTE: chatroom contract id
          })(data);
        },
        process({ data }, { state }) {
          const { contractID } = data;
          state.chatRooms[contractID] = {
            visible: true
            // NOTE: this attr is used to hide/show direct message
          };
        },
        sideEffect({ contractID, data }) {
          (0, import_sbp3.default)("gi.contracts/identity/referenceTally", contractID, data.contractID, "retain");
        }
      },
      "gi.contracts/identity/joinDirectMessage": {
        validate: objectOf({
          contractID: stringMax(MAX_HASH_LEN, "contractID")
        }),
        process({ data }, { state }) {
          const { contractID } = data;
          if (!state.chatRooms) {
            state.chatRooms = /* @__PURE__ */ Object.create(null);
          }
          if (state.chatRooms[contractID]) {
            throw new TypeError(L("Already joined direct message."));
          }
          state.chatRooms[contractID] = {
            visible: true
          };
        },
        sideEffect({ contractID, data }, { state }) {
          if (state.chatRooms[data.contractID].visible) {
            (0, import_sbp3.default)("gi.contracts/identity/referenceTally", contractID, data.contractID, "retain");
          }
        }
      },
      "gi.contracts/identity/joinGroup": {
        validate: objectMaybeOf({
          groupContractID: stringMax(MAX_HASH_LEN, "groupContractID"),
          inviteSecret: string,
          creatorID: optional(boolean)
        }),
        async process({ hash, data }, { state }) {
          const { groupContractID, inviteSecret } = data;
          if (has(state.groups, groupContractID) && !state.groups[groupContractID].hasLeft) {
            throw new Error(`Cannot join already joined group ${groupContractID}`);
          }
          const inviteSecretId = await (0, import_sbp3.default)("chelonia/crypto/keyId", new Secret(inviteSecret));
          state.groups[groupContractID] = { hash, inviteSecretId };
        },
        async sideEffect({ hash, data, contractID }, { state }) {
          const { groupContractID, inviteSecret } = data;
          await (0, import_sbp3.default)("chelonia/storeSecretKeys", new Secret([{
            key: inviteSecret,
            transient: true
          }]));
          (0, import_sbp3.default)("gi.contracts/identity/referenceTally", contractID, groupContractID, "retain");
          (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
            const state2 = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
            if (!state2 || contractID !== (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID) {
              return;
            }
            if (!has(state2.groups, groupContractID) || state2.groups[groupContractID].hasLeft || state2.groups[groupContractID].hash !== hash) {
              (0, import_sbp3.default)("okTurtles.data/set", `gi.contracts/identity/group-skipped-${groupContractID}-${hash}`, true);
              return;
            }
            const inviteSecretId = (0, import_sbp3.default)("chelonia/crypto/keyId", new Secret(inviteSecret));
            return inviteSecretId;
          }).then(async (inviteSecretId) => {
            if (!inviteSecretId) return;
            (0, import_sbp3.default)("gi.actions/group/join", {
              originatingContractID: contractID,
              originatingContractName: "gi.contracts/identity",
              contractID: data.groupContractID,
              contractName: "gi.contracts/group",
              reference: hash,
              signingKeyId: inviteSecretId,
              innerSigningKeyId: await (0, import_sbp3.default)("chelonia/contract/currentKeyIdByName", state, "csk"),
              encryptionKeyId: await (0, import_sbp3.default)("chelonia/contract/currentKeyIdByName", state, "cek")
            }).catch((e) => {
              console.warn(`[gi.contracts/identity/joinGroup/sideEffect] Error sending gi.actions/group/join action for group ${data.groupContractID}`, e);
            });
          }).catch((e) => {
            console.error(`[gi.contracts/identity/joinGroup/sideEffect] Error at queueInvocation group ${data.groupContractID}`, e);
          });
        }
      },
      "gi.contracts/identity/leaveGroup": {
        validate: objectOf({
          groupContractID: stringMax(MAX_HASH_LEN, "groupContractID"),
          reference: string
        }),
        process({ data }, { state }) {
          const { groupContractID, reference } = data;
          if (!has(state.groups, groupContractID) || state.groups[groupContractID].hasLeft) {
            throw new Error(`Cannot leave group which hasn't been joined ${groupContractID}`);
          }
          if (state.groups[groupContractID].hash !== reference) {
            throw new Error(`Cannot leave group ${groupContractID} because the reference hash does not match the latest`);
          }
          state.groups[groupContractID] = { hash: reference, hasLeft: true };
        },
        sideEffect({ data, contractID }) {
          (0, import_sbp3.default)("gi.contracts/identity/referenceTally", contractID, data.groupContractID, "release");
          (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
            const state = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
            if (!state || contractID !== (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID) {
              return;
            }
            const { groupContractID, reference } = data;
            if (!has(state.groups, groupContractID) || !state.groups[groupContractID].hasLeft || state.groups[groupContractID].hash !== reference) {
              return;
            }
            (0, import_sbp3.default)("gi.actions/group/removeOurselves", {
              contractID: groupContractID
            }).catch((e) => {
              if (e?.name === "GIErrorUIRuntimeError" && e.cause?.name === "GIGroupNotJoinedError") return;
              console.warn(`[gi.contracts/identity/leaveGroup/sideEffect] Error removing ourselves from group contract ${data.groupContractID}`, e);
            });
            if ((0, import_sbp3.default)("state/vuex/state").lastLoggedIn?.[contractID]) {
              delete (0, import_sbp3.default)("state/vuex/state").lastLoggedIn[contractID];
            }
            await (0, import_sbp3.default)("gi.contracts/identity/revokeGroupKeyAndRotateOurPEK", contractID, state, data.groupContractID);
            (0, import_sbp3.default)("okTurtles.events/emit", LEFT_GROUP, { identityContractID: contractID, groupContractID: data.groupContractID });
          }).catch((e) => {
            console.error(`[gi.contracts/identity/leaveGroup/sideEffect] Error leaving group ${data.groupContractID}`, e);
          });
        }
      },
      "gi.contracts/identity/setDirectMessageVisibility": {
        validate: (data, { state }) => {
          objectOf({
            contractID: stringMax(MAX_HASH_LEN, "contractID"),
            visible: boolean
          })(data);
          if (!state.chatRooms[data.contractID]) {
            throw new TypeError(L("Not existing direct message."));
          }
        },
        process({ data }, { state }) {
          state.chatRooms[data.contractID]["visible"] = data.visible;
        }
      },
      "gi.contracts/identity/saveFileDeleteToken": {
        validate: objectOf({
          billableContractID: stringMax(MAX_HASH_LEN, "billableContractID"),
          tokensByManifestCid: arrayOf(objectOf({
            manifestCid: stringMax(MAX_HASH_LEN, "manifestCid"),
            token: string
          }))
        }),
        process({ data }, { state }) {
          for (const { manifestCid, token } of data.tokensByManifestCid) {
            state.fileDeleteTokens[manifestCid] = {
              billableContractID: data.billableContractID,
              token
            };
          }
        }
      },
      "gi.contracts/identity/removeFileDeleteToken": {
        validate: objectOf({
          manifestCids: arrayOf(string)
        }),
        process({ data }, { state }) {
          for (const manifestCid of data.manifestCids) {
            delete state.fileDeleteTokens[manifestCid];
          }
        }
      },
      "gi.contracts/identity/setGroupAttributes": {
        validate: objectOf({
          groupContractID: string,
          attributes: objectMaybeOf({
            seenWelcomeScreen: validatorFrom((v) => v === true)
          })
        }),
        process({ data }, { state }) {
          const { groupContractID, attributes } = data;
          if (!has(state.groups, groupContractID) || state.groups[groupContractID].hasLeft) {
            throw new Error("Can't set attributes of groups you're not a member of");
          }
          if (attributes.seenWelcomeScreen) {
            if (state.groups[groupContractID].seenWelcomeScreen) {
              throw new Error("seenWelcomeScreen already set");
            }
            state.groups[groupContractID].seenWelcomeScreen = attributes.seenWelcomeScreen;
          }
        }
      },
      "gi.contracts/identity/deleteDirectMessage": {
        validate: objectOf({
          contractID: string
        }),
        process({ contractID, data }, { state }) {
          if (state.chatRooms[data.contractID].visible) {
            (0, import_sbp3.default)(
              "gi.contracts/identity/pushSideEffect",
              contractID,
              ["gi.contracts/identity/referenceTally", contractID, data.contractID, "release"]
            );
          }
          delete state.chatRooms[data.contractID];
        },
        sideEffect({ data, contractID, innerSigningContractID }) {
          (0, import_sbp3.default)("okTurtles.events/emit", DELETED_CHATROOM, { chatRoomID: data.contractID });
          const { identityContractID } = (0, import_sbp3.default)("state/vuex/state").loggedIn;
          if (identityContractID === innerSigningContractID) {
            (0, import_sbp3.default)("gi.actions/chatroom/delete", { contractID: data.contractID, data: {} }).catch((e) => {
              console.warn(`Error sending chatroom removal action for ${data.chatRoomID}`, e);
            });
          }
        }
      }
    },
    methods: {
      "gi.contracts/identity/revokeGroupKeyAndRotateOurPEK": async (identityContractID, state, groupContractID) => {
        const CSKid = await (0, import_sbp3.default)("chelonia/contract/currentKeyIdByName", state, "csk", true);
        const CEKid = await (0, import_sbp3.default)("chelonia/contract/currentKeyIdByName", state, "cek");
        const groupCSKids = await (0, import_sbp3.default)("chelonia/contract/foreignKeysByContractID", state, groupContractID);
        if (groupCSKids?.length) {
          if (!CEKid) {
            throw new Error("Identity CEK not found");
          }
          (0, import_sbp3.default)("chelonia/queueInvocation", identityContractID, ["chelonia/out/keyDel", {
            contractID: identityContractID,
            contractName: "gi.contracts/identity",
            data: groupCSKids,
            signingKeyId: CSKid
          }]).catch((e) => {
            console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during keyDel to ${identityContractID}:`, e);
          });
        }
        (0, import_sbp3.default)("chelonia/queueInvocation", identityContractID, async () => {
          await (0, import_sbp3.default)("chelonia/contract/setPendingKeyRevocation", identityContractID, ["pek"]);
          await (0, import_sbp3.default)("gi.actions/out/rotateKeys", identityContractID, "gi.contracts/identity", "pending", "gi.actions/identity/shareNewPEK");
          await (0, import_sbp3.default)("chelonia/contract/disconnect", identityContractID, groupContractID);
        }).catch((e) => {
          console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e);
        });
      },
      ...referenceTally("gi.contracts/identity/referenceTally")
    }
  });
})();
