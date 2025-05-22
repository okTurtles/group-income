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
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
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

  // frontend/common/errors.js
  var errors_exports = {};
  __export(errors_exports, {
    GIErrorIgnoreAndBan: () => GIErrorIgnoreAndBan,
    GIErrorMissingSigningKeyError: () => GIErrorMissingSigningKeyError,
    GIErrorUIRuntimeError: () => GIErrorUIRuntimeError
  });

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

  // frontend/model/contracts/group.js
  var import_sbp4 = __toESM(__require("@sbp/sbp"));

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
  var numberRange = (from, to, key = "") => {
    if (!isNumber(from) || !isNumber(to)) {
      throw new TypeError("Params for numberRange must be numbers");
    }
    if (from >= to) {
      throw new TypeError('Params "to" should be bigger than "from"');
    }
    function numberRange2(value, _scope = "") {
      number(value, _scope);
      if (value >= from && value <= to) return value;
      throw validatorError(
        numberRange2,
        value,
        _scope,
        key ? `number type '${key}' must be within the range of [${from}, ${to}]` : `must be within the range of [${from}, ${to}]`
      );
    }
    numberRange2.type = `number(range: [${from}, ${to}])`;
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

  // node_modules/turtledash/dist/esm/index.js
  function omit(o, props) {
    const x = /* @__PURE__ */ Object.create(null);
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
  function deepEqualJSONType(a, b) {
    if (a === b)
      return true;
    if (a == null || b == null || typeof a !== typeof b)
      return false;
    if (typeof a !== "object")
      return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length)
        return false;
    } else if (![Object.prototype, null].includes(Object.getPrototypeOf(a))) {
      throw new Error(`not JSON type: ${a}`);
    }
    for (const key in a) {
      if (!deepEqualJSONType(a[key], b[key]))
        return false;
    }
    return true;
  }
  var has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

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
  var import_sbp2 = __toESM(__require("@sbp/sbp"));

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

  // shared/domains/chelonia/constants.js
  var INVITE_STATUS = {
    REVOKED: "revoked",
    VALID: "valid",
    USED: "used"
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
  var import_sbp3 = __toESM(__require("@sbp/sbp"));

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
    (0, import_sbp3.default)(
      "gi.contracts/group/pushSideEffect",
      contractID,
      ["gi.contracts/group/makeNotificationWhenProposalClosed", state, contractID, meta, height, proposalHash, proposal]
    );
    (0, import_sbp3.default)(
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
    (0, import_sbp3.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_AGAINST, data);
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
        await (0, import_sbp3.default)("gi.contracts/group/invite/process", forMessage, state);
        (0, import_sbp3.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
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
        await (0, import_sbp3.default)("gi.contracts/group/removeMember/process", forMessage, state);
        (0, import_sbp3.default)(
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
        await (0, import_sbp3.default)("gi.contracts/group/updateSettings/process", forMessage, state);
        (0, import_sbp3.default)(
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
        await (0, import_sbp3.default)("gi.contracts/group/updateAllVotingRules/process", forMessage, state);
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
        (0, import_sbp3.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
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
    (0, import_sbp4.default)(
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
      const encryptionKeyId = await (0, import_sbp4.default)("chelonia/contract/currentKeyIdByName", state, "cek", true);
      const signingKeyId = await (0, import_sbp4.default)("chelonia/contract/currentKeyIdByName", state, "csk", true);
      if (!signingKeyId) {
        return;
      }
      extraParams.encryptionKeyId = encryptionKeyId;
      extraParams.signingKeyId = signingKeyId;
      extraParams.innerSigningContractID = null;
    }
    (0, import_sbp4.default)("gi.actions/chatroom/leave", {
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
  (0, import_sbp4.default)("chelonia/defineContract", {
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
            (0, import_sbp4.default)("chelonia/queueInvocation", contractID, async () => {
              const state2 = await (0, import_sbp4.default)("chelonia/contract/state", contractID);
              if (!state2 || state2.generalChatRoomId) return;
              const CSKid = await (0, import_sbp4.default)("chelonia/contract/currentKeyIdByName", state2, "csk", true);
              const CEKid = await (0, import_sbp4.default)("chelonia/contract/currentKeyIdByName", state2, "cek");
              (0, import_sbp4.default)("gi.actions/group/addChatRoom", {
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
            const { loggedIn } = (0, import_sbp4.default)("state/vuex/state");
            const payment = state.payments[data.paymentHash];
            if (loggedIn.identityContractID === payment.data.toMemberID) {
              const myProfile = getters.groupProfile(loggedIn.identityContractID);
              if (isActionNewerThanUserJoinedDate(height, myProfile)) {
                (0, import_sbp4.default)("gi.notifications/emit", "PAYMENT_RECEIVED", {
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
          const { loggedIn } = (0, import_sbp4.default)("state/vuex/state");
          if (data.toMemberID === loggedIn.identityContractID) {
            const myProfile = getters.groupProfile(loggedIn.identityContractID);
            if (isActionNewerThanUserJoinedDate(height, myProfile)) {
              (0, import_sbp4.default)("gi.notifications/emit", "PAYMENT_THANKYOU_SENT", {
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
          const { loggedIn } = (0, import_sbp4.default)("state/vuex/state");
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
            (0, import_sbp4.default)("gi.notifications/emit", "NEW_PROPOSAL", {
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
          // TODO: this, somehow we need to send an OP_KEY_ADD SPMessage to add a generated once-only writeonly message public key to the contract, and (encrypted) include the corresponding invite link, also, we need all clients to verify that this message/operation was valid to prevent a hacked client from adding arbitrary OP_KEY_ADD messages, and automatically ban anyone generating such messages
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
          const { loggedIn } = (0, import_sbp4.default)("state/vuex/state");
          const myProfile = getters.groupProfile(loggedIn.identityContractID);
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            for (const proposalId of data.proposalIds) {
              const proposal = state.proposals[proposalId];
              (0, import_sbp4.default)("gi.notifications/emit", "PROPOSAL_EXPIRING", {
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
          const identityContractID = (0, import_sbp4.default)("state/vuex/state").loggedIn?.identityContractID;
          if (memberID === identityContractID) {
            const ourChatrooms = Object.entries(state?.chatRooms || {}).filter(([, state2]) => state2.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID);
            if (ourChatrooms.length) {
              (0, import_sbp4.default)(
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
          (0, import_sbp4.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp4.default)("chelonia/contract/setPendingKeyRevocation", contractID, ["cek", "csk"]));
          (0, import_sbp4.default)("gi.contracts/group/referenceTally", contractID, memberID, "release");
          (0, import_sbp4.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp4.default)("gi.contracts/group/leaveGroup", {
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
          const { loggedIn } = (0, import_sbp4.default)("state/vuex/state");
          (0, import_sbp4.default)("gi.contracts/group/referenceTally", contractID, innerSigningContractID, "retain");
          (0, import_sbp4.default)("chelonia/queueInvocation", contractID, async () => {
            const state = await (0, import_sbp4.default)("chelonia/contract/state", contractID);
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
              await (0, import_sbp4.default)("gi.actions/identity/addJoinDirectMessageKey", userID, contractID, "csk");
              const generalChatRoomId = state.generalChatRoomId;
              if (generalChatRoomId) {
                if (state.chatRooms[generalChatRoomId]?.members?.[userID]?.status !== PROFILE_STATUS.ACTIVE) {
                  (0, import_sbp4.default)("gi.actions/group/joinChatRoom", {
                    contractID,
                    data: { chatRoomID: generalChatRoomId }
                  }).catch((e) => {
                    if (e?.name === "GIErrorUIRuntimeError" && e.cause?.name === "GIGroupAlreadyJoinedError") return;
                    console.error("Error while joining the #General chatroom", e);
                    (0, import_sbp4.default)("okTurtles.events/emit", ERROR_JOINING_CHATROOM, { identityContractID: userID, groupContractID: contractID, chatRoomID: generalChatRoomId });
                  });
                }
              } else {
                console.error("Couldn't join the chatroom in the group. Doesn't exist.", { chatroomName: CHATROOM_GENERAL_NAME });
                (0, import_sbp4.default)("okTurtles.events/emit", ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST, { identityContractID: userID, groupContractID: contractID });
              }
              (0, import_sbp4.default)("okTurtles.events/emit", JOINED_GROUP, { identityContractID: userID, groupContractID: contractID });
            } else if (isActionNewerThanUserJoinedDate(height, state?.profiles?.[userID])) {
              (0, import_sbp4.default)("gi.notifications/emit", "MEMBER_ADDED", {
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
            (0, import_sbp4.default)(
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
          const isChangingIncomeDetailsType = data.incomeDetailsType && groupProfile.incomeDetailsType !== data.incomeDetailsType;
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
            (0, import_sbp4.default)(
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
            const shouldResetPaymentStreaks = (
              // 1. When the user switches from 'pledger' to receiver.
              isChangingIncomeDetailsType && data.incomeDetailsType === "incomeAmount" || // 2. The user is a 'pledger' but updates the pledge amount to 0.
              !isChangingIncomeDetailsType && data.incomeDetailsType === "pledgeAmount" && data.pledgeAmount === 0
            );
            if (shouldResetPaymentStreaks) {
              state.streaks.onTimePayments[innerSigningContractID] = 0;
              state.streaks.missedPayments[innerSigningContractID] = 0;
            }
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
            (0, import_sbp4.default)("chelonia/queueInvocation", contractID, () => {
              const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
              if (state.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE && state.chatRooms?.[contractID]?.members[identityContractID]?.status !== PROFILE_STATUS.ACTIVE) {
                (0, import_sbp4.default)("gi.actions/group/joinChatRoom", {
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
          const identityContractID = (0, import_sbp4.default)("state/vuex/state").loggedIn?.identityContractID;
          if (identityContractID && state?.chatRooms[data.chatRoomID]?.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE) {
            (0, import_sbp4.default)(
              "gi.contracts/group/pushSideEffect",
              contractID,
              ["gi.contracts/group/referenceTally", contractID, data.chatRoomID, "release"]
            );
          }
          delete state.chatRooms[data.chatRoomID];
        },
        sideEffect({ data, contractID, innerSigningContractID }) {
          (0, import_sbp4.default)("okTurtles.events/emit", DELETED_CHATROOM, { groupContractID: contractID, chatRoomID: data.chatRoomID });
          const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
          if (identityContractID === innerSigningContractID) {
            (0, import_sbp4.default)("gi.actions/chatroom/delete", { contractID: data.chatRoomID, data: {} }).catch((e) => {
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
          const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
          if (innerSigningContractID === identityContractID) {
            (0, import_sbp4.default)("chelonia/queueInvocation", contractID, async () => {
              const state2 = await (0, import_sbp4.default)("chelonia/contract/state", contractID);
              if (state2?.profiles?.[innerSigningContractID]?.status === PROFILE_STATUS.ACTIVE && state2.chatRooms?.[data.chatRoomID]?.members[memberID]?.status === PROFILE_STATUS.REMOVED && state2.chatRooms[data.chatRoomID].members[memberID].joinedHeight === data.joinedHeight) {
                await leaveChatRoomAction(contractID, state2, data.chatRoomID, memberID, innerSigningContractID);
              }
            }).catch((e) => {
              console.error(`[gi.contracts/group/leaveChatRoom/sideEffect] Error for ${contractID}`, { contractID, data, error: e });
            });
          }
          if (memberID === identityContractID) {
            (0, import_sbp4.default)("gi.contracts/group/referenceTally", contractID, data.chatRoomID, "release");
            (0, import_sbp4.default)("okTurtles.events/emit", LEFT_CHATROOM, {
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
          const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
          if (memberID === identityContractID) {
            (0, import_sbp4.default)("gi.contracts/group/referenceTally", contractID, data.chatRoomID, "retain");
          }
          if (innerSigningContractID === identityContractID) {
            (0, import_sbp4.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp4.default)("gi.contracts/group/joinGroupChatrooms", contractID, data.chatRoomID, identityContractID, memberID, height)).catch((e) => {
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
        const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
        const dependentContractIDs = [
          ...Object.entries(state?.profiles || {}).filter(([, state2]) => state2.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID),
          ...Object.entries(state?.chatRooms || {}).filter(([, state2]) => state2.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID)
        ];
        if (dependentContractIDs.length) {
          (0, import_sbp4.default)("chelonia/contract/release", dependentContractIDs).catch((e) => {
            console.error("[gi.contracts/group/_cleanup] Error calling release", contractID, e);
          });
        }
        Promise.all(
          [
            () => (0, import_sbp4.default)("gi.contracts/group/removeArchivedProposals", contractID),
            () => (0, import_sbp4.default)("gi.contracts/group/removeArchivedPayments", contractID)
          ]
        ).catch((e) => {
          console.error(`[gi.contracts/group/_cleanup] Error removing entries for archive for ${contractID}`, e);
        });
      },
      "gi.contracts/group/archiveProposal": async function(contractID, proposalHash, proposal) {
        const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
        const key = `proposals/${identityContractID}/${contractID}`;
        const proposals2 = await (0, import_sbp4.default)("gi.db/archive/load", key) || [];
        if (proposals2.some(([archivedProposalHash]) => archivedProposalHash === proposalHash)) {
          return;
        }
        proposals2.unshift([proposalHash, proposal]);
        while (proposals2.length > MAX_ARCHIVED_PROPOSALS) {
          proposals2.pop();
        }
        await (0, import_sbp4.default)("gi.db/archive/save", key, proposals2);
        (0, import_sbp4.default)("okTurtles.events/emit", PROPOSAL_ARCHIVED, contractID, proposalHash, proposal);
      },
      "gi.contracts/group/archivePayments": async function(contractID, archivingPayments) {
        const { paymentsByPeriod, payments } = archivingPayments;
        const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
        const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`;
        const archPaymentsByPeriod = await (0, import_sbp4.default)("gi.db/archive/load", archPaymentsByPeriodKey) || {};
        const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`;
        const archSentOrReceivedPayments = await (0, import_sbp4.default)("gi.db/archive/load", archSentOrReceivedPaymentsKey) || { sent: [], received: [] };
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
            await (0, import_sbp4.default)("gi.db/archive/delete", `payments/${shouldBeDeletedPeriod}/${identityContractID}/${contractID}`);
            delete archPaymentsByPeriod[shouldBeDeletedPeriod];
            archSentOrReceivedPayments.sent = archSentOrReceivedPayments.sent.filter((payment) => !paymentHashes.includes(payment.hash));
            archSentOrReceivedPayments.received = archSentOrReceivedPayments.received.filter((payment) => !paymentHashes.includes(payment.hash));
          }
          await (0, import_sbp4.default)("gi.db/archive/save", archPaymentsKey, archPayments);
        }
        await (0, import_sbp4.default)("gi.db/archive/save", archPaymentsByPeriodKey, archPaymentsByPeriod);
        await (0, import_sbp4.default)("gi.db/archive/save", archSentOrReceivedPaymentsKey, archSentOrReceivedPayments);
        (0, import_sbp4.default)("okTurtles.events/emit", PAYMENTS_ARCHIVED, { paymentsByPeriod, payments });
      },
      "gi.contracts/group/removeArchivedProposals": async function(contractID) {
        const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
        const key = `proposals/${identityContractID}/${contractID}`;
        await (0, import_sbp4.default)("gi.db/archive/delete", key);
      },
      "gi.contracts/group/removeArchivedPayments": async function(contractID) {
        const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
        const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`;
        const periods = Object.keys(await (0, import_sbp4.default)("gi.db/archive/load", archPaymentsByPeriodKey) || {});
        const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`;
        for (const period of periods) {
          const archPaymentsKey = `payments/${identityContractID}/${period}/${contractID}`;
          await (0, import_sbp4.default)("gi.db/archive/delete", archPaymentsKey);
        }
        await (0, import_sbp4.default)("gi.db/archive/delete", archPaymentsByPeriodKey);
        await (0, import_sbp4.default)("gi.db/archive/delete", archSentOrReceivedPaymentsKey);
      },
      "gi.contracts/group/makeNotificationWhenProposalClosed": function(state, contractID, meta, height, proposalHash, proposal) {
        const { loggedIn } = (0, import_sbp4.default)("state/vuex/state");
        if (isActionNewerThanUserJoinedDate(height, state.profiles[loggedIn.identityContractID])) {
          (0, import_sbp4.default)("gi.notifications/emit", "PROPOSAL_CLOSED", { createdDate: meta.createdDate, groupID: contractID, proposalHash, proposal });
        }
      },
      "gi.contracts/group/sendMincomeChangedNotification": async function(contractID, meta, data, height, innerSigningContractID) {
        const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
        const myProfile = (await (0, import_sbp4.default)("chelonia/contract/state", contractID)).profiles[identityContractID];
        const { fromAmount, toAmount } = data;
        if (isActionNewerThanUserJoinedDate(height, myProfile) && myProfile.incomeDetailsType) {
          const memberType = myProfile.incomeDetailsType === "pledgeAmount" ? "pledging" : "receiving";
          const mincomeIncreased = toAmount > fromAmount;
          const actionNeeded = mincomeIncreased || memberType === "receiving" && !mincomeIncreased && myProfile.incomeAmount < fromAmount && myProfile.incomeAmount > toAmount;
          if (!actionNeeded) {
            return;
          }
          if (memberType === "receiving" && !mincomeIncreased) {
            await (0, import_sbp4.default)("gi.actions/group/groupProfileUpdate", {
              contractID,
              data: {
                incomeDetailsType: "pledgeAmount",
                pledgeAmount: 0
              }
            });
          }
          (0, import_sbp4.default)("gi.notifications/emit", "MINCOME_CHANGED", {
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
        const state = await (0, import_sbp4.default)("chelonia/contract/state", contractID);
        const actorID = (0, import_sbp4.default)("state/vuex/state").loggedIn.identityContractID;
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
          await (0, import_sbp4.default)("chelonia/contract/retain", chatRoomID, { ephemeral: true });
          if (!await (0, import_sbp4.default)("chelonia/contract/hasKeysToPerformOperation", chatRoomID, "gi.contracts/chatroom/join")) {
            throw new Error(`Missing keys to join chatroom ${chatRoomID}`);
          }
          const encryptionKeyId = (0, import_sbp4.default)("chelonia/contract/currentKeyIdByName", state, "cek", true);
          (0, import_sbp4.default)("gi.actions/chatroom/join", {
            contractID: chatRoomID,
            data: actorID === memberID ? {} : { memberID },
            encryptionKeyId
          }).catch((e) => {
            if (e.name === "GIErrorUIRuntimeError" && e.cause?.name === "GIChatroomAlreadyMemberError") {
              return;
            }
            console.warn(`[gi.contracts/group/joinGroupChatrooms] Unable to join ${memberID} to chatroom ${chatRoomID} for group ${contractID}`, e);
          }).finally(() => {
            (0, import_sbp4.default)("chelonia/contract/release", chatRoomID, { ephemeral: true }).catch((e) => console.error("[gi.contracts/group/joinGroupChatrooms] Error during release", e));
          });
        }
      },
      // eslint-disable-next-line require-await
      "gi.contracts/group/leaveGroup": async ({ data, meta, contractID, height, getters, innerSigningContractID, proposalHash }) => {
        const { identityContractID } = (0, import_sbp4.default)("state/vuex/state").loggedIn;
        const memberID = data.memberID || innerSigningContractID;
        const state = await (0, import_sbp4.default)("chelonia/contract/state", contractID);
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
            const pendingKeyShares = await (0, import_sbp4.default)("chelonia/contract/waitingForKeyShareTo", state, identityContractID);
            if (pendingKeyShares) {
              console.info("[gi.contracts/group/leaveGroup] Not removing group contract because it has a pending key share for ourselves", contractID);
              return true;
            }
            const sentKeyShares = await (0, import_sbp4.default)("chelonia/contract/successfulKeySharesByContractID", state, identityContractID);
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
          (0, import_sbp4.default)("gi.actions/identity/leaveGroup", {
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
              (0, import_sbp4.default)("gi.notifications/emit", memberRemovedThemselves ? "MEMBER_LEFT" : "MEMBER_REMOVED", {
                createdDate: meta.createdDate,
                groupID: contractID,
                memberID
              });
            }
            Promise.resolve().then(() => (0, import_sbp4.default)("gi.contracts/group/rotateKeys", contractID)).then(() => (0, import_sbp4.default)("gi.contracts/group/revokeGroupKeyAndRotateOurPEK", contractID)).catch((e) => {
              console.warn(`[gi.contracts/group/leaveGroup] for ${contractID}: Error rotating group keys or our PEK`, e);
            });
            await (0, import_sbp4.default)("gi.contracts/group/removeForeignKeys", contractID, memberID, state);
          }
        }
      },
      "gi.contracts/group/rotateKeys": async (contractID) => {
        const state = await (0, import_sbp4.default)("chelonia/contract/state", contractID);
        const pendingKeyRevocations = state?._volatile?.pendingKeyRevocations;
        if (!pendingKeyRevocations || Object.keys(pendingKeyRevocations).length === 0) {
          return;
        }
        (0, import_sbp4.default)("gi.actions/out/rotateKeys", contractID, "gi.contracts/group", "pending", "gi.actions/group/shareNewKeys").catch((e) => {
          console.warn(`rotateKeys: ${e.name} thrown:`, e);
        });
      },
      "gi.contracts/group/revokeGroupKeyAndRotateOurPEK": (groupContractID) => {
        const rootState = (0, import_sbp4.default)("state/vuex/state");
        const { identityContractID } = rootState.loggedIn;
        (0, import_sbp4.default)("chelonia/queueInvocation", identityContractID, async () => {
          await (0, import_sbp4.default)("chelonia/contract/setPendingKeyRevocation", identityContractID, ["pek"]);
          await (0, import_sbp4.default)("gi.actions/out/rotateKeys", identityContractID, "gi.contracts/identity", "pending", "gi.actions/identity/shareNewPEK");
        }).catch((e) => {
          console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e);
        });
      },
      "gi.contracts/group/removeForeignKeys": async (contractID, userID, state) => {
        const keyIds = await (0, import_sbp4.default)("chelonia/contract/foreignKeysByContractID", state, userID);
        if (!keyIds?.length) return;
        const CSKid = await (0, import_sbp4.default)("chelonia/contract/currentKeyIdByName", state, "csk", true);
        (0, import_sbp4.default)("chelonia/out/keyDel", {
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
        const { loggedIn } = (0, import_sbp4.default)("state/vuex/state");
        const isUpdatingMyself = loggedIn.identityContractID === innerSigningContractID;
        if (!isUpdatingMyself) {
          const myProfile = getters.groupProfile(loggedIn.identityContractID);
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            (0, import_sbp4.default)("gi.notifications/emit", "NONMONETARY_CONTRIBUTION_UPDATE", {
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
