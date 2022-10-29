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

// frontend/model/contracts/shared/constants.js
var INVITE_STATUS = {
  REVOKED: "revoked",
  VALID: "valid",
  USED: "used"
};
var MESSAGE_TYPES = {
  POLL: "message-poll",
  TEXT: "message-text",
  INTERACTIVE: "message-interactive",
  NOTIFICATION: "message-notification"
};

// frontend/common/common.js
import { default as default2 } from "vue";

// frontend/common/vSafeHtml.js
import dompurify from "dompurify";
import Vue from "vue";

// frontend/model/contracts/shared/giLodash.js
function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
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
function template(string, ...args) {
  const firstArg = args[0];
  const replacementsByKey = typeof firstArg === "object" && firstArg !== null ? firstArg : args;
  return string.replace(nargs, function replaceArg(match, capture, index) {
    if (string[index - 1] === "{" && string[index + match.length] === "}") {
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
function createInvite({ quantity = 1, creator, expires, invitee }) {
  return {
    inviteSecret: `${parseInt(Math.random() * 1e4)}`,
    quantity,
    creator,
    invitee,
    status: INVITE_STATUS.VALID,
    responses: {},
    expires: Date.now() + DAYS_MILLIS * expires
  };
}
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
    newMessage = {
      ...newMessage,
      proposal: data.proposal
    };
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
export {
  createInvite,
  createMessage,
  findMessageIdx,
  leaveChatRoom,
  makeMentionFromUsername
};
