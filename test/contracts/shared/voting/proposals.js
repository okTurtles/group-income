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

// frontend/model/contracts/misc/flowTyper.js
var EMPTY_VALUE = Symbol("@@empty");
var isEmpty = (v) => v === EMPTY_VALUE;
var isNil = (v) => v === null;
var isUndef = (v) => typeof v === "undefined";
var isBoolean = (v) => typeof v === "boolean";
var isNumber = (v) => typeof v === "number";
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

// frontend/model/contracts/shared/time.js
var MINS_MILLIS = 6e4;
var HOURS_MILLIS = 60 * MINS_MILLIS;
var DAYS_MILLIS = 24 * HOURS_MILLIS;
var MONTHS_MILLIS = 30 * DAYS_MILLIS;

// frontend/model/contracts/shared/constants.js
var PROFILE_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  REMOVED: "removed"
};
var PROPOSAL_RESULT = "proposal-result";
var PROPOSAL_INVITE_MEMBER = "invite-member";
var PROPOSAL_REMOVE_MEMBER = "remove-member";
var PROPOSAL_GROUP_SETTING_CHANGE = "group-setting-change";
var PROPOSAL_PROPOSAL_SETTING_CHANGE = "proposal-setting-change";
var PROPOSAL_GENERIC = "generic";
var STATUS_PASSED = "passed";
var STATUS_FAILED = "failed";

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
    if (proposalType2 === PROPOSAL_REMOVE_MEMBER)
      population -= 1;
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
function archiveProposal({ state, proposalHash, proposal, contractID }) {
  default2.delete(state.proposals, proposalHash);
  module_default("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/archiveProposal", contractID, proposalHash, proposal]);
}
function buildInvitationUrl(groupId, inviteSecret) {
  return `${location.origin}/app/join?groupId=${groupId}&secret=${inviteSecret}`;
}
var proposalSettingsType = objectOf({
  rule: ruleType,
  expires_ms: number,
  ruleSettings: objectOf({
    [RULE_PERCENTAGE]: objectOf({ threshold: number }),
    [RULE_DISAGREEMENT]: objectOf({ threshold: number })
  })
});
function oneVoteToPass(proposalHash) {
  const rootState = module_default("state/vuex/state");
  const state = rootState[rootState.currentGroupId];
  const proposal = state.proposals[proposalHash];
  const votes = Object.assign({}, proposal.votes);
  const currentResult = rules_default[proposal.data.votingRule](state, proposal.data.proposalType, votes);
  votes[String(Math.random())] = VOTE_FOR;
  const newResult = rules_default[proposal.data.votingRule](state, proposal.data.proposalType, votes);
  console.debug(`oneVoteToPass currentResult(${currentResult}) newResult(${newResult})`);
  return currentResult === VOTE_UNDECIDED && newResult === VOTE_FOR;
}
function voteAgainst(state, { meta, data, contractID }) {
  const { proposalHash } = data;
  const proposal = state.proposals[proposalHash];
  proposal.status = STATUS_FAILED;
  module_default("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_AGAINST, data);
  archiveProposal({ state, proposalHash, proposal, contractID });
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
    [VOTE_FOR]: function(state, { meta, data, contractID }) {
      const { proposalHash } = data;
      const proposal = state.proposals[proposalHash];
      proposal.payload = data.passPayload;
      proposal.status = STATUS_PASSED;
      const message = { meta, data: data.passPayload, contractID };
      module_default("gi.contracts/group/invite/process", message, state);
      module_default("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
      archiveProposal({ state, proposalHash, proposal, contractID });
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_REMOVE_MEMBER]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function(state, { meta, data, contractID }) {
      const { proposalHash, passPayload } = data;
      const proposal = state.proposals[proposalHash];
      proposal.status = STATUS_PASSED;
      proposal.payload = passPayload;
      const messageData = {
        ...proposal.data.proposalData,
        proposalHash,
        proposalPayload: passPayload
      };
      const message = { data: messageData, meta, contractID };
      module_default("gi.contracts/group/removeMember/process", message, state);
      module_default("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/removeMember/sideEffect", message]);
      archiveProposal({ state, proposalHash, proposal, contractID });
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GROUP_SETTING_CHANGE]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function(state, { meta, data, contractID }) {
      const { proposalHash } = data;
      const proposal = state.proposals[proposalHash];
      proposal.status = STATUS_PASSED;
      const { setting, proposedValue } = proposal.data.proposalData;
      const message = {
        meta,
        data: { [setting]: proposedValue },
        contractID
      };
      module_default("gi.contracts/group/updateSettings/process", message, state);
      archiveProposal({ state, proposalHash, proposal, contractID });
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_PROPOSAL_SETTING_CHANGE]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function(state, { meta, data, contractID }) {
      const { proposalHash } = data;
      const proposal = state.proposals[proposalHash];
      proposal.status = STATUS_PASSED;
      const message = {
        meta,
        data: proposal.data.proposalData,
        contractID
      };
      module_default("gi.contracts/group/updateAllVotingRules/process", message, state);
      archiveProposal({ state, proposalHash, proposal, contractID });
    },
    [VOTE_AGAINST]: voteAgainst
  },
  [PROPOSAL_GENERIC]: {
    defaults: proposalDefaults,
    [VOTE_FOR]: function(state, { meta, data, contractID }) {
      const { proposalHash } = data;
      const proposal = state.proposals[proposalHash];
      proposal.status = STATUS_PASSED;
      module_default("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
      archiveProposal({ state, proposalHash, proposal, contractID });
    },
    [VOTE_AGAINST]: voteAgainst
  }
};
var proposals_default = proposals;
var proposalType = unionOf(...Object.keys(proposals).map((k) => literalOf(k)));
export {
  archiveProposal,
  buildInvitationUrl,
  proposals_default as default,
  oneVoteToPass,
  proposalDefaults,
  proposalSettingsType,
  proposalType
};
//# sourceMappingURL=proposals.js.map
