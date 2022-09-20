"use strict";

// node_modules/@sbp/sbp/dist/module.mjs
var selectors = {};
var domains = {};
var globalFilters = [];
var domainFilters = {};
var selectorFilters = {};
var unsafeSelectors = {};
var DOMAIN_REGEX = /^[^/]+/;
function sbp(selector, ...data) {
  const domain = domainFromSelector(selector);
  if (!selectors[selector]) {
    throw new Error(`SBP: selector not registered: ${selector}`);
  }
  for (const filters of [selectorFilters[selector], domainFilters[domain], globalFilters]) {
    if (filters) {
      for (const filter of filters) {
        if (filter(domain, selector, data) === false)
          return;
      }
    }
  }
  return selectors[selector].call(domains[domain].state, ...data);
}
function domainFromSelector(selector) {
  const domainLookup = DOMAIN_REGEX.exec(selector);
  if (domainLookup === null) {
    throw new Error(`SBP: selector missing domain: ${selector}`);
  }
  return domainLookup[0];
}
var SBP_BASE_SELECTORS = {
  "sbp/selectors/register": function(sels) {
    const registered = [];
    for (const selector in sels) {
      const domain = domainFromSelector(selector);
      if (selectors[selector]) {
        (console.warn || console.log)(`[SBP WARN]: not registering already registered selector: '${selector}'`);
      } else if (typeof sels[selector] === "function") {
        if (unsafeSelectors[selector]) {
          (console.warn || console.log)(`[SBP WARN]: registering unsafe selector: '${selector}' (remember to lock after overwriting)`);
        }
        const fn = selectors[selector] = sels[selector];
        registered.push(selector);
        if (!domains[domain]) {
          domains[domain] = { state: {} };
        }
        if (selector === `${domain}/_init`) {
          fn.call(domains[domain].state);
        }
      }
    }
    return registered;
  },
  "sbp/selectors/unregister": function(sels) {
    for (const selector of sels) {
      if (!unsafeSelectors[selector]) {
        throw new Error(`SBP: can't unregister locked selector: ${selector}`);
      }
      delete selectors[selector];
    }
  },
  "sbp/selectors/overwrite": function(sels) {
    sbp("sbp/selectors/unregister", Object.keys(sels));
    return sbp("sbp/selectors/register", sels);
  },
  "sbp/selectors/unsafe": function(sels) {
    for (const selector of sels) {
      if (selectors[selector]) {
        throw new Error("unsafe must be called before registering selector");
      }
      unsafeSelectors[selector] = true;
    }
  },
  "sbp/selectors/lock": function(sels) {
    for (const selector of sels) {
      delete unsafeSelectors[selector];
    }
  },
  "sbp/selectors/fn": function(sel) {
    return selectors[sel];
  },
  "sbp/filters/global/add": function(filter) {
    globalFilters.push(filter);
  },
  "sbp/filters/domain/add": function(domain, filter) {
    if (!domainFilters[domain])
      domainFilters[domain] = [];
    domainFilters[domain].push(filter);
  },
  "sbp/filters/selector/add": function(selector, filter) {
    if (!selectorFilters[selector])
      selectorFilters[selector] = [];
    selectorFilters[selector].push(filter);
  }
};
SBP_BASE_SELECTORS["sbp/selectors/register"](SBP_BASE_SELECTORS);
var module_default = sbp;

// frontend/common/common.js
import { default as default2 } from "vue";

// frontend/common/vSafeHtml.js
import dompurify from "dompurify";
import Vue from "vue";

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

// frontend/common/vSafeHtml.js
var defaultConfig = {
  ALLOWED_ATTR: ["class"],
  ALLOWED_TAGS: ["b", "br", "em", "i", "p", "small", "span", "strong", "sub", "sup", "u"],
  RETURN_DOM_FRAGMENT: true
};
var transform = (el, binding) => {
  if (binding.oldValue !== binding.value) {
    let config = defaultConfig;
    if (binding.arg === "a") {
      config = cloneDeep(config);
      config.ALLOWED_ATTR.push("href", "target");
      config.ALLOWED_TAGS.push("a");
    }
    el.textContent = "";
    el.appendChild(dompurify.sanitize(binding.value, config));
  }
};
Vue.directive("safe-html", {
  bind: transform,
  update: transform
});

