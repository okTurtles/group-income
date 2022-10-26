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

// frontend/model/contracts/misc/flowTyper.js
var EMPTY_VALUE = Symbol("@@empty");
var isEmpty = (v) => v === EMPTY_VALUE;
var isNil = (v) => v === null;
var isUndef = (v) => typeof v === "undefined";
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
function undef(value, _scope = "") {
  if (isEmpty(value) || isUndef(value))
    return void 0;
  throw validatorError(undef, value, _scope);
}
undef.type = () => "void";
var string = function string2(value, _scope = "") {
  if (isEmpty(value))
    return "";
  if (isString(value))
    return value;
  throw validatorError(string2, value, _scope);
};

// frontend/model/contracts/shared/validators.js
var allowedUsernameCharacters = (value) => /^[\w-]*$/.test(value);
var noConsecutiveHyphensOrUnderscores = (value) => !value.includes("--") && !value.includes("__");
var noLeadingOrTrailingHyphen = (value) => !value.startsWith("-") && !value.endsWith("-");
var noLeadingOrTrailingUnderscore = (value) => !value.startsWith("_") && !value.endsWith("_");
var noUppercase = (value) => value.toLowerCase() === value;

// frontend/model/contracts/shared/constants.js
var IDENTITY_USERNAME_MAX_CHARS = 80;

// frontend/model/contracts/identity.js
module_default("chelonia/defineContract", {
  name: "gi.contracts/identity",
  getters: {
    currentIdentityState(state) {
      return state;
    },
    loginState(state, getters) {
      return getters.currentIdentityState.loginState;
    }
  },
  actions: {
    "gi.contracts/identity": {
      validate: (data, { state, meta }) => {
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
          attributes: {}
        }, data);
        for (const key in initialState) {
          default2.set(state, key, initialState[key]);
        }
      }
    },
    "gi.contracts/identity/setAttributes": {
      validate: object,
      process({ data }, { state }) {
        for (const key in data) {
          default2.set(state.attributes, key, data[key]);
        }
      }
    },
    "gi.contracts/identity/deleteAttributes": {
      validate: arrayOf(string),
      process({ data }, { state }) {
        for (const attribute of data) {
          default2.delete(state.attributes, attribute);
        }
      }
    },
    "gi.contracts/identity/updateSettings": {
      validate: object,
      process({ data }, { state }) {
        for (const key in data) {
          default2.set(state.settings, key, data[key]);
        }
      }
    },
    "gi.contracts/identity/setLoginState": {
      validate: objectOf({
        groupIds: arrayOf(string)
      }),
      process({ data }, { state }) {
        default2.set(state, "loginState", data);
      },
      sideEffect({ contractID }) {
        if (contractID === module_default("state/vuex/getters").ourIdentityContractId) {
          module_default("chelonia/queueInvocation", contractID, ["gi.actions/identity/updateLoginStateUponLogin"]).catch((e) => {
            module_default("gi.notifications/emit", "ERROR", {
              message: L("Failed to join groups we're part of on another device. Not catastrophic, but could lead to problems. {errName}: '{errMsg}'", {
                errName: e.name,
                errMsg: e.message || "?"
              })
            });
          });
        }
      }
    }
  }
});
