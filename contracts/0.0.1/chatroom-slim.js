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

  // frontend/model/contracts/chatroom.js
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

  // frontend/model/contracts/shared/constants.js
  var CHATROOM_NAME_LIMITS_IN_CHARS = 50;
  var CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280;
  var CHATROOM_ACTIONS_PER_PAGE = 40;
  var CHATROOM_MESSAGES_PER_PAGE = 20;
  var CHATROOM_MESSAGE_ACTION = "chatroom-message-action";
  var CHATROOM_TYPES = {
    INDIVIDUAL: "individual",
    GROUP: "group"
  };
  var CHATROOM_PRIVACY_LEVEL = {
    GROUP: "chatroom-privacy-level-group",
    PRIVATE: "chatroom-privacy-level-private",
    PUBLIC: "chatroom-privacy-level-public"
  };
  var MESSAGE_TYPES = {
    POLL: "message-poll",
    TEXT: "message-text",
    INTERACTIVE: "message-interactive",
    NOTIFICATION: "message-notification"
  };
  var MESSAGE_NOTIFICATIONS = {
    ADD_MEMBER: "add-member",
    JOIN_MEMBER: "join-member",
    LEAVE_MEMBER: "leave-member",
    KICK_MEMBER: "kick-member",
    UPDATE_DESCRIPTION: "update-description",
    UPDATE_NAME: "update-name",
    DELETE_CHANNEL: "delete-channel",
    VOTE: "vote"
  };
  var MAIL_TYPE_MESSAGE = "message";
  var MAIL_TYPE_FRIEND_REQ = "friend-request";

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
        return propertyTypeFn.name === "maybe" && !o.hasOwnProperty(property);
      });
      if (undefAttr) {
        throw validatorError(object2, o[undefAttr], `${_scope}.${undefAttr}`, `empty object property '${undefAttr}' for ${_scope} type`, `void | null | ${getType(typeObj[undefAttr]).substr(1)}`, "-");
      }
      const reducer = isEmpty(value) ? (acc, key) => Object.assign(acc, { [key]: typeObj[key](value) }) : (acc, key) => {
        const typeFn = typeObj[key];
        if (typeFn.name === "optional" && !o.hasOwnProperty(key)) {
          return Object.assign(acc, {});
        } else {
          return Object.assign(acc, { [key]: typeFn(o[key], `${_scope}.${key}`) });
        }
      };
      return typeAttrs.reduce(reducer, {});
    }
    object2.type = () => {
      const props = Object.keys(typeObj).map((key) => typeObj[key].name === "optional" ? `${key}?: ${getType(typeObj[key], { noVoid: true })}` : `${key}: ${getType(typeObj[key])}`);
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

  // frontend/model/contracts/shared/types.js
  var inviteType = objectOf({
    inviteSecret: string,
    quantity: number,
    creator: string,
    invitee: optional(string),
    status: string,
    responses: mapOf(string, string),
    expires: number
  });
  var chatRoomAttributesType = objectOf({
    name: string,
    description: string,
    type: unionOf(...Object.values(CHATROOM_TYPES).map((v) => literalOf(v))),
    privacyLevel: unionOf(...Object.values(CHATROOM_PRIVACY_LEVEL).map((v) => literalOf(v)))
  });
  var messageType = objectMaybeOf({
    type: unionOf(...Object.values(MESSAGE_TYPES).map((v) => literalOf(v))),
    text: string,
    notification: objectMaybeOf({
      type: unionOf(...Object.values(MESSAGE_NOTIFICATIONS).map((v) => literalOf(v))),
      params: mapOf(string, string)
    }),
    replyingMessage: objectOf({
      id: string,
      text: string
    }),
    emoticons: mapOf(string, arrayOf(string)),
    onlyVisibleTo: arrayOf(string)
  });
  var mailType = unionOf(...[MAIL_TYPE_MESSAGE, MAIL_TYPE_FRIEND_REQ].map((k) => literalOf(k)));

  // frontend/model/contracts/shared/functions.js
  var import_sbp = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/time.js
  var import_common = __require("@common/common.js");
  var MINS_MILLIS = 6e4;
  var HOURS_MILLIS = 60 * MINS_MILLIS;
  var DAYS_MILLIS = 24 * HOURS_MILLIS;
  var MONTHS_MILLIS = 30 * DAYS_MILLIS;
  var locale = typeof navigator === "undefined" && "en-US" || (navigator.languages ? navigator.languages[0] : navigator.language);

  // frontend/views/utils/misc.js
  function logExceptNavigationDuplicated(err) {
    err.name !== "NavigationDuplicated" && console.error(err);
  }

  // frontend/model/contracts/shared/functions.js
  function createMessage({ meta, data, hash, state }) {
    const { type, text, replyingMessage } = data;
    const { createdDate } = meta;
    let newMessage = {
      type,
      datetime: new Date(createdDate).toISOString(),
      id: hash,
      from: meta.username
    };
    if (type === MESSAGE_TYPES.TEXT) {
      newMessage = !replyingMessage ? { ...newMessage, text } : { ...newMessage, text, replyingMessage };
    } else if (type === MESSAGE_TYPES.POLL) {
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
    }
    return newMessage;
  }
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
    (0, import_sbp.default)("chelonia/contract/remove", contractID).catch((e) => {
      console.error(`leaveChatRoom(${contractID}): remove threw ${e.name}:`, e);
    });
  }
  function findMessageIdx(id, messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].id === id) {
        return i;
      }
    }
    return -1;
  }

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
    (0, import_sbp2.default)("okTurtles.events/emit", `${CHATROOM_MESSAGE_ACTION}-${contractID}`, { hash });
  }
  (0, import_sbp2.default)("chelonia/defineContract", {
    name: "gi.contracts/chatroom",
    metadata: {
      validate: objectOf({
        createdDate: string,
        username: string,
        identityContractID: string
      }),
      create() {
        const { username, identityContractID } = (0, import_sbp2.default)("state/vuex/state").loggedIn;
        return {
          createdDate: new Date().toISOString(),
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
              messagesPerPage: CHATROOM_MESSAGES_PER_PAGE,
              maxNameLength: CHATROOM_NAME_LIMITS_IN_CHARS,
              maxDescriptionLength: CHATROOM_DESCRIPTION_LIMITS_IN_CHARS
            },
            attributes: {
              creator: meta.username,
              deletedDate: null,
              archievedDate: null
            },
            users: {},
            messages: []
          }, data);
          for (const key in initialState) {
            import_common2.Vue.set(state, key, initialState[key]);
          }
        }
      },
      "gi.contracts/chatroom/join": {
        validate: objectOf({
          username: string
        }),
        process({ data, meta, hash }, { state, getters }) {
          const { username } = data;
          if (!state.saveMessage && state.users[username]) {
            console.warn("Can not join the chatroom which you are already part of");
            return;
          }
          import_common2.Vue.set(state.users, username, { joinedDate: meta.createdDate });
          if (!state.saveMessage) {
            return;
          }
          const notificationType = username === meta.username ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER;
          const notificationData = createNotificationData(notificationType, notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { username } : {});
          const newMessage = createMessage({ meta, hash, data: notificationData, state });
          state.messages.push(newMessage);
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/rename": {
        validate: objectOf({
          name: string
        }),
        process({ data, meta, hash }, { state }) {
          import_common2.Vue.set(state.attributes, "name", data.name);
          if (!state.saveMessage) {
            return;
          }
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {});
          const newMessage = createMessage({ meta, hash, data: notificationData, state });
          state.messages.push(newMessage);
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/changeDescription": {
        validate: objectOf({
          description: string
        }),
        process({ data, meta, hash }, { state }) {
          import_common2.Vue.set(state.attributes, "description", data.description);
          if (!state.saveMessage) {
            return;
          }
          const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {});
          const newMessage = createMessage({ meta, hash, data: notificationData, state });
          state.messages.push(newMessage);
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/leave": {
        validate: objectOf({
          username: optional(string),
          member: string
        }),
        process({ data, meta, hash }, { state }) {
          const { member } = data;
          const isKicked = data.username && member !== data.username;
          if (!state.saveMessage && !state.users[member]) {
            throw new Error(`Can not leave the chatroom which ${member} are not part of`);
          }
          import_common2.Vue.delete(state.users, member);
          if (!state.saveMessage) {
            return;
          }
          const notificationType = !isKicked ? MESSAGE_NOTIFICATIONS.LEAVE_MEMBER : MESSAGE_NOTIFICATIONS.KICK_MEMBER;
          const notificationData = createNotificationData(notificationType, isKicked ? { username: member } : {});
          const newMessage = createMessage({
            meta: isKicked ? meta : { ...meta, username: member },
            hash,
            data: notificationData,
            state
          });
          state.messages.push(newMessage);
        },
        sideEffect({ data, hash, contractID }, { state }) {
          const rootState = (0, import_sbp2.default)("state/vuex/state");
          if (!state.saveMessage && data.member === rootState.loggedIn.username) {
            if ((0, import_sbp2.default)("okTurtles.data/get", "JOINING_CHATROOM")) {
              return;
            }
            leaveChatRoom({ contractID });
          }
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/delete": {
        validate: (data, { state, getters, meta }) => {
          if (state.attributes.creator !== meta.username) {
            throw new TypeError((0, import_common2.L)("Only the channel creator can delete channel."));
          }
        },
        process({ data, meta }, { state, rootState }) {
          import_common2.Vue.set(state.attributes, "deletedDate", meta.createdDate);
          for (const username in state.users) {
            import_common2.Vue.delete(state.users, username);
          }
        },
        sideEffect({ meta, contractID }, { state }) {
          if (!state.saveMessage && state.attributes.creator === meta.username) {
            if ((0, import_sbp2.default)("okTurtles.data/get", "JOINING_CHATROOM")) {
              return;
            }
            leaveChatRoom({ contractID });
          }
        }
      },
      "gi.contracts/chatroom/addMessage": {
        validate: messageType,
        process({ data, meta, hash }, { state }) {
          const newMessage = createMessage({ meta, data, hash, state });
          if (!state.saveMessage) {
            return;
          }
          const pendingMsg = state.messages.find((msg) => msg.id === hash && msg.pending);
          if (pendingMsg) {
            delete pendingMsg.pending;
          } else {
            state.messages.push(newMessage);
          }
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/editMessage": {
        validate: (data, { state, meta }) => {
          objectOf({
            id: string,
            text: string
          })(data);
        },
        process({ data, meta }, { state }) {
          if (!state.saveMessage) {
            return;
          }
          const msgIndex = findMessageIdx(data.id, state.messages);
          if (msgIndex >= 0 && meta.username === state.messages[msgIndex].from) {
            state.messages[msgIndex].text = data.text;
            state.messages[msgIndex].updatedDate = meta.createdDate;
            if (state.saveMessage && state.messages[msgIndex].pending) {
              delete state.messages[msgIndex].pending;
            }
          }
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/deleteMessage": {
        validate: objectOf({
          id: string
        }),
        process({ data, meta }, { state }) {
          if (!state.saveMessage) {
            return;
          }
          const msgIndex = findMessageIdx(data.id, state.messages);
          if (msgIndex >= 0) {
            state.messages.splice(msgIndex, 1);
          }
        },
        sideEffect({ data, contractID, hash }) {
          const rootState = (0, import_sbp2.default)("state/vuex/state");
          if (rootState.chatRoomScrollPosition[contractID] === data.id) {
            (0, import_sbp2.default)("state/vuex/commit", "setChatRoomScrollPosition", {
              chatRoomId: contractID,
              messageId: null
            });
          }
          emitMessageEvent({ contractID, hash });
        }
      },
      "gi.contracts/chatroom/makeEmotion": {
        validate: objectOf({
          id: string,
          emoticon: string
        }),
        process({ data, meta, contractID }, { state }) {
          if (!state.saveMessage) {
            return;
          }
          const { id, emoticon } = data;
          const msgIndex = findMessageIdx(id, state.messages);
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
              import_common2.Vue.set(state.messages[msgIndex], "emoticons", emoticons);
            } else {
              import_common2.Vue.delete(state.messages[msgIndex], "emoticons");
            }
          }
        },
        sideEffect({ contractID, hash }) {
          emitMessageEvent({ contractID, hash });
        }
      }
    }
  });
})();