// frontend/common/translations.js
import dompurify2 from "dompurify";
import Vue2 from "vue";

// frontend/common/stringTemplate.js
var nargs = /\{([0-9a-zA-Z_]+)\}/g;
function template(string3, ...args) {
  const firstArg = args[0];
  const replacementsByKey = typeof firstArg === "object" && firstArg !== null ? firstArg : args;
  return string3.replace(nargs, function replaceArg(match, capture, index) {
    if (string3[index - 1] === "{" && string3[index + match.length] === "}") {
      return capture;
    }
    const maybeReplacement = Object.prototype.hasOwnProperty.call(replacementsByKey, capture) ? replacementsByKey[capture] : void 0;
    if (maybeReplacement === null || maybeReplacement === void 0) {
      return "";
    }
    return String(maybeReplacement);
  });
}

// frontend/common/translations.js
Vue2.prototype.L = L;
Vue2.prototype.LTags = LTags;
var defaultLanguage = "en-US";
var defaultLanguageCode = "en";
var defaultTranslationTable = {};
var dompurifyConfig = {
  ...defaultConfig,
  ALLOWED_ATTR: ["class", "href", "rel", "target"],
  ALLOWED_TAGS: ["a", "b", "br", "button", "em", "i", "p", "small", "span", "strong", "sub", "sup", "u"],
  RETURN_DOM_FRAGMENT: false
};
var currentLanguage = defaultLanguage;
var currentLanguageCode = defaultLanguage.split("-")[0];
var currentTranslationTable = defaultTranslationTable;
module_default("sbp/selectors/register", {
  "translations/init": async function init(language) {
    const [languageCode] = language.toLowerCase().split("-");
    if (language.toLowerCase() === currentLanguage.toLowerCase())
      return;
    if (languageCode === currentLanguageCode)
      return;
    if (languageCode === defaultLanguageCode) {
      currentLanguage = defaultLanguage;
      currentLanguageCode = defaultLanguageCode;
      currentTranslationTable = defaultTranslationTable;
      return;
    }
    try {
      currentTranslationTable = await module_default("backend/translations/get", language) || defaultTranslationTable;
      currentLanguage = language;
      currentLanguageCode = languageCode;
    } catch (error) {
      console.error(error);
    }
  }
});
function LTags(...tags) {
  const o = {
    "br_": "<br/>"
  };
  for (const tag of tags) {
    o[`${tag}_`] = `<${tag}>`;
    o[`_${tag}`] = `</${tag}>`;
  }
  return o;
}
function L(key, args) {
  return template(currentTranslationTable[key] || key, args).replace(/\s(?=[;:?!])/g, "&nbsp;");
}
function sanitize(inputString) {
  return dompurify2.sanitize(inputString, dompurifyConfig);
}
Vue2.component("i18n", {
  functional: true,
  props: {
    args: [Object, Array],
    tag: {
      type: String,
      default: "span"
    },
    compile: Boolean
  },
  render: function(h, context) {
    const text = context.children[0].text;
    const translation = L(text, context.props.args || {});
    if (!translation) {
      console.warn("The following i18n text was not translated correctly:", text);
      return h(context.props.tag, context.data, text);
    }
    if (context.props.tag === "a" && context.data.attrs.target === "_blank") {
      context.data.attrs.rel = "noopener noreferrer";
    }
    if (context.props.compile) {
      const result = Vue2.compile("<wrap>" + sanitize(translation) + "</wrap>");
      return result.render.call({
        _c: (tag, ...args) => {
          if (tag === "wrap") {
            return h(context.props.tag, context.data, ...args);
          } else {
            return h(tag, ...args);
          }
        },
        _v: (x) => x
      });
    } else {
      if (!context.data.domProps)
        context.data.domProps = {};
      context.data.domProps.innerHTML = sanitize(translation);
      return h(context.props.tag, context.data);
    }
  }
});

