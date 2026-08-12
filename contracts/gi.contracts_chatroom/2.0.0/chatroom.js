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
        Object.defineProperty(this, "cause", { configurable: true, writable: true, value: params[1]?.cause });
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

  // frontend/model/contracts/chatroom.js
  var import_sbp3 = __toESM(__require("@sbp/sbp"));

  // frontend/utils/events.js
  var NEW_CHATROOM_UNREAD_POSITION = "new-chatroom-unread-position";

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

  // frontend/model/contracts/shared/constants.js
  var MAX_HASH_LEN = 300;
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
  var CHATROOM_NAME_LIMITS_IN_CHARS = 50;
  var CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280;
  var CHATROOM_MAX_MESSAGE_LEN = 2e4;
  var CHATROOM_MAX_MESSAGES = 20;
  var CHATROOM_ACTIONS_PER_PAGE = 40;
  var CHATROOM_MEMBER_MENTION_SPECIAL_CHAR = "@";
  var MESSAGE_RECEIVE_RAW = "message-receive-raw";
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
    UPDATE_NAME: "update-name"
  };
  var POLL_TYPES = {
    SINGLE_CHOICE: "single-vote",
    // allows only 1 choice per member
    MULTIPLE_CHOICES: "multiple-votes"
    // allows multiple choices on the poll
  };
  var POLL_STATUS = {
    ACTIVE: "active",
    CLOSED: "closed"
  };
  var POLL_QUESTION_MAX_CHARS = 280;
  var POLL_OPTION_MAX_CHARS = 280;

  // frontend/model/contracts/shared/functions.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/time.js
  var MINS_MILLIS = 6e4;
  var HOURS_MILLIS = 60 * MINS_MILLIS;
  var DAYS_MILLIS = 24 * HOURS_MILLIS;
  var MONTHS_MILLIS = 30 * DAYS_MILLIS;
  var YEARS_MILLIS = 365 * DAYS_MILLIS;

  // frontend/model/contracts/shared/functions.js
  function createMessage({ meta, data, hash, height, state, pending, innerSigningContractID }) {
    const { type, text, replyingMessage, attachments } = data;
    const { createdDate } = meta;
    const newMessage = {
      type,
      hash,
      height,
      from: innerSigningContractID,
      datetime: new Date(createdDate).toISOString()
    };
    if (pending) {
      newMessage.pending = true;
    }
    if (type === MESSAGE_TYPES.TEXT) {
      newMessage.text = text;
      if (replyingMessage) {
        newMessage.replyingMessage = replyingMessage;
      }
      if (attachments) {
        newMessage.attachments = attachments;
      }
    } else if (type === MESSAGE_TYPES.POLL) {
      newMessage.pollData = {
        ...data.pollData,
        creatorID: innerSigningContractID,
        status: POLL_STATUS.ACTIVE,
        // 'voted' field below will contain the user names of the users who has voted for this option
        options: data.pollData.options.map((opt) => ({ ...opt, voted: [] }))
      };
    } else if (type === MESSAGE_TYPES.NOTIFICATION) {
      const params = {
        channelName: state?.attributes.name,
        channelDescription: state?.attributes.description,
        ...data.notification
      };
      delete params.type;
      newMessage.notification = { type: data.notification.type, params };
    } else if (type === MESSAGE_TYPES.INTERACTIVE) {
      newMessage.proposal = data.proposal;
    }
    return newMessage;
  }
  async function postLeaveChatRoomCleanup(contractID, state) {
    if (await (0, import_sbp2.default)("chelonia/contract/isSyncing", contractID, { firstSync: true })) {
      return;
    }
    (0, import_sbp2.default)("gi.actions/identity/kv/deleteChatRoomUnreadMessages", { contractID }).catch((e) => {
      console.error("[leaveChatroom] Error at deleteChatRoomUnreadMessages ", contractID, e);
    });
    (0, import_sbp2.default)("okTurtles.events/emit", NEW_CHATROOM_UNREAD_POSITION, { chatRoomID: contractID });
  }
  function findMessageIdx(hash, messages = []) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].hash === hash) {
        return i;
      }
    }
    return -1;
  }
  function makeMentionFromUserID(userID) {
    return {
      me: userID ? `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${userID}` : "",
      all: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}all`
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

  // frontend/model/contracts/shared/getters/chatroom.js
  var chatroom_default = {
    chatRoomSettings(state, getters) {
      return getters.currentChatRoomState.settings || {};
    },
    chatRoomAttributes(state, getters) {
      return getters.currentChatRoomState.attributes || {};
    },
    chatRoomMembers(state, getters) {
      return getters.currentChatRoomState.members || {};
    },
    chatRoomRecentMessages(state, getters) {
      return getters.currentChatRoomState.messages || [];
    },
    chatRoomPinnedMessages(state, getters) {
      return (getters.currentChatRoomState.pinnedMessages || []).sort((a, b) => a.height < b.height ? 1 : -1);
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

  // frontend/model/contracts/chatroom.js
  var GIChatroomAlreadyMemberError = ChelErrorGenerator("GIChatroomAlreadyMemberError");
  var GIChatroomNotMemberError = ChelErrorGenerator("GIChatroomNotMemberError");
  function createNotificationData(notificationType, moreParams = {}) {
    return {
      type: MESSAGE_TYPES.NOTIFICATION,
      notification: {
        type: notificationType,
        ...moreParams
      }
    };
  }
  async function deleteEncryptedFiles(manifestCids, option) {
    if (Object.values(option).reduce((a, c) => a || c, false)) {
      if (!Array.isArray(manifestCids)) {
        manifestCids = [manifestCids];
      }
      await (0, import_sbp3.default)("gi.actions/identity/removeFiles", { manifestCids, option });
    }
  }
  function addMessage(state, message) {
    state.messages.push(message);
    if (state.renderingContext) {
      return;
    }
    while (state.messages.length > CHATROOM_MAX_MESSAGES) {
      state.messages.shift();
    }
  }
  (0, import_sbp3.default)("chelonia/defineContract", {
    name: "gi.contracts/chatroom",
    metadata: {
      validate: objectOf({
        createdDate: string
        // action created date
      }),
      async create() {
        return {
          createdDate: await fetchServerTime()
        };
      }
    },
    getters: {
      currentChatRoomState(state) {
        return state;
      },
      ...chatroom_default
    },
    actions: {
      // This is the constructor of Chat contract
      "gi.contracts/chatroom": {
        validate: objectOf({
          attributes: chatRoomAttributesType
        }),
        process({ data }, { state }) {
          const initialState = merge({
            settings: {
              actionsPerPage: CHATROOM_ACTIONS_PER_PAGE,
              maxNameLength: CHATROOM_NAME_LIMITS_IN_CHARS,
              maxDescriptionLength: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
            },
            attributes: {
              adminIDs: [],
              deletedDate: null
            },
            members: {},
            messages: [],
            pinnedMessages: []
          }, data);
          for (const key in initialState) {
            state[key] = initialState[key];
          }
        }
      },
      "gi.contracts/chatroom/join": {
        validate: actionRequireInnerSignature(objectOf({
          memberID: optional(string)
          // user id of joining memberID
        })),
        process({ data, meta, hash, height, contractID, innerSigningContractID }, { state }) {
          const memberID = data.memberID || innerSigningContractID;
          if (!memberID) {
            throw new Error("The new member must be given either explicitly or implcitly with an inner signature");
          }
          if (!state.renderingContext) {
            if (!state.members) {
              state.members = {};
            }
            if (state.members[memberID]) {
              throw new GIChatroomAlreadyMemberError(`Can not join the chatroom which ${memberID} is already part of`);
            }
          }
          state.members[memberID] = { joinedDate: meta.createdDate, joinedHeight: height };
          if (!state.attributes) return;
          if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            return;
          }
          const notificationType = memberID === innerSigningContractID ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER;
          const notificationData = createNotificationData(
            notificationType,
            notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { memberID, actorID: innerSigningContractID } : { memberID }
          );
          addMessage(state, createMessage({ meta, hash, height, state, data: notificationData, innerSigningContractID }));
        },
        sideEffect({ data, contractID, hash, meta, innerSigningContractID, height }, { state }) {
          const memberID = data.memberID || innerSigningContractID;
          (0, import_sbp3.default)("gi.contracts/chatroom/referenceTally", contractID, memberID, "retain");
          (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
            const state2 = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
            if (!state2?.members?.[memberID]) {
              return;
            }
            const identityContractID = (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID;
            if (memberID === identityContractID) {
              await (0, import_sbp3.default)("gi.actions/identity/kv/initChatRoomUnreadMessages", {
                contractID,
                messageHash: hash,
                createdHeight: height
              });
            }
          }).catch((e) => {
            console.error("[gi.contracts/chatroom/join/sideEffect] Error at sideEffect", e?.message || e);
          });
        }
      },
      "gi.contracts/chatroom/rename": {
        validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID } }) => {
          objectOf({ name: stringMax(CHATROOM_NAME_LIMITS_IN_CHARS, "name") })(data);
          if (state.attributes.creatorID !== innerSigningContractID) {
            throw new TypeError(L("Only the channel creator can rename."));
          }
        }),
        process({ data, meta, hash, height, innerSigningContractID }, { state }) {
          state.attributes["name"] = data.name;
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {});
          const newMessage = createMessage({ meta, hash, height, data: notificationData, state, innerSigningContractID });
          state.messages.push(newMessage);
        }
      },
      "gi.contracts/chatroom/changeDescription": {
        validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID } }) => {
          objectOf({ description: stringMax(CHATROOM_DESCRIPTION_LIMITS_IN_CHARS, "description") })(data);
          if (state.attributes.creatorID !== innerSigningContractID) {
            throw new TypeError(L("Only the channel creator can change description."));
          }
        }),
        process({ data, meta, hash, height, innerSigningContractID }, { state }) {
          state.attributes["description"] = data.description;
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {});
          addMessage(state, createMessage({ meta, hash, height, state, data: notificationData, innerSigningContractID }));
        }
      },
      "gi.contracts/chatroom/leave": {
        validate: objectOf({
          memberID: optional(string)
          // member to be removed
        }),
        process({ data, meta, hash, height, contractID, innerSigningContractID }, { state }) {
          const memberID = data.memberID || innerSigningContractID;
          if (!memberID) {
            throw new Error("The removed member must be given either explicitly or implcitly with an inner signature");
          }
          const isKicked = innerSigningContractID && memberID !== innerSigningContractID;
          if (!state.renderingContext) {
            if (!state.members) {
              throw new Error("Missing members state");
            } else if (!state.members[memberID]) {
              throw new GIChatroomNotMemberError(`Can not leave the chatroom ${contractID} which ${memberID} is not part of`);
            }
          }
          delete state.members[memberID];
          if (!state.attributes) return;
          if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            return;
          }
          const notificationType = !isKicked ? MESSAGE_NOTIFICATIONS.LEAVE_MEMBER : MESSAGE_NOTIFICATIONS.KICK_MEMBER;
          const notificationData = createNotificationData(notificationType, { memberID });
          addMessage(state, createMessage({
            meta,
            hash,
            height,
            data: notificationData,
            state,
            // Special case for a memberID being removed using the group's CSK
            // This way, we show the 'Member left' notification instead of the
            // 'kicked' notification
            innerSigningContractID: !isKicked ? memberID : innerSigningContractID
          }));
        },
        async sideEffect({ data, hash, contractID, meta, innerSigningContractID }, { state }) {
          const memberID = data.memberID || innerSigningContractID;
          const itsMe = memberID === (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID;
          if (itsMe) {
            await postLeaveChatRoomCleanup(contractID, state).catch((e) => {
              console.error("[gi.contracts/chatroom/leave] Error at leaveChatRoom", e);
            });
          }
          (0, import_sbp3.default)("gi.contracts/chatroom/referenceTally", contractID, memberID, "release");
          (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
            const state2 = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
            if (!state2 || !!state2.members?.[data.memberID] || !state2.attributes) {
              return;
            }
            if (!itsMe && state2.attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE) {
              (0, import_sbp3.default)("gi.contracts/chatroom/rotateKeys", contractID);
            }
            await (0, import_sbp3.default)("gi.contracts/chatroom/removeForeignKeys", contractID, memberID, state2);
          }).catch((e) => {
            console.error("[gi.contracts/chatroom/leave/sideEffect] Error at sideEffect", e?.message || e);
          });
        }
      },
      "gi.contracts/chatroom/delete": {
        validate: actionRequireInnerSignature((_, { state, meta, message: { innerSigningContractID } }) => {
          if (state.attributes.creatorID !== innerSigningContractID) {
            throw new TypeError(L("Only the channel creator can delete channel."));
          }
        }),
        process({ meta, contractID }, { state }) {
          if (!state.attributes) return;
          state.attributes["deletedDate"] = meta.createdDate;
          (0, import_sbp3.default)(
            "gi.contracts/chatroom/pushSideEffect",
            contractID,
            ["gi.contracts/chatroom/referenceTally", contractID, Object.keys(state.members), "release"]
          );
          for (const memberID in state.members) {
            delete state.members[memberID];
          }
        },
        async sideEffect({ contractID }, { state }) {
          await postLeaveChatRoomCleanup(contractID, state);
          const me = (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID;
          if (me === state.attributes.creatorID || state.attributes.adminIDs.includes(me)) {
            await (0, import_sbp3.default)("chelonia/out/deleteContract", contractID, {
              [contractID]: {
                billableContractID: me
              }
            }).catch((e) => {
              console.warn("[gi.contracts/chatroom/delete] Error calling chelonia/out/deleteContract", contractID, e);
            });
          }
        }
      },
      "gi.contracts/chatroom/addMessage": {
        validate: (data, props) => {
          actionRequireInnerSignature(messageType)(data, props);
          if (data.type === MESSAGE_TYPES.POLL) {
            const optionStrings = data.pollData.options.map((o) => o.value);
            if (data.pollData.question.length > POLL_QUESTION_MAX_CHARS) {
              throw new TypeError(L("Poll question must be less than {n} characters", { n: POLL_QUESTION_MAX_CHARS }));
            }
            if (optionStrings.some((v) => v.length > POLL_OPTION_MAX_CHARS)) {
              throw new TypeError(L("Poll option must be less than {n} characters", { n: POLL_OPTION_MAX_CHARS }));
            }
          }
        },
        // NOTE: This function is 'reentrant' and may be called multiple times
        // for the same message and state. The `direction` attributes handles
        // these situations especially, and it's meant to mark sent-by-the-user
        // but not-yet-received-over-the-network messages.
        process({ direction, data, meta, hash, height, innerSigningContractID }, { state }) {
          if (!state.messages) return;
          const existingMsg = state.messages.find((msg) => msg.hash === hash);
          if (!existingMsg) {
            const pending = direction === "outgoing";
            addMessage(state, createMessage({ meta, data, hash, height, state, pending, innerSigningContractID }));
          } else if (direction !== "outgoing") {
            delete existingMsg["pending"];
          }
        },
        sideEffect({ contractID, hash, height, meta, data, innerSigningContractID }, { state, getters }) {
          const me = (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID;
          if (me === innerSigningContractID && data.type !== MESSAGE_TYPES.INTERACTIVE) {
            return;
          }
          (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
            const state2 = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
            if (!state2?.members?.[me]) {
              return;
            }
            const newMessage = createMessage({ meta, data, hash, height, state: state2, innerSigningContractID });
            (0, import_sbp3.default)("okTurtles.events/emit", MESSAGE_RECEIVE_RAW, {
              contractID,
              data,
              innerSigningContractID,
              newMessage
            });
          });
        }
      },
      "gi.contracts/chatroom/editMessage": {
        validate: actionRequireInnerSignature(objectOf({
          hash: stringMax(MAX_HASH_LEN, "hash"),
          createdHeight: number,
          text: stringMax(CHATROOM_MAX_MESSAGE_LEN, "text")
        })),
        process({ data, meta }, { state }) {
          if (!state.messages) return;
          const { hash, text } = data;
          const fnEditMessage = (message) => {
            message["text"] = text;
            message["updatedDate"] = meta.createdDate;
            if (state.renderingContext && message.pending) {
              delete message["pending"];
            }
          };
          [state.messages, state.pinnedMessages].forEach((messageArray) => {
            const msgIndex = findMessageIdx(hash, messageArray);
            if (msgIndex >= 0) {
              fnEditMessage(messageArray[msgIndex]);
            }
          });
        },
        sideEffect({ contractID, hash, meta, data, innerSigningContractID }, { state, getters }) {
          const me = (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID;
          if (me === innerSigningContractID || getters.chatRoomAttributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
            return;
          }
          (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
            const state2 = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
            if (!state2?.members?.[me]) {
              return;
            }
            (0, import_sbp3.default)("okTurtles.events/emit", MESSAGE_RECEIVE_RAW, {
              contractID,
              data,
              innerSigningContractID
            });
          });
        }
      },
      "gi.contracts/chatroom/deleteMessage": {
        validate: actionRequireInnerSignature((data, { state, message: { innerSigningContractID }, contractID }) => {
          objectOf({
            hash: stringMax(MAX_HASH_LEN, "hash"),
            // NOTE: manifestCids of the attachments which belong to the message
            //       if the message is deleted, those attachments should be deleted too
            manifestCids: arrayOf(stringMax(MAX_HASH_LEN, "manifestCids")),
            messageSender: stringMax(MAX_HASH_LEN, "messageSender")
          })(data);
          if (innerSigningContractID !== data.messageSender) {
            if (state.attributes.type === CHATROOM_TYPES.DIRECT_MESSAGE) {
              throw new TypeError(L("Only the person who sent the message can delete it."));
            } else if (!state.attributes.adminIDs.includes(innerSigningContractID)) {
              throw new TypeError(L("Only the group creator and the person who sent the message can delete it."));
            }
          }
        }),
        process({ data, innerSigningContractID }, { state }) {
          if (!state.messages) return;
          [state.messages, state.pinnedMessages].forEach((messageArray) => {
            const msgIndex = findMessageIdx(data.hash, messageArray);
            if (msgIndex >= 0) {
              messageArray.splice(msgIndex, 1);
            }
            for (const message of messageArray) {
              if (message.replyingMessage?.hash === data.hash) {
                message.replyingMessage.hash = null;
                message.replyingMessage.text = L("Original message was removed by {user}", {
                  user: makeMentionFromUserID(innerSigningContractID).me
                });
              }
            }
          });
        },
        sideEffect({ data, contractID, innerSigningContractID }) {
          const rootState = (0, import_sbp3.default)("state/vuex/state");
          const me = rootState.loggedIn.identityContractID;
          if (rootState.chatroom?.chatRoomScrollPosition?.[contractID] === data.hash) {
            (0, import_sbp3.default)("okTurtles.events/emit", NEW_CHATROOM_UNREAD_POSITION, {
              chatRoomID: contractID,
              messageHash: null
            });
          }
          if (data.manifestCids.length) {
            const option = {
              shouldDeleteFile: me === innerSigningContractID,
              shouldDeleteToken: me === data.messageSender
            };
            deleteEncryptedFiles(data.manifestCids, option).catch((e) => {
              console.error(`[gi.contracts/chatroom/deleteMessage/sideEffect] (${contractID}):`, e);
            });
          }
          if (me === innerSigningContractID) {
            return;
          }
          (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
            const state = await (0, import_sbp3.default)("chelonia/contract/state", contractID);
            if (!state?.members?.[me]) {
              return;
            }
            (0, import_sbp3.default)("gi.actions/identity/kv/removeChatRoomUnreadMessage", { contractID, messageHash: data.hash }).catch((e) => {
              console.error("[gi.contracts/chatroom/deleteMessage/sideEffect] Error calling removeChatRoomUnreadMessage", e);
            });
          });
        }
      },
      "gi.contracts/chatroom/deleteAttachment": {
        validate: actionRequireInnerSignature(objectOf({
          hash: stringMax(MAX_HASH_LEN, "hash"),
          manifestCid: stringMax(MAX_HASH_LEN, "manifestCid"),
          messageSender: stringMax(MAX_HASH_LEN, "messageSender")
        })),
        process({ data }, { state }) {
          if (!state.messages) return;
          const fnDeleteAttachment = (message) => {
            const oldAttachments = message.attachments;
            if (Array.isArray(oldAttachments)) {
              const newAttachments = oldAttachments.filter((attachment) => {
                return attachment.downloadData.manifestCid !== data.manifestCid;
              });
              message["attachments"] = newAttachments;
            }
          };
          [state.messages, state.pinnedMessages].forEach((messageArray) => {
            const msgIndex = findMessageIdx(data.hash, messageArray);
            if (msgIndex >= 0) {
              fnDeleteAttachment(messageArray[msgIndex]);
            }
          });
        },
        sideEffect({ data, contractID, innerSigningContractID }) {
          const me = (0, import_sbp3.default)("state/vuex/state").loggedIn.identityContractID;
          const option = {
            shouldDeleteFile: me === innerSigningContractID,
            shouldDeleteToken: me === data.messageSender
          };
          deleteEncryptedFiles(data.manifestCid, option).catch((e) => {
            console.error(`[gi.contracts/chatroom/deleteAttachment/sideEffect] (${contractID}):`, e);
          });
        }
      },
      "gi.contracts/chatroom/makeEmotion": {
        validate: actionRequireInnerSignature(objectOf({
          hash: stringMax(MAX_HASH_LEN, "hash"),
          emoticon: string
        })),
        process({ data, innerSigningContractID }, { state }) {
          if (!state.messages) return;
          const { hash, emoticon } = data;
          const fnMakeEmotion = (message) => {
            let emoticons = cloneDeep(message.emoticons || {});
            if (emoticons[emoticon]) {
              const alreadyAdded = emoticons[emoticon].indexOf(innerSigningContractID);
              if (alreadyAdded >= 0) {
                emoticons[emoticon].splice(alreadyAdded, 1);
                if (!emoticons[emoticon].length) {
                  delete emoticons[emoticon];
                  if (!Object.keys(emoticons).length) {
                    emoticons = null;
                  }
                }
              } else {
                emoticons[emoticon].push(innerSigningContractID);
              }
            } else {
              emoticons[emoticon] = [innerSigningContractID];
            }
            if (emoticons) {
              message["emoticons"] = emoticons;
            } else {
              delete message["emoticons"];
            }
          };
          [state.messages, state.pinnedMessages].forEach((messageArray) => {
            const msgIndex = findMessageIdx(hash, messageArray);
            if (msgIndex >= 0) {
              fnMakeEmotion(messageArray[msgIndex]);
            }
          });
        }
      },
      "gi.contracts/chatroom/voteOnPoll": {
        validate: actionRequireInnerSignature(objectOf({
          hash: stringMax(MAX_HASH_LEN, "hash"),
          votes: arrayOf(string),
          votesAsString: string
        })),
        process({ data, meta, hash, height, innerSigningContractID }, { state }) {
          if (!state.messages) return;
          const fnVoteOnPoll = (message) => {
            const myVotes = data.votes;
            const pollData = message.pollData;
            const optsCopy = cloneDeep(pollData.options);
            myVotes.forEach((optId) => {
              optsCopy.find((x) => x.id === optId)?.voted.push(innerSigningContractID);
            });
            message["pollData"] = { ...pollData, options: optsCopy };
          };
          [state.messages, state.pinnedMessages].forEach((messageArray) => {
            const msgIndex = findMessageIdx(data.hash, messageArray);
            if (msgIndex >= 0) {
              fnVoteOnPoll(messageArray[msgIndex]);
            }
          });
        }
      },
      "gi.contracts/chatroom/changeVoteOnPoll": {
        validate: actionRequireInnerSignature(objectOf({
          hash: string,
          votes: arrayOf(string),
          votesAsString: string
        })),
        process({ data, meta, hash, height, innerSigningContractID }, { state }) {
          if (!state.messages) return;
          const fnChangeVoteOnPoll = (message) => {
            const myUpdatedVotes = data.votes;
            const pollData = message.pollData;
            const optsCopy = cloneDeep(pollData.options);
            optsCopy.forEach((opt) => {
              opt.voted = opt.voted.filter((votername) => votername !== innerSigningContractID);
            });
            myUpdatedVotes.forEach((optId) => {
              optsCopy.find((x) => x.id === optId)?.voted.push(innerSigningContractID);
            });
            message["pollData"] = { ...pollData, options: optsCopy };
          };
          [state.messages, state.pinnedMessages].forEach((messageArray) => {
            const msgIndex = findMessageIdx(data.hash, messageArray);
            if (msgIndex >= 0) {
              fnChangeVoteOnPoll(messageArray[msgIndex]);
            }
          });
        }
      },
      "gi.contracts/chatroom/closePoll": {
        validate: actionRequireInnerSignature(objectOf({
          hash: stringMax(MAX_HASH_LEN, "hash")
        })),
        process({ data }, { state }) {
          if (!state.messages) return;
          const fnClosePoll = (message) => {
            message.pollData["status"] = POLL_STATUS.CLOSED;
          };
          [state.messages, state.pinnedMessages].forEach((messageArray) => {
            const msgIndex = findMessageIdx(data.hash, messageArray);
            if (msgIndex >= 0) {
              fnClosePoll(messageArray[msgIndex]);
            }
          });
        }
      },
      "gi.contracts/chatroom/pinMessage": {
        validate: actionRequireInnerSignature(objectOf({
          message: object
        })),
        process({ data, innerSigningContractID }, { state }) {
          if (!state.messages) return;
          const { message } = data;
          state.pinnedMessages.unshift(message);
          const msgIndex = findMessageIdx(message.hash, state.messages);
          if (msgIndex >= 0) {
            state.messages[msgIndex]["pinnedBy"] = innerSigningContractID;
          }
        }
      },
      "gi.contracts/chatroom/unpinMessage": {
        validate: actionRequireInnerSignature(objectOf({
          hash: stringMax(MAX_HASH_LEN, "hash")
        })),
        process({ data }, { state }) {
          if (!state.messages) return;
          const pinnedMsgIndex = findMessageIdx(data.hash, state.pinnedMessages);
          if (pinnedMsgIndex >= 0) {
            state.pinnedMessages.splice(pinnedMsgIndex, 1);
          }
          const msgIndex = findMessageIdx(data.hash, state.messages);
          if (msgIndex >= 0) {
            delete state.messages[msgIndex]["pinnedBy"];
          }
        }
      }
    },
    methods: {
      "gi.contracts/chatroom/_cleanup": ({ contractID, state }) => {
        if (state?.members) {
          (0, import_sbp3.default)("chelonia/contract/release", Object.keys(state.members)).catch((e) => {
            console.error("[gi.contracts/chatroom/_cleanup] Error calling release", contractID, e);
          });
        }
      },
      "gi.contracts/chatroom/rotateKeys": (contractID) => {
        (0, import_sbp3.default)("chelonia/queueInvocation", contractID, async () => {
          await (0, import_sbp3.default)("chelonia/contract/setPendingKeyRevocation", contractID, ["cek", "csk"]);
          await (0, import_sbp3.default)("gi.actions/out/rotateKeys", contractID, "gi.contracts/chatroom", "pending", "gi.actions/chatroom/shareNewKeys");
        }).catch((e) => {
          console.warn(`rotateKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e);
        });
      },
      "gi.contracts/chatroom/removeForeignKeys": async (contractID, memberID, state) => {
        const keyIds = await (0, import_sbp3.default)("chelonia/contract/foreignKeysByContractID", state, memberID);
        if (!keyIds?.length) return;
        const CSKid = await (0, import_sbp3.default)("chelonia/contract/currentKeyIdByName", state, "csk", true);
        const CEKid = await (0, import_sbp3.default)("chelonia/contract/currentKeyIdByName", state, "cek");
        if (!CEKid) throw new Error("Missing encryption key");
        (0, import_sbp3.default)("chelonia/out/keyDel", {
          contractID,
          contractName: "gi.contracts/chatroom",
          data: keyIds,
          signingKeyId: CSKid,
          hooks: {
            preSendCheck: (_, state2) => {
              return !state2.members?.[memberID];
            }
          }
        }).catch((e) => {
          console.warn(`removeForeignKeys: ${e.name} thrown during queueEvent to ${contractID}:`, e);
        });
      },
      ...referenceTally("gi.contracts/chatroom/referenceTally")
    }
  });
})();
