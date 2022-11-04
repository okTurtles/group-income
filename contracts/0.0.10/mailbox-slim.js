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
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

  // frontend/model/contracts/mailbox.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));
  var import_common2 = __require("@common/common.js");

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

  // frontend/model/contracts/shared/functions.js
  var import_sbp = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/time.js
  var import_common = __require("@common/common.js");
  var MINS_MILLIS = 6e4;
  var HOURS_MILLIS = 60 * MINS_MILLIS;
  var DAYS_MILLIS = 24 * HOURS_MILLIS;
  var MONTHS_MILLIS = 30 * DAYS_MILLIS;

  // frontend/views/utils/misc.js
  function logExceptNavigationDuplicated(err) {
    err.name !== "NavigationDuplicated" && console.error(err);
  }

  // frontend/model/contracts/shared/functions.js
  async function leaveChatRoom({ contractID }) {
    const rootState = (0, import_sbp.default)("state/vuex/state");
    const rootGetters = (0, import_sbp.default)("state/vuex/getters");
    if (contractID === rootGetters.currentChatRoomId) {
      (0, import_sbp.default)("state/vuex/commit", "setCurrentChatRoomId", {
        groupId: rootState.currentGroupId
      });
      const curRouteName = (0, import_sbp.default)("controller/router").history.current.name;
      if (curRouteName === "GroupChat" || curRouteName === "GroupChatConversation") {
        await (0, import_sbp.default)("controller/router").push({ name: "GroupChatConversation", params: { chatRoomId: rootGetters.currentChatRoomId } }).catch(logExceptNavigationDuplicated);
      }
    }
    (0, import_sbp.default)("state/vuex/commit", "deleteChatRoomUnread", { chatRoomId: contractID });
    (0, import_sbp.default)("state/vuex/commit", "deleteChatRoomScrollPosition", { chatRoomId: contractID });
    (0, import_sbp.default)("chelonia/contract/remove", contractID).catch((e) => {
      console.error(`leaveChatRoom(${contractID}): remove threw ${e.name}:`, e);
    });
  }

  // frontend/model/contracts/misc/flowTyper.js
  var EMPTY_VALUE = Symbol("@@empty");
  var isEmpty = (v) => v === EMPTY_VALUE;
  var isNil = (v) => v === null;
  var isUndef = (v) => typeof v === "undefined";
  var isBoolean = (v) => typeof v === "boolean";
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
  var boolean = function boolean2(value, _scope = "") {
    if (isEmpty(value))
      return false;
    if (isBoolean(value))
      return value;
    throw validatorError(boolean2, value, _scope);
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

  // frontend/model/contracts/mailbox.js
  (0, import_sbp2.default)("chelonia/defineContract", {
    name: "gi.contracts/mailbox",
    metadata: {
      validate: objectOf({
        createdDate: string,
        username: optional(string),
        identityContractID: optional(string)
      }),
      create() {
        if (!(0, import_sbp2.default)("state/vuex/state").loggedIn) {
          return { createdDate: new Date().toISOString() };
        }
        const { username, identityContractID } = (0, import_sbp2.default)("state/vuex/state").loggedIn;
        return {
          createdDate: new Date().toISOString(),
          username,
          identityContractID
        };
      }
    },
    actions: {
      "gi.contracts/mailbox": {
        validate: objectOf({
          username: string
        }),
        process({ data }, { state }) {
          const initialState = merge({
            attributes: {
              creator: data.username,
              autoJoinAllowance: true
            },
            users: {}
          }, data);
          for (const key in initialState) {
            import_common2.Vue.set(state, key, initialState[key]);
          }
        }
      },
      "gi.contracts/mailbox/setAutoJoinAllowance": {
        validate: (data, { state, meta }) => {
          objectOf({ allownace: boolean })(data);
          if (state.attributes.creator !== meta.username) {
            throw new TypeError((0, import_common2.L)("Only the mailbox creator can set attributes."));
          } else if (state.attributes === data.allownace) {
            throw new TypeError((0, import_common2.L)("Same attribute is already set."));
          }
        },
        process({ meta, data }, { state }) {
          import_common2.Vue.set(state.attributes, "autoJoinAllowance", data.allownace);
        }
      },
      "gi.contracts/mailbox/createDirectMessage": {
        validate: (data, { state, meta }) => {
          objectOf({
            username: string,
            contractID: string
          })(data);
          if (state.attributes.creator !== meta.username) {
            throw new TypeError((0, import_common2.L)("Only the mailbox creator can create direct message channel."));
          } else if (state.users[data.username]) {
            throw new TypeError((0, import_common2.L)("Already existing direct message channel."));
          }
        },
        process({ meta, data }, { state }) {
          import_common2.Vue.set(state.users, data.username, {
            contractID: data.contractID,
            creator: meta.username,
            hidden: false,
            joinedDate: meta.createdDate
          });
        },
        sideEffect({ data }) {
          (0, import_sbp2.default)("chelonia/contract/sync", data.contractID);
        }
      },
      "gi.contracts/mailbox/joinDirectMessage": {
        validate: objectOf({
          username: string,
          contractID: optional(string)
        }),
        process({ meta, data }, { state }) {
          if (state.attributes.creator === data.username) {
            if (state.users[meta.username]) {
              throw new TypeError((0, import_common2.L)("Already existing direct message channel."));
            }
          } else if (state.attributes.creator === meta.username) {
            if (!state.users[data.username] || state.users[data.username].joinedDate) {
              throw new TypeError((0, import_common2.L)("Never created or already joined direct message channel."));
            }
          } else {
            throw new TypeError((0, import_common2.L)("Incorrect mailbox creator to join direct message channel."));
          }
          const joinedDate = state.attributes.autoJoinAllowance ? meta.createdDate : null;
          if (state.attributes.creator === data.username) {
            import_common2.Vue.set(state.users, meta.username, {
              contractID: data.contractID,
              creator: meta.username,
              hidden: false,
              joinedDate
            });
          } else {
            import_common2.Vue.set(state.users[data.username], "joinedDate", joinedDate);
          }
        },
        sideEffect({ meta, data }, { state }) {
          if (state.attributes.creator === meta.username) {
            (0, import_sbp2.default)("chelonia/contract/sync", state.users[data.username].contractID);
          } else if (state.attributes.autoJoinAllowance) {
            (0, import_sbp2.default)("chelonia/contract/sync", data.contractID);
          }
        }
      },
      "gi.contracts/mailbox/leaveDirectMessage": {
        validate: (data, { state, meta }) => {
          objectOf({
            username: string
          })(data);
          if (state.attributes.creator !== meta.username) {
            throw new TypeError((0, import_common2.L)("Only the mailbox creator can leave direct message channel."));
          } else if (!state.users[data.username]?.joinedDate) {
            throw new TypeError((0, import_common2.L)("Not joined or already left direct message channel."));
          }
        },
        process({ data }, { state }) {
          import_common2.Vue.set(state.users[data.username], "joinedDate", null);
        },
        sideEffect({ data }, { state }) {
          if ((0, import_sbp2.default)("okTurtles.data/get", "SYNCING_MAILBOX")) {
            return;
          }
          leaveChatRoom({ contractID: state.users[data.username].contractID });
        }
      }
    }
  });
})();