// frontend/model/contracts/shared/constants.js
var CHATROOM_NAME_LIMITS_IN_CHARS = 50;
var CHATROOM_DESCRIPTION_LIMITS_IN_CHARS = 280;
var CHATROOM_ACTIONS_PER_PAGE = 40;
var CHATROOM_MESSAGES_PER_PAGE = 20;
var CHATROOM_MESSAGE_ACTION = "chatroom-message-action";
var MESSAGE_RECEIVE = "message-receive";
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

// frontend/model/contracts/shared/time.js
var MINS_MILLIS = 6e4;
var HOURS_MILLIS = 60 * MINS_MILLIS;
var DAYS_MILLIS = 24 * HOURS_MILLIS;
var MONTHS_MILLIS = 30 * DAYS_MILLIS;

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
  const rootState = module_default("state/vuex/state");
  const rootGetters = module_default("state/vuex/getters");
  if (contractID === rootGetters.currentChatRoomId) {
    module_default("state/vuex/commit", "setCurrentChatRoomId", {
      groupId: rootState.currentGroupId
    });
    const curRouteName = module_default("controller/router").history.current.name;
    if (curRouteName === "GroupChat" || curRouteName === "GroupChatConversation") {
      await module_default("controller/router").push({ name: "GroupChatConversation", params: { chatRoomId: rootGetters.currentChatRoomId } }).catch(logExceptNavigationDuplicated);
    }
  }
  module_default("state/vuex/commit", "deleteChatRoomUnread", { chatRoomId: contractID });
  module_default("state/vuex/commit", "deleteChatRoomScrollPosition", { chatRoomId: contractID });
  module_default("chelonia/contract/remove", contractID).catch((e) => {
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
function makeMentionFromUsername(username) {
  return {
    me: `@${username}`,
    all: "@all"
  };
}

// frontend/model/contracts/shared/nativeNotification.js
function makeNotification({ title, body, icon, path }) {
  const notificationEnabled = module_default("state/vuex/state").notificationEnabled;
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || !notificationEnabled) {
    return;
  }
  const notification = new Notification(title, { body, icon });
  if (path) {
    notification.onclick = function(event) {
      event.preventDefault();
      module_default("controller/router").push({ path }).catch(console.warn);
    };
  }
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
  module_default("okTurtles.events/emit", `${CHATROOM_MESSAGE_ACTION}-${contractID}`, { hash });
}
function addMention({ contractID, messageId, datetime, text, username, chatRoomName }) {
  if (module_default("okTurtles.data/get", "READY_TO_JOIN_CHATROOM")) {
    return;
  }
  module_default("state/vuex/commit", "addChatRoomUnreadMention", {
    chatRoomId: contractID,
    messageId,
    createdDate: datetime
  });
  const rootGetters = module_default("state/vuex/getters");
  const groupID = rootGetters.groupIdFromChatRoomId(contractID);
  const path = `/group-chat/${contractID}`;
  makeNotification({
    title: `# ${chatRoomName}`,
    body: text,
    icon: rootGetters.globalProfile2(groupID, username).picture,
    path
  });
  module_default("okTurtles.events/emit", MESSAGE_RECEIVE);
}
function deleteMention({ contractID, messageId }) {
  module_default("state/vuex/commit", "deleteChatRoomUnreadMention", { chatRoomId: contractID, messageId });
}
function updateUnreadPosition({ contractID, hash, createdDate }) {
  module_default("state/vuex/commit", "setChatRoomUnreadSince", {
    chatRoomId: contractID,
    messageId: hash,
    createdDate
  });
}
module_default("chelonia/defineContract", {
  name: "gi.contracts/chatroom",
  metadata: {
    validate: objectOf({
      createdDate: string,
      username: string,
      identityContractID: string
    }),
    create() {
      const { username, identityContractID } = module_default("state/vuex/state").loggedIn;
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
            archivedDate: null
          },
          users: {},
          messages: []
        }, data);
        for (const key in initialState) {
          default2.set(state, key, initialState[key]);
        }
      }
    },
    "gi.contracts/chatroom/join": {
      validate: objectOf({
        username: string
      }),
      process({ data, meta, hash }, { state }) {
        const { username } = data;
        if (!state.saveMessage && state.users[username]) {
          console.warn("Can not join the chatroom which you are already part of");
          return;
        }
        default2.set(state.users, username, { joinedDate: meta.createdDate });
        if (!state.saveMessage) {
          return;
        }
        const notificationType = username === meta.username ? MESSAGE_NOTIFICATIONS.JOIN_MEMBER : MESSAGE_NOTIFICATIONS.ADD_MEMBER;
        const notificationData = createNotificationData(notificationType, notificationType === MESSAGE_NOTIFICATIONS.ADD_MEMBER ? { username } : {});
        const newMessage = createMessage({ meta, hash, data: notificationData, state });
        state.messages.push(newMessage);
      },
      sideEffect({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash });
        if (module_default("okTurtles.data/get", "READY_TO_JOIN_CHATROOM") || module_default("okTurtles.data/get", "JOINING_CHATROOM_ID") === contractID) {
          updateUnreadPosition({ contractID, hash, createdDate: meta.createdDate });
        }
      }
    },
    "gi.contracts/chatroom/rename": {
      validate: objectOf({
        name: string
      }),
      process({ data, meta, hash }, { state }) {
        default2.set(state.attributes, "name", data.name);
        if (!state.saveMessage) {
          return;
        }
        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_NAME, {});
        const newMessage = createMessage({ meta, hash, data: notificationData, state });
        state.messages.push(newMessage);
      },
      sideEffect({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash });
        if (module_default("okTurtles.data/get", "READY_TO_JOIN_CHATROOM")) {
          updateUnreadPosition({ contractID, hash, createdDate: meta.createdDate });
        }
      }
    },
    "gi.contracts/chatroom/changeDescription": {
      validate: objectOf({
        description: string
      }),
      process({ data, meta, hash }, { state }) {
        default2.set(state.attributes, "description", data.description);
        if (!state.saveMessage) {
          return;
        }
        const notificationData = createNotificationData(MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION, {});
        const newMessage = createMessage({ meta, hash, data: notificationData, state });
        state.messages.push(newMessage);
      },
      sideEffect({ contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash });
        if (module_default("okTurtles.data/get", "READY_TO_JOIN_CHATROOM")) {
          updateUnreadPosition({ contractID, hash, createdDate: meta.createdDate });
        }
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
        default2.delete(state.users, member);
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
      sideEffect({ data, hash, contractID, meta }, { state }) {
        const rootState = module_default("state/vuex/state");
        if (data.member === rootState.loggedIn.username) {
          if (module_default("okTurtles.data/get", "READY_TO_JOIN_CHATROOM")) {
            updateUnreadPosition({ contractID, hash, createdDate: meta.createdDate });
          }
          if (module_default("okTurtles.data/get", "JOINING_CHATROOM_ID")) {
            return;
          }
          leaveChatRoom({ contractID });
        }
        emitMessageEvent({ contractID, hash });
      }
    },
    "gi.contracts/chatroom/delete": {
      validate: (data, { state, meta }) => {
        if (state.attributes.creator !== meta.username) {
          throw new TypeError(L("Only the channel creator can delete channel."));
        }
      },
      process({ data, meta }, { state, rootState }) {
        default2.set(state.attributes, "deletedDate", meta.createdDate);
        for (const username in state.users) {
          default2.delete(state.users, username);
        }
      },
      sideEffect({ meta, contractID }, { state }) {
        if (module_default("okTurtles.data/get", "JOINING_CHATROOM_ID")) {
          return;
        }
        leaveChatRoom({ contractID });
      }
    },
    "gi.contracts/chatroom/addMessage": {
      validate: messageType,
      process({ data, meta, hash }, { state }) {
        if (!state.saveMessage) {
          return;
        }
        const pendingMsg = state.messages.find((msg) => msg.id === hash && msg.pending);
        if (pendingMsg) {
          delete pendingMsg.pending;
        } else {
          state.messages.push(createMessage({ meta, data, hash, state }));
        }
      },
      sideEffect({ contractID, hash, meta, data }, { state, getters }) {
        emitMessageEvent({ contractID, hash });
        const rootState = module_default("state/vuex/state");
        const me = rootState.loggedIn.username;
        if (me === meta.username) {
          return;
        }
        const newMessage = createMessage({ meta, data, hash, state });
        const mentions = makeMentionFromUsername(me);
        if (data.type === MESSAGE_TYPES.TEXT && (newMessage.text.includes(mentions.me) || newMessage.text.includes(mentions.all))) {
          addMention({
            contractID,
            messageId: newMessage.id,
            datetime: newMessage.datetime,
            text: newMessage.text,
            username: meta.username,
            chatRoomName: getters.chatRoomAttributes.name
          });
        }
        if (module_default("okTurtles.data/get", "READY_TO_JOIN_CHATROOM")) {
          updateUnreadPosition({ contractID, hash, createdDate: meta.createdDate });
        }
      }
    },
    "gi.contracts/chatroom/editMessage": {
      validate: (data, { state, meta }) => {
        objectOf({
          id: string,
          createdDate: string,
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
      sideEffect({ contractID, hash, meta, data }, { getters }) {
        emitMessageEvent({ contractID, hash });
        const rootState = module_default("state/vuex/state");
        const me = rootState.loggedIn.username;
        if (me === meta.username) {
          return;
        }
        const isAlreadyAdded = rootState.chatRoomUnread[contractID].mentions.find((m) => m.messageId === data.id);
        const mentions = makeMentionFromUsername(me);
        const isIncludeMention = data.text.includes(mentions.me) || data.text.includes(mentions.all);
        if (!isAlreadyAdded && isIncludeMention) {
          addMention({
            contractID,
            messageId: data.id,
            datetime: data.createdDate,
            text: data.text,
            username: meta.username,
            chatRoomName: getters.chatRoomAttributes.name
          });
        } else if (isAlreadyAdded && !isIncludeMention) {
          deleteMention({ contractID, messageId: data.id });
        }
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
        for (const message of state.messages) {
          if (message.replyingMessage?.id === data.id) {
            message.replyingMessage.id = null;
            message.replyingMessage.text = "Original message was removed.";
          }
        }
      },
      sideEffect({ data, contractID, hash, meta }) {
        emitMessageEvent({ contractID, hash });
        const rootState = module_default("state/vuex/state");
        const me = rootState.loggedIn.username;
        if (rootState.chatRoomScrollPosition[contractID] === data.id) {
          module_default("state/vuex/commit", "setChatRoomScrollPosition", {
            chatRoomId: contractID,
            messageId: null
          });
        }
        if (rootState.chatRoomUnread[contractID].since.messageId === data.id) {
          module_default("state/vuex/commit", "deleteChatRoomUnreadSince", {
            chatRoomId: contractID,
            deletedDate: meta.createdDate
          });
        }
        if (me === meta.username) {
          return;
        }
        if (rootState.chatRoomUnread[contractID].mentions.find((m) => m.messageId === data.id)) {
          deleteMention({ contractID, messageId: data.id });
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
            default2.set(state.messages[msgIndex], "emoticons", emoticons);
          } else {
            default2.delete(state.messages[msgIndex], "emoticons");
          }
        }
      },
      sideEffect({ contractID, hash }) {
        emitMessageEvent({ contractID, hash });
      }
    }
  }
});
//# sourceMappingURL=chatroom.js.map
