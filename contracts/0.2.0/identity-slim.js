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

  // frontend/model/contracts/identity.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));
  var import_common = __require("@common/common.js");

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

  // frontend/model/contracts/shared/validators.js
  var allowedUsernameCharacters = (value) => /^[\w-]*$/.test(value);
  var noConsecutiveHyphensOrUnderscores = (value) => !value.includes("--") && !value.includes("__");
  var noLeadingOrTrailingHyphen = (value) => !value.startsWith("-") && !value.endsWith("-");
  var noLeadingOrTrailingUnderscore = (value) => !value.startsWith("_") && !value.endsWith("_");
  var noUppercase = (value) => value.toLowerCase() === value;

  // frontend/model/contracts/shared/functions.js
  var import_sbp = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/constants.js
  var IDENTITY_USERNAME_MAX_CHARS = 80;

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

  // frontend/model/contracts/identity.js
  (0, import_sbp2.default)("chelonia/defineContract", {
    name: "gi.contracts/identity",
    getters: {
      currentIdentityState(state) {
        return state;
      },
      loginState(state, getters) {
        return getters.currentIdentityState.loginState;
      },
      ourDirectMessages(state, getters) {
        return getters.currentIdentityState.chatRooms || {};
      }
    },
    actions: {
      "gi.contracts/identity": {
        validate: (data, { state }) => {
          objectMaybeOf({
            attributes: objectMaybeOf({
              username: string,
              email: string,
              picture: string
            })
          })(data);
          const { username } = data.attributes;
          if (username.length > IDENTITY_USERNAME_MAX_CHARS) {
            throw new TypeError(`A username cannot exceed ${IDENTITY_USERNAME_MAX_CHARS} characters.`);
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
        },
        process({ data }, { state }) {
          const initialState = merge({
            settings: {},
            attributes: {
              allowDMInvite: true
            },
            chatRooms: {}
          }, data);
          for (const key in initialState) {
            import_common.Vue.set(state, key, initialState[key]);
          }
        }
      },
      "gi.contracts/identity/setAttributes": {
        validate: object,
        process({ data }, { state }) {
          for (const key in data) {
            import_common.Vue.set(state.attributes, key, data[key]);
          }
        }
      },
      "gi.contracts/identity/deleteAttributes": {
        validate: arrayOf(string),
        process({ data }, { state }) {
          for (const attribute of data) {
            import_common.Vue.delete(state.attributes, attribute);
          }
        }
      },
      "gi.contracts/identity/updateSettings": {
        validate: object,
        process({ data }, { state }) {
          for (const key in data) {
            import_common.Vue.set(state.settings, key, data[key]);
          }
        }
      },
      "gi.contracts/identity/setLoginState": {
        validate: objectOf({
          groupIds: arrayOf(string)
        }),
        process({ data }, { state }) {
          import_common.Vue.set(state, "loginState", data);
        },
        sideEffect({ contractID }) {
          if (contractID === (0, import_sbp2.default)("state/vuex/getters").ourIdentityContractId) {
            (0, import_sbp2.default)("chelonia/queueInvocation", contractID, ["gi.actions/identity/updateLoginStateUponLogin"]).catch((e) => {
              (0, import_sbp2.default)("gi.notifications/emit", "ERROR", {
                message: (0, import_common.L)("Failed to join groups we're part of on another device. Not catastrophic, but could lead to problems. {errName}: '{errMsg}'", {
                  errName: e.name,
                  errMsg: e.message || "?"
                })
              });
            });
          }
        }
      },
      "gi.contracts/identity/createDirectMessage": {
        validate: (data, { state, getters }) => {
          objectOf({
            groupContractID: optional(string),
            contractID: string
          })(data);
        },
        process({ data }, { state }) {
          const { groupContractID, contractID } = data;
          if (groupContractID) {
            import_common.Vue.set(state.chatRooms, contractID, {
              groupContractID,
              visible: true
            });
          } else {
          }
        },
        async sideEffect({ contractID, data }) {
          await (0, import_sbp2.default)("chelonia/contract/sync", data.contractID);
          if (!(0, import_sbp2.default)("chelonia/contract/isSyncing", contractID)) {
            await (0, import_sbp2.default)("controller/router").push({ name: "GroupChatConversation", params: { chatRoomId: data.contractID } }).catch(logExceptNavigationDuplicated);
          }
        }
      },
      "gi.contracts/identity/joinDirectMessage": {
        validate: objectOf({
          groupContractID: optional(string),
          contractID: string
        }),
        process({ data }, { state, getters }) {
          const { groupContractID, contractID } = data;
          if (getters.ourDirectMessages[contractID]) {
            throw new TypeError((0, import_common.L)("Already joined direct message."));
          }
          if (groupContractID) {
            import_common.Vue.set(state.chatRooms, contractID, {
              groupContractID,
              visible: state.attributes.allowDMInvite
            });
          } else {
          }
        },
        async sideEffect({ data }, { getters }) {
          if (getters.ourDirectMessages[data.contractID].visible) {
            await (0, import_sbp2.default)("chelonia/contract/sync", data.contractID);
          }
        }
      },
      "gi.contracts/identity/setDirectMessageVisibility": {
        validate: (data, { state, getters }) => {
          objectOf({
            contractID: string,
            visible: boolean
          })(data);
          if (!getters.ourDirectMessages[data.contractID]) {
            throw new TypeError((0, import_common.L)("Not existing direct message."));
          }
        },
        process({ data }, { state, getters }) {
          import_common.Vue.set(state.chatRooms[data.contractID], "visible", data.visible);
        },
        sideEffect({ data }) {
          const { contractID, visible } = data;
          visible ? (0, import_sbp2.default)("chelonia/contract/sync", contractID) : leaveChatRoom({ contractID });
        }
      }
    }
  });
})();
