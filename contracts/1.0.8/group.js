"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw new Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target2, all) => {
    for (var name in all)
      __defProp(target2, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from3, except, desc) => {
    if (from3 && typeof from3 === "object" || typeof from3 === "function") {
      for (let key of __getOwnPropNames(from3))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from3[key], enumerable: !(desc = __getOwnPropDesc(from3, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target2) => (target2 = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target2, "default", { value: mod, enumerable: true }) : target2, mod));
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // node_modules/dompurify/dist/purify.js
  var require_purify = __commonJS({
    "node_modules/dompurify/dist/purify.js"(exports, module) {
      (function(global2, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global2 = global2 || self, global2.DOMPurify = factory());
      })(exports, function() {
        "use strict";
        function _toConsumableArray(arr) {
          if (Array.isArray(arr)) {
            for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
              arr2[i] = arr[i];
            }
            return arr2;
          } else {
            return Array.from(arr);
          }
        }
        var hasOwnProperty2 = Object.hasOwnProperty, setPrototypeOf = Object.setPrototypeOf, isFrozen = Object.isFrozen, getPrototypeOf = Object.getPrototypeOf, getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
        var freeze = Object.freeze, seal = Object.seal, create3 = Object.create;
        var _ref = typeof Reflect !== "undefined" && Reflect, apply = _ref.apply, construct = _ref.construct;
        if (!apply) {
          apply = function apply2(fun, thisValue, args) {
            return fun.apply(thisValue, args);
          };
        }
        if (!freeze) {
          freeze = function freeze2(x) {
            return x;
          };
        }
        if (!seal) {
          seal = function seal2(x) {
            return x;
          };
        }
        if (!construct) {
          construct = function construct2(Func, args) {
            return new (Function.prototype.bind.apply(Func, [null].concat(_toConsumableArray(args))))();
          };
        }
        var arrayForEach = unapply(Array.prototype.forEach);
        var arrayPop = unapply(Array.prototype.pop);
        var arrayPush = unapply(Array.prototype.push);
        var stringToLowerCase = unapply(String.prototype.toLowerCase);
        var stringMatch = unapply(String.prototype.match);
        var stringReplace = unapply(String.prototype.replace);
        var stringIndexOf = unapply(String.prototype.indexOf);
        var stringTrim = unapply(String.prototype.trim);
        var regExpTest = unapply(RegExp.prototype.test);
        var typeErrorCreate = unconstruct(TypeError);
        function unapply(func) {
          return function(thisArg) {
            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            return apply(func, thisArg, args);
          };
        }
        function unconstruct(func) {
          return function() {
            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }
            return construct(func, args);
          };
        }
        function addToSet(set2, array) {
          if (setPrototypeOf) {
            setPrototypeOf(set2, null);
          }
          var l = array.length;
          while (l--) {
            var element = array[l];
            if (typeof element === "string") {
              var lcElement = stringToLowerCase(element);
              if (lcElement !== element) {
                if (!isFrozen(array)) {
                  array[l] = lcElement;
                }
                element = lcElement;
              }
            }
            set2[element] = true;
          }
          return set2;
        }
        function clone(object2) {
          var newObject = create3(null);
          var property = void 0;
          for (property in object2) {
            if (apply(hasOwnProperty2, object2, [property])) {
              newObject[property] = object2[property];
            }
          }
          return newObject;
        }
        function lookupGetter(object2, prop) {
          while (object2 !== null) {
            var desc = getOwnPropertyDescriptor(object2, prop);
            if (desc) {
              if (desc.get) {
                return unapply(desc.get);
              }
              if (typeof desc.value === "function") {
                return unapply(desc.value);
              }
            }
            object2 = getPrototypeOf(object2);
          }
          function fallbackValue(element) {
            console.warn("fallback value for", element);
            return null;
          }
          return fallbackValue;
        }
        var html2 = freeze(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "section", "select", "shadow", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]);
        var svg = freeze(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]);
        var svgFilters = freeze(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]);
        var svgDisallowed = freeze(["animate", "color-profile", "cursor", "discard", "fedropshadow", "feimage", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]);
        var mathMl = freeze(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover"]);
        var mathMlDisallowed = freeze(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]);
        var text2 = freeze(["#text"]);
        var html$1 = freeze(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "noshade", "novalidate", "nowrap", "open", "optimum", "pattern", "placeholder", "playsinline", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "xmlns"]);
        var svg$1 = freeze(["accent-height", "accumulate", "additive", "alignment-baseline", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "targetx", "targety", "transform", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]);
        var mathMl$1 = freeze(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]);
        var xml = freeze(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]);
        var MUSTACHE_EXPR = seal(/\{\{[\s\S]*|[\s\S]*\}\}/gm);
        var ERB_EXPR = seal(/<%[\s\S]*|[\s\S]*%>/gm);
        var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/);
        var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
        var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
        var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
        var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
        var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
          return typeof obj;
        } : function(obj) {
          return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
        };
        function _toConsumableArray$1(arr) {
          if (Array.isArray(arr)) {
            for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
              arr2[i] = arr[i];
            }
            return arr2;
          } else {
            return Array.from(arr);
          }
        }
        var getGlobal = function getGlobal2() {
          return typeof window === "undefined" ? null : window;
        };
        var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, document2) {
          if ((typeof trustedTypes === "undefined" ? "undefined" : _typeof(trustedTypes)) !== "object" || typeof trustedTypes.createPolicy !== "function") {
            return null;
          }
          var suffix = null;
          var ATTR_NAME = "data-tt-policy-suffix";
          if (document2.currentScript && document2.currentScript.hasAttribute(ATTR_NAME)) {
            suffix = document2.currentScript.getAttribute(ATTR_NAME);
          }
          var policyName = "dompurify" + (suffix ? "#" + suffix : "");
          try {
            return trustedTypes.createPolicy(policyName, {
              createHTML: function createHTML(html$$1) {
                return html$$1;
              }
            });
          } catch (_) {
            console.warn("TrustedTypes policy " + policyName + " could not be created.");
            return null;
          }
        };
        function createDOMPurify() {
          var window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
          var DOMPurify = function DOMPurify2(root) {
            return createDOMPurify(root);
          };
          DOMPurify.version = "2.2.7";
          DOMPurify.removed = [];
          if (!window2 || !window2.document || window2.document.nodeType !== 9) {
            DOMPurify.isSupported = false;
            return DOMPurify;
          }
          var originalDocument = window2.document;
          var document2 = window2.document;
          var DocumentFragment = window2.DocumentFragment, HTMLTemplateElement = window2.HTMLTemplateElement, Node = window2.Node, Element = window2.Element, NodeFilter = window2.NodeFilter, _window$NamedNodeMap = window2.NamedNodeMap, NamedNodeMap = _window$NamedNodeMap === void 0 ? window2.NamedNodeMap || window2.MozNamedAttrMap : _window$NamedNodeMap, Text = window2.Text, Comment = window2.Comment, DOMParser = window2.DOMParser, trustedTypes = window2.trustedTypes;
          var ElementPrototype = Element.prototype;
          var cloneNode = lookupGetter(ElementPrototype, "cloneNode");
          var getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
          var getChildNodes = lookupGetter(ElementPrototype, "childNodes");
          var getParentNode = lookupGetter(ElementPrototype, "parentNode");
          if (typeof HTMLTemplateElement === "function") {
            var template2 = document2.createElement("template");
            if (template2.content && template2.content.ownerDocument) {
              document2 = template2.content.ownerDocument;
            }
          }
          var trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, originalDocument);
          var emptyHTML = trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML("") : "";
          var _document = document2, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, getElementsByTagName = _document.getElementsByTagName, createDocumentFragment = _document.createDocumentFragment;
          var importNode = originalDocument.importNode;
          var documentMode = {};
          try {
            documentMode = clone(document2).documentMode ? document2.documentMode : {};
          } catch (_) {
          }
          var hooks2 = {};
          DOMPurify.isSupported = typeof getParentNode === "function" && implementation && typeof implementation.createHTMLDocument !== "undefined" && documentMode !== 9;
          var MUSTACHE_EXPR$$1 = MUSTACHE_EXPR, ERB_EXPR$$1 = ERB_EXPR, DATA_ATTR$$1 = DATA_ATTR, ARIA_ATTR$$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$$1 = ATTR_WHITESPACE;
          var IS_ALLOWED_URI$$1 = IS_ALLOWED_URI;
          var ALLOWED_TAGS = null;
          var DEFAULT_ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray$1(html2), _toConsumableArray$1(svg), _toConsumableArray$1(svgFilters), _toConsumableArray$1(mathMl), _toConsumableArray$1(text2)));
          var ALLOWED_ATTR = null;
          var DEFAULT_ALLOWED_ATTR = addToSet({}, [].concat(_toConsumableArray$1(html$1), _toConsumableArray$1(svg$1), _toConsumableArray$1(mathMl$1), _toConsumableArray$1(xml)));
          var FORBID_TAGS = null;
          var FORBID_ATTR = null;
          var ALLOW_ARIA_ATTR = true;
          var ALLOW_DATA_ATTR = true;
          var ALLOW_UNKNOWN_PROTOCOLS = false;
          var SAFE_FOR_TEMPLATES = false;
          var WHOLE_DOCUMENT = false;
          var SET_CONFIG = false;
          var FORCE_BODY = false;
          var RETURN_DOM = false;
          var RETURN_DOM_FRAGMENT = false;
          var RETURN_DOM_IMPORT = true;
          var RETURN_TRUSTED_TYPE = false;
          var SANITIZE_DOM = true;
          var KEEP_CONTENT = true;
          var IN_PLACE = false;
          var USE_PROFILES = {};
          var FORBID_CONTENTS = addToSet({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
          var DATA_URI_TAGS = null;
          var DEFAULT_DATA_URI_TAGS = addToSet({}, ["audio", "video", "img", "source", "image", "track"]);
          var URI_SAFE_ATTRIBUTES = null;
          var DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "summary", "title", "value", "style", "xmlns"]);
          var CONFIG = null;
          var formElement = document2.createElement("form");
          var _parseConfig = function _parseConfig2(cfg) {
            if (CONFIG && CONFIG === cfg) {
              return;
            }
            if (!cfg || (typeof cfg === "undefined" ? "undefined" : _typeof(cfg)) !== "object") {
              cfg = {};
            }
            cfg = clone(cfg);
            ALLOWED_TAGS = "ALLOWED_TAGS" in cfg ? addToSet({}, cfg.ALLOWED_TAGS) : DEFAULT_ALLOWED_TAGS;
            ALLOWED_ATTR = "ALLOWED_ATTR" in cfg ? addToSet({}, cfg.ALLOWED_ATTR) : DEFAULT_ALLOWED_ATTR;
            URI_SAFE_ATTRIBUTES = "ADD_URI_SAFE_ATTR" in cfg ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR) : DEFAULT_URI_SAFE_ATTRIBUTES;
            DATA_URI_TAGS = "ADD_DATA_URI_TAGS" in cfg ? addToSet(clone(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS) : DEFAULT_DATA_URI_TAGS;
            FORBID_TAGS = "FORBID_TAGS" in cfg ? addToSet({}, cfg.FORBID_TAGS) : {};
            FORBID_ATTR = "FORBID_ATTR" in cfg ? addToSet({}, cfg.FORBID_ATTR) : {};
            USE_PROFILES = "USE_PROFILES" in cfg ? cfg.USE_PROFILES : false;
            ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
            ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
            ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
            SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
            WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
            RETURN_DOM = cfg.RETURN_DOM || false;
            RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
            RETURN_DOM_IMPORT = cfg.RETURN_DOM_IMPORT !== false;
            RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
            FORCE_BODY = cfg.FORCE_BODY || false;
            SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
            KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
            IN_PLACE = cfg.IN_PLACE || false;
            IS_ALLOWED_URI$$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI$$1;
            if (SAFE_FOR_TEMPLATES) {
              ALLOW_DATA_ATTR = false;
            }
            if (RETURN_DOM_FRAGMENT) {
              RETURN_DOM = true;
            }
            if (USE_PROFILES) {
              ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray$1(text2)));
              ALLOWED_ATTR = [];
              if (USE_PROFILES.html === true) {
                addToSet(ALLOWED_TAGS, html2);
                addToSet(ALLOWED_ATTR, html$1);
              }
              if (USE_PROFILES.svg === true) {
                addToSet(ALLOWED_TAGS, svg);
                addToSet(ALLOWED_ATTR, svg$1);
                addToSet(ALLOWED_ATTR, xml);
              }
              if (USE_PROFILES.svgFilters === true) {
                addToSet(ALLOWED_TAGS, svgFilters);
                addToSet(ALLOWED_ATTR, svg$1);
                addToSet(ALLOWED_ATTR, xml);
              }
              if (USE_PROFILES.mathMl === true) {
                addToSet(ALLOWED_TAGS, mathMl);
                addToSet(ALLOWED_ATTR, mathMl$1);
                addToSet(ALLOWED_ATTR, xml);
              }
            }
            if (cfg.ADD_TAGS) {
              if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
                ALLOWED_TAGS = clone(ALLOWED_TAGS);
              }
              addToSet(ALLOWED_TAGS, cfg.ADD_TAGS);
            }
            if (cfg.ADD_ATTR) {
              if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
                ALLOWED_ATTR = clone(ALLOWED_ATTR);
              }
              addToSet(ALLOWED_ATTR, cfg.ADD_ATTR);
            }
            if (cfg.ADD_URI_SAFE_ATTR) {
              addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR);
            }
            if (KEEP_CONTENT) {
              ALLOWED_TAGS["#text"] = true;
            }
            if (WHOLE_DOCUMENT) {
              addToSet(ALLOWED_TAGS, ["html", "head", "body"]);
            }
            if (ALLOWED_TAGS.table) {
              addToSet(ALLOWED_TAGS, ["tbody"]);
              delete FORBID_TAGS.tbody;
            }
            if (freeze) {
              freeze(cfg);
            }
            CONFIG = cfg;
          };
          var MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ["mi", "mo", "mn", "ms", "mtext"]);
          var HTML_INTEGRATION_POINTS = addToSet({}, ["foreignobject", "desc", "title", "annotation-xml"]);
          var ALL_SVG_TAGS = addToSet({}, svg);
          addToSet(ALL_SVG_TAGS, svgFilters);
          addToSet(ALL_SVG_TAGS, svgDisallowed);
          var ALL_MATHML_TAGS = addToSet({}, mathMl);
          addToSet(ALL_MATHML_TAGS, mathMlDisallowed);
          var MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
          var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
          var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
          var _checkValidNamespace = function _checkValidNamespace2(element) {
            var parent = getParentNode(element);
            if (!parent || !parent.tagName) {
              parent = {
                namespaceURI: HTML_NAMESPACE,
                tagName: "template"
              };
            }
            var tagName2 = stringToLowerCase(element.tagName);
            var parentTagName = stringToLowerCase(parent.tagName);
            if (element.namespaceURI === SVG_NAMESPACE) {
              if (parent.namespaceURI === HTML_NAMESPACE) {
                return tagName2 === "svg";
              }
              if (parent.namespaceURI === MATHML_NAMESPACE) {
                return tagName2 === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
              }
              return Boolean(ALL_SVG_TAGS[tagName2]);
            }
            if (element.namespaceURI === MATHML_NAMESPACE) {
              if (parent.namespaceURI === HTML_NAMESPACE) {
                return tagName2 === "math";
              }
              if (parent.namespaceURI === SVG_NAMESPACE) {
                return tagName2 === "math" && HTML_INTEGRATION_POINTS[parentTagName];
              }
              return Boolean(ALL_MATHML_TAGS[tagName2]);
            }
            if (element.namespaceURI === HTML_NAMESPACE) {
              if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
                return false;
              }
              if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
                return false;
              }
              var commonSvgAndHTMLElements = addToSet({}, ["title", "style", "font", "a", "script"]);
              return !ALL_MATHML_TAGS[tagName2] && (commonSvgAndHTMLElements[tagName2] || !ALL_SVG_TAGS[tagName2]);
            }
            return false;
          };
          var _forceRemove = function _forceRemove2(node) {
            arrayPush(DOMPurify.removed, { element: node });
            try {
              node.parentNode.removeChild(node);
            } catch (_) {
              try {
                node.outerHTML = emptyHTML;
              } catch (_2) {
                node.remove();
              }
            }
          };
          var _removeAttribute = function _removeAttribute2(name, node) {
            try {
              arrayPush(DOMPurify.removed, {
                attribute: node.getAttributeNode(name),
                from: node
              });
            } catch (_) {
              arrayPush(DOMPurify.removed, {
                attribute: null,
                from: node
              });
            }
            node.removeAttribute(name);
            if (name === "is" && !ALLOWED_ATTR[name]) {
              if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
                try {
                  _forceRemove(node);
                } catch (_) {
                }
              } else {
                try {
                  node.setAttribute(name, "");
                } catch (_) {
                }
              }
            }
          };
          var _initDocument = function _initDocument2(dirty) {
            var doc = void 0;
            var leadingWhitespace = void 0;
            if (FORCE_BODY) {
              dirty = "<remove></remove>" + dirty;
            } else {
              var matches2 = stringMatch(dirty, /^[\r\n\t ]+/);
              leadingWhitespace = matches2 && matches2[0];
            }
            var dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
            try {
              doc = new DOMParser().parseFromString(dirtyPayload, "text/html");
            } catch (_) {
            }
            if (!doc || !doc.documentElement) {
              doc = implementation.createHTMLDocument("");
              var _doc = doc, body = _doc.body;
              body.parentNode.removeChild(body.parentNode.firstElementChild);
              body.outerHTML = dirtyPayload;
            }
            if (dirty && leadingWhitespace) {
              doc.body.insertBefore(document2.createTextNode(leadingWhitespace), doc.body.childNodes[0] || null);
            }
            return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
          };
          var _createIterator = function _createIterator2(root) {
            return createNodeIterator.call(root.ownerDocument || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT, function() {
              return NodeFilter.FILTER_ACCEPT;
            }, false);
          };
          var _isClobbered = function _isClobbered2(elm) {
            if (elm instanceof Text || elm instanceof Comment) {
              return false;
            }
            if (typeof elm.nodeName !== "string" || typeof elm.textContent !== "string" || typeof elm.removeChild !== "function" || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== "function" || typeof elm.setAttribute !== "function" || typeof elm.namespaceURI !== "string" || typeof elm.insertBefore !== "function") {
              return true;
            }
            return false;
          };
          var _isNode = function _isNode2(object2) {
            return (typeof Node === "undefined" ? "undefined" : _typeof(Node)) === "object" ? object2 instanceof Node : object2 && (typeof object2 === "undefined" ? "undefined" : _typeof(object2)) === "object" && typeof object2.nodeType === "number" && typeof object2.nodeName === "string";
          };
          var _executeHook = function _executeHook2(entryPoint, currentNode, data) {
            if (!hooks2[entryPoint]) {
              return;
            }
            arrayForEach(hooks2[entryPoint], function(hook) {
              hook.call(DOMPurify, currentNode, data, CONFIG);
            });
          };
          var _sanitizeElements = function _sanitizeElements2(currentNode) {
            var content = void 0;
            _executeHook("beforeSanitizeElements", currentNode, null);
            if (_isClobbered(currentNode)) {
              _forceRemove(currentNode);
              return true;
            }
            if (stringMatch(currentNode.nodeName, /[\u0080-\uFFFF]/)) {
              _forceRemove(currentNode);
              return true;
            }
            var tagName2 = stringToLowerCase(currentNode.nodeName);
            _executeHook("uponSanitizeElement", currentNode, {
              tagName: tagName2,
              allowedTags: ALLOWED_TAGS
            });
            if (!_isNode(currentNode.firstElementChild) && (!_isNode(currentNode.content) || !_isNode(currentNode.content.firstElementChild)) && regExpTest(/<[/\w]/g, currentNode.innerHTML) && regExpTest(/<[/\w]/g, currentNode.textContent)) {
              _forceRemove(currentNode);
              return true;
            }
            if (!ALLOWED_TAGS[tagName2] || FORBID_TAGS[tagName2]) {
              if (KEEP_CONTENT && !FORBID_CONTENTS[tagName2]) {
                var parentNode2 = getParentNode(currentNode);
                var childNodes = getChildNodes(currentNode);
                if (childNodes && parentNode2) {
                  var childCount = childNodes.length;
                  for (var i = childCount - 1; i >= 0; --i) {
                    parentNode2.insertBefore(cloneNode(childNodes[i], true), getNextSibling(currentNode));
                  }
                }
              }
              _forceRemove(currentNode);
              return true;
            }
            if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
              _forceRemove(currentNode);
              return true;
            }
            if ((tagName2 === "noscript" || tagName2 === "noembed") && regExpTest(/<\/no(script|embed)/i, currentNode.innerHTML)) {
              _forceRemove(currentNode);
              return true;
            }
            if (SAFE_FOR_TEMPLATES && currentNode.nodeType === 3) {
              content = currentNode.textContent;
              content = stringReplace(content, MUSTACHE_EXPR$$1, " ");
              content = stringReplace(content, ERB_EXPR$$1, " ");
              if (currentNode.textContent !== content) {
                arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
                currentNode.textContent = content;
              }
            }
            _executeHook("afterSanitizeElements", currentNode, null);
            return false;
          };
          var _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
            if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) {
              return false;
            }
            if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$$1, lcName))
              ;
            else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$$1, lcName))
              ;
            else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
              return false;
            } else if (URI_SAFE_ATTRIBUTES[lcName])
              ;
            else if (regExpTest(IS_ALLOWED_URI$$1, stringReplace(value, ATTR_WHITESPACE$$1, "")))
              ;
            else if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag])
              ;
            else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$$1, stringReplace(value, ATTR_WHITESPACE$$1, "")))
              ;
            else if (!value)
              ;
            else {
              return false;
            }
            return true;
          };
          var _sanitizeAttributes = function _sanitizeAttributes2(currentNode) {
            var attr = void 0;
            var value = void 0;
            var lcName = void 0;
            var l = void 0;
            _executeHook("beforeSanitizeAttributes", currentNode, null);
            var attributes = currentNode.attributes;
            if (!attributes) {
              return;
            }
            var hookEvent = {
              attrName: "",
              attrValue: "",
              keepAttr: true,
              allowedAttributes: ALLOWED_ATTR
            };
            l = attributes.length;
            while (l--) {
              attr = attributes[l];
              var _attr = attr, name = _attr.name, namespaceURI = _attr.namespaceURI;
              value = stringTrim(attr.value);
              lcName = stringToLowerCase(name);
              hookEvent.attrName = lcName;
              hookEvent.attrValue = value;
              hookEvent.keepAttr = true;
              hookEvent.forceKeepAttr = void 0;
              _executeHook("uponSanitizeAttribute", currentNode, hookEvent);
              value = hookEvent.attrValue;
              if (hookEvent.forceKeepAttr) {
                continue;
              }
              _removeAttribute(name, currentNode);
              if (!hookEvent.keepAttr) {
                continue;
              }
              if (regExpTest(/\/>/i, value)) {
                _removeAttribute(name, currentNode);
                continue;
              }
              if (SAFE_FOR_TEMPLATES) {
                value = stringReplace(value, MUSTACHE_EXPR$$1, " ");
                value = stringReplace(value, ERB_EXPR$$1, " ");
              }
              var lcTag = currentNode.nodeName.toLowerCase();
              if (!_isValidAttribute(lcTag, lcName, value)) {
                continue;
              }
              try {
                if (namespaceURI) {
                  currentNode.setAttributeNS(namespaceURI, name, value);
                } else {
                  currentNode.setAttribute(name, value);
                }
                arrayPop(DOMPurify.removed);
              } catch (_) {
              }
            }
            _executeHook("afterSanitizeAttributes", currentNode, null);
          };
          var _sanitizeShadowDOM = function _sanitizeShadowDOM2(fragment) {
            var shadowNode = void 0;
            var shadowIterator = _createIterator(fragment);
            _executeHook("beforeSanitizeShadowDOM", fragment, null);
            while (shadowNode = shadowIterator.nextNode()) {
              _executeHook("uponSanitizeShadowNode", shadowNode, null);
              if (_sanitizeElements(shadowNode)) {
                continue;
              }
              if (shadowNode.content instanceof DocumentFragment) {
                _sanitizeShadowDOM2(shadowNode.content);
              }
              _sanitizeAttributes(shadowNode);
            }
            _executeHook("afterSanitizeShadowDOM", fragment, null);
          };
          DOMPurify.sanitize = function(dirty, cfg) {
            var body = void 0;
            var importedNode = void 0;
            var currentNode = void 0;
            var oldNode = void 0;
            var returnNode = void 0;
            if (!dirty) {
              dirty = "<!-->";
            }
            if (typeof dirty !== "string" && !_isNode(dirty)) {
              if (typeof dirty.toString !== "function") {
                throw typeErrorCreate("toString is not a function");
              } else {
                dirty = dirty.toString();
                if (typeof dirty !== "string") {
                  throw typeErrorCreate("dirty is not a string, aborting");
                }
              }
            }
            if (!DOMPurify.isSupported) {
              if (_typeof(window2.toStaticHTML) === "object" || typeof window2.toStaticHTML === "function") {
                if (typeof dirty === "string") {
                  return window2.toStaticHTML(dirty);
                }
                if (_isNode(dirty)) {
                  return window2.toStaticHTML(dirty.outerHTML);
                }
              }
              return dirty;
            }
            if (!SET_CONFIG) {
              _parseConfig(cfg);
            }
            DOMPurify.removed = [];
            if (typeof dirty === "string") {
              IN_PLACE = false;
            }
            if (IN_PLACE)
              ;
            else if (dirty instanceof Node) {
              body = _initDocument("<!---->");
              importedNode = body.ownerDocument.importNode(dirty, true);
              if (importedNode.nodeType === 1 && importedNode.nodeName === "BODY") {
                body = importedNode;
              } else if (importedNode.nodeName === "HTML") {
                body = importedNode;
              } else {
                body.appendChild(importedNode);
              }
            } else {
              if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) {
                return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
              }
              body = _initDocument(dirty);
              if (!body) {
                return RETURN_DOM ? null : emptyHTML;
              }
            }
            if (body && FORCE_BODY) {
              _forceRemove(body.firstChild);
            }
            var nodeIterator = _createIterator(IN_PLACE ? dirty : body);
            while (currentNode = nodeIterator.nextNode()) {
              if (currentNode.nodeType === 3 && currentNode === oldNode) {
                continue;
              }
              if (_sanitizeElements(currentNode)) {
                continue;
              }
              if (currentNode.content instanceof DocumentFragment) {
                _sanitizeShadowDOM(currentNode.content);
              }
              _sanitizeAttributes(currentNode);
              oldNode = currentNode;
            }
            oldNode = null;
            if (IN_PLACE) {
              return dirty;
            }
            if (RETURN_DOM) {
              if (RETURN_DOM_FRAGMENT) {
                returnNode = createDocumentFragment.call(body.ownerDocument);
                while (body.firstChild) {
                  returnNode.appendChild(body.firstChild);
                }
              } else {
                returnNode = body;
              }
              if (RETURN_DOM_IMPORT) {
                returnNode = importNode.call(originalDocument, returnNode, true);
              }
              return returnNode;
            }
            var serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
            if (SAFE_FOR_TEMPLATES) {
              serializedHTML = stringReplace(serializedHTML, MUSTACHE_EXPR$$1, " ");
              serializedHTML = stringReplace(serializedHTML, ERB_EXPR$$1, " ");
            }
            return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
          };
          DOMPurify.setConfig = function(cfg) {
            _parseConfig(cfg);
            SET_CONFIG = true;
          };
          DOMPurify.clearConfig = function() {
            CONFIG = null;
            SET_CONFIG = false;
          };
          DOMPurify.isValidAttribute = function(tag, attr, value) {
            if (!CONFIG) {
              _parseConfig({});
            }
            var lcTag = stringToLowerCase(tag);
            var lcName = stringToLowerCase(attr);
            return _isValidAttribute(lcTag, lcName, value);
          };
          DOMPurify.addHook = function(entryPoint, hookFunction) {
            if (typeof hookFunction !== "function") {
              return;
            }
            hooks2[entryPoint] = hooks2[entryPoint] || [];
            arrayPush(hooks2[entryPoint], hookFunction);
          };
          DOMPurify.removeHook = function(entryPoint) {
            if (hooks2[entryPoint]) {
              arrayPop(hooks2[entryPoint]);
            }
          };
          DOMPurify.removeHooks = function(entryPoint) {
            if (hooks2[entryPoint]) {
              hooks2[entryPoint] = [];
            }
          };
          DOMPurify.removeAllHooks = function() {
            hooks2 = {};
          };
          return DOMPurify;
        }
        var purify = createDOMPurify();
        return purify;
      });
    }
  });

  // (disabled):crypto
  var require_crypto = __commonJS({
    "(disabled):crypto"() {
    }
  });

  // node_modules/tweetnacl/nacl-fast.js
  var require_nacl_fast = __commonJS({
    "node_modules/tweetnacl/nacl-fast.js"(exports, module) {
      (function(nacl3) {
        "use strict";
        var gf = function(init3) {
          var i, r = new Float64Array(16);
          if (init3)
            for (i = 0; i < init3.length; i++)
              r[i] = init3[i];
          return r;
        };
        var randombytes = function() {
          throw new Error("no PRNG");
        };
        var _0 = new Uint8Array(16);
        var _9 = new Uint8Array(32);
        _9[0] = 9;
        var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
        function ts64(x, i, h, l) {
          x[i] = h >> 24 & 255;
          x[i + 1] = h >> 16 & 255;
          x[i + 2] = h >> 8 & 255;
          x[i + 3] = h & 255;
          x[i + 4] = l >> 24 & 255;
          x[i + 5] = l >> 16 & 255;
          x[i + 6] = l >> 8 & 255;
          x[i + 7] = l & 255;
        }
        function vn(x, xi, y, yi, n) {
          var i, d = 0;
          for (i = 0; i < n; i++)
            d |= x[xi + i] ^ y[yi + i];
          return (1 & d - 1 >>> 8) - 1;
        }
        function crypto_verify_16(x, xi, y, yi) {
          return vn(x, xi, y, yi, 16);
        }
        function crypto_verify_32(x, xi, y, yi) {
          return vn(x, xi, y, yi, 32);
        }
        function core_salsa20(o, p, k, c) {
          var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
          var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
          for (var i = 0; i < 20; i += 2) {
            u = x0 + x12 | 0;
            x4 ^= u << 7 | u >>> 32 - 7;
            u = x4 + x0 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x4 | 0;
            x12 ^= u << 13 | u >>> 32 - 13;
            u = x12 + x8 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x1 | 0;
            x9 ^= u << 7 | u >>> 32 - 7;
            u = x9 + x5 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x9 | 0;
            x1 ^= u << 13 | u >>> 32 - 13;
            u = x1 + x13 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x6 | 0;
            x14 ^= u << 7 | u >>> 32 - 7;
            u = x14 + x10 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x14 | 0;
            x6 ^= u << 13 | u >>> 32 - 13;
            u = x6 + x2 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x11 | 0;
            x3 ^= u << 7 | u >>> 32 - 7;
            u = x3 + x15 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x3 | 0;
            x11 ^= u << 13 | u >>> 32 - 13;
            u = x11 + x7 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
            u = x0 + x3 | 0;
            x1 ^= u << 7 | u >>> 32 - 7;
            u = x1 + x0 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x1 | 0;
            x3 ^= u << 13 | u >>> 32 - 13;
            u = x3 + x2 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x4 | 0;
            x6 ^= u << 7 | u >>> 32 - 7;
            u = x6 + x5 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x6 | 0;
            x4 ^= u << 13 | u >>> 32 - 13;
            u = x4 + x7 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x9 | 0;
            x11 ^= u << 7 | u >>> 32 - 7;
            u = x11 + x10 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x11 | 0;
            x9 ^= u << 13 | u >>> 32 - 13;
            u = x9 + x8 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x14 | 0;
            x12 ^= u << 7 | u >>> 32 - 7;
            u = x12 + x15 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x12 | 0;
            x14 ^= u << 13 | u >>> 32 - 13;
            u = x14 + x13 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
          }
          x0 = x0 + j0 | 0;
          x1 = x1 + j1 | 0;
          x2 = x2 + j2 | 0;
          x3 = x3 + j3 | 0;
          x4 = x4 + j4 | 0;
          x5 = x5 + j5 | 0;
          x6 = x6 + j6 | 0;
          x7 = x7 + j7 | 0;
          x8 = x8 + j8 | 0;
          x9 = x9 + j9 | 0;
          x10 = x10 + j10 | 0;
          x11 = x11 + j11 | 0;
          x12 = x12 + j12 | 0;
          x13 = x13 + j13 | 0;
          x14 = x14 + j14 | 0;
          x15 = x15 + j15 | 0;
          o[0] = x0 >>> 0 & 255;
          o[1] = x0 >>> 8 & 255;
          o[2] = x0 >>> 16 & 255;
          o[3] = x0 >>> 24 & 255;
          o[4] = x1 >>> 0 & 255;
          o[5] = x1 >>> 8 & 255;
          o[6] = x1 >>> 16 & 255;
          o[7] = x1 >>> 24 & 255;
          o[8] = x2 >>> 0 & 255;
          o[9] = x2 >>> 8 & 255;
          o[10] = x2 >>> 16 & 255;
          o[11] = x2 >>> 24 & 255;
          o[12] = x3 >>> 0 & 255;
          o[13] = x3 >>> 8 & 255;
          o[14] = x3 >>> 16 & 255;
          o[15] = x3 >>> 24 & 255;
          o[16] = x4 >>> 0 & 255;
          o[17] = x4 >>> 8 & 255;
          o[18] = x4 >>> 16 & 255;
          o[19] = x4 >>> 24 & 255;
          o[20] = x5 >>> 0 & 255;
          o[21] = x5 >>> 8 & 255;
          o[22] = x5 >>> 16 & 255;
          o[23] = x5 >>> 24 & 255;
          o[24] = x6 >>> 0 & 255;
          o[25] = x6 >>> 8 & 255;
          o[26] = x6 >>> 16 & 255;
          o[27] = x6 >>> 24 & 255;
          o[28] = x7 >>> 0 & 255;
          o[29] = x7 >>> 8 & 255;
          o[30] = x7 >>> 16 & 255;
          o[31] = x7 >>> 24 & 255;
          o[32] = x8 >>> 0 & 255;
          o[33] = x8 >>> 8 & 255;
          o[34] = x8 >>> 16 & 255;
          o[35] = x8 >>> 24 & 255;
          o[36] = x9 >>> 0 & 255;
          o[37] = x9 >>> 8 & 255;
          o[38] = x9 >>> 16 & 255;
          o[39] = x9 >>> 24 & 255;
          o[40] = x10 >>> 0 & 255;
          o[41] = x10 >>> 8 & 255;
          o[42] = x10 >>> 16 & 255;
          o[43] = x10 >>> 24 & 255;
          o[44] = x11 >>> 0 & 255;
          o[45] = x11 >>> 8 & 255;
          o[46] = x11 >>> 16 & 255;
          o[47] = x11 >>> 24 & 255;
          o[48] = x12 >>> 0 & 255;
          o[49] = x12 >>> 8 & 255;
          o[50] = x12 >>> 16 & 255;
          o[51] = x12 >>> 24 & 255;
          o[52] = x13 >>> 0 & 255;
          o[53] = x13 >>> 8 & 255;
          o[54] = x13 >>> 16 & 255;
          o[55] = x13 >>> 24 & 255;
          o[56] = x14 >>> 0 & 255;
          o[57] = x14 >>> 8 & 255;
          o[58] = x14 >>> 16 & 255;
          o[59] = x14 >>> 24 & 255;
          o[60] = x15 >>> 0 & 255;
          o[61] = x15 >>> 8 & 255;
          o[62] = x15 >>> 16 & 255;
          o[63] = x15 >>> 24 & 255;
        }
        function core_hsalsa20(o, p, k, c) {
          var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
          var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
          for (var i = 0; i < 20; i += 2) {
            u = x0 + x12 | 0;
            x4 ^= u << 7 | u >>> 32 - 7;
            u = x4 + x0 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x4 | 0;
            x12 ^= u << 13 | u >>> 32 - 13;
            u = x12 + x8 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x1 | 0;
            x9 ^= u << 7 | u >>> 32 - 7;
            u = x9 + x5 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x9 | 0;
            x1 ^= u << 13 | u >>> 32 - 13;
            u = x1 + x13 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x6 | 0;
            x14 ^= u << 7 | u >>> 32 - 7;
            u = x14 + x10 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x14 | 0;
            x6 ^= u << 13 | u >>> 32 - 13;
            u = x6 + x2 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x11 | 0;
            x3 ^= u << 7 | u >>> 32 - 7;
            u = x3 + x15 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x3 | 0;
            x11 ^= u << 13 | u >>> 32 - 13;
            u = x11 + x7 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
            u = x0 + x3 | 0;
            x1 ^= u << 7 | u >>> 32 - 7;
            u = x1 + x0 | 0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x1 | 0;
            x3 ^= u << 13 | u >>> 32 - 13;
            u = x3 + x2 | 0;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x4 | 0;
            x6 ^= u << 7 | u >>> 32 - 7;
            u = x6 + x5 | 0;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x6 | 0;
            x4 ^= u << 13 | u >>> 32 - 13;
            u = x4 + x7 | 0;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x9 | 0;
            x11 ^= u << 7 | u >>> 32 - 7;
            u = x11 + x10 | 0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x11 | 0;
            x9 ^= u << 13 | u >>> 32 - 13;
            u = x9 + x8 | 0;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x14 | 0;
            x12 ^= u << 7 | u >>> 32 - 7;
            u = x12 + x15 | 0;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x12 | 0;
            x14 ^= u << 13 | u >>> 32 - 13;
            u = x14 + x13 | 0;
            x15 ^= u << 18 | u >>> 32 - 18;
          }
          o[0] = x0 >>> 0 & 255;
          o[1] = x0 >>> 8 & 255;
          o[2] = x0 >>> 16 & 255;
          o[3] = x0 >>> 24 & 255;
          o[4] = x5 >>> 0 & 255;
          o[5] = x5 >>> 8 & 255;
          o[6] = x5 >>> 16 & 255;
          o[7] = x5 >>> 24 & 255;
          o[8] = x10 >>> 0 & 255;
          o[9] = x10 >>> 8 & 255;
          o[10] = x10 >>> 16 & 255;
          o[11] = x10 >>> 24 & 255;
          o[12] = x15 >>> 0 & 255;
          o[13] = x15 >>> 8 & 255;
          o[14] = x15 >>> 16 & 255;
          o[15] = x15 >>> 24 & 255;
          o[16] = x6 >>> 0 & 255;
          o[17] = x6 >>> 8 & 255;
          o[18] = x6 >>> 16 & 255;
          o[19] = x6 >>> 24 & 255;
          o[20] = x7 >>> 0 & 255;
          o[21] = x7 >>> 8 & 255;
          o[22] = x7 >>> 16 & 255;
          o[23] = x7 >>> 24 & 255;
          o[24] = x8 >>> 0 & 255;
          o[25] = x8 >>> 8 & 255;
          o[26] = x8 >>> 16 & 255;
          o[27] = x8 >>> 24 & 255;
          o[28] = x9 >>> 0 & 255;
          o[29] = x9 >>> 8 & 255;
          o[30] = x9 >>> 16 & 255;
          o[31] = x9 >>> 24 & 255;
        }
        function crypto_core_salsa20(out, inp, k, c) {
          core_salsa20(out, inp, k, c);
        }
        function crypto_core_hsalsa20(out, inp, k, c) {
          core_hsalsa20(out, inp, k, c);
        }
        var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
        function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
          var z = new Uint8Array(16), x = new Uint8Array(64);
          var u, i;
          for (i = 0; i < 16; i++)
            z[i] = 0;
          for (i = 0; i < 8; i++)
            z[i] = n[i];
          while (b >= 64) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < 64; i++)
              c[cpos + i] = m[mpos + i] ^ x[i];
            u = 1;
            for (i = 8; i < 16; i++) {
              u = u + (z[i] & 255) | 0;
              z[i] = u & 255;
              u >>>= 8;
            }
            b -= 64;
            cpos += 64;
            mpos += 64;
          }
          if (b > 0) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < b; i++)
              c[cpos + i] = m[mpos + i] ^ x[i];
          }
          return 0;
        }
        function crypto_stream_salsa20(c, cpos, b, n, k) {
          var z = new Uint8Array(16), x = new Uint8Array(64);
          var u, i;
          for (i = 0; i < 16; i++)
            z[i] = 0;
          for (i = 0; i < 8; i++)
            z[i] = n[i];
          while (b >= 64) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < 64; i++)
              c[cpos + i] = x[i];
            u = 1;
            for (i = 8; i < 16; i++) {
              u = u + (z[i] & 255) | 0;
              z[i] = u & 255;
              u >>>= 8;
            }
            b -= 64;
            cpos += 64;
          }
          if (b > 0) {
            crypto_core_salsa20(x, z, k, sigma);
            for (i = 0; i < b; i++)
              c[cpos + i] = x[i];
          }
          return 0;
        }
        function crypto_stream(c, cpos, d, n, k) {
          var s = new Uint8Array(32);
          crypto_core_hsalsa20(s, n, k, sigma);
          var sn = new Uint8Array(8);
          for (var i = 0; i < 8; i++)
            sn[i] = n[i + 16];
          return crypto_stream_salsa20(c, cpos, d, sn, s);
        }
        function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
          var s = new Uint8Array(32);
          crypto_core_hsalsa20(s, n, k, sigma);
          var sn = new Uint8Array(8);
          for (var i = 0; i < 8; i++)
            sn[i] = n[i + 16];
          return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
        }
        var poly1305 = function(key) {
          this.buffer = new Uint8Array(16);
          this.r = new Uint16Array(10);
          this.h = new Uint16Array(10);
          this.pad = new Uint16Array(8);
          this.leftover = 0;
          this.fin = 0;
          var t0, t1, t2, t3, t4, t5, t6, t7;
          t0 = key[0] & 255 | (key[1] & 255) << 8;
          this.r[0] = t0 & 8191;
          t1 = key[2] & 255 | (key[3] & 255) << 8;
          this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
          t2 = key[4] & 255 | (key[5] & 255) << 8;
          this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
          t3 = key[6] & 255 | (key[7] & 255) << 8;
          this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
          t4 = key[8] & 255 | (key[9] & 255) << 8;
          this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
          this.r[5] = t4 >>> 1 & 8190;
          t5 = key[10] & 255 | (key[11] & 255) << 8;
          this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
          t6 = key[12] & 255 | (key[13] & 255) << 8;
          this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
          t7 = key[14] & 255 | (key[15] & 255) << 8;
          this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
          this.r[9] = t7 >>> 5 & 127;
          this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
          this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
          this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
          this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
          this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
          this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
          this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
          this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
        };
        poly1305.prototype.blocks = function(m, mpos, bytes) {
          var hibit = this.fin ? 0 : 1 << 11;
          var t0, t1, t2, t3, t4, t5, t6, t7, c;
          var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
          var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
          var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
          while (bytes >= 16) {
            t0 = m[mpos + 0] & 255 | (m[mpos + 1] & 255) << 8;
            h0 += t0 & 8191;
            t1 = m[mpos + 2] & 255 | (m[mpos + 3] & 255) << 8;
            h1 += (t0 >>> 13 | t1 << 3) & 8191;
            t2 = m[mpos + 4] & 255 | (m[mpos + 5] & 255) << 8;
            h2 += (t1 >>> 10 | t2 << 6) & 8191;
            t3 = m[mpos + 6] & 255 | (m[mpos + 7] & 255) << 8;
            h3 += (t2 >>> 7 | t3 << 9) & 8191;
            t4 = m[mpos + 8] & 255 | (m[mpos + 9] & 255) << 8;
            h4 += (t3 >>> 4 | t4 << 12) & 8191;
            h5 += t4 >>> 1 & 8191;
            t5 = m[mpos + 10] & 255 | (m[mpos + 11] & 255) << 8;
            h6 += (t4 >>> 14 | t5 << 2) & 8191;
            t6 = m[mpos + 12] & 255 | (m[mpos + 13] & 255) << 8;
            h7 += (t5 >>> 11 | t6 << 5) & 8191;
            t7 = m[mpos + 14] & 255 | (m[mpos + 15] & 255) << 8;
            h8 += (t6 >>> 8 | t7 << 8) & 8191;
            h9 += t7 >>> 5 | hibit;
            c = 0;
            d0 = c;
            d0 += h0 * r0;
            d0 += h1 * (5 * r9);
            d0 += h2 * (5 * r8);
            d0 += h3 * (5 * r7);
            d0 += h4 * (5 * r6);
            c = d0 >>> 13;
            d0 &= 8191;
            d0 += h5 * (5 * r5);
            d0 += h6 * (5 * r4);
            d0 += h7 * (5 * r3);
            d0 += h8 * (5 * r2);
            d0 += h9 * (5 * r1);
            c += d0 >>> 13;
            d0 &= 8191;
            d1 = c;
            d1 += h0 * r1;
            d1 += h1 * r0;
            d1 += h2 * (5 * r9);
            d1 += h3 * (5 * r8);
            d1 += h4 * (5 * r7);
            c = d1 >>> 13;
            d1 &= 8191;
            d1 += h5 * (5 * r6);
            d1 += h6 * (5 * r5);
            d1 += h7 * (5 * r4);
            d1 += h8 * (5 * r3);
            d1 += h9 * (5 * r2);
            c += d1 >>> 13;
            d1 &= 8191;
            d2 = c;
            d2 += h0 * r2;
            d2 += h1 * r1;
            d2 += h2 * r0;
            d2 += h3 * (5 * r9);
            d2 += h4 * (5 * r8);
            c = d2 >>> 13;
            d2 &= 8191;
            d2 += h5 * (5 * r7);
            d2 += h6 * (5 * r6);
            d2 += h7 * (5 * r5);
            d2 += h8 * (5 * r4);
            d2 += h9 * (5 * r3);
            c += d2 >>> 13;
            d2 &= 8191;
            d3 = c;
            d3 += h0 * r3;
            d3 += h1 * r2;
            d3 += h2 * r1;
            d3 += h3 * r0;
            d3 += h4 * (5 * r9);
            c = d3 >>> 13;
            d3 &= 8191;
            d3 += h5 * (5 * r8);
            d3 += h6 * (5 * r7);
            d3 += h7 * (5 * r6);
            d3 += h8 * (5 * r5);
            d3 += h9 * (5 * r4);
            c += d3 >>> 13;
            d3 &= 8191;
            d4 = c;
            d4 += h0 * r4;
            d4 += h1 * r3;
            d4 += h2 * r2;
            d4 += h3 * r1;
            d4 += h4 * r0;
            c = d4 >>> 13;
            d4 &= 8191;
            d4 += h5 * (5 * r9);
            d4 += h6 * (5 * r8);
            d4 += h7 * (5 * r7);
            d4 += h8 * (5 * r6);
            d4 += h9 * (5 * r5);
            c += d4 >>> 13;
            d4 &= 8191;
            d5 = c;
            d5 += h0 * r5;
            d5 += h1 * r4;
            d5 += h2 * r3;
            d5 += h3 * r2;
            d5 += h4 * r1;
            c = d5 >>> 13;
            d5 &= 8191;
            d5 += h5 * r0;
            d5 += h6 * (5 * r9);
            d5 += h7 * (5 * r8);
            d5 += h8 * (5 * r7);
            d5 += h9 * (5 * r6);
            c += d5 >>> 13;
            d5 &= 8191;
            d6 = c;
            d6 += h0 * r6;
            d6 += h1 * r5;
            d6 += h2 * r4;
            d6 += h3 * r3;
            d6 += h4 * r2;
            c = d6 >>> 13;
            d6 &= 8191;
            d6 += h5 * r1;
            d6 += h6 * r0;
            d6 += h7 * (5 * r9);
            d6 += h8 * (5 * r8);
            d6 += h9 * (5 * r7);
            c += d6 >>> 13;
            d6 &= 8191;
            d7 = c;
            d7 += h0 * r7;
            d7 += h1 * r6;
            d7 += h2 * r5;
            d7 += h3 * r4;
            d7 += h4 * r3;
            c = d7 >>> 13;
            d7 &= 8191;
            d7 += h5 * r2;
            d7 += h6 * r1;
            d7 += h7 * r0;
            d7 += h8 * (5 * r9);
            d7 += h9 * (5 * r8);
            c += d7 >>> 13;
            d7 &= 8191;
            d8 = c;
            d8 += h0 * r8;
            d8 += h1 * r7;
            d8 += h2 * r6;
            d8 += h3 * r5;
            d8 += h4 * r4;
            c = d8 >>> 13;
            d8 &= 8191;
            d8 += h5 * r3;
            d8 += h6 * r2;
            d8 += h7 * r1;
            d8 += h8 * r0;
            d8 += h9 * (5 * r9);
            c += d8 >>> 13;
            d8 &= 8191;
            d9 = c;
            d9 += h0 * r9;
            d9 += h1 * r8;
            d9 += h2 * r7;
            d9 += h3 * r6;
            d9 += h4 * r5;
            c = d9 >>> 13;
            d9 &= 8191;
            d9 += h5 * r4;
            d9 += h6 * r3;
            d9 += h7 * r2;
            d9 += h8 * r1;
            d9 += h9 * r0;
            c += d9 >>> 13;
            d9 &= 8191;
            c = (c << 2) + c | 0;
            c = c + d0 | 0;
            d0 = c & 8191;
            c = c >>> 13;
            d1 += c;
            h0 = d0;
            h1 = d1;
            h2 = d2;
            h3 = d3;
            h4 = d4;
            h5 = d5;
            h6 = d6;
            h7 = d7;
            h8 = d8;
            h9 = d9;
            mpos += 16;
            bytes -= 16;
          }
          this.h[0] = h0;
          this.h[1] = h1;
          this.h[2] = h2;
          this.h[3] = h3;
          this.h[4] = h4;
          this.h[5] = h5;
          this.h[6] = h6;
          this.h[7] = h7;
          this.h[8] = h8;
          this.h[9] = h9;
        };
        poly1305.prototype.finish = function(mac, macpos) {
          var g = new Uint16Array(10);
          var c, mask, f, i;
          if (this.leftover) {
            i = this.leftover;
            this.buffer[i++] = 1;
            for (; i < 16; i++)
              this.buffer[i] = 0;
            this.fin = 1;
            this.blocks(this.buffer, 0, 16);
          }
          c = this.h[1] >>> 13;
          this.h[1] &= 8191;
          for (i = 2; i < 10; i++) {
            this.h[i] += c;
            c = this.h[i] >>> 13;
            this.h[i] &= 8191;
          }
          this.h[0] += c * 5;
          c = this.h[0] >>> 13;
          this.h[0] &= 8191;
          this.h[1] += c;
          c = this.h[1] >>> 13;
          this.h[1] &= 8191;
          this.h[2] += c;
          g[0] = this.h[0] + 5;
          c = g[0] >>> 13;
          g[0] &= 8191;
          for (i = 1; i < 10; i++) {
            g[i] = this.h[i] + c;
            c = g[i] >>> 13;
            g[i] &= 8191;
          }
          g[9] -= 1 << 13;
          mask = (c ^ 1) - 1;
          for (i = 0; i < 10; i++)
            g[i] &= mask;
          mask = ~mask;
          for (i = 0; i < 10; i++)
            this.h[i] = this.h[i] & mask | g[i];
          this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
          this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
          this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
          this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
          this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
          this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
          this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
          this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
          f = this.h[0] + this.pad[0];
          this.h[0] = f & 65535;
          for (i = 1; i < 8; i++) {
            f = (this.h[i] + this.pad[i] | 0) + (f >>> 16) | 0;
            this.h[i] = f & 65535;
          }
          mac[macpos + 0] = this.h[0] >>> 0 & 255;
          mac[macpos + 1] = this.h[0] >>> 8 & 255;
          mac[macpos + 2] = this.h[1] >>> 0 & 255;
          mac[macpos + 3] = this.h[1] >>> 8 & 255;
          mac[macpos + 4] = this.h[2] >>> 0 & 255;
          mac[macpos + 5] = this.h[2] >>> 8 & 255;
          mac[macpos + 6] = this.h[3] >>> 0 & 255;
          mac[macpos + 7] = this.h[3] >>> 8 & 255;
          mac[macpos + 8] = this.h[4] >>> 0 & 255;
          mac[macpos + 9] = this.h[4] >>> 8 & 255;
          mac[macpos + 10] = this.h[5] >>> 0 & 255;
          mac[macpos + 11] = this.h[5] >>> 8 & 255;
          mac[macpos + 12] = this.h[6] >>> 0 & 255;
          mac[macpos + 13] = this.h[6] >>> 8 & 255;
          mac[macpos + 14] = this.h[7] >>> 0 & 255;
          mac[macpos + 15] = this.h[7] >>> 8 & 255;
        };
        poly1305.prototype.update = function(m, mpos, bytes) {
          var i, want;
          if (this.leftover) {
            want = 16 - this.leftover;
            if (want > bytes)
              want = bytes;
            for (i = 0; i < want; i++)
              this.buffer[this.leftover + i] = m[mpos + i];
            bytes -= want;
            mpos += want;
            this.leftover += want;
            if (this.leftover < 16)
              return;
            this.blocks(this.buffer, 0, 16);
            this.leftover = 0;
          }
          if (bytes >= 16) {
            want = bytes - bytes % 16;
            this.blocks(m, mpos, want);
            mpos += want;
            bytes -= want;
          }
          if (bytes) {
            for (i = 0; i < bytes; i++)
              this.buffer[this.leftover + i] = m[mpos + i];
            this.leftover += bytes;
          }
        };
        function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
          var s = new poly1305(k);
          s.update(m, mpos, n);
          s.finish(out, outpos);
          return 0;
        }
        function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
          var x = new Uint8Array(16);
          crypto_onetimeauth(x, 0, m, mpos, n, k);
          return crypto_verify_16(h, hpos, x, 0);
        }
        function crypto_secretbox(c, m, d, n, k) {
          var i;
          if (d < 32)
            return -1;
          crypto_stream_xor(c, 0, m, 0, d, n, k);
          crypto_onetimeauth(c, 16, c, 32, d - 32, c);
          for (i = 0; i < 16; i++)
            c[i] = 0;
          return 0;
        }
        function crypto_secretbox_open(m, c, d, n, k) {
          var i;
          var x = new Uint8Array(32);
          if (d < 32)
            return -1;
          crypto_stream(x, 0, 32, n, k);
          if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0)
            return -1;
          crypto_stream_xor(m, 0, c, 0, d, n, k);
          for (i = 0; i < 32; i++)
            m[i] = 0;
          return 0;
        }
        function set25519(r, a) {
          var i;
          for (i = 0; i < 16; i++)
            r[i] = a[i] | 0;
        }
        function car25519(o) {
          var i, v, c = 1;
          for (i = 0; i < 16; i++) {
            v = o[i] + c + 65535;
            c = Math.floor(v / 65536);
            o[i] = v - c * 65536;
          }
          o[0] += c - 1 + 37 * (c - 1);
        }
        function sel25519(p, q, b) {
          var t, c = ~(b - 1);
          for (var i = 0; i < 16; i++) {
            t = c & (p[i] ^ q[i]);
            p[i] ^= t;
            q[i] ^= t;
          }
        }
        function pack25519(o, n) {
          var i, j, b;
          var m = gf(), t = gf();
          for (i = 0; i < 16; i++)
            t[i] = n[i];
          car25519(t);
          car25519(t);
          car25519(t);
          for (j = 0; j < 2; j++) {
            m[0] = t[0] - 65517;
            for (i = 1; i < 15; i++) {
              m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
              m[i - 1] &= 65535;
            }
            m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
            b = m[15] >> 16 & 1;
            m[14] &= 65535;
            sel25519(t, m, 1 - b);
          }
          for (i = 0; i < 16; i++) {
            o[2 * i] = t[i] & 255;
            o[2 * i + 1] = t[i] >> 8;
          }
        }
        function neq25519(a, b) {
          var c = new Uint8Array(32), d = new Uint8Array(32);
          pack25519(c, a);
          pack25519(d, b);
          return crypto_verify_32(c, 0, d, 0);
        }
        function par25519(a) {
          var d = new Uint8Array(32);
          pack25519(d, a);
          return d[0] & 1;
        }
        function unpack25519(o, n) {
          var i;
          for (i = 0; i < 16; i++)
            o[i] = n[2 * i] + (n[2 * i + 1] << 8);
          o[15] &= 32767;
        }
        function A(o, a, b) {
          for (var i = 0; i < 16; i++)
            o[i] = a[i] + b[i];
        }
        function Z(o, a, b) {
          for (var i = 0; i < 16; i++)
            o[i] = a[i] - b[i];
        }
        function M(o, a, b) {
          var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
          v = a[0];
          t0 += v * b0;
          t1 += v * b1;
          t2 += v * b2;
          t3 += v * b3;
          t4 += v * b4;
          t5 += v * b5;
          t6 += v * b6;
          t7 += v * b7;
          t8 += v * b8;
          t9 += v * b9;
          t10 += v * b10;
          t11 += v * b11;
          t12 += v * b12;
          t13 += v * b13;
          t14 += v * b14;
          t15 += v * b15;
          v = a[1];
          t1 += v * b0;
          t2 += v * b1;
          t3 += v * b2;
          t4 += v * b3;
          t5 += v * b4;
          t6 += v * b5;
          t7 += v * b6;
          t8 += v * b7;
          t9 += v * b8;
          t10 += v * b9;
          t11 += v * b10;
          t12 += v * b11;
          t13 += v * b12;
          t14 += v * b13;
          t15 += v * b14;
          t16 += v * b15;
          v = a[2];
          t2 += v * b0;
          t3 += v * b1;
          t4 += v * b2;
          t5 += v * b3;
          t6 += v * b4;
          t7 += v * b5;
          t8 += v * b6;
          t9 += v * b7;
          t10 += v * b8;
          t11 += v * b9;
          t12 += v * b10;
          t13 += v * b11;
          t14 += v * b12;
          t15 += v * b13;
          t16 += v * b14;
          t17 += v * b15;
          v = a[3];
          t3 += v * b0;
          t4 += v * b1;
          t5 += v * b2;
          t6 += v * b3;
          t7 += v * b4;
          t8 += v * b5;
          t9 += v * b6;
          t10 += v * b7;
          t11 += v * b8;
          t12 += v * b9;
          t13 += v * b10;
          t14 += v * b11;
          t15 += v * b12;
          t16 += v * b13;
          t17 += v * b14;
          t18 += v * b15;
          v = a[4];
          t4 += v * b0;
          t5 += v * b1;
          t6 += v * b2;
          t7 += v * b3;
          t8 += v * b4;
          t9 += v * b5;
          t10 += v * b6;
          t11 += v * b7;
          t12 += v * b8;
          t13 += v * b9;
          t14 += v * b10;
          t15 += v * b11;
          t16 += v * b12;
          t17 += v * b13;
          t18 += v * b14;
          t19 += v * b15;
          v = a[5];
          t5 += v * b0;
          t6 += v * b1;
          t7 += v * b2;
          t8 += v * b3;
          t9 += v * b4;
          t10 += v * b5;
          t11 += v * b6;
          t12 += v * b7;
          t13 += v * b8;
          t14 += v * b9;
          t15 += v * b10;
          t16 += v * b11;
          t17 += v * b12;
          t18 += v * b13;
          t19 += v * b14;
          t20 += v * b15;
          v = a[6];
          t6 += v * b0;
          t7 += v * b1;
          t8 += v * b2;
          t9 += v * b3;
          t10 += v * b4;
          t11 += v * b5;
          t12 += v * b6;
          t13 += v * b7;
          t14 += v * b8;
          t15 += v * b9;
          t16 += v * b10;
          t17 += v * b11;
          t18 += v * b12;
          t19 += v * b13;
          t20 += v * b14;
          t21 += v * b15;
          v = a[7];
          t7 += v * b0;
          t8 += v * b1;
          t9 += v * b2;
          t10 += v * b3;
          t11 += v * b4;
          t12 += v * b5;
          t13 += v * b6;
          t14 += v * b7;
          t15 += v * b8;
          t16 += v * b9;
          t17 += v * b10;
          t18 += v * b11;
          t19 += v * b12;
          t20 += v * b13;
          t21 += v * b14;
          t22 += v * b15;
          v = a[8];
          t8 += v * b0;
          t9 += v * b1;
          t10 += v * b2;
          t11 += v * b3;
          t12 += v * b4;
          t13 += v * b5;
          t14 += v * b6;
          t15 += v * b7;
          t16 += v * b8;
          t17 += v * b9;
          t18 += v * b10;
          t19 += v * b11;
          t20 += v * b12;
          t21 += v * b13;
          t22 += v * b14;
          t23 += v * b15;
          v = a[9];
          t9 += v * b0;
          t10 += v * b1;
          t11 += v * b2;
          t12 += v * b3;
          t13 += v * b4;
          t14 += v * b5;
          t15 += v * b6;
          t16 += v * b7;
          t17 += v * b8;
          t18 += v * b9;
          t19 += v * b10;
          t20 += v * b11;
          t21 += v * b12;
          t22 += v * b13;
          t23 += v * b14;
          t24 += v * b15;
          v = a[10];
          t10 += v * b0;
          t11 += v * b1;
          t12 += v * b2;
          t13 += v * b3;
          t14 += v * b4;
          t15 += v * b5;
          t16 += v * b6;
          t17 += v * b7;
          t18 += v * b8;
          t19 += v * b9;
          t20 += v * b10;
          t21 += v * b11;
          t22 += v * b12;
          t23 += v * b13;
          t24 += v * b14;
          t25 += v * b15;
          v = a[11];
          t11 += v * b0;
          t12 += v * b1;
          t13 += v * b2;
          t14 += v * b3;
          t15 += v * b4;
          t16 += v * b5;
          t17 += v * b6;
          t18 += v * b7;
          t19 += v * b8;
          t20 += v * b9;
          t21 += v * b10;
          t22 += v * b11;
          t23 += v * b12;
          t24 += v * b13;
          t25 += v * b14;
          t26 += v * b15;
          v = a[12];
          t12 += v * b0;
          t13 += v * b1;
          t14 += v * b2;
          t15 += v * b3;
          t16 += v * b4;
          t17 += v * b5;
          t18 += v * b6;
          t19 += v * b7;
          t20 += v * b8;
          t21 += v * b9;
          t22 += v * b10;
          t23 += v * b11;
          t24 += v * b12;
          t25 += v * b13;
          t26 += v * b14;
          t27 += v * b15;
          v = a[13];
          t13 += v * b0;
          t14 += v * b1;
          t15 += v * b2;
          t16 += v * b3;
          t17 += v * b4;
          t18 += v * b5;
          t19 += v * b6;
          t20 += v * b7;
          t21 += v * b8;
          t22 += v * b9;
          t23 += v * b10;
          t24 += v * b11;
          t25 += v * b12;
          t26 += v * b13;
          t27 += v * b14;
          t28 += v * b15;
          v = a[14];
          t14 += v * b0;
          t15 += v * b1;
          t16 += v * b2;
          t17 += v * b3;
          t18 += v * b4;
          t19 += v * b5;
          t20 += v * b6;
          t21 += v * b7;
          t22 += v * b8;
          t23 += v * b9;
          t24 += v * b10;
          t25 += v * b11;
          t26 += v * b12;
          t27 += v * b13;
          t28 += v * b14;
          t29 += v * b15;
          v = a[15];
          t15 += v * b0;
          t16 += v * b1;
          t17 += v * b2;
          t18 += v * b3;
          t19 += v * b4;
          t20 += v * b5;
          t21 += v * b6;
          t22 += v * b7;
          t23 += v * b8;
          t24 += v * b9;
          t25 += v * b10;
          t26 += v * b11;
          t27 += v * b12;
          t28 += v * b13;
          t29 += v * b14;
          t30 += v * b15;
          t0 += 38 * t16;
          t1 += 38 * t17;
          t2 += 38 * t18;
          t3 += 38 * t19;
          t4 += 38 * t20;
          t5 += 38 * t21;
          t6 += 38 * t22;
          t7 += 38 * t23;
          t8 += 38 * t24;
          t9 += 38 * t25;
          t10 += 38 * t26;
          t11 += 38 * t27;
          t12 += 38 * t28;
          t13 += 38 * t29;
          t14 += 38 * t30;
          c = 1;
          v = t0 + c + 65535;
          c = Math.floor(v / 65536);
          t0 = v - c * 65536;
          v = t1 + c + 65535;
          c = Math.floor(v / 65536);
          t1 = v - c * 65536;
          v = t2 + c + 65535;
          c = Math.floor(v / 65536);
          t2 = v - c * 65536;
          v = t3 + c + 65535;
          c = Math.floor(v / 65536);
          t3 = v - c * 65536;
          v = t4 + c + 65535;
          c = Math.floor(v / 65536);
          t4 = v - c * 65536;
          v = t5 + c + 65535;
          c = Math.floor(v / 65536);
          t5 = v - c * 65536;
          v = t6 + c + 65535;
          c = Math.floor(v / 65536);
          t6 = v - c * 65536;
          v = t7 + c + 65535;
          c = Math.floor(v / 65536);
          t7 = v - c * 65536;
          v = t8 + c + 65535;
          c = Math.floor(v / 65536);
          t8 = v - c * 65536;
          v = t9 + c + 65535;
          c = Math.floor(v / 65536);
          t9 = v - c * 65536;
          v = t10 + c + 65535;
          c = Math.floor(v / 65536);
          t10 = v - c * 65536;
          v = t11 + c + 65535;
          c = Math.floor(v / 65536);
          t11 = v - c * 65536;
          v = t12 + c + 65535;
          c = Math.floor(v / 65536);
          t12 = v - c * 65536;
          v = t13 + c + 65535;
          c = Math.floor(v / 65536);
          t13 = v - c * 65536;
          v = t14 + c + 65535;
          c = Math.floor(v / 65536);
          t14 = v - c * 65536;
          v = t15 + c + 65535;
          c = Math.floor(v / 65536);
          t15 = v - c * 65536;
          t0 += c - 1 + 37 * (c - 1);
          c = 1;
          v = t0 + c + 65535;
          c = Math.floor(v / 65536);
          t0 = v - c * 65536;
          v = t1 + c + 65535;
          c = Math.floor(v / 65536);
          t1 = v - c * 65536;
          v = t2 + c + 65535;
          c = Math.floor(v / 65536);
          t2 = v - c * 65536;
          v = t3 + c + 65535;
          c = Math.floor(v / 65536);
          t3 = v - c * 65536;
          v = t4 + c + 65535;
          c = Math.floor(v / 65536);
          t4 = v - c * 65536;
          v = t5 + c + 65535;
          c = Math.floor(v / 65536);
          t5 = v - c * 65536;
          v = t6 + c + 65535;
          c = Math.floor(v / 65536);
          t6 = v - c * 65536;
          v = t7 + c + 65535;
          c = Math.floor(v / 65536);
          t7 = v - c * 65536;
          v = t8 + c + 65535;
          c = Math.floor(v / 65536);
          t8 = v - c * 65536;
          v = t9 + c + 65535;
          c = Math.floor(v / 65536);
          t9 = v - c * 65536;
          v = t10 + c + 65535;
          c = Math.floor(v / 65536);
          t10 = v - c * 65536;
          v = t11 + c + 65535;
          c = Math.floor(v / 65536);
          t11 = v - c * 65536;
          v = t12 + c + 65535;
          c = Math.floor(v / 65536);
          t12 = v - c * 65536;
          v = t13 + c + 65535;
          c = Math.floor(v / 65536);
          t13 = v - c * 65536;
          v = t14 + c + 65535;
          c = Math.floor(v / 65536);
          t14 = v - c * 65536;
          v = t15 + c + 65535;
          c = Math.floor(v / 65536);
          t15 = v - c * 65536;
          t0 += c - 1 + 37 * (c - 1);
          o[0] = t0;
          o[1] = t1;
          o[2] = t2;
          o[3] = t3;
          o[4] = t4;
          o[5] = t5;
          o[6] = t6;
          o[7] = t7;
          o[8] = t8;
          o[9] = t9;
          o[10] = t10;
          o[11] = t11;
          o[12] = t12;
          o[13] = t13;
          o[14] = t14;
          o[15] = t15;
        }
        function S(o, a) {
          M(o, a, a);
        }
        function inv25519(o, i) {
          var c = gf();
          var a;
          for (a = 0; a < 16; a++)
            c[a] = i[a];
          for (a = 253; a >= 0; a--) {
            S(c, c);
            if (a !== 2 && a !== 4)
              M(c, c, i);
          }
          for (a = 0; a < 16; a++)
            o[a] = c[a];
        }
        function pow2523(o, i) {
          var c = gf();
          var a;
          for (a = 0; a < 16; a++)
            c[a] = i[a];
          for (a = 250; a >= 0; a--) {
            S(c, c);
            if (a !== 1)
              M(c, c, i);
          }
          for (a = 0; a < 16; a++)
            o[a] = c[a];
        }
        function crypto_scalarmult(q, n, p) {
          var z = new Uint8Array(32);
          var x = new Float64Array(80), r, i;
          var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
          for (i = 0; i < 31; i++)
            z[i] = n[i];
          z[31] = n[31] & 127 | 64;
          z[0] &= 248;
          unpack25519(x, p);
          for (i = 0; i < 16; i++) {
            b[i] = x[i];
            d[i] = a[i] = c[i] = 0;
          }
          a[0] = d[0] = 1;
          for (i = 254; i >= 0; --i) {
            r = z[i >>> 3] >>> (i & 7) & 1;
            sel25519(a, b, r);
            sel25519(c, d, r);
            A(e, a, c);
            Z(a, a, c);
            A(c, b, d);
            Z(b, b, d);
            S(d, e);
            S(f, a);
            M(a, c, a);
            M(c, b, e);
            A(e, a, c);
            Z(a, a, c);
            S(b, a);
            Z(c, d, f);
            M(a, c, _121665);
            A(a, a, d);
            M(c, c, a);
            M(a, d, f);
            M(d, b, x);
            S(b, e);
            sel25519(a, b, r);
            sel25519(c, d, r);
          }
          for (i = 0; i < 16; i++) {
            x[i + 16] = a[i];
            x[i + 32] = c[i];
            x[i + 48] = b[i];
            x[i + 64] = d[i];
          }
          var x32 = x.subarray(32);
          var x16 = x.subarray(16);
          inv25519(x32, x32);
          M(x16, x16, x32);
          pack25519(q, x16);
          return 0;
        }
        function crypto_scalarmult_base(q, n) {
          return crypto_scalarmult(q, n, _9);
        }
        function crypto_box_keypair(y, x) {
          randombytes(x, 32);
          return crypto_scalarmult_base(y, x);
        }
        function crypto_box_beforenm(k, y, x) {
          var s = new Uint8Array(32);
          crypto_scalarmult(s, x, y);
          return crypto_core_hsalsa20(k, _0, s, sigma);
        }
        var crypto_box_afternm = crypto_secretbox;
        var crypto_box_open_afternm = crypto_secretbox_open;
        function crypto_box(c, m, d, n, y, x) {
          var k = new Uint8Array(32);
          crypto_box_beforenm(k, y, x);
          return crypto_box_afternm(c, m, d, n, k);
        }
        function crypto_box_open(m, c, d, n, y, x) {
          var k = new Uint8Array(32);
          crypto_box_beforenm(k, y, x);
          return crypto_box_open_afternm(m, c, d, n, k);
        }
        var K = [
          1116352408,
          3609767458,
          1899447441,
          602891725,
          3049323471,
          3964484399,
          3921009573,
          2173295548,
          961987163,
          4081628472,
          1508970993,
          3053834265,
          2453635748,
          2937671579,
          2870763221,
          3664609560,
          3624381080,
          2734883394,
          310598401,
          1164996542,
          607225278,
          1323610764,
          1426881987,
          3590304994,
          1925078388,
          4068182383,
          2162078206,
          991336113,
          2614888103,
          633803317,
          3248222580,
          3479774868,
          3835390401,
          2666613458,
          4022224774,
          944711139,
          264347078,
          2341262773,
          604807628,
          2007800933,
          770255983,
          1495990901,
          1249150122,
          1856431235,
          1555081692,
          3175218132,
          1996064986,
          2198950837,
          2554220882,
          3999719339,
          2821834349,
          766784016,
          2952996808,
          2566594879,
          3210313671,
          3203337956,
          3336571891,
          1034457026,
          3584528711,
          2466948901,
          113926993,
          3758326383,
          338241895,
          168717936,
          666307205,
          1188179964,
          773529912,
          1546045734,
          1294757372,
          1522805485,
          1396182291,
          2643833823,
          1695183700,
          2343527390,
          1986661051,
          1014477480,
          2177026350,
          1206759142,
          2456956037,
          344077627,
          2730485921,
          1290863460,
          2820302411,
          3158454273,
          3259730800,
          3505952657,
          3345764771,
          106217008,
          3516065817,
          3606008344,
          3600352804,
          1432725776,
          4094571909,
          1467031594,
          275423344,
          851169720,
          430227734,
          3100823752,
          506948616,
          1363258195,
          659060556,
          3750685593,
          883997877,
          3785050280,
          958139571,
          3318307427,
          1322822218,
          3812723403,
          1537002063,
          2003034995,
          1747873779,
          3602036899,
          1955562222,
          1575990012,
          2024104815,
          1125592928,
          2227730452,
          2716904306,
          2361852424,
          442776044,
          2428436474,
          593698344,
          2756734187,
          3733110249,
          3204031479,
          2999351573,
          3329325298,
          3815920427,
          3391569614,
          3928383900,
          3515267271,
          566280711,
          3940187606,
          3454069534,
          4118630271,
          4000239992,
          116418474,
          1914138554,
          174292421,
          2731055270,
          289380356,
          3203993006,
          460393269,
          320620315,
          685471733,
          587496836,
          852142971,
          1086792851,
          1017036298,
          365543100,
          1126000580,
          2618297676,
          1288033470,
          3409855158,
          1501505948,
          4234509866,
          1607167915,
          987167468,
          1816402316,
          1246189591
        ];
        function crypto_hashblocks_hl(hh, hl, m, n) {
          var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
          var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
          var pos = 0;
          while (n >= 128) {
            for (i = 0; i < 16; i++) {
              j = 8 * i + pos;
              wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
              wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
            }
            for (i = 0; i < 80; i++) {
              bh0 = ah0;
              bh1 = ah1;
              bh2 = ah2;
              bh3 = ah3;
              bh4 = ah4;
              bh5 = ah5;
              bh6 = ah6;
              bh7 = ah7;
              bl0 = al0;
              bl1 = al1;
              bl2 = al2;
              bl3 = al3;
              bl4 = al4;
              bl5 = al5;
              bl6 = al6;
              bl7 = al7;
              h = ah7;
              l = al7;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
              l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = ah4 & ah5 ^ ~ah4 & ah6;
              l = al4 & al5 ^ ~al4 & al6;
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = K[i * 2];
              l = K[i * 2 + 1];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = wh[i % 16];
              l = wl[i % 16];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              th = c & 65535 | d << 16;
              tl = a & 65535 | b << 16;
              h = th;
              l = tl;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
              l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              h = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
              l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              bh7 = c & 65535 | d << 16;
              bl7 = a & 65535 | b << 16;
              h = bh3;
              l = bl3;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = th;
              l = tl;
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              bh3 = c & 65535 | d << 16;
              bl3 = a & 65535 | b << 16;
              ah1 = bh0;
              ah2 = bh1;
              ah3 = bh2;
              ah4 = bh3;
              ah5 = bh4;
              ah6 = bh5;
              ah7 = bh6;
              ah0 = bh7;
              al1 = bl0;
              al2 = bl1;
              al3 = bl2;
              al4 = bl3;
              al5 = bl4;
              al6 = bl5;
              al7 = bl6;
              al0 = bl7;
              if (i % 16 === 15) {
                for (j = 0; j < 16; j++) {
                  h = wh[j];
                  l = wl[j];
                  a = l & 65535;
                  b = l >>> 16;
                  c = h & 65535;
                  d = h >>> 16;
                  h = wh[(j + 9) % 16];
                  l = wl[(j + 9) % 16];
                  a += l & 65535;
                  b += l >>> 16;
                  c += h & 65535;
                  d += h >>> 16;
                  th = wh[(j + 1) % 16];
                  tl = wl[(j + 1) % 16];
                  h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                  l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                  a += l & 65535;
                  b += l >>> 16;
                  c += h & 65535;
                  d += h >>> 16;
                  th = wh[(j + 14) % 16];
                  tl = wl[(j + 14) % 16];
                  h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                  l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                  a += l & 65535;
                  b += l >>> 16;
                  c += h & 65535;
                  d += h >>> 16;
                  b += a >>> 16;
                  c += b >>> 16;
                  d += c >>> 16;
                  wh[j] = c & 65535 | d << 16;
                  wl[j] = a & 65535 | b << 16;
                }
              }
            }
            h = ah0;
            l = al0;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[0];
            l = hl[0];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[0] = ah0 = c & 65535 | d << 16;
            hl[0] = al0 = a & 65535 | b << 16;
            h = ah1;
            l = al1;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[1];
            l = hl[1];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[1] = ah1 = c & 65535 | d << 16;
            hl[1] = al1 = a & 65535 | b << 16;
            h = ah2;
            l = al2;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[2];
            l = hl[2];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[2] = ah2 = c & 65535 | d << 16;
            hl[2] = al2 = a & 65535 | b << 16;
            h = ah3;
            l = al3;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[3];
            l = hl[3];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[3] = ah3 = c & 65535 | d << 16;
            hl[3] = al3 = a & 65535 | b << 16;
            h = ah4;
            l = al4;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[4];
            l = hl[4];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[4] = ah4 = c & 65535 | d << 16;
            hl[4] = al4 = a & 65535 | b << 16;
            h = ah5;
            l = al5;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[5];
            l = hl[5];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[5] = ah5 = c & 65535 | d << 16;
            hl[5] = al5 = a & 65535 | b << 16;
            h = ah6;
            l = al6;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[6];
            l = hl[6];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[6] = ah6 = c & 65535 | d << 16;
            hl[6] = al6 = a & 65535 | b << 16;
            h = ah7;
            l = al7;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = hh[7];
            l = hl[7];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[7] = ah7 = c & 65535 | d << 16;
            hl[7] = al7 = a & 65535 | b << 16;
            pos += 128;
            n -= 128;
          }
          return n;
        }
        function crypto_hash(out, m, n) {
          var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
          hh[0] = 1779033703;
          hh[1] = 3144134277;
          hh[2] = 1013904242;
          hh[3] = 2773480762;
          hh[4] = 1359893119;
          hh[5] = 2600822924;
          hh[6] = 528734635;
          hh[7] = 1541459225;
          hl[0] = 4089235720;
          hl[1] = 2227873595;
          hl[2] = 4271175723;
          hl[3] = 1595750129;
          hl[4] = 2917565137;
          hl[5] = 725511199;
          hl[6] = 4215389547;
          hl[7] = 327033209;
          crypto_hashblocks_hl(hh, hl, m, n);
          n %= 128;
          for (i = 0; i < n; i++)
            x[i] = m[b - n + i];
          x[n] = 128;
          n = 256 - 128 * (n < 112 ? 1 : 0);
          x[n - 9] = 0;
          ts64(x, n - 8, b / 536870912 | 0, b << 3);
          crypto_hashblocks_hl(hh, hl, x, n);
          for (i = 0; i < 8; i++)
            ts64(out, 8 * i, hh[i], hl[i]);
          return 0;
        }
        function add2(p, q) {
          var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
          Z(a, p[1], p[0]);
          Z(t, q[1], q[0]);
          M(a, a, t);
          A(b, p[0], p[1]);
          A(t, q[0], q[1]);
          M(b, b, t);
          M(c, p[3], q[3]);
          M(c, c, D2);
          M(d, p[2], q[2]);
          A(d, d, d);
          Z(e, b, a);
          Z(f, d, c);
          A(g, d, c);
          A(h, b, a);
          M(p[0], e, f);
          M(p[1], h, g);
          M(p[2], g, f);
          M(p[3], e, h);
        }
        function cswap(p, q, b) {
          var i;
          for (i = 0; i < 4; i++) {
            sel25519(p[i], q[i], b);
          }
        }
        function pack(r, p) {
          var tx = gf(), ty = gf(), zi = gf();
          inv25519(zi, p[2]);
          M(tx, p[0], zi);
          M(ty, p[1], zi);
          pack25519(r, ty);
          r[31] ^= par25519(tx) << 7;
        }
        function scalarmult(p, q, s) {
          var b, i;
          set25519(p[0], gf0);
          set25519(p[1], gf1);
          set25519(p[2], gf1);
          set25519(p[3], gf0);
          for (i = 255; i >= 0; --i) {
            b = s[i / 8 | 0] >> (i & 7) & 1;
            cswap(p, q, b);
            add2(q, p);
            add2(p, p);
            cswap(p, q, b);
          }
        }
        function scalarbase(p, s) {
          var q = [gf(), gf(), gf(), gf()];
          set25519(q[0], X);
          set25519(q[1], Y);
          set25519(q[2], gf1);
          M(q[3], X, Y);
          scalarmult(p, q, s);
        }
        function crypto_sign_keypair(pk, sk, seeded) {
          var d = new Uint8Array(64);
          var p = [gf(), gf(), gf(), gf()];
          var i;
          if (!seeded)
            randombytes(sk, 32);
          crypto_hash(d, sk, 32);
          d[0] &= 248;
          d[31] &= 127;
          d[31] |= 64;
          scalarbase(p, d);
          pack(pk, p);
          for (i = 0; i < 32; i++)
            sk[i + 32] = pk[i];
          return 0;
        }
        var L2 = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
        function modL(r, x) {
          var carry, i, j, k;
          for (i = 63; i >= 32; --i) {
            carry = 0;
            for (j = i - 32, k = i - 12; j < k; ++j) {
              x[j] += carry - 16 * x[i] * L2[j - (i - 32)];
              carry = Math.floor((x[j] + 128) / 256);
              x[j] -= carry * 256;
            }
            x[j] += carry;
            x[i] = 0;
          }
          carry = 0;
          for (j = 0; j < 32; j++) {
            x[j] += carry - (x[31] >> 4) * L2[j];
            carry = x[j] >> 8;
            x[j] &= 255;
          }
          for (j = 0; j < 32; j++)
            x[j] -= carry * L2[j];
          for (i = 0; i < 32; i++) {
            x[i + 1] += x[i] >> 8;
            r[i] = x[i] & 255;
          }
        }
        function reduce(r) {
          var x = new Float64Array(64), i;
          for (i = 0; i < 64; i++)
            x[i] = r[i];
          for (i = 0; i < 64; i++)
            r[i] = 0;
          modL(r, x);
        }
        function crypto_sign(sm, m, n, sk) {
          var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
          var i, j, x = new Float64Array(64);
          var p = [gf(), gf(), gf(), gf()];
          crypto_hash(d, sk, 32);
          d[0] &= 248;
          d[31] &= 127;
          d[31] |= 64;
          var smlen = n + 64;
          for (i = 0; i < n; i++)
            sm[64 + i] = m[i];
          for (i = 0; i < 32; i++)
            sm[32 + i] = d[32 + i];
          crypto_hash(r, sm.subarray(32), n + 32);
          reduce(r);
          scalarbase(p, r);
          pack(sm, p);
          for (i = 32; i < 64; i++)
            sm[i] = sk[i];
          crypto_hash(h, sm, n + 64);
          reduce(h);
          for (i = 0; i < 64; i++)
            x[i] = 0;
          for (i = 0; i < 32; i++)
            x[i] = r[i];
          for (i = 0; i < 32; i++) {
            for (j = 0; j < 32; j++) {
              x[i + j] += h[i] * d[j];
            }
          }
          modL(sm.subarray(32), x);
          return smlen;
        }
        function unpackneg(r, p) {
          var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
          set25519(r[2], gf1);
          unpack25519(r[1], p);
          S(num, r[1]);
          M(den, num, D);
          Z(num, num, r[2]);
          A(den, r[2], den);
          S(den2, den);
          S(den4, den2);
          M(den6, den4, den2);
          M(t, den6, num);
          M(t, t, den);
          pow2523(t, t);
          M(t, t, num);
          M(t, t, den);
          M(t, t, den);
          M(r[0], t, den);
          S(chk, r[0]);
          M(chk, chk, den);
          if (neq25519(chk, num))
            M(r[0], r[0], I);
          S(chk, r[0]);
          M(chk, chk, den);
          if (neq25519(chk, num))
            return -1;
          if (par25519(r[0]) === p[31] >> 7)
            Z(r[0], gf0, r[0]);
          M(r[3], r[0], r[1]);
          return 0;
        }
        function crypto_sign_open(m, sm, n, pk) {
          var i;
          var t = new Uint8Array(32), h = new Uint8Array(64);
          var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
          if (n < 64)
            return -1;
          if (unpackneg(q, pk))
            return -1;
          for (i = 0; i < n; i++)
            m[i] = sm[i];
          for (i = 0; i < 32; i++)
            m[i + 32] = pk[i];
          crypto_hash(h, m, n);
          reduce(h);
          scalarmult(p, q, h);
          scalarbase(q, sm.subarray(32));
          add2(p, q);
          pack(t, p);
          n -= 64;
          if (crypto_verify_32(sm, 0, t, 0)) {
            for (i = 0; i < n; i++)
              m[i] = 0;
            return -1;
          }
          for (i = 0; i < n; i++)
            m[i] = sm[i + 64];
          return n;
        }
        var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
        nacl3.lowlevel = {
          crypto_core_hsalsa20,
          crypto_stream_xor,
          crypto_stream,
          crypto_stream_salsa20_xor,
          crypto_stream_salsa20,
          crypto_onetimeauth,
          crypto_onetimeauth_verify,
          crypto_verify_16,
          crypto_verify_32,
          crypto_secretbox,
          crypto_secretbox_open,
          crypto_scalarmult,
          crypto_scalarmult_base,
          crypto_box_beforenm,
          crypto_box_afternm,
          crypto_box,
          crypto_box_open,
          crypto_box_keypair,
          crypto_hash,
          crypto_sign,
          crypto_sign_keypair,
          crypto_sign_open,
          crypto_secretbox_KEYBYTES,
          crypto_secretbox_NONCEBYTES,
          crypto_secretbox_ZEROBYTES,
          crypto_secretbox_BOXZEROBYTES,
          crypto_scalarmult_BYTES,
          crypto_scalarmult_SCALARBYTES,
          crypto_box_PUBLICKEYBYTES,
          crypto_box_SECRETKEYBYTES,
          crypto_box_BEFORENMBYTES,
          crypto_box_NONCEBYTES,
          crypto_box_ZEROBYTES,
          crypto_box_BOXZEROBYTES,
          crypto_sign_BYTES,
          crypto_sign_PUBLICKEYBYTES,
          crypto_sign_SECRETKEYBYTES,
          crypto_sign_SEEDBYTES,
          crypto_hash_BYTES,
          gf,
          D,
          L: L2,
          pack25519,
          unpack25519,
          M,
          A,
          S,
          Z,
          pow2523,
          add: add2,
          set25519,
          modL,
          scalarmult,
          scalarbase
        };
        function checkLengths(k, n) {
          if (k.length !== crypto_secretbox_KEYBYTES)
            throw new Error("bad key size");
          if (n.length !== crypto_secretbox_NONCEBYTES)
            throw new Error("bad nonce size");
        }
        function checkBoxLengths(pk, sk) {
          if (pk.length !== crypto_box_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          if (sk.length !== crypto_box_SECRETKEYBYTES)
            throw new Error("bad secret key size");
        }
        function checkArrayTypes() {
          for (var i = 0; i < arguments.length; i++) {
            if (!(arguments[i] instanceof Uint8Array))
              throw new TypeError("unexpected type, use Uint8Array");
          }
        }
        function cleanup(arr) {
          for (var i = 0; i < arr.length; i++)
            arr[i] = 0;
        }
        nacl3.randomBytes = function(n) {
          var b = new Uint8Array(n);
          randombytes(b, n);
          return b;
        };
        nacl3.secretbox = function(msg, nonce, key) {
          checkArrayTypes(msg, nonce, key);
          checkLengths(key, nonce);
          var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
          var c = new Uint8Array(m.length);
          for (var i = 0; i < msg.length; i++)
            m[i + crypto_secretbox_ZEROBYTES] = msg[i];
          crypto_secretbox(c, m, m.length, nonce, key);
          return c.subarray(crypto_secretbox_BOXZEROBYTES);
        };
        nacl3.secretbox.open = function(box, nonce, key) {
          checkArrayTypes(box, nonce, key);
          checkLengths(key, nonce);
          var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
          var m = new Uint8Array(c.length);
          for (var i = 0; i < box.length; i++)
            c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
          if (c.length < 32)
            return null;
          if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0)
            return null;
          return m.subarray(crypto_secretbox_ZEROBYTES);
        };
        nacl3.secretbox.keyLength = crypto_secretbox_KEYBYTES;
        nacl3.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
        nacl3.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
        nacl3.scalarMult = function(n, p) {
          checkArrayTypes(n, p);
          if (n.length !== crypto_scalarmult_SCALARBYTES)
            throw new Error("bad n size");
          if (p.length !== crypto_scalarmult_BYTES)
            throw new Error("bad p size");
          var q = new Uint8Array(crypto_scalarmult_BYTES);
          crypto_scalarmult(q, n, p);
          return q;
        };
        nacl3.scalarMult.base = function(n) {
          checkArrayTypes(n);
          if (n.length !== crypto_scalarmult_SCALARBYTES)
            throw new Error("bad n size");
          var q = new Uint8Array(crypto_scalarmult_BYTES);
          crypto_scalarmult_base(q, n);
          return q;
        };
        nacl3.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
        nacl3.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
        nacl3.box = function(msg, nonce, publicKey, secretKey) {
          var k = nacl3.box.before(publicKey, secretKey);
          return nacl3.secretbox(msg, nonce, k);
        };
        nacl3.box.before = function(publicKey, secretKey) {
          checkArrayTypes(publicKey, secretKey);
          checkBoxLengths(publicKey, secretKey);
          var k = new Uint8Array(crypto_box_BEFORENMBYTES);
          crypto_box_beforenm(k, publicKey, secretKey);
          return k;
        };
        nacl3.box.after = nacl3.secretbox;
        nacl3.box.open = function(msg, nonce, publicKey, secretKey) {
          var k = nacl3.box.before(publicKey, secretKey);
          return nacl3.secretbox.open(msg, nonce, k);
        };
        nacl3.box.open.after = nacl3.secretbox.open;
        nacl3.box.keyPair = function() {
          var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
          crypto_box_keypair(pk, sk);
          return { publicKey: pk, secretKey: sk };
        };
        nacl3.box.keyPair.fromSecretKey = function(secretKey) {
          checkArrayTypes(secretKey);
          if (secretKey.length !== crypto_box_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
          crypto_scalarmult_base(pk, secretKey);
          return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
        };
        nacl3.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
        nacl3.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
        nacl3.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
        nacl3.box.nonceLength = crypto_box_NONCEBYTES;
        nacl3.box.overheadLength = nacl3.secretbox.overheadLength;
        nacl3.sign = function(msg, secretKey) {
          checkArrayTypes(msg, secretKey);
          if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
          crypto_sign(signedMsg, msg, msg.length, secretKey);
          return signedMsg;
        };
        nacl3.sign.open = function(signedMsg, publicKey) {
          checkArrayTypes(signedMsg, publicKey);
          if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          var tmp = new Uint8Array(signedMsg.length);
          var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
          if (mlen < 0)
            return null;
          var m = new Uint8Array(mlen);
          for (var i = 0; i < m.length; i++)
            m[i] = tmp[i];
          return m;
        };
        nacl3.sign.detached = function(msg, secretKey) {
          var signedMsg = nacl3.sign(msg, secretKey);
          var sig = new Uint8Array(crypto_sign_BYTES);
          for (var i = 0; i < sig.length; i++)
            sig[i] = signedMsg[i];
          return sig;
        };
        nacl3.sign.detached.verify = function(msg, sig, publicKey) {
          checkArrayTypes(msg, sig, publicKey);
          if (sig.length !== crypto_sign_BYTES)
            throw new Error("bad signature size");
          if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
            throw new Error("bad public key size");
          var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
          var m = new Uint8Array(crypto_sign_BYTES + msg.length);
          var i;
          for (i = 0; i < crypto_sign_BYTES; i++)
            sm[i] = sig[i];
          for (i = 0; i < msg.length; i++)
            sm[i + crypto_sign_BYTES] = msg[i];
          return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
        };
        nacl3.sign.keyPair = function() {
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
          crypto_sign_keypair(pk, sk);
          return { publicKey: pk, secretKey: sk };
        };
        nacl3.sign.keyPair.fromSecretKey = function(secretKey) {
          checkArrayTypes(secretKey);
          if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
            throw new Error("bad secret key size");
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          for (var i = 0; i < pk.length; i++)
            pk[i] = secretKey[32 + i];
          return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
        };
        nacl3.sign.keyPair.fromSeed = function(seed) {
          checkArrayTypes(seed);
          if (seed.length !== crypto_sign_SEEDBYTES)
            throw new Error("bad seed size");
          var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
          var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
          for (var i = 0; i < 32; i++)
            sk[i] = seed[i];
          crypto_sign_keypair(pk, sk, true);
          return { publicKey: pk, secretKey: sk };
        };
        nacl3.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
        nacl3.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
        nacl3.sign.seedLength = crypto_sign_SEEDBYTES;
        nacl3.sign.signatureLength = crypto_sign_BYTES;
        nacl3.hash = function(msg) {
          checkArrayTypes(msg);
          var h = new Uint8Array(crypto_hash_BYTES);
          crypto_hash(h, msg, msg.length);
          return h;
        };
        nacl3.hash.hashLength = crypto_hash_BYTES;
        nacl3.verify = function(x, y) {
          checkArrayTypes(x, y);
          if (x.length === 0 || y.length === 0)
            return false;
          if (x.length !== y.length)
            return false;
          return vn(x, 0, y, 0, x.length) === 0 ? true : false;
        };
        nacl3.setPRNG = function(fn) {
          randombytes = fn;
        };
        (function() {
          var crypto2 = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
          if (crypto2 && crypto2.getRandomValues) {
            var QUOTA = 65536;
            nacl3.setPRNG(function(x, n) {
              var i, v = new Uint8Array(n);
              for (i = 0; i < n; i += QUOTA) {
                crypto2.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
              }
              for (i = 0; i < n; i++)
                x[i] = v[i];
              cleanup(v);
            });
          } else if (typeof __require !== "undefined") {
            crypto2 = require_crypto();
            if (crypto2 && crypto2.randomBytes) {
              nacl3.setPRNG(function(x, n) {
                var i, v = crypto2.randomBytes(n);
                for (i = 0; i < n; i++)
                  x[i] = v[i];
                cleanup(v);
              });
            }
          }
        })();
      })(typeof module !== "undefined" && module.exports ? module.exports : self.nacl = self.nacl || {});
    }
  });

  // node_modules/blakejs/util.js
  var require_util = __commonJS({
    "node_modules/blakejs/util.js"(exports, module) {
      var ERROR_MSG_INPUT = "Input must be an string, Buffer or Uint8Array";
      function normalizeInput(input) {
        let ret;
        if (input instanceof Uint8Array) {
          ret = input;
        } else if (typeof input === "string") {
          const encoder = new TextEncoder();
          ret = encoder.encode(input);
        } else {
          throw new Error(ERROR_MSG_INPUT);
        }
        return ret;
      }
      function toHex(bytes) {
        return Array.prototype.map.call(bytes, function(n) {
          return (n < 16 ? "0" : "") + n.toString(16);
        }).join("");
      }
      function uint32ToHex(val) {
        return (4294967296 + val).toString(16).substring(1);
      }
      function debugPrint(label, arr, size) {
        let msg = "\n" + label + " = ";
        for (let i = 0; i < arr.length; i += 2) {
          if (size === 32) {
            msg += uint32ToHex(arr[i]).toUpperCase();
            msg += " ";
            msg += uint32ToHex(arr[i + 1]).toUpperCase();
          } else if (size === 64) {
            msg += uint32ToHex(arr[i + 1]).toUpperCase();
            msg += uint32ToHex(arr[i]).toUpperCase();
          } else
            throw new Error("Invalid size " + size);
          if (i % 6 === 4) {
            msg += "\n" + new Array(label.length + 4).join(" ");
          } else if (i < arr.length - 2) {
            msg += " ";
          }
        }
        console.log(msg);
      }
      function testSpeed(hashFn, N, M) {
        let startMs = new Date().getTime();
        const input = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          input[i] = i % 256;
        }
        const genMs = new Date().getTime();
        console.log("Generated random input in " + (genMs - startMs) + "ms");
        startMs = genMs;
        for (let i = 0; i < M; i++) {
          const hashHex = hashFn(input);
          const hashMs = new Date().getTime();
          const ms = hashMs - startMs;
          startMs = hashMs;
          console.log("Hashed in " + ms + "ms: " + hashHex.substring(0, 20) + "...");
          console.log(Math.round(N / (1 << 20) / (ms / 1e3) * 100) / 100 + " MB PER SECOND");
        }
      }
      module.exports = {
        normalizeInput,
        toHex,
        debugPrint,
        testSpeed
      };
    }
  });

  // node_modules/blakejs/blake2b.js
  var require_blake2b = __commonJS({
    "node_modules/blakejs/blake2b.js"(exports, module) {
      var util = require_util();
      function ADD64AA(v2, a, b) {
        const o0 = v2[a] + v2[b];
        let o1 = v2[a + 1] + v2[b + 1];
        if (o0 >= 4294967296) {
          o1++;
        }
        v2[a] = o0;
        v2[a + 1] = o1;
      }
      function ADD64AC(v2, a, b0, b1) {
        let o0 = v2[a] + b0;
        if (b0 < 0) {
          o0 += 4294967296;
        }
        let o1 = v2[a + 1] + b1;
        if (o0 >= 4294967296) {
          o1++;
        }
        v2[a] = o0;
        v2[a + 1] = o1;
      }
      function B2B_GET32(arr, i) {
        return arr[i] ^ arr[i + 1] << 8 ^ arr[i + 2] << 16 ^ arr[i + 3] << 24;
      }
      function B2B_G(a, b, c, d, ix, iy) {
        const x0 = m[ix];
        const x1 = m[ix + 1];
        const y0 = m[iy];
        const y1 = m[iy + 1];
        ADD64AA(v, a, b);
        ADD64AC(v, a, x0, x1);
        let xor0 = v[d] ^ v[a];
        let xor1 = v[d + 1] ^ v[a + 1];
        v[d] = xor1;
        v[d + 1] = xor0;
        ADD64AA(v, c, d);
        xor0 = v[b] ^ v[c];
        xor1 = v[b + 1] ^ v[c + 1];
        v[b] = xor0 >>> 24 ^ xor1 << 8;
        v[b + 1] = xor1 >>> 24 ^ xor0 << 8;
        ADD64AA(v, a, b);
        ADD64AC(v, a, y0, y1);
        xor0 = v[d] ^ v[a];
        xor1 = v[d + 1] ^ v[a + 1];
        v[d] = xor0 >>> 16 ^ xor1 << 16;
        v[d + 1] = xor1 >>> 16 ^ xor0 << 16;
        ADD64AA(v, c, d);
        xor0 = v[b] ^ v[c];
        xor1 = v[b + 1] ^ v[c + 1];
        v[b] = xor1 >>> 31 ^ xor0 << 1;
        v[b + 1] = xor0 >>> 31 ^ xor1 << 1;
      }
      var BLAKE2B_IV32 = new Uint32Array([
        4089235720,
        1779033703,
        2227873595,
        3144134277,
        4271175723,
        1013904242,
        1595750129,
        2773480762,
        2917565137,
        1359893119,
        725511199,
        2600822924,
        4215389547,
        528734635,
        327033209,
        1541459225
      ]);
      var SIGMA8 = [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        14,
        10,
        4,
        8,
        9,
        15,
        13,
        6,
        1,
        12,
        0,
        2,
        11,
        7,
        5,
        3,
        11,
        8,
        12,
        0,
        5,
        2,
        15,
        13,
        10,
        14,
        3,
        6,
        7,
        1,
        9,
        4,
        7,
        9,
        3,
        1,
        13,
        12,
        11,
        14,
        2,
        6,
        5,
        10,
        4,
        0,
        15,
        8,
        9,
        0,
        5,
        7,
        2,
        4,
        10,
        15,
        14,
        1,
        11,
        12,
        6,
        8,
        3,
        13,
        2,
        12,
        6,
        10,
        0,
        11,
        8,
        3,
        4,
        13,
        7,
        5,
        15,
        14,
        1,
        9,
        12,
        5,
        1,
        15,
        14,
        13,
        4,
        10,
        0,
        7,
        6,
        3,
        9,
        2,
        8,
        11,
        13,
        11,
        7,
        14,
        12,
        1,
        3,
        9,
        5,
        0,
        15,
        4,
        8,
        6,
        2,
        10,
        6,
        15,
        14,
        9,
        11,
        3,
        0,
        8,
        12,
        2,
        13,
        7,
        1,
        4,
        10,
        5,
        10,
        2,
        8,
        4,
        7,
        6,
        1,
        5,
        15,
        11,
        9,
        14,
        3,
        12,
        13,
        0,
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        14,
        10,
        4,
        8,
        9,
        15,
        13,
        6,
        1,
        12,
        0,
        2,
        11,
        7,
        5,
        3
      ];
      var SIGMA82 = new Uint8Array(SIGMA8.map(function(x) {
        return x * 2;
      }));
      var v = new Uint32Array(32);
      var m = new Uint32Array(32);
      function blake2bCompress(ctx, last) {
        let i = 0;
        for (i = 0; i < 16; i++) {
          v[i] = ctx.h[i];
          v[i + 16] = BLAKE2B_IV32[i];
        }
        v[24] = v[24] ^ ctx.t;
        v[25] = v[25] ^ ctx.t / 4294967296;
        if (last) {
          v[28] = ~v[28];
          v[29] = ~v[29];
        }
        for (i = 0; i < 32; i++) {
          m[i] = B2B_GET32(ctx.b, 4 * i);
        }
        for (i = 0; i < 12; i++) {
          B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1]);
          B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3]);
          B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5]);
          B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7]);
          B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9]);
          B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11]);
          B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13]);
          B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15]);
        }
        for (i = 0; i < 16; i++) {
          ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
        }
      }
      var parameterBlock = new Uint8Array([
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]);
      function blake2bInit2(outlen, key, salt, personal) {
        if (outlen === 0 || outlen > 64) {
          throw new Error("Illegal output length, expected 0 < length <= 64");
        }
        if (key && key.length > 64) {
          throw new Error("Illegal key, expected Uint8Array with 0 < length <= 64");
        }
        if (salt && salt.length !== 16) {
          throw new Error("Illegal salt, expected Uint8Array with length is 16");
        }
        if (personal && personal.length !== 16) {
          throw new Error("Illegal personal, expected Uint8Array with length is 16");
        }
        const ctx = {
          b: new Uint8Array(128),
          h: new Uint32Array(16),
          t: 0,
          c: 0,
          outlen
        };
        parameterBlock.fill(0);
        parameterBlock[0] = outlen;
        if (key)
          parameterBlock[1] = key.length;
        parameterBlock[2] = 1;
        parameterBlock[3] = 1;
        if (salt)
          parameterBlock.set(salt, 32);
        if (personal)
          parameterBlock.set(personal, 48);
        for (let i = 0; i < 16; i++) {
          ctx.h[i] = BLAKE2B_IV32[i] ^ B2B_GET32(parameterBlock, i * 4);
        }
        if (key) {
          blake2bUpdate2(ctx, key);
          ctx.c = 128;
        }
        return ctx;
      }
      function blake2bUpdate2(ctx, input) {
        for (let i = 0; i < input.length; i++) {
          if (ctx.c === 128) {
            ctx.t += ctx.c;
            blake2bCompress(ctx, false);
            ctx.c = 0;
          }
          ctx.b[ctx.c++] = input[i];
        }
      }
      function blake2bFinal2(ctx) {
        ctx.t += ctx.c;
        while (ctx.c < 128) {
          ctx.b[ctx.c++] = 0;
        }
        blake2bCompress(ctx, true);
        const out = new Uint8Array(ctx.outlen);
        for (let i = 0; i < ctx.outlen; i++) {
          out[i] = ctx.h[i >> 2] >> 8 * (i & 3);
        }
        return out;
      }
      function blake2b3(input, key, outlen, salt, personal) {
        outlen = outlen || 64;
        input = util.normalizeInput(input);
        if (salt) {
          salt = util.normalizeInput(salt);
        }
        if (personal) {
          personal = util.normalizeInput(personal);
        }
        const ctx = blake2bInit2(outlen, key, salt, personal);
        blake2bUpdate2(ctx, input);
        return blake2bFinal2(ctx);
      }
      function blake2bHex(input, key, outlen, salt, personal) {
        const output = blake2b3(input, key, outlen, salt, personal);
        return util.toHex(output);
      }
      module.exports = {
        blake2b: blake2b3,
        blake2bHex,
        blake2bInit: blake2bInit2,
        blake2bUpdate: blake2bUpdate2,
        blake2bFinal: blake2bFinal2
      };
    }
  });

  // node_modules/blakejs/blake2s.js
  var require_blake2s = __commonJS({
    "node_modules/blakejs/blake2s.js"(exports, module) {
      var util = require_util();
      function B2S_GET32(v2, i) {
        return v2[i] ^ v2[i + 1] << 8 ^ v2[i + 2] << 16 ^ v2[i + 3] << 24;
      }
      function B2S_G(a, b, c, d, x, y) {
        v[a] = v[a] + v[b] + x;
        v[d] = ROTR32(v[d] ^ v[a], 16);
        v[c] = v[c] + v[d];
        v[b] = ROTR32(v[b] ^ v[c], 12);
        v[a] = v[a] + v[b] + y;
        v[d] = ROTR32(v[d] ^ v[a], 8);
        v[c] = v[c] + v[d];
        v[b] = ROTR32(v[b] ^ v[c], 7);
      }
      function ROTR32(x, y) {
        return x >>> y ^ x << 32 - y;
      }
      var BLAKE2S_IV = new Uint32Array([
        1779033703,
        3144134277,
        1013904242,
        2773480762,
        1359893119,
        2600822924,
        528734635,
        1541459225
      ]);
      var SIGMA = new Uint8Array([
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        14,
        10,
        4,
        8,
        9,
        15,
        13,
        6,
        1,
        12,
        0,
        2,
        11,
        7,
        5,
        3,
        11,
        8,
        12,
        0,
        5,
        2,
        15,
        13,
        10,
        14,
        3,
        6,
        7,
        1,
        9,
        4,
        7,
        9,
        3,
        1,
        13,
        12,
        11,
        14,
        2,
        6,
        5,
        10,
        4,
        0,
        15,
        8,
        9,
        0,
        5,
        7,
        2,
        4,
        10,
        15,
        14,
        1,
        11,
        12,
        6,
        8,
        3,
        13,
        2,
        12,
        6,
        10,
        0,
        11,
        8,
        3,
        4,
        13,
        7,
        5,
        15,
        14,
        1,
        9,
        12,
        5,
        1,
        15,
        14,
        13,
        4,
        10,
        0,
        7,
        6,
        3,
        9,
        2,
        8,
        11,
        13,
        11,
        7,
        14,
        12,
        1,
        3,
        9,
        5,
        0,
        15,
        4,
        8,
        6,
        2,
        10,
        6,
        15,
        14,
        9,
        11,
        3,
        0,
        8,
        12,
        2,
        13,
        7,
        1,
        4,
        10,
        5,
        10,
        2,
        8,
        4,
        7,
        6,
        1,
        5,
        15,
        11,
        9,
        14,
        3,
        12,
        13,
        0
      ]);
      var v = new Uint32Array(16);
      var m = new Uint32Array(16);
      function blake2sCompress(ctx, last) {
        let i = 0;
        for (i = 0; i < 8; i++) {
          v[i] = ctx.h[i];
          v[i + 8] = BLAKE2S_IV[i];
        }
        v[12] ^= ctx.t;
        v[13] ^= ctx.t / 4294967296;
        if (last) {
          v[14] = ~v[14];
        }
        for (i = 0; i < 16; i++) {
          m[i] = B2S_GET32(ctx.b, 4 * i);
        }
        for (i = 0; i < 10; i++) {
          B2S_G(0, 4, 8, 12, m[SIGMA[i * 16 + 0]], m[SIGMA[i * 16 + 1]]);
          B2S_G(1, 5, 9, 13, m[SIGMA[i * 16 + 2]], m[SIGMA[i * 16 + 3]]);
          B2S_G(2, 6, 10, 14, m[SIGMA[i * 16 + 4]], m[SIGMA[i * 16 + 5]]);
          B2S_G(3, 7, 11, 15, m[SIGMA[i * 16 + 6]], m[SIGMA[i * 16 + 7]]);
          B2S_G(0, 5, 10, 15, m[SIGMA[i * 16 + 8]], m[SIGMA[i * 16 + 9]]);
          B2S_G(1, 6, 11, 12, m[SIGMA[i * 16 + 10]], m[SIGMA[i * 16 + 11]]);
          B2S_G(2, 7, 8, 13, m[SIGMA[i * 16 + 12]], m[SIGMA[i * 16 + 13]]);
          B2S_G(3, 4, 9, 14, m[SIGMA[i * 16 + 14]], m[SIGMA[i * 16 + 15]]);
        }
        for (i = 0; i < 8; i++) {
          ctx.h[i] ^= v[i] ^ v[i + 8];
        }
      }
      function blake2sInit(outlen, key) {
        if (!(outlen > 0 && outlen <= 32)) {
          throw new Error("Incorrect output length, should be in [1, 32]");
        }
        const keylen = key ? key.length : 0;
        if (key && !(keylen > 0 && keylen <= 32)) {
          throw new Error("Incorrect key length, should be in [1, 32]");
        }
        const ctx = {
          h: new Uint32Array(BLAKE2S_IV),
          b: new Uint8Array(64),
          c: 0,
          t: 0,
          outlen
        };
        ctx.h[0] ^= 16842752 ^ keylen << 8 ^ outlen;
        if (keylen > 0) {
          blake2sUpdate(ctx, key);
          ctx.c = 64;
        }
        return ctx;
      }
      function blake2sUpdate(ctx, input) {
        for (let i = 0; i < input.length; i++) {
          if (ctx.c === 64) {
            ctx.t += ctx.c;
            blake2sCompress(ctx, false);
            ctx.c = 0;
          }
          ctx.b[ctx.c++] = input[i];
        }
      }
      function blake2sFinal(ctx) {
        ctx.t += ctx.c;
        while (ctx.c < 64) {
          ctx.b[ctx.c++] = 0;
        }
        blake2sCompress(ctx, true);
        const out = new Uint8Array(ctx.outlen);
        for (let i = 0; i < ctx.outlen; i++) {
          out[i] = ctx.h[i >> 2] >> 8 * (i & 3) & 255;
        }
        return out;
      }
      function blake2s(input, key, outlen) {
        outlen = outlen || 32;
        input = util.normalizeInput(input);
        const ctx = blake2sInit(outlen, key);
        blake2sUpdate(ctx, input);
        return blake2sFinal(ctx);
      }
      function blake2sHex(input, key, outlen) {
        const output = blake2s(input, key, outlen);
        return util.toHex(output);
      }
      module.exports = {
        blake2s,
        blake2sHex,
        blake2sInit,
        blake2sUpdate,
        blake2sFinal
      };
    }
  });

  // node_modules/blakejs/index.js
  var require_blakejs = __commonJS({
    "node_modules/blakejs/index.js"(exports, module) {
      var b2b = require_blake2b();
      var b2s = require_blake2s();
      module.exports = {
        blake2b: b2b.blake2b,
        blake2bHex: b2b.blake2bHex,
        blake2bInit: b2b.blake2bInit,
        blake2bUpdate: b2b.blake2bUpdate,
        blake2bFinal: b2b.blake2bFinal,
        blake2s: b2s.blake2s,
        blake2sHex: b2s.blake2sHex,
        blake2sInit: b2s.blake2sInit,
        blake2sUpdate: b2s.blake2sUpdate,
        blake2sFinal: b2s.blake2sFinal
      };
    }
  });

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength;
      exports.toByteArray = toByteArray;
      exports.fromByteArray = fromByteArray;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i = 0, len2 = code.length; i < len2; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }
      var i;
      var len2;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len3 = b64.length;
        if (len3 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1)
          validLen = len3;
        var placeHoldersLen = validLen === len3 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len3 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i2;
        for (i2 = 0; i2 < len3; i2 += 4) {
          tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i2 = start; i2 < end; i2 += 3) {
          tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray(uint8) {
        var tmp;
        var len3 = uint8.length;
        var extraBytes = len3 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i2 = 0, len22 = len3 - extraBytes; i2 < len22; i2 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len3 - 1];
          parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
        } else if (extraBytes === 2) {
          tmp = (uint8[len3 - 2] << 8) + uint8[len3 - 1];
          parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e, m;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i = isLE ? nBytes - 1 : 0;
        var d = isLE ? -1 : 1;
        var s = buffer[offset + i];
        i += d;
        e = s & (1 << -nBits) - 1;
        s >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        m = e & (1 << -nBits) - 1;
        e >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
        }
        if (e === 0) {
          e = 1 - eBias;
        } else if (e === eMax) {
          return m ? NaN : (s ? -1 : 1) * Infinity;
        } else {
          m = m + Math.pow(2, mLen);
          e = e - eBias;
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i = isLE ? 0 : nBytes - 1;
        var d = isLE ? 1 : -1;
        var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0;
          e = eMax;
        } else {
          e = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
          }
          if (e + eBias >= 1) {
            value += rt / c;
          } else {
            value += rt * Math.pow(2, 1 - eBias);
          }
          if (value * c >= 2) {
            e++;
            c /= 2;
          }
          if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
          } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
        }
        e = e << mLen | m;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
        }
        buffer[offset + i - d] |= s * 128;
      };
    }
  });

  // node_modules/buffer/index.js
  var require_buffer = __commonJS({
    "node_modules/buffer/index.js"(exports) {
      "use strict";
      var base64 = require_base64_js();
      var ieee754 = require_ieee754();
      var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports.Buffer = Buffer2;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      var K_MAX_LENGTH = 2147483647;
      exports.kMaxLength = K_MAX_LENGTH;
      Buffer2.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer2.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto3 = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto3, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto3);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer2.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this))
            return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer2.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this))
            return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length2) {
        if (length2 > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length2 + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length2);
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function Buffer2(arg, encodingOrOffset, length2) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError('The "string" argument must be of type string. Received type number');
          }
          return allocUnsafe(arg);
        }
        return from3(arg, encodingOrOffset, length2);
      }
      Buffer2.poolSize = 8192;
      function from3(value, encodingOrOffset, length2) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length2);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length2);
        }
        if (typeof value === "number") {
          throw new TypeError('The "value" argument must not be of type number. Received type number');
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer2.from(valueOf, encodingOrOffset, length2);
        }
        const b = fromObject(value);
        if (b)
          return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length2);
        }
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
      }
      Buffer2.from = function(value, encodingOrOffset, length2) {
        return from3(value, encodingOrOffset, length2);
      };
      Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer2, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer2.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer2.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer2.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string3, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer2.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length2 = byteLength(string3, encoding) | 0;
        let buf = createBuffer(length2);
        const actual = buf.write(string3, encoding);
        if (actual !== length2) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array) {
        const length2 = array.length < 0 ? 0 : checked(array.length) | 0;
        const buf = createBuffer(length2);
        for (let i = 0; i < length2; i += 1) {
          buf[i] = array[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array, byteOffset, length2) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length2 || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length2 === void 0) {
          buf = new Uint8Array(array);
        } else if (length2 === void 0) {
          buf = new Uint8Array(array, byteOffset);
        } else {
          buf = new Uint8Array(array, byteOffset, length2);
        }
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer2.isBuffer(obj)) {
          const len2 = checked(obj.length) | 0;
          const buf = createBuffer(len2);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len2);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length2) {
        if (length2 >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length2 | 0;
      }
      function SlowBuffer(length2) {
        if (+length2 != length2) {
          length2 = 0;
        }
        return Buffer2.alloc(+length2);
      }
      Buffer2.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer2.prototype;
      };
      Buffer2.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array))
          a = Buffer2.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array))
          b = Buffer2.from(b, b.offset, b.byteLength);
        if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
          throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
        }
        if (a === b)
          return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len2 = Math.min(x, y); i < len2; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y)
          return -1;
        if (y < x)
          return 1;
        return 0;
      };
      Buffer2.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer2.concat = function concat2(list, length2) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer2.alloc(0);
        }
        let i;
        if (length2 === void 0) {
          length2 = 0;
          for (i = 0; i < list.length; ++i) {
            length2 += list[i].length;
          }
        }
        const buffer = Buffer2.allocUnsafe(length2);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer.length) {
              if (!Buffer2.isBuffer(buf))
                buf = Buffer2.from(buf);
              buf.copy(buffer, pos);
            } else {
              Uint8Array.prototype.set.call(buffer, buf, pos);
            }
          } else if (!Buffer2.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer, pos);
          }
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string3, encoding) {
        if (Buffer2.isBuffer(string3)) {
          return string3.length;
        }
        if (ArrayBuffer.isView(string3) || isInstance(string3, ArrayBuffer)) {
          return string3.byteLength;
        }
        if (typeof string3 !== "string") {
          throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string3);
        }
        const len2 = string3.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len2 === 0)
          return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len2;
            case "utf8":
            case "utf-8":
              return utf8ToBytes(string3).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len2 * 2;
            case "hex":
              return len2 >>> 1;
            case "base64":
              return base64ToBytes(string3).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes(string3).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding)
          encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase)
                throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer2.prototype.swap16 = function swap16() {
        const len2 = this.length;
        if (len2 % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len2; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer2.prototype.swap32 = function swap32() {
        const len2 = this.length;
        if (len2 % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len2; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer2.prototype.swap64 = function swap64() {
        const len2 = this.length;
        if (len2 % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len2; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer2.prototype.toString = function toString2() {
        const length2 = this.length;
        if (length2 === 0)
          return "";
        if (arguments.length === 0)
          return utf8Slice(this, 0, length2);
        return slowToString.apply(this, arguments);
      };
      Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
      Buffer2.prototype.equals = function equals3(b) {
        if (!Buffer2.isBuffer(b))
          throw new TypeError("Argument must be a Buffer");
        if (this === b)
          return true;
        return Buffer2.compare(this, b) === 0;
      };
      Buffer2.prototype.inspect = function inspect() {
        let str2 = "";
        const max = exports.INSPECT_MAX_BYTES;
        str2 = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max)
          str2 += " ... ";
        return "<Buffer " + str2 + ">";
      };
      if (customInspectSymbol) {
        Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
      }
      Buffer2.prototype.compare = function compare(target2, start, end, thisStart, thisEnd) {
        if (isInstance(target2, Uint8Array)) {
          target2 = Buffer2.from(target2, target2.offset, target2.byteLength);
        }
        if (!Buffer2.isBuffer(target2)) {
          throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target2);
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target2 ? target2.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target2.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target2)
          return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len2 = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target2.slice(start, end);
        for (let i = 0; i < len2; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y)
          return -1;
        if (y < x)
          return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (buffer.length === 0)
          return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer.length - 1;
        }
        if (byteOffset < 0)
          byteOffset = buffer.length + byteOffset;
        if (byteOffset >= buffer.length) {
          if (dir)
            return -1;
          else
            byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (dir)
            byteOffset = 0;
          else
            return -1;
        }
        if (typeof val === "string") {
          val = Buffer2.from(val, encoding);
        }
        if (Buffer2.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read2(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read2(arr, i) === read2(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1)
                foundIndex = i;
              if (i - foundIndex + 1 === valLength)
                return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1)
                i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength)
            byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read2(arr, i + j) !== read2(val, j)) {
                found = false;
                break;
              }
            }
            if (found)
              return i;
          }
        }
        return -1;
      }
      Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string3, offset, length2) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length2) {
          length2 = remaining;
        } else {
          length2 = Number(length2);
          if (length2 > remaining) {
            length2 = remaining;
          }
        }
        const strLen = string3.length;
        if (length2 > strLen / 2) {
          length2 = strLen / 2;
        }
        let i;
        for (i = 0; i < length2; ++i) {
          const parsed = parseInt(string3.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed))
            return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string3, offset, length2) {
        return blitBuffer(utf8ToBytes(string3, buf.length - offset), buf, offset, length2);
      }
      function asciiWrite(buf, string3, offset, length2) {
        return blitBuffer(asciiToBytes(string3), buf, offset, length2);
      }
      function base64Write(buf, string3, offset, length2) {
        return blitBuffer(base64ToBytes(string3), buf, offset, length2);
      }
      function ucs2Write(buf, string3, offset, length2) {
        return blitBuffer(utf16leToBytes(string3, buf.length - offset), buf, offset, length2);
      }
      Buffer2.prototype.write = function write(string3, offset, length2, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length2 = this.length;
          offset = 0;
        } else if (length2 === void 0 && typeof offset === "string") {
          encoding = offset;
          length2 = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length2)) {
            length2 = length2 >>> 0;
            if (encoding === void 0)
              encoding = "utf8";
          } else {
            encoding = length2;
            length2 = void 0;
          }
        } else {
          throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        }
        const remaining = this.length - offset;
        if (length2 === void 0 || length2 > remaining)
          length2 = remaining;
        if (string3.length > 0 && (length2 < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding)
          encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string3, offset, length2);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string3, offset, length2);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string3, offset, length2);
            case "base64":
              return base64Write(this, string3, offset, length2);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string3, offset, length2);
            default:
              if (loweredCase)
                throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer2.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len2 = codePoints.length;
        if (len2 <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len2) {
          res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len2 = buf.length;
        if (!start || start < 0)
          start = 0;
        if (!end || end < 0 || end > len2)
          end = len2;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer2.prototype.slice = function slice(start, end) {
        const len2 = this.length;
        start = ~~start;
        end = end === void 0 ? len2 : ~~end;
        if (start < 0) {
          start += len2;
          if (start < 0)
            start = 0;
        } else if (start > len2) {
          start = len2;
        }
        if (end < 0) {
          end += len2;
          if (end < 0)
            end = 0;
        } else if (end > len2) {
          end = len2;
        }
        if (end < start)
          end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer2.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length2) {
        if (offset % 1 !== 0 || offset < 0)
          throw new RangeError("offset is not uint");
        if (offset + ext > length2)
          throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert)
          checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert)
          checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul)
          val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert)
          checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul)
          val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128))
          return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert)
          checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer2.isBuffer(buf))
          throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min)
          throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length)
          throw new RangeError("Index out of range");
      }
      Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 1, 127, -128);
        if (value < 0)
          value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert)
          checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0)
          value = 4294967295 + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length)
          throw new RangeError("Index out of range");
        if (offset < 0)
          throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer2.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer2.prototype.copy = function copy(target2, targetStart, start, end) {
        if (!Buffer2.isBuffer(target2))
          throw new TypeError("argument should be a Buffer");
        if (!start)
          start = 0;
        if (!end && end !== 0)
          end = this.length;
        if (targetStart >= target2.length)
          targetStart = target2.length;
        if (!targetStart)
          targetStart = 0;
        if (end > 0 && end < start)
          end = start;
        if (end === start)
          return 0;
        if (target2.length === 0 || this.length === 0)
          return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length)
          throw new RangeError("Index out of range");
        if (end < 0)
          throw new RangeError("sourceEnd out of bounds");
        if (end > this.length)
          end = this.length;
        if (target2.length - targetStart < end - start) {
          end = target2.length - targetStart + start;
        }
        const len2 = end - start;
        if (this === target2 && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(target2, this.subarray(start, end), targetStart);
        }
        return len2;
      };
      Buffer2.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val)
          val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
          const len2 = bytes.length;
          if (len2 === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len2];
          }
        }
        return this;
      };
      var errors = {};
      function E(sym, getMessage, Base) {
        errors[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E("ERR_BUFFER_OUT_OF_BOUNDS", function(name) {
        if (name) {
          return `${name} is outside of buffer bounds`;
        }
        return "Attempt to access memory outside buffer bounds";
      }, RangeError);
      E("ERR_INVALID_ARG_TYPE", function(name, actual) {
        return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
      }, TypeError);
      E("ERR_OUT_OF_RANGE", function(str2, range, input) {
        let msg = `The value of "${str2}" is out of range.`;
        let received = input;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
          received = String(input);
          if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
            received = addNumericalSeparator(received);
          }
          received += "n";
        }
        msg += ` It must be ${range}. Received ${received}`;
        return msg;
      }, RangeError);
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value, min, max, buf, offset, byteLength2) {
        if (value > max || value < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range;
          if (byteLength2 > 3) {
            if (min === 0 || min === BigInt(0)) {
              range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          } else {
            range = `>= ${min}${n} and <= ${max}${n}`;
          }
          throw new errors.ERR_OUT_OF_RANGE("value", range, value);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value, name) {
        if (typeof value !== "number") {
          throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
      }
      function boundsError(value, length2, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
        }
        if (length2 < 0) {
          throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors.ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length2}`, value);
      }
      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str2) {
        str2 = str2.split("=")[0];
        str2 = str2.trim().replace(INVALID_BASE64_RE, "");
        if (str2.length < 2)
          return "";
        while (str2.length % 4 !== 0) {
          str2 = str2 + "=";
        }
        return str2;
      }
      function utf8ToBytes(string3, units) {
        units = units || Infinity;
        let codePoint;
        const length2 = string3.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length2; ++i) {
          codePoint = string3.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1)
                  bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length2) {
                if ((units -= 3) > -1)
                  bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1)
                bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1)
              bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0)
              break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0)
              break;
            bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0)
              break;
            bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0)
              break;
            bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str2) {
        const byteArray = [];
        for (let i = 0; i < str2.length; ++i) {
          byteArray.push(str2.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str2, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str2.length; ++i) {
          if ((units -= 2) < 0)
            break;
          c = str2.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str2) {
        return base64.toByteArray(base64clean(str2));
      }
      function blitBuffer(src2, dst, offset, length2) {
        let i;
        for (i = 0; i < length2; ++i) {
          if (i + offset >= dst.length || i >= src2.length)
            break;
          dst[i + offset] = src2[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      var hexSliceLookupTable = function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      }();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    }
  });

  // node_modules/scrypt-async/scrypt-async.js
  var require_scrypt_async = __commonJS({
    "node_modules/scrypt-async/scrypt-async.js"(exports, module) {
      function scrypt2(password, salt, logN, r, dkLen, interruptStep, callback, encoding) {
        "use strict";
        function SHA256(m) {
          var K = [
            1116352408,
            1899447441,
            3049323471,
            3921009573,
            961987163,
            1508970993,
            2453635748,
            2870763221,
            3624381080,
            310598401,
            607225278,
            1426881987,
            1925078388,
            2162078206,
            2614888103,
            3248222580,
            3835390401,
            4022224774,
            264347078,
            604807628,
            770255983,
            1249150122,
            1555081692,
            1996064986,
            2554220882,
            2821834349,
            2952996808,
            3210313671,
            3336571891,
            3584528711,
            113926993,
            338241895,
            666307205,
            773529912,
            1294757372,
            1396182291,
            1695183700,
            1986661051,
            2177026350,
            2456956037,
            2730485921,
            2820302411,
            3259730800,
            3345764771,
            3516065817,
            3600352804,
            4094571909,
            275423344,
            430227734,
            506948616,
            659060556,
            883997877,
            958139571,
            1322822218,
            1537002063,
            1747873779,
            1955562222,
            2024104815,
            2227730452,
            2361852424,
            2428436474,
            2756734187,
            3204031479,
            3329325298
          ];
          var h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762, h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225, w = new Array(64);
          function blocks(p3) {
            var off = 0, len2 = p3.length;
            while (len2 >= 64) {
              var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7, u, i2, j, t1, t2;
              for (i2 = 0; i2 < 16; i2++) {
                j = off + i2 * 4;
                w[i2] = (p3[j] & 255) << 24 | (p3[j + 1] & 255) << 16 | (p3[j + 2] & 255) << 8 | p3[j + 3] & 255;
              }
              for (i2 = 16; i2 < 64; i2++) {
                u = w[i2 - 2];
                t1 = (u >>> 17 | u << 32 - 17) ^ (u >>> 19 | u << 32 - 19) ^ u >>> 10;
                u = w[i2 - 15];
                t2 = (u >>> 7 | u << 32 - 7) ^ (u >>> 18 | u << 32 - 18) ^ u >>> 3;
                w[i2] = (t1 + w[i2 - 7] | 0) + (t2 + w[i2 - 16] | 0) | 0;
              }
              for (i2 = 0; i2 < 64; i2++) {
                t1 = (((e >>> 6 | e << 32 - 6) ^ (e >>> 11 | e << 32 - 11) ^ (e >>> 25 | e << 32 - 25)) + (e & f ^ ~e & g) | 0) + (h + (K[i2] + w[i2] | 0) | 0) | 0;
                t2 = ((a >>> 2 | a << 32 - 2) ^ (a >>> 13 | a << 32 - 13) ^ (a >>> 22 | a << 32 - 22)) + (a & b ^ a & c ^ b & c) | 0;
                h = g;
                g = f;
                f = e;
                e = d + t1 | 0;
                d = c;
                c = b;
                b = a;
                a = t1 + t2 | 0;
              }
              h0 = h0 + a | 0;
              h1 = h1 + b | 0;
              h2 = h2 + c | 0;
              h3 = h3 + d | 0;
              h4 = h4 + e | 0;
              h5 = h5 + f | 0;
              h6 = h6 + g | 0;
              h7 = h7 + h | 0;
              off += 64;
              len2 -= 64;
            }
          }
          blocks(m);
          var i, bytesLeft = m.length % 64, bitLenHi = m.length / 536870912 | 0, bitLenLo = m.length << 3, numZeros = bytesLeft < 56 ? 56 : 120, p2 = m.slice(m.length - bytesLeft, m.length);
          p2.push(128);
          for (i = bytesLeft + 1; i < numZeros; i++)
            p2.push(0);
          p2.push(bitLenHi >>> 24 & 255);
          p2.push(bitLenHi >>> 16 & 255);
          p2.push(bitLenHi >>> 8 & 255);
          p2.push(bitLenHi >>> 0 & 255);
          p2.push(bitLenLo >>> 24 & 255);
          p2.push(bitLenLo >>> 16 & 255);
          p2.push(bitLenLo >>> 8 & 255);
          p2.push(bitLenLo >>> 0 & 255);
          blocks(p2);
          return [
            h0 >>> 24 & 255,
            h0 >>> 16 & 255,
            h0 >>> 8 & 255,
            h0 >>> 0 & 255,
            h1 >>> 24 & 255,
            h1 >>> 16 & 255,
            h1 >>> 8 & 255,
            h1 >>> 0 & 255,
            h2 >>> 24 & 255,
            h2 >>> 16 & 255,
            h2 >>> 8 & 255,
            h2 >>> 0 & 255,
            h3 >>> 24 & 255,
            h3 >>> 16 & 255,
            h3 >>> 8 & 255,
            h3 >>> 0 & 255,
            h4 >>> 24 & 255,
            h4 >>> 16 & 255,
            h4 >>> 8 & 255,
            h4 >>> 0 & 255,
            h5 >>> 24 & 255,
            h5 >>> 16 & 255,
            h5 >>> 8 & 255,
            h5 >>> 0 & 255,
            h6 >>> 24 & 255,
            h6 >>> 16 & 255,
            h6 >>> 8 & 255,
            h6 >>> 0 & 255,
            h7 >>> 24 & 255,
            h7 >>> 16 & 255,
            h7 >>> 8 & 255,
            h7 >>> 0 & 255
          ];
        }
        function PBKDF2_HMAC_SHA256_OneIter(password2, salt2, dkLen2) {
          if (password2.length > 64) {
            password2 = SHA256(password2.push ? password2 : Array.prototype.slice.call(password2, 0));
          }
          var i, innerLen = 64 + salt2.length + 4, inner = new Array(innerLen), outerKey = new Array(64), dk = [];
          for (i = 0; i < 64; i++)
            inner[i] = 54;
          for (i = 0; i < password2.length; i++)
            inner[i] ^= password2[i];
          for (i = 0; i < salt2.length; i++)
            inner[64 + i] = salt2[i];
          for (i = innerLen - 4; i < innerLen; i++)
            inner[i] = 0;
          for (i = 0; i < 64; i++)
            outerKey[i] = 92;
          for (i = 0; i < password2.length; i++)
            outerKey[i] ^= password2[i];
          function incrementCounter() {
            for (var i2 = innerLen - 1; i2 >= innerLen - 4; i2--) {
              inner[i2]++;
              if (inner[i2] <= 255)
                return;
              inner[i2] = 0;
            }
          }
          while (dkLen2 >= 32) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
            dkLen2 -= 32;
          }
          if (dkLen2 > 0) {
            incrementCounter();
            dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen2));
          }
          return dk;
        }
        function salsaXOR(tmp2, B2, bin, bout) {
          var j0 = tmp2[0] ^ B2[bin++], j1 = tmp2[1] ^ B2[bin++], j2 = tmp2[2] ^ B2[bin++], j3 = tmp2[3] ^ B2[bin++], j4 = tmp2[4] ^ B2[bin++], j5 = tmp2[5] ^ B2[bin++], j6 = tmp2[6] ^ B2[bin++], j7 = tmp2[7] ^ B2[bin++], j8 = tmp2[8] ^ B2[bin++], j9 = tmp2[9] ^ B2[bin++], j10 = tmp2[10] ^ B2[bin++], j11 = tmp2[11] ^ B2[bin++], j12 = tmp2[12] ^ B2[bin++], j13 = tmp2[13] ^ B2[bin++], j14 = tmp2[14] ^ B2[bin++], j15 = tmp2[15] ^ B2[bin++], u, i;
          var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15;
          for (i = 0; i < 8; i += 2) {
            u = x0 + x12;
            x4 ^= u << 7 | u >>> 32 - 7;
            u = x4 + x0;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x4;
            x12 ^= u << 13 | u >>> 32 - 13;
            u = x12 + x8;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x1;
            x9 ^= u << 7 | u >>> 32 - 7;
            u = x9 + x5;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x9;
            x1 ^= u << 13 | u >>> 32 - 13;
            u = x1 + x13;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x6;
            x14 ^= u << 7 | u >>> 32 - 7;
            u = x14 + x10;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x14;
            x6 ^= u << 13 | u >>> 32 - 13;
            u = x6 + x2;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x11;
            x3 ^= u << 7 | u >>> 32 - 7;
            u = x3 + x15;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x3;
            x11 ^= u << 13 | u >>> 32 - 13;
            u = x11 + x7;
            x15 ^= u << 18 | u >>> 32 - 18;
            u = x0 + x3;
            x1 ^= u << 7 | u >>> 32 - 7;
            u = x1 + x0;
            x2 ^= u << 9 | u >>> 32 - 9;
            u = x2 + x1;
            x3 ^= u << 13 | u >>> 32 - 13;
            u = x3 + x2;
            x0 ^= u << 18 | u >>> 32 - 18;
            u = x5 + x4;
            x6 ^= u << 7 | u >>> 32 - 7;
            u = x6 + x5;
            x7 ^= u << 9 | u >>> 32 - 9;
            u = x7 + x6;
            x4 ^= u << 13 | u >>> 32 - 13;
            u = x4 + x7;
            x5 ^= u << 18 | u >>> 32 - 18;
            u = x10 + x9;
            x11 ^= u << 7 | u >>> 32 - 7;
            u = x11 + x10;
            x8 ^= u << 9 | u >>> 32 - 9;
            u = x8 + x11;
            x9 ^= u << 13 | u >>> 32 - 13;
            u = x9 + x8;
            x10 ^= u << 18 | u >>> 32 - 18;
            u = x15 + x14;
            x12 ^= u << 7 | u >>> 32 - 7;
            u = x12 + x15;
            x13 ^= u << 9 | u >>> 32 - 9;
            u = x13 + x12;
            x14 ^= u << 13 | u >>> 32 - 13;
            u = x14 + x13;
            x15 ^= u << 18 | u >>> 32 - 18;
          }
          B2[bout++] = tmp2[0] = x0 + j0 | 0;
          B2[bout++] = tmp2[1] = x1 + j1 | 0;
          B2[bout++] = tmp2[2] = x2 + j2 | 0;
          B2[bout++] = tmp2[3] = x3 + j3 | 0;
          B2[bout++] = tmp2[4] = x4 + j4 | 0;
          B2[bout++] = tmp2[5] = x5 + j5 | 0;
          B2[bout++] = tmp2[6] = x6 + j6 | 0;
          B2[bout++] = tmp2[7] = x7 + j7 | 0;
          B2[bout++] = tmp2[8] = x8 + j8 | 0;
          B2[bout++] = tmp2[9] = x9 + j9 | 0;
          B2[bout++] = tmp2[10] = x10 + j10 | 0;
          B2[bout++] = tmp2[11] = x11 + j11 | 0;
          B2[bout++] = tmp2[12] = x12 + j12 | 0;
          B2[bout++] = tmp2[13] = x13 + j13 | 0;
          B2[bout++] = tmp2[14] = x14 + j14 | 0;
          B2[bout++] = tmp2[15] = x15 + j15 | 0;
        }
        function blockCopy(dst, di, src2, si, len2) {
          while (len2--)
            dst[di++] = src2[si++];
        }
        function blockXOR(dst, di, src2, si, len2) {
          while (len2--)
            dst[di++] ^= src2[si++];
        }
        function blockMix(tmp2, B2, bin, bout, r2) {
          blockCopy(tmp2, 0, B2, bin + (2 * r2 - 1) * 16, 16);
          for (var i = 0; i < 2 * r2; i += 2) {
            salsaXOR(tmp2, B2, bin + i * 16, bout + i * 8);
            salsaXOR(tmp2, B2, bin + i * 16 + 16, bout + i * 8 + r2 * 16);
          }
        }
        function integerify(B2, bi, r2) {
          return B2[bi + (2 * r2 - 1) * 16];
        }
        function stringToUTF8Bytes(s) {
          var arr = [];
          for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c < 128) {
              arr.push(c);
            } else if (c < 2048) {
              arr.push(192 | c >> 6);
              arr.push(128 | c & 63);
            } else if (c < 55296) {
              arr.push(224 | c >> 12);
              arr.push(128 | c >> 6 & 63);
              arr.push(128 | c & 63);
            } else {
              if (i >= s.length - 1) {
                throw new Error("invalid string");
              }
              i++;
              c = (c & 1023) << 10;
              c |= s.charCodeAt(i) & 1023;
              c += 65536;
              arr.push(240 | c >> 18);
              arr.push(128 | c >> 12 & 63);
              arr.push(128 | c >> 6 & 63);
              arr.push(128 | c & 63);
            }
          }
          return arr;
        }
        function bytesToHex(p2) {
          var enc = "0123456789abcdef".split("");
          var len2 = p2.length, arr = [], i = 0;
          for (; i < len2; i++) {
            arr.push(enc[p2[i] >>> 4 & 15]);
            arr.push(enc[p2[i] >>> 0 & 15]);
          }
          return arr.join("");
        }
        function bytesToBase64(p2) {
          var enc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
          var len2 = p2.length, arr = [], i = 0, a, b, c, t;
          while (i < len2) {
            a = i < len2 ? p2[i++] : 0;
            b = i < len2 ? p2[i++] : 0;
            c = i < len2 ? p2[i++] : 0;
            t = (a << 16) + (b << 8) + c;
            arr.push(enc[t >>> 3 * 6 & 63]);
            arr.push(enc[t >>> 2 * 6 & 63]);
            arr.push(enc[t >>> 1 * 6 & 63]);
            arr.push(enc[t >>> 0 * 6 & 63]);
          }
          if (len2 % 3 > 0) {
            arr[arr.length - 1] = "=";
            if (len2 % 3 === 1)
              arr[arr.length - 2] = "=";
          }
          return arr.join("");
        }
        var MAX_UINT = -1 >>> 0, p = 1;
        if (typeof logN === "object") {
          if (arguments.length > 4) {
            throw new Error("scrypt: incorrect number of arguments");
          }
          var opts = logN;
          callback = r;
          logN = opts.logN;
          if (typeof logN === "undefined") {
            if (typeof opts.N !== "undefined") {
              if (opts.N < 2 || opts.N > MAX_UINT)
                throw new Error("scrypt: N is out of range");
              if ((opts.N & opts.N - 1) !== 0)
                throw new Error("scrypt: N is not a power of 2");
              logN = Math.log(opts.N) / Math.LN2;
            } else {
              throw new Error("scrypt: missing N parameter");
            }
          }
          p = opts.p || 1;
          r = opts.r;
          dkLen = opts.dkLen || 32;
          interruptStep = opts.interruptStep || 0;
          encoding = opts.encoding;
        }
        if (p < 1)
          throw new Error("scrypt: invalid p");
        if (r <= 0)
          throw new Error("scrypt: invalid r");
        if (logN < 1 || logN > 31)
          throw new Error("scrypt: logN must be between 1 and 31");
        var N = 1 << logN >>> 0, XY, V, B, tmp;
        if (r * p >= 1 << 30 || r > MAX_UINT / 128 / p || r > MAX_UINT / 256 || N > MAX_UINT / 128 / r)
          throw new Error("scrypt: parameters are too large");
        if (typeof password === "string")
          password = stringToUTF8Bytes(password);
        if (typeof salt === "string")
          salt = stringToUTF8Bytes(salt);
        if (typeof Int32Array !== "undefined") {
          XY = new Int32Array(64 * r);
          V = new Int32Array(32 * N * r);
          tmp = new Int32Array(16);
        } else {
          XY = [];
          V = [];
          tmp = new Array(16);
        }
        B = PBKDF2_HMAC_SHA256_OneIter(password, salt, p * 128 * r);
        var xi = 0, yi = 32 * r;
        function smixStart(pos) {
          for (var i = 0; i < 32 * r; i++) {
            var j = pos + i * 4;
            XY[xi + i] = (B[j + 3] & 255) << 24 | (B[j + 2] & 255) << 16 | (B[j + 1] & 255) << 8 | (B[j + 0] & 255) << 0;
          }
        }
        function smixStep1(start, end) {
          for (var i = start; i < end; i += 2) {
            blockCopy(V, i * (32 * r), XY, xi, 32 * r);
            blockMix(tmp, XY, xi, yi, r);
            blockCopy(V, (i + 1) * (32 * r), XY, yi, 32 * r);
            blockMix(tmp, XY, yi, xi, r);
          }
        }
        function smixStep2(start, end) {
          for (var i = start; i < end; i += 2) {
            var j = integerify(XY, xi, r) & N - 1;
            blockXOR(XY, xi, V, j * (32 * r), 32 * r);
            blockMix(tmp, XY, xi, yi, r);
            j = integerify(XY, yi, r) & N - 1;
            blockXOR(XY, yi, V, j * (32 * r), 32 * r);
            blockMix(tmp, XY, yi, xi, r);
          }
        }
        function smixFinish(pos) {
          for (var i = 0; i < 32 * r; i++) {
            var j = XY[xi + i];
            B[pos + i * 4 + 0] = j >>> 0 & 255;
            B[pos + i * 4 + 1] = j >>> 8 & 255;
            B[pos + i * 4 + 2] = j >>> 16 & 255;
            B[pos + i * 4 + 3] = j >>> 24 & 255;
          }
        }
        var nextTick2 = typeof setImmediate !== "undefined" ? setImmediate : setTimeout;
        function interruptedFor(start, end, step, fn, donefn) {
          (function performStep() {
            nextTick2(function() {
              fn(start, start + step < end ? start + step : end);
              start += step;
              if (start < end)
                performStep();
              else
                donefn();
            });
          })();
        }
        function getResult(enc) {
          var result = PBKDF2_HMAC_SHA256_OneIter(password, B, dkLen);
          if (enc === "base64")
            return bytesToBase64(result);
          else if (enc === "hex")
            return bytesToHex(result);
          else if (enc === "binary")
            return new Uint8Array(result);
          else
            return result;
        }
        function calculateSync() {
          for (var i = 0; i < p; i++) {
            smixStart(i * 128 * r);
            smixStep1(0, N);
            smixStep2(0, N);
            smixFinish(i * 128 * r);
          }
          callback(getResult(encoding));
        }
        function calculateAsync(i) {
          smixStart(i * 128 * r);
          interruptedFor(0, N, interruptStep * 2, smixStep1, function() {
            interruptedFor(0, N, interruptStep * 2, smixStep2, function() {
              smixFinish(i * 128 * r);
              if (i + 1 < p) {
                nextTick2(function() {
                  calculateAsync(i + 1);
                });
              } else {
                callback(getResult(encoding));
              }
            });
          });
        }
        if (typeof interruptStep === "function") {
          encoding = callback;
          callback = interruptStep;
          interruptStep = 1e3;
        }
        if (interruptStep <= 0) {
          calculateSync();
        } else {
          calculateAsync(0);
        }
      }
      if (typeof module !== "undefined")
        module.exports = scrypt2;
    }
  });

  // node_modules/vue/dist/vue.esm.js
  var emptyObject = Object.freeze({});
  function isUndef(v) {
    return v === void 0 || v === null;
  }
  function isDef(v) {
    return v !== void 0 && v !== null;
  }
  function isTrue(v) {
    return v === true;
  }
  function isFalse(v) {
    return v === false;
  }
  function isPrimitive(value) {
    return typeof value === "string" || typeof value === "number" || typeof value === "symbol" || typeof value === "boolean";
  }
  function isObject(obj) {
    return obj !== null && typeof obj === "object";
  }
  var _toString = Object.prototype.toString;
  function isPlainObject(obj) {
    return _toString.call(obj) === "[object Object]";
  }
  function isRegExp(v) {
    return _toString.call(v) === "[object RegExp]";
  }
  function isValidArrayIndex(val) {
    var n = parseFloat(String(val));
    return n >= 0 && Math.floor(n) === n && isFinite(val);
  }
  function isPromise(val) {
    return isDef(val) && typeof val.then === "function" && typeof val.catch === "function";
  }
  function toString(val) {
    return val == null ? "" : Array.isArray(val) || isPlainObject(val) && val.toString === _toString ? JSON.stringify(val, null, 2) : String(val);
  }
  function toNumber(val) {
    var n = parseFloat(val);
    return isNaN(n) ? val : n;
  }
  function makeMap(str2, expectsLowerCase) {
    var map = /* @__PURE__ */ Object.create(null);
    var list = str2.split(",");
    for (var i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }
    return expectsLowerCase ? function(val) {
      return map[val.toLowerCase()];
    } : function(val) {
      return map[val];
    };
  }
  var isBuiltInTag = makeMap("slot,component", true);
  var isReservedAttribute = makeMap("key,ref,slot,slot-scope,is");
  function remove(arr, item) {
    if (arr.length) {
      var index2 = arr.indexOf(item);
      if (index2 > -1) {
        return arr.splice(index2, 1);
      }
    }
  }
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key);
  }
  function cached(fn) {
    var cache2 = /* @__PURE__ */ Object.create(null);
    return function cachedFn(str2) {
      var hit = cache2[str2];
      return hit || (cache2[str2] = fn(str2));
    };
  }
  var camelizeRE = /-(\w)/g;
  var camelize = cached(function(str2) {
    return str2.replace(camelizeRE, function(_, c) {
      return c ? c.toUpperCase() : "";
    });
  });
  var capitalize = cached(function(str2) {
    return str2.charAt(0).toUpperCase() + str2.slice(1);
  });
  var hyphenateRE = /\B([A-Z])/g;
  var hyphenate = cached(function(str2) {
    return str2.replace(hyphenateRE, "-$1").toLowerCase();
  });
  function polyfillBind(fn, ctx) {
    function boundFn(a) {
      var l = arguments.length;
      return l ? l > 1 ? fn.apply(ctx, arguments) : fn.call(ctx, a) : fn.call(ctx);
    }
    boundFn._length = fn.length;
    return boundFn;
  }
  function nativeBind(fn, ctx) {
    return fn.bind(ctx);
  }
  var bind = Function.prototype.bind ? nativeBind : polyfillBind;
  function toArray(list, start) {
    start = start || 0;
    var i = list.length - start;
    var ret = new Array(i);
    while (i--) {
      ret[i] = list[i + start];
    }
    return ret;
  }
  function extend(to, _from) {
    for (var key in _from) {
      to[key] = _from[key];
    }
    return to;
  }
  function toObject(arr) {
    var res = {};
    for (var i = 0; i < arr.length; i++) {
      if (arr[i]) {
        extend(res, arr[i]);
      }
    }
    return res;
  }
  function noop(a, b, c) {
  }
  var no = function(a, b, c) {
    return false;
  };
  var identity = function(_) {
    return _;
  };
  function genStaticKeys(modules2) {
    return modules2.reduce(function(keys, m) {
      return keys.concat(m.staticKeys || []);
    }, []).join(",");
  }
  function looseEqual(a, b) {
    if (a === b) {
      return true;
    }
    var isObjectA = isObject(a);
    var isObjectB = isObject(b);
    if (isObjectA && isObjectB) {
      try {
        var isArrayA = Array.isArray(a);
        var isArrayB = Array.isArray(b);
        if (isArrayA && isArrayB) {
          return a.length === b.length && a.every(function(e, i) {
            return looseEqual(e, b[i]);
          });
        } else if (a instanceof Date && b instanceof Date) {
          return a.getTime() === b.getTime();
        } else if (!isArrayA && !isArrayB) {
          var keysA = Object.keys(a);
          var keysB = Object.keys(b);
          return keysA.length === keysB.length && keysA.every(function(key) {
            return looseEqual(a[key], b[key]);
          });
        } else {
          return false;
        }
      } catch (e) {
        return false;
      }
    } else if (!isObjectA && !isObjectB) {
      return String(a) === String(b);
    } else {
      return false;
    }
  }
  function looseIndexOf(arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (looseEqual(arr[i], val)) {
        return i;
      }
    }
    return -1;
  }
  function once(fn) {
    var called = false;
    return function() {
      if (!called) {
        called = true;
        fn.apply(this, arguments);
      }
    };
  }
  var SSR_ATTR = "data-server-rendered";
  var ASSET_TYPES = [
    "component",
    "directive",
    "filter"
  ];
  var LIFECYCLE_HOOKS = [
    "beforeCreate",
    "created",
    "beforeMount",
    "mounted",
    "beforeUpdate",
    "updated",
    "beforeDestroy",
    "destroyed",
    "activated",
    "deactivated",
    "errorCaptured",
    "serverPrefetch"
  ];
  var config = {
    optionMergeStrategies: /* @__PURE__ */ Object.create(null),
    silent: false,
    productionTip: false,
    devtools: false,
    performance: false,
    errorHandler: null,
    warnHandler: null,
    ignoredElements: [],
    keyCodes: /* @__PURE__ */ Object.create(null),
    isReservedTag: no,
    isReservedAttr: no,
    isUnknownElement: no,
    getTagNamespace: noop,
    parsePlatformTagName: identity,
    mustUseProp: no,
    async: true,
    _lifecycleHooks: LIFECYCLE_HOOKS
  };
  var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
  function isReserved(str2) {
    var c = (str2 + "").charCodeAt(0);
    return c === 36 || c === 95;
  }
  function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
      value: val,
      enumerable: !!enumerable,
      writable: true,
      configurable: true
    });
  }
  var bailRE = new RegExp("[^" + unicodeRegExp.source + ".$_\\d]");
  function parsePath(path) {
    if (bailRE.test(path)) {
      return;
    }
    var segments = path.split(".");
    return function(obj) {
      for (var i = 0; i < segments.length; i++) {
        if (!obj) {
          return;
        }
        obj = obj[segments[i]];
      }
      return obj;
    };
  }
  var hasProto = "__proto__" in {};
  var inBrowser = typeof window !== "undefined";
  var inWeex = typeof WXEnvironment !== "undefined" && !!WXEnvironment.platform;
  var weexPlatform = inWeex && WXEnvironment.platform.toLowerCase();
  var UA = inBrowser && window.navigator.userAgent.toLowerCase();
  var isIE = UA && /msie|trident/.test(UA);
  var isIE9 = UA && UA.indexOf("msie 9.0") > 0;
  var isEdge = UA && UA.indexOf("edge/") > 0;
  var isAndroid = UA && UA.indexOf("android") > 0 || weexPlatform === "android";
  var isIOS = UA && /iphone|ipad|ipod|ios/.test(UA) || weexPlatform === "ios";
  var isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;
  var isPhantomJS = UA && /phantomjs/.test(UA);
  var isFF = UA && UA.match(/firefox\/(\d+)/);
  var nativeWatch = {}.watch;
  var supportsPassive = false;
  if (inBrowser) {
    try {
      opts = {};
      Object.defineProperty(opts, "passive", {
        get: function get3() {
          supportsPassive = true;
        }
      });
      window.addEventListener("test-passive", null, opts);
    } catch (e) {
    }
  }
  var opts;
  var _isServer;
  var isServerRendering = function() {
    if (_isServer === void 0) {
      if (!inBrowser && !inWeex && typeof global !== "undefined") {
        _isServer = global["process"] && global["process"].env.VUE_ENV === "server";
      } else {
        _isServer = false;
      }
    }
    return _isServer;
  };
  var devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
  function isNative(Ctor) {
    return typeof Ctor === "function" && /native code/.test(Ctor.toString());
  }
  var hasSymbol = typeof Symbol !== "undefined" && isNative(Symbol) && typeof Reflect !== "undefined" && isNative(Reflect.ownKeys);
  var _Set;
  if (typeof Set !== "undefined" && isNative(Set)) {
    _Set = Set;
  } else {
    _Set = /* @__PURE__ */ function() {
      function Set2() {
        this.set = /* @__PURE__ */ Object.create(null);
      }
      Set2.prototype.has = function has3(key) {
        return this.set[key] === true;
      };
      Set2.prototype.add = function add2(key) {
        this.set[key] = true;
      };
      Set2.prototype.clear = function clear() {
        this.set = /* @__PURE__ */ Object.create(null);
      };
      return Set2;
    }();
  }
  var warn = noop;
  if (false) {
    hasConsole = typeof console !== "undefined";
    classifyRE = /(?:^|[-_])(\w)/g;
    classify = function(str2) {
      return str2.replace(classifyRE, function(c) {
        return c.toUpperCase();
      }).replace(/[-_]/g, "");
    };
    warn = function(msg, vm) {
      var trace = vm ? generateComponentTrace(vm) : "";
      if (config.warnHandler) {
        config.warnHandler.call(null, msg, vm, trace);
      } else if (hasConsole && !config.silent) {
        console.error("[Vue warn]: " + msg + trace);
      }
    };
    tip = function(msg, vm) {
      if (hasConsole && !config.silent) {
        console.warn("[Vue tip]: " + msg + (vm ? generateComponentTrace(vm) : ""));
      }
    };
    formatComponentName = function(vm, includeFile) {
      if (vm.$root === vm) {
        return "<Root>";
      }
      var options = typeof vm === "function" && vm.cid != null ? vm.options : vm._isVue ? vm.$options || vm.constructor.options : vm;
      var name = options.name || options._componentTag;
      var file = options.__file;
      if (!name && file) {
        var match = file.match(/([^/\\]+)\.vue$/);
        name = match && match[1];
      }
      return (name ? "<" + classify(name) + ">" : "<Anonymous>") + (file && includeFile !== false ? " at " + file : "");
    };
    repeat = function(str2, n) {
      var res = "";
      while (n) {
        if (n % 2 === 1) {
          res += str2;
        }
        if (n > 1) {
          str2 += str2;
        }
        n >>= 1;
      }
      return res;
    };
    generateComponentTrace = function(vm) {
      if (vm._isVue && vm.$parent) {
        var tree = [];
        var currentRecursiveSequence = 0;
        while (vm) {
          if (tree.length > 0) {
            var last = tree[tree.length - 1];
            if (last.constructor === vm.constructor) {
              currentRecursiveSequence++;
              vm = vm.$parent;
              continue;
            } else if (currentRecursiveSequence > 0) {
              tree[tree.length - 1] = [last, currentRecursiveSequence];
              currentRecursiveSequence = 0;
            }
          }
          tree.push(vm);
          vm = vm.$parent;
        }
        return "\n\nfound in\n\n" + tree.map(function(vm2, i) {
          return "" + (i === 0 ? "---> " : repeat(" ", 5 + i * 2)) + (Array.isArray(vm2) ? formatComponentName(vm2[0]) + "... (" + vm2[1] + " recursive calls)" : formatComponentName(vm2));
        }).join("\n");
      } else {
        return "\n\n(found in " + formatComponentName(vm) + ")";
      }
    };
  }
  var hasConsole;
  var classifyRE;
  var classify;
  var repeat;
  var uid = 0;
  var Dep = function Dep2() {
    this.id = uid++;
    this.subs = [];
  };
  Dep.prototype.addSub = function addSub(sub) {
    this.subs.push(sub);
  };
  Dep.prototype.removeSub = function removeSub(sub) {
    remove(this.subs, sub);
  };
  Dep.prototype.depend = function depend() {
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  };
  Dep.prototype.notify = function notify() {
    var subs = this.subs.slice();
    if (false) {
      subs.sort(function(a, b) {
        return a.id - b.id;
      });
    }
    for (var i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  };
  Dep.target = null;
  var targetStack = [];
  function pushTarget(target2) {
    targetStack.push(target2);
    Dep.target = target2;
  }
  function popTarget() {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
  }
  var VNode = function VNode2(tag, data, children, text2, elm, context, componentOptions, asyncFactory) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text2;
    this.elm = elm;
    this.ns = void 0;
    this.context = context;
    this.fnContext = void 0;
    this.fnOptions = void 0;
    this.fnScopeId = void 0;
    this.key = data && data.key;
    this.componentOptions = componentOptions;
    this.componentInstance = void 0;
    this.parent = void 0;
    this.raw = false;
    this.isStatic = false;
    this.isRootInsert = true;
    this.isComment = false;
    this.isCloned = false;
    this.isOnce = false;
    this.asyncFactory = asyncFactory;
    this.asyncMeta = void 0;
    this.isAsyncPlaceholder = false;
  };
  var prototypeAccessors = { child: { configurable: true } };
  prototypeAccessors.child.get = function() {
    return this.componentInstance;
  };
  Object.defineProperties(VNode.prototype, prototypeAccessors);
  var createEmptyVNode = function(text2) {
    if (text2 === void 0)
      text2 = "";
    var node = new VNode();
    node.text = text2;
    node.isComment = true;
    return node;
  };
  function createTextVNode(val) {
    return new VNode(void 0, void 0, void 0, String(val));
  }
  function cloneVNode(vnode) {
    var cloned = new VNode(vnode.tag, vnode.data, vnode.children && vnode.children.slice(), vnode.text, vnode.elm, vnode.context, vnode.componentOptions, vnode.asyncFactory);
    cloned.ns = vnode.ns;
    cloned.isStatic = vnode.isStatic;
    cloned.key = vnode.key;
    cloned.isComment = vnode.isComment;
    cloned.fnContext = vnode.fnContext;
    cloned.fnOptions = vnode.fnOptions;
    cloned.fnScopeId = vnode.fnScopeId;
    cloned.asyncMeta = vnode.asyncMeta;
    cloned.isCloned = true;
    return cloned;
  }
  var arrayProto = Array.prototype;
  var arrayMethods = Object.create(arrayProto);
  var methodsToPatch = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse"
  ];
  methodsToPatch.forEach(function(method) {
    var original = arrayProto[method];
    def(arrayMethods, method, function mutator() {
      var args = [], len2 = arguments.length;
      while (len2--)
        args[len2] = arguments[len2];
      var result = original.apply(this, args);
      var ob = this.__ob__;
      var inserted2;
      switch (method) {
        case "push":
        case "unshift":
          inserted2 = args;
          break;
        case "splice":
          inserted2 = args.slice(2);
          break;
      }
      if (inserted2) {
        ob.observeArray(inserted2);
      }
      ob.dep.notify();
      return result;
    });
  });
  var arrayKeys = Object.getOwnPropertyNames(arrayMethods);
  var shouldObserve = true;
  function toggleObserving(value) {
    shouldObserve = value;
  }
  var Observer = function Observer2(value) {
    this.value = value;
    this.dep = new Dep();
    this.vmCount = 0;
    def(value, "__ob__", this);
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods);
      } else {
        copyAugment(value, arrayMethods, arrayKeys);
      }
      this.observeArray(value);
    } else {
      this.walk(value);
    }
  };
  Observer.prototype.walk = function walk(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      defineReactive$$1(obj, keys[i]);
    }
  };
  Observer.prototype.observeArray = function observeArray(items) {
    for (var i = 0, l = items.length; i < l; i++) {
      observe(items[i]);
    }
  };
  function protoAugment(target2, src2) {
    target2.__proto__ = src2;
  }
  function copyAugment(target2, src2, keys) {
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      def(target2, key, src2[key]);
    }
  }
  function observe(value, asRootData) {
    if (!isObject(value) || value instanceof VNode) {
      return;
    }
    var ob;
    if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
      ob = value.__ob__;
    } else if (shouldObserve && !isServerRendering() && (Array.isArray(value) || isPlainObject(value)) && Object.isExtensible(value) && !value._isVue) {
      ob = new Observer(value);
    }
    if (asRootData && ob) {
      ob.vmCount++;
    }
    return ob;
  }
  function defineReactive$$1(obj, key, val, customSetter, shallow) {
    var dep = new Dep();
    var property = Object.getOwnPropertyDescriptor(obj, key);
    if (property && property.configurable === false) {
      return;
    }
    var getter = property && property.get;
    var setter = property && property.set;
    if ((!getter || setter) && arguments.length === 2) {
      val = obj[key];
    }
    var childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter() {
        var value = getter ? getter.call(obj) : val;
        if (Dep.target) {
          dep.depend();
          if (childOb) {
            childOb.dep.depend();
            if (Array.isArray(value)) {
              dependArray(value);
            }
          }
        }
        return value;
      },
      set: function reactiveSetter(newVal) {
        var value = getter ? getter.call(obj) : val;
        if (newVal === value || newVal !== newVal && value !== value) {
          return;
        }
        if (false) {
          customSetter();
        }
        if (getter && !setter) {
          return;
        }
        if (setter) {
          setter.call(obj, newVal);
        } else {
          val = newVal;
        }
        childOb = !shallow && observe(newVal);
        dep.notify();
      }
    });
  }
  function set(target2, key, val) {
    if (false) {
      warn("Cannot set reactive property on undefined, null, or primitive value: " + target2);
    }
    if (Array.isArray(target2) && isValidArrayIndex(key)) {
      target2.length = Math.max(target2.length, key);
      target2.splice(key, 1, val);
      return val;
    }
    if (key in target2 && !(key in Object.prototype)) {
      target2[key] = val;
      return val;
    }
    var ob = target2.__ob__;
    if (target2._isVue || ob && ob.vmCount) {
      return val;
    }
    if (!ob) {
      target2[key] = val;
      return val;
    }
    defineReactive$$1(ob.value, key, val);
    ob.dep.notify();
    return val;
  }
  function del(target2, key) {
    if (false) {
      warn("Cannot delete reactive property on undefined, null, or primitive value: " + target2);
    }
    if (Array.isArray(target2) && isValidArrayIndex(key)) {
      target2.splice(key, 1);
      return;
    }
    var ob = target2.__ob__;
    if (target2._isVue || ob && ob.vmCount) {
      return;
    }
    if (!hasOwn(target2, key)) {
      return;
    }
    delete target2[key];
    if (!ob) {
      return;
    }
    ob.dep.notify();
  }
  function dependArray(value) {
    for (var e = void 0, i = 0, l = value.length; i < l; i++) {
      e = value[i];
      e && e.__ob__ && e.__ob__.dep.depend();
      if (Array.isArray(e)) {
        dependArray(e);
      }
    }
  }
  var strats = config.optionMergeStrategies;
  if (false) {
    strats.el = strats.propsData = function(parent, child, vm, key) {
      if (!vm) {
        warn('option "' + key + '" can only be used during instance creation with the `new` keyword.');
      }
      return defaultStrat(parent, child);
    };
  }
  function mergeData(to, from3) {
    if (!from3) {
      return to;
    }
    var key, toVal, fromVal;
    var keys = hasSymbol ? Reflect.ownKeys(from3) : Object.keys(from3);
    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      if (key === "__ob__") {
        continue;
      }
      toVal = to[key];
      fromVal = from3[key];
      if (!hasOwn(to, key)) {
        set(to, key, fromVal);
      } else if (toVal !== fromVal && isPlainObject(toVal) && isPlainObject(fromVal)) {
        mergeData(toVal, fromVal);
      }
    }
    return to;
  }
  function mergeDataOrFn(parentVal, childVal, vm) {
    if (!vm) {
      if (!childVal) {
        return parentVal;
      }
      if (!parentVal) {
        return childVal;
      }
      return function mergedDataFn() {
        return mergeData(typeof childVal === "function" ? childVal.call(this, this) : childVal, typeof parentVal === "function" ? parentVal.call(this, this) : parentVal);
      };
    } else {
      return function mergedInstanceDataFn() {
        var instanceData = typeof childVal === "function" ? childVal.call(vm, vm) : childVal;
        var defaultData = typeof parentVal === "function" ? parentVal.call(vm, vm) : parentVal;
        if (instanceData) {
          return mergeData(instanceData, defaultData);
        } else {
          return defaultData;
        }
      };
    }
  }
  strats.data = function(parentVal, childVal, vm) {
    if (!vm) {
      if (childVal && typeof childVal !== "function") {
        return parentVal;
      }
      return mergeDataOrFn(parentVal, childVal);
    }
    return mergeDataOrFn(parentVal, childVal, vm);
  };
  function mergeHook(parentVal, childVal) {
    var res = childVal ? parentVal ? parentVal.concat(childVal) : Array.isArray(childVal) ? childVal : [childVal] : parentVal;
    return res ? dedupeHooks(res) : res;
  }
  function dedupeHooks(hooks2) {
    var res = [];
    for (var i = 0; i < hooks2.length; i++) {
      if (res.indexOf(hooks2[i]) === -1) {
        res.push(hooks2[i]);
      }
    }
    return res;
  }
  LIFECYCLE_HOOKS.forEach(function(hook) {
    strats[hook] = mergeHook;
  });
  function mergeAssets(parentVal, childVal, vm, key) {
    var res = Object.create(parentVal || null);
    if (childVal) {
      return extend(res, childVal);
    } else {
      return res;
    }
  }
  ASSET_TYPES.forEach(function(type) {
    strats[type + "s"] = mergeAssets;
  });
  strats.watch = function(parentVal, childVal, vm, key) {
    if (parentVal === nativeWatch) {
      parentVal = void 0;
    }
    if (childVal === nativeWatch) {
      childVal = void 0;
    }
    if (!childVal) {
      return Object.create(parentVal || null);
    }
    if (false) {
      assertObjectType(key, childVal, vm);
    }
    if (!parentVal) {
      return childVal;
    }
    var ret = {};
    extend(ret, parentVal);
    for (var key$1 in childVal) {
      var parent = ret[key$1];
      var child = childVal[key$1];
      if (parent && !Array.isArray(parent)) {
        parent = [parent];
      }
      ret[key$1] = parent ? parent.concat(child) : Array.isArray(child) ? child : [child];
    }
    return ret;
  };
  strats.props = strats.methods = strats.inject = strats.computed = function(parentVal, childVal, vm, key) {
    if (childVal && false) {
      assertObjectType(key, childVal, vm);
    }
    if (!parentVal) {
      return childVal;
    }
    var ret = /* @__PURE__ */ Object.create(null);
    extend(ret, parentVal);
    if (childVal) {
      extend(ret, childVal);
    }
    return ret;
  };
  strats.provide = mergeDataOrFn;
  var defaultStrat = function(parentVal, childVal) {
    return childVal === void 0 ? parentVal : childVal;
  };
  function normalizeProps(options, vm) {
    var props2 = options.props;
    if (!props2) {
      return;
    }
    var res = {};
    var i, val, name;
    if (Array.isArray(props2)) {
      i = props2.length;
      while (i--) {
        val = props2[i];
        if (typeof val === "string") {
          name = camelize(val);
          res[name] = { type: null };
        } else if (false) {
          warn("props must be strings when using array syntax.");
        }
      }
    } else if (isPlainObject(props2)) {
      for (var key in props2) {
        val = props2[key];
        name = camelize(key);
        res[name] = isPlainObject(val) ? val : { type: val };
      }
    } else if (false) {
      warn('Invalid value for option "props": expected an Array or an Object, but got ' + toRawType(props2) + ".", vm);
    }
    options.props = res;
  }
  function normalizeInject(options, vm) {
    var inject = options.inject;
    if (!inject) {
      return;
    }
    var normalized = options.inject = {};
    if (Array.isArray(inject)) {
      for (var i = 0; i < inject.length; i++) {
        normalized[inject[i]] = { from: inject[i] };
      }
    } else if (isPlainObject(inject)) {
      for (var key in inject) {
        var val = inject[key];
        normalized[key] = isPlainObject(val) ? extend({ from: key }, val) : { from: val };
      }
    } else if (false) {
      warn('Invalid value for option "inject": expected an Array or an Object, but got ' + toRawType(inject) + ".", vm);
    }
  }
  function normalizeDirectives(options) {
    var dirs = options.directives;
    if (dirs) {
      for (var key in dirs) {
        var def$$1 = dirs[key];
        if (typeof def$$1 === "function") {
          dirs[key] = { bind: def$$1, update: def$$1 };
        }
      }
    }
  }
  function mergeOptions(parent, child, vm) {
    if (false) {
      checkComponents(child);
    }
    if (typeof child === "function") {
      child = child.options;
    }
    normalizeProps(child, vm);
    normalizeInject(child, vm);
    normalizeDirectives(child);
    if (!child._base) {
      if (child.extends) {
        parent = mergeOptions(parent, child.extends, vm);
      }
      if (child.mixins) {
        for (var i = 0, l = child.mixins.length; i < l; i++) {
          parent = mergeOptions(parent, child.mixins[i], vm);
        }
      }
    }
    var options = {};
    var key;
    for (key in parent) {
      mergeField(key);
    }
    for (key in child) {
      if (!hasOwn(parent, key)) {
        mergeField(key);
      }
    }
    function mergeField(key2) {
      var strat = strats[key2] || defaultStrat;
      options[key2] = strat(parent[key2], child[key2], vm, key2);
    }
    return options;
  }
  function resolveAsset(options, type, id, warnMissing) {
    if (typeof id !== "string") {
      return;
    }
    var assets = options[type];
    if (hasOwn(assets, id)) {
      return assets[id];
    }
    var camelizedId = camelize(id);
    if (hasOwn(assets, camelizedId)) {
      return assets[camelizedId];
    }
    var PascalCaseId = capitalize(camelizedId);
    if (hasOwn(assets, PascalCaseId)) {
      return assets[PascalCaseId];
    }
    var res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
    if (false) {
      warn("Failed to resolve " + type.slice(0, -1) + ": " + id, options);
    }
    return res;
  }
  function validateProp(key, propOptions, propsData, vm) {
    var prop = propOptions[key];
    var absent = !hasOwn(propsData, key);
    var value = propsData[key];
    var booleanIndex = getTypeIndex(Boolean, prop.type);
    if (booleanIndex > -1) {
      if (absent && !hasOwn(prop, "default")) {
        value = false;
      } else if (value === "" || value === hyphenate(key)) {
        var stringIndex = getTypeIndex(String, prop.type);
        if (stringIndex < 0 || booleanIndex < stringIndex) {
          value = true;
        }
      }
    }
    if (value === void 0) {
      value = getPropDefaultValue(vm, prop, key);
      var prevShouldObserve = shouldObserve;
      toggleObserving(true);
      observe(value);
      toggleObserving(prevShouldObserve);
    }
    if (false) {
      assertProp(prop, key, value, vm, absent);
    }
    return value;
  }
  function getPropDefaultValue(vm, prop, key) {
    if (!hasOwn(prop, "default")) {
      return void 0;
    }
    var def2 = prop.default;
    if (false) {
      warn('Invalid default value for prop "' + key + '": Props with type Object/Array must use a factory function to return the default value.', vm);
    }
    if (vm && vm.$options.propsData && vm.$options.propsData[key] === void 0 && vm._props[key] !== void 0) {
      return vm._props[key];
    }
    return typeof def2 === "function" && getType(prop.type) !== "Function" ? def2.call(vm) : def2;
  }
  function getType(fn) {
    var match = fn && fn.toString().match(/^\s*function (\w+)/);
    return match ? match[1] : "";
  }
  function isSameType(a, b) {
    return getType(a) === getType(b);
  }
  function getTypeIndex(type, expectedTypes) {
    if (!Array.isArray(expectedTypes)) {
      return isSameType(expectedTypes, type) ? 0 : -1;
    }
    for (var i = 0, len2 = expectedTypes.length; i < len2; i++) {
      if (isSameType(expectedTypes[i], type)) {
        return i;
      }
    }
    return -1;
  }
  function handleError(err, vm, info) {
    pushTarget();
    try {
      if (vm) {
        var cur = vm;
        while (cur = cur.$parent) {
          var hooks2 = cur.$options.errorCaptured;
          if (hooks2) {
            for (var i = 0; i < hooks2.length; i++) {
              try {
                var capture = hooks2[i].call(cur, err, vm, info) === false;
                if (capture) {
                  return;
                }
              } catch (e) {
                globalHandleError(e, cur, "errorCaptured hook");
              }
            }
          }
        }
      }
      globalHandleError(err, vm, info);
    } finally {
      popTarget();
    }
  }
  function invokeWithErrorHandling(handler, context, args, vm, info) {
    var res;
    try {
      res = args ? handler.apply(context, args) : handler.call(context);
      if (res && !res._isVue && isPromise(res) && !res._handled) {
        res.catch(function(e) {
          return handleError(e, vm, info + " (Promise/async)");
        });
        res._handled = true;
      }
    } catch (e) {
      handleError(e, vm, info);
    }
    return res;
  }
  function globalHandleError(err, vm, info) {
    if (config.errorHandler) {
      try {
        return config.errorHandler.call(null, err, vm, info);
      } catch (e) {
        if (e !== err) {
          logError(e, null, "config.errorHandler");
        }
      }
    }
    logError(err, vm, info);
  }
  function logError(err, vm, info) {
    if (false) {
      warn("Error in " + info + ': "' + err.toString() + '"', vm);
    }
    if ((inBrowser || inWeex) && typeof console !== "undefined") {
      console.error(err);
    } else {
      throw err;
    }
  }
  var isUsingMicroTask = false;
  var callbacks = [];
  var pending = false;
  function flushCallbacks() {
    pending = false;
    var copies = callbacks.slice(0);
    callbacks.length = 0;
    for (var i = 0; i < copies.length; i++) {
      copies[i]();
    }
  }
  var timerFunc;
  if (typeof Promise !== "undefined" && isNative(Promise)) {
    p = Promise.resolve();
    timerFunc = function() {
      p.then(flushCallbacks);
      if (isIOS) {
        setTimeout(noop);
      }
    };
    isUsingMicroTask = true;
  } else if (!isIE && typeof MutationObserver !== "undefined" && (isNative(MutationObserver) || MutationObserver.toString() === "[object MutationObserverConstructor]")) {
    counter = 1;
    observer = new MutationObserver(flushCallbacks);
    textNode = document.createTextNode(String(counter));
    observer.observe(textNode, {
      characterData: true
    });
    timerFunc = function() {
      counter = (counter + 1) % 2;
      textNode.data = String(counter);
    };
    isUsingMicroTask = true;
  } else if (typeof setImmediate !== "undefined" && isNative(setImmediate)) {
    timerFunc = function() {
      setImmediate(flushCallbacks);
    };
  } else {
    timerFunc = function() {
      setTimeout(flushCallbacks, 0);
    };
  }
  var p;
  var counter;
  var observer;
  var textNode;
  function nextTick(cb, ctx) {
    var _resolve;
    callbacks.push(function() {
      if (cb) {
        try {
          cb.call(ctx);
        } catch (e) {
          handleError(e, ctx, "nextTick");
        }
      } else if (_resolve) {
        _resolve(ctx);
      }
    });
    if (!pending) {
      pending = true;
      timerFunc();
    }
    if (!cb && typeof Promise !== "undefined") {
      return new Promise(function(resolve) {
        _resolve = resolve;
      });
    }
  }
  if (false) {
    perf = inBrowser && window.performance;
    if (perf && perf.mark && perf.measure && perf.clearMarks && perf.clearMeasures) {
      mark = function(tag) {
        return perf.mark(tag);
      };
      measure = function(name, startTag, endTag2) {
        perf.measure(name, startTag, endTag2);
        perf.clearMarks(startTag);
        perf.clearMarks(endTag2);
      };
    }
  }
  var perf;
  if (false) {
    allowedGlobals = makeMap("Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,require");
    warnNonPresent = function(target2, key) {
      warn('Property or method "' + key + '" is not defined on the instance but referenced during render. Make sure that this property is reactive, either in the data option, or for class-based components, by initializing the property. See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.', target2);
    };
    warnReservedPrefix = function(target2, key) {
      warn('Property "' + key + '" must be accessed with "$data.' + key + '" because properties starting with "$" or "_" are not proxied in the Vue instance to prevent conflicts with Vue internals. See: https://vuejs.org/v2/api/#data', target2);
    };
    hasProxy = typeof Proxy !== "undefined" && isNative(Proxy);
    if (hasProxy) {
      isBuiltInModifier = makeMap("stop,prevent,self,ctrl,shift,alt,meta,exact");
      config.keyCodes = new Proxy(config.keyCodes, {
        set: function set2(target2, key, value) {
          if (isBuiltInModifier(key)) {
            warn("Avoid overwriting built-in modifier in config.keyCodes: ." + key);
            return false;
          } else {
            target2[key] = value;
            return true;
          }
        }
      });
    }
    hasHandler = {
      has: function has3(target2, key) {
        var has4 = key in target2;
        var isAllowed = allowedGlobals(key) || typeof key === "string" && key.charAt(0) === "_" && !(key in target2.$data);
        if (!has4 && !isAllowed) {
          if (key in target2.$data) {
            warnReservedPrefix(target2, key);
          } else {
            warnNonPresent(target2, key);
          }
        }
        return has4 || !isAllowed;
      }
    };
    getHandler = {
      get: function get3(target2, key) {
        if (typeof key === "string" && !(key in target2)) {
          if (key in target2.$data) {
            warnReservedPrefix(target2, key);
          } else {
            warnNonPresent(target2, key);
          }
        }
        return target2[key];
      }
    };
    initProxy = function initProxy(vm) {
      if (hasProxy) {
        var options = vm.$options;
        var handlers = options.render && options.render._withStripped ? getHandler : hasHandler;
        vm._renderProxy = new Proxy(vm, handlers);
      } else {
        vm._renderProxy = vm;
      }
    };
  }
  var allowedGlobals;
  var warnNonPresent;
  var warnReservedPrefix;
  var hasProxy;
  var isBuiltInModifier;
  var hasHandler;
  var getHandler;
  var seenObjects = new _Set();
  function traverse(val) {
    _traverse(val, seenObjects);
    seenObjects.clear();
  }
  function _traverse(val, seen) {
    var i, keys;
    var isA = Array.isArray(val);
    if (!isA && !isObject(val) || Object.isFrozen(val) || val instanceof VNode) {
      return;
    }
    if (val.__ob__) {
      var depId = val.__ob__.dep.id;
      if (seen.has(depId)) {
        return;
      }
      seen.add(depId);
    }
    if (isA) {
      i = val.length;
      while (i--) {
        _traverse(val[i], seen);
      }
    } else {
      keys = Object.keys(val);
      i = keys.length;
      while (i--) {
        _traverse(val[keys[i]], seen);
      }
    }
  }
  var normalizeEvent = cached(function(name) {
    var passive = name.charAt(0) === "&";
    name = passive ? name.slice(1) : name;
    var once$$1 = name.charAt(0) === "~";
    name = once$$1 ? name.slice(1) : name;
    var capture = name.charAt(0) === "!";
    name = capture ? name.slice(1) : name;
    return {
      name,
      once: once$$1,
      capture,
      passive
    };
  });
  function createFnInvoker(fns, vm) {
    function invoker() {
      var arguments$1 = arguments;
      var fns2 = invoker.fns;
      if (Array.isArray(fns2)) {
        var cloned = fns2.slice();
        for (var i = 0; i < cloned.length; i++) {
          invokeWithErrorHandling(cloned[i], null, arguments$1, vm, "v-on handler");
        }
      } else {
        return invokeWithErrorHandling(fns2, null, arguments, vm, "v-on handler");
      }
    }
    invoker.fns = fns;
    return invoker;
  }
  function updateListeners(on2, oldOn, add2, remove$$12, createOnceHandler2, vm) {
    var name, def$$1, cur, old, event;
    for (name in on2) {
      def$$1 = cur = on2[name];
      old = oldOn[name];
      event = normalizeEvent(name);
      if (isUndef(cur)) {
      } else if (isUndef(old)) {
        if (isUndef(cur.fns)) {
          cur = on2[name] = createFnInvoker(cur, vm);
        }
        if (isTrue(event.once)) {
          cur = on2[name] = createOnceHandler2(event.name, cur, event.capture);
        }
        add2(event.name, cur, event.capture, event.passive, event.params);
      } else if (cur !== old) {
        old.fns = cur;
        on2[name] = old;
      }
    }
    for (name in oldOn) {
      if (isUndef(on2[name])) {
        event = normalizeEvent(name);
        remove$$12(event.name, oldOn[name], event.capture);
      }
    }
  }
  function mergeVNodeHook(def2, hookKey, hook) {
    if (def2 instanceof VNode) {
      def2 = def2.data.hook || (def2.data.hook = {});
    }
    var invoker;
    var oldHook = def2[hookKey];
    function wrappedHook() {
      hook.apply(this, arguments);
      remove(invoker.fns, wrappedHook);
    }
    if (isUndef(oldHook)) {
      invoker = createFnInvoker([wrappedHook]);
    } else {
      if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
        invoker = oldHook;
        invoker.fns.push(wrappedHook);
      } else {
        invoker = createFnInvoker([oldHook, wrappedHook]);
      }
    }
    invoker.merged = true;
    def2[hookKey] = invoker;
  }
  function extractPropsFromVNodeData(data, Ctor, tag) {
    var propOptions = Ctor.options.props;
    if (isUndef(propOptions)) {
      return;
    }
    var res = {};
    var attrs2 = data.attrs;
    var props2 = data.props;
    if (isDef(attrs2) || isDef(props2)) {
      for (var key in propOptions) {
        var altKey = hyphenate(key);
        if (false) {
          var keyInLowerCase = key.toLowerCase();
          if (key !== keyInLowerCase && attrs2 && hasOwn(attrs2, keyInLowerCase)) {
            tip('Prop "' + keyInLowerCase + '" is passed to component ' + formatComponentName(tag || Ctor) + ', but the declared prop name is "' + key + '". Note that HTML attributes are case-insensitive and camelCased props need to use their kebab-case equivalents when using in-DOM templates. You should probably use "' + altKey + '" instead of "' + key + '".');
          }
        }
        checkProp(res, props2, key, altKey, true) || checkProp(res, attrs2, key, altKey, false);
      }
    }
    return res;
  }
  function checkProp(res, hash2, key, altKey, preserve) {
    if (isDef(hash2)) {
      if (hasOwn(hash2, key)) {
        res[key] = hash2[key];
        if (!preserve) {
          delete hash2[key];
        }
        return true;
      } else if (hasOwn(hash2, altKey)) {
        res[key] = hash2[altKey];
        if (!preserve) {
          delete hash2[altKey];
        }
        return true;
      }
    }
    return false;
  }
  function simpleNormalizeChildren(children) {
    for (var i = 0; i < children.length; i++) {
      if (Array.isArray(children[i])) {
        return Array.prototype.concat.apply([], children);
      }
    }
    return children;
  }
  function normalizeChildren(children) {
    return isPrimitive(children) ? [createTextVNode(children)] : Array.isArray(children) ? normalizeArrayChildren(children) : void 0;
  }
  function isTextNode(node) {
    return isDef(node) && isDef(node.text) && isFalse(node.isComment);
  }
  function normalizeArrayChildren(children, nestedIndex) {
    var res = [];
    var i, c, lastIndex, last;
    for (i = 0; i < children.length; i++) {
      c = children[i];
      if (isUndef(c) || typeof c === "boolean") {
        continue;
      }
      lastIndex = res.length - 1;
      last = res[lastIndex];
      if (Array.isArray(c)) {
        if (c.length > 0) {
          c = normalizeArrayChildren(c, (nestedIndex || "") + "_" + i);
          if (isTextNode(c[0]) && isTextNode(last)) {
            res[lastIndex] = createTextVNode(last.text + c[0].text);
            c.shift();
          }
          res.push.apply(res, c);
        }
      } else if (isPrimitive(c)) {
        if (isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + c);
        } else if (c !== "") {
          res.push(createTextVNode(c));
        }
      } else {
        if (isTextNode(c) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + c.text);
        } else {
          if (isTrue(children._isVList) && isDef(c.tag) && isUndef(c.key) && isDef(nestedIndex)) {
            c.key = "__vlist" + nestedIndex + "_" + i + "__";
          }
          res.push(c);
        }
      }
    }
    return res;
  }
  function initProvide(vm) {
    var provide = vm.$options.provide;
    if (provide) {
      vm._provided = typeof provide === "function" ? provide.call(vm) : provide;
    }
  }
  function initInjections(vm) {
    var result = resolveInject(vm.$options.inject, vm);
    if (result) {
      toggleObserving(false);
      Object.keys(result).forEach(function(key) {
        if (false) {
          defineReactive$$1(vm, key, result[key], function() {
            warn('Avoid mutating an injected value directly since the changes will be overwritten whenever the provided component re-renders. injection being mutated: "' + key + '"', vm);
          });
        } else {
          defineReactive$$1(vm, key, result[key]);
        }
      });
      toggleObserving(true);
    }
  }
  function resolveInject(inject, vm) {
    if (inject) {
      var result = /* @__PURE__ */ Object.create(null);
      var keys = hasSymbol ? Reflect.ownKeys(inject) : Object.keys(inject);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key === "__ob__") {
          continue;
        }
        var provideKey = inject[key].from;
        var source = vm;
        while (source) {
          if (source._provided && hasOwn(source._provided, provideKey)) {
            result[key] = source._provided[provideKey];
            break;
          }
          source = source.$parent;
        }
        if (!source) {
          if ("default" in inject[key]) {
            var provideDefault = inject[key].default;
            result[key] = typeof provideDefault === "function" ? provideDefault.call(vm) : provideDefault;
          } else if (false) {
            warn('Injection "' + key + '" not found', vm);
          }
        }
      }
      return result;
    }
  }
  function resolveSlots(children, context) {
    if (!children || !children.length) {
      return {};
    }
    var slots = {};
    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i];
      var data = child.data;
      if (data && data.attrs && data.attrs.slot) {
        delete data.attrs.slot;
      }
      if ((child.context === context || child.fnContext === context) && data && data.slot != null) {
        var name = data.slot;
        var slot = slots[name] || (slots[name] = []);
        if (child.tag === "template") {
          slot.push.apply(slot, child.children || []);
        } else {
          slot.push(child);
        }
      } else {
        (slots.default || (slots.default = [])).push(child);
      }
    }
    for (var name$1 in slots) {
      if (slots[name$1].every(isWhitespace)) {
        delete slots[name$1];
      }
    }
    return slots;
  }
  function isWhitespace(node) {
    return node.isComment && !node.asyncFactory || node.text === " ";
  }
  function normalizeScopedSlots(slots, normalSlots, prevSlots) {
    var res;
    var hasNormalSlots = Object.keys(normalSlots).length > 0;
    var isStable = slots ? !!slots.$stable : !hasNormalSlots;
    var key = slots && slots.$key;
    if (!slots) {
      res = {};
    } else if (slots._normalized) {
      return slots._normalized;
    } else if (isStable && prevSlots && prevSlots !== emptyObject && key === prevSlots.$key && !hasNormalSlots && !prevSlots.$hasNormal) {
      return prevSlots;
    } else {
      res = {};
      for (var key$1 in slots) {
        if (slots[key$1] && key$1[0] !== "$") {
          res[key$1] = normalizeScopedSlot(normalSlots, key$1, slots[key$1]);
        }
      }
    }
    for (var key$2 in normalSlots) {
      if (!(key$2 in res)) {
        res[key$2] = proxyNormalSlot(normalSlots, key$2);
      }
    }
    if (slots && Object.isExtensible(slots)) {
      slots._normalized = res;
    }
    def(res, "$stable", isStable);
    def(res, "$key", key);
    def(res, "$hasNormal", hasNormalSlots);
    return res;
  }
  function normalizeScopedSlot(normalSlots, key, fn) {
    var normalized = function() {
      var res = arguments.length ? fn.apply(null, arguments) : fn({});
      res = res && typeof res === "object" && !Array.isArray(res) ? [res] : normalizeChildren(res);
      return res && (res.length === 0 || res.length === 1 && res[0].isComment) ? void 0 : res;
    };
    if (fn.proxy) {
      Object.defineProperty(normalSlots, key, {
        get: normalized,
        enumerable: true,
        configurable: true
      });
    }
    return normalized;
  }
  function proxyNormalSlot(slots, key) {
    return function() {
      return slots[key];
    };
  }
  function renderList(val, render4) {
    var ret, i, l, keys, key;
    if (Array.isArray(val) || typeof val === "string") {
      ret = new Array(val.length);
      for (i = 0, l = val.length; i < l; i++) {
        ret[i] = render4(val[i], i);
      }
    } else if (typeof val === "number") {
      ret = new Array(val);
      for (i = 0; i < val; i++) {
        ret[i] = render4(i + 1, i);
      }
    } else if (isObject(val)) {
      if (hasSymbol && val[Symbol.iterator]) {
        ret = [];
        var iterator = val[Symbol.iterator]();
        var result = iterator.next();
        while (!result.done) {
          ret.push(render4(result.value, ret.length));
          result = iterator.next();
        }
      } else {
        keys = Object.keys(val);
        ret = new Array(keys.length);
        for (i = 0, l = keys.length; i < l; i++) {
          key = keys[i];
          ret[i] = render4(val[key], key, i);
        }
      }
    }
    if (!isDef(ret)) {
      ret = [];
    }
    ret._isVList = true;
    return ret;
  }
  function renderSlot(name, fallback, props2, bindObject) {
    var scopedSlotFn = this.$scopedSlots[name];
    var nodes;
    if (scopedSlotFn) {
      props2 = props2 || {};
      if (bindObject) {
        if (false) {
          warn("slot v-bind without argument expects an Object", this);
        }
        props2 = extend(extend({}, bindObject), props2);
      }
      nodes = scopedSlotFn(props2) || fallback;
    } else {
      nodes = this.$slots[name] || fallback;
    }
    var target2 = props2 && props2.slot;
    if (target2) {
      return this.$createElement("template", { slot: target2 }, nodes);
    } else {
      return nodes;
    }
  }
  function resolveFilter(id) {
    return resolveAsset(this.$options, "filters", id, true) || identity;
  }
  function isKeyNotMatch(expect, actual) {
    if (Array.isArray(expect)) {
      return expect.indexOf(actual) === -1;
    } else {
      return expect !== actual;
    }
  }
  function checkKeyCodes(eventKeyCode, key, builtInKeyCode, eventKeyName, builtInKeyName) {
    var mappedKeyCode = config.keyCodes[key] || builtInKeyCode;
    if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
      return isKeyNotMatch(builtInKeyName, eventKeyName);
    } else if (mappedKeyCode) {
      return isKeyNotMatch(mappedKeyCode, eventKeyCode);
    } else if (eventKeyName) {
      return hyphenate(eventKeyName) !== key;
    }
  }
  function bindObjectProps(data, tag, value, asProp, isSync) {
    if (value) {
      if (!isObject(value)) {
      } else {
        if (Array.isArray(value)) {
          value = toObject(value);
        }
        var hash2;
        var loop = function(key2) {
          if (key2 === "class" || key2 === "style" || isReservedAttribute(key2)) {
            hash2 = data;
          } else {
            var type = data.attrs && data.attrs.type;
            hash2 = asProp || config.mustUseProp(tag, type, key2) ? data.domProps || (data.domProps = {}) : data.attrs || (data.attrs = {});
          }
          var camelizedKey = camelize(key2);
          var hyphenatedKey = hyphenate(key2);
          if (!(camelizedKey in hash2) && !(hyphenatedKey in hash2)) {
            hash2[key2] = value[key2];
            if (isSync) {
              var on2 = data.on || (data.on = {});
              on2["update:" + key2] = function($event) {
                value[key2] = $event;
              };
            }
          }
        };
        for (var key in value)
          loop(key);
      }
    }
    return data;
  }
  function renderStatic(index2, isInFor) {
    var cached2 = this._staticTrees || (this._staticTrees = []);
    var tree = cached2[index2];
    if (tree && !isInFor) {
      return tree;
    }
    tree = cached2[index2] = this.$options.staticRenderFns[index2].call(this._renderProxy, null, this);
    markStatic(tree, "__static__" + index2, false);
    return tree;
  }
  function markOnce(tree, index2, key) {
    markStatic(tree, "__once__" + index2 + (key ? "_" + key : ""), true);
    return tree;
  }
  function markStatic(tree, key, isOnce) {
    if (Array.isArray(tree)) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i] && typeof tree[i] !== "string") {
          markStaticNode(tree[i], key + "_" + i, isOnce);
        }
      }
    } else {
      markStaticNode(tree, key, isOnce);
    }
  }
  function markStaticNode(node, key, isOnce) {
    node.isStatic = true;
    node.key = key;
    node.isOnce = isOnce;
  }
  function bindObjectListeners(data, value) {
    if (value) {
      if (!isPlainObject(value)) {
      } else {
        var on2 = data.on = data.on ? extend({}, data.on) : {};
        for (var key in value) {
          var existing = on2[key];
          var ours = value[key];
          on2[key] = existing ? [].concat(existing, ours) : ours;
        }
      }
    }
    return data;
  }
  function resolveScopedSlots(fns, res, hasDynamicKeys, contentHashKey) {
    res = res || { $stable: !hasDynamicKeys };
    for (var i = 0; i < fns.length; i++) {
      var slot = fns[i];
      if (Array.isArray(slot)) {
        resolveScopedSlots(slot, res, hasDynamicKeys);
      } else if (slot) {
        if (slot.proxy) {
          slot.fn.proxy = true;
        }
        res[slot.key] = slot.fn;
      }
    }
    if (contentHashKey) {
      res.$key = contentHashKey;
    }
    return res;
  }
  function bindDynamicKeys(baseObj, values) {
    for (var i = 0; i < values.length; i += 2) {
      var key = values[i];
      if (typeof key === "string" && key) {
        baseObj[values[i]] = values[i + 1];
      } else if (false) {
        warn("Invalid value for dynamic directive argument (expected string or null): " + key, this);
      }
    }
    return baseObj;
  }
  function prependModifier(value, symbol) {
    return typeof value === "string" ? symbol + value : value;
  }
  function installRenderHelpers(target2) {
    target2._o = markOnce;
    target2._n = toNumber;
    target2._s = toString;
    target2._l = renderList;
    target2._t = renderSlot;
    target2._q = looseEqual;
    target2._i = looseIndexOf;
    target2._m = renderStatic;
    target2._f = resolveFilter;
    target2._k = checkKeyCodes;
    target2._b = bindObjectProps;
    target2._v = createTextVNode;
    target2._e = createEmptyVNode;
    target2._u = resolveScopedSlots;
    target2._g = bindObjectListeners;
    target2._d = bindDynamicKeys;
    target2._p = prependModifier;
  }
  function FunctionalRenderContext(data, props2, children, parent, Ctor) {
    var this$1 = this;
    var options = Ctor.options;
    var contextVm;
    if (hasOwn(parent, "_uid")) {
      contextVm = Object.create(parent);
      contextVm._original = parent;
    } else {
      contextVm = parent;
      parent = parent._original;
    }
    var isCompiled = isTrue(options._compiled);
    var needNormalization = !isCompiled;
    this.data = data;
    this.props = props2;
    this.children = children;
    this.parent = parent;
    this.listeners = data.on || emptyObject;
    this.injections = resolveInject(options.inject, parent);
    this.slots = function() {
      if (!this$1.$slots) {
        normalizeScopedSlots(data.scopedSlots, this$1.$slots = resolveSlots(children, parent));
      }
      return this$1.$slots;
    };
    Object.defineProperty(this, "scopedSlots", {
      enumerable: true,
      get: function get3() {
        return normalizeScopedSlots(data.scopedSlots, this.slots());
      }
    });
    if (isCompiled) {
      this.$options = options;
      this.$slots = this.slots();
      this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots);
    }
    if (options._scopeId) {
      this._c = function(a, b, c, d) {
        var vnode = createElement(contextVm, a, b, c, d, needNormalization);
        if (vnode && !Array.isArray(vnode)) {
          vnode.fnScopeId = options._scopeId;
          vnode.fnContext = parent;
        }
        return vnode;
      };
    } else {
      this._c = function(a, b, c, d) {
        return createElement(contextVm, a, b, c, d, needNormalization);
      };
    }
  }
  installRenderHelpers(FunctionalRenderContext.prototype);
  function createFunctionalComponent(Ctor, propsData, data, contextVm, children) {
    var options = Ctor.options;
    var props2 = {};
    var propOptions = options.props;
    if (isDef(propOptions)) {
      for (var key in propOptions) {
        props2[key] = validateProp(key, propOptions, propsData || emptyObject);
      }
    } else {
      if (isDef(data.attrs)) {
        mergeProps(props2, data.attrs);
      }
      if (isDef(data.props)) {
        mergeProps(props2, data.props);
      }
    }
    var renderContext = new FunctionalRenderContext(data, props2, children, contextVm, Ctor);
    var vnode = options.render.call(null, renderContext._c, renderContext);
    if (vnode instanceof VNode) {
      return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext);
    } else if (Array.isArray(vnode)) {
      var vnodes = normalizeChildren(vnode) || [];
      var res = new Array(vnodes.length);
      for (var i = 0; i < vnodes.length; i++) {
        res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext);
      }
      return res;
    }
  }
  function cloneAndMarkFunctionalResult(vnode, data, contextVm, options, renderContext) {
    var clone = cloneVNode(vnode);
    clone.fnContext = contextVm;
    clone.fnOptions = options;
    if (false) {
      (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext;
    }
    if (data.slot) {
      (clone.data || (clone.data = {})).slot = data.slot;
    }
    return clone;
  }
  function mergeProps(to, from3) {
    for (var key in from3) {
      to[camelize(key)] = from3[key];
    }
  }
  var componentVNodeHooks = {
    init: function init(vnode, hydrating) {
      if (vnode.componentInstance && !vnode.componentInstance._isDestroyed && vnode.data.keepAlive) {
        var mountedNode = vnode;
        componentVNodeHooks.prepatch(mountedNode, mountedNode);
      } else {
        var child = vnode.componentInstance = createComponentInstanceForVnode(vnode, activeInstance);
        child.$mount(hydrating ? vnode.elm : void 0, hydrating);
      }
    },
    prepatch: function prepatch(oldVnode, vnode) {
      var options = vnode.componentOptions;
      var child = vnode.componentInstance = oldVnode.componentInstance;
      updateChildComponent(child, options.propsData, options.listeners, vnode, options.children);
    },
    insert: function insert(vnode) {
      var context = vnode.context;
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isMounted) {
        componentInstance._isMounted = true;
        callHook(componentInstance, "mounted");
      }
      if (vnode.data.keepAlive) {
        if (context._isMounted) {
          queueActivatedComponent(componentInstance);
        } else {
          activateChildComponent(componentInstance, true);
        }
      }
    },
    destroy: function destroy(vnode) {
      var componentInstance = vnode.componentInstance;
      if (!componentInstance._isDestroyed) {
        if (!vnode.data.keepAlive) {
          componentInstance.$destroy();
        } else {
          deactivateChildComponent(componentInstance, true);
        }
      }
    }
  };
  var hooksToMerge = Object.keys(componentVNodeHooks);
  function createComponent(Ctor, data, context, children, tag) {
    if (isUndef(Ctor)) {
      return;
    }
    var baseCtor = context.$options._base;
    if (isObject(Ctor)) {
      Ctor = baseCtor.extend(Ctor);
    }
    if (typeof Ctor !== "function") {
      if (false) {
        warn("Invalid Component definition: " + String(Ctor), context);
      }
      return;
    }
    var asyncFactory;
    if (isUndef(Ctor.cid)) {
      asyncFactory = Ctor;
      Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
      if (Ctor === void 0) {
        return createAsyncPlaceholder(asyncFactory, data, context, children, tag);
      }
    }
    data = data || {};
    resolveConstructorOptions(Ctor);
    if (isDef(data.model)) {
      transformModel(Ctor.options, data);
    }
    var propsData = extractPropsFromVNodeData(data, Ctor, tag);
    if (isTrue(Ctor.options.functional)) {
      return createFunctionalComponent(Ctor, propsData, data, context, children);
    }
    var listeners = data.on;
    data.on = data.nativeOn;
    if (isTrue(Ctor.options.abstract)) {
      var slot = data.slot;
      data = {};
      if (slot) {
        data.slot = slot;
      }
    }
    installComponentHooks(data);
    var name = Ctor.options.name || tag;
    var vnode = new VNode("vue-component-" + Ctor.cid + (name ? "-" + name : ""), data, void 0, void 0, void 0, context, { Ctor, propsData, listeners, tag, children }, asyncFactory);
    return vnode;
  }
  function createComponentInstanceForVnode(vnode, parent) {
    var options = {
      _isComponent: true,
      _parentVnode: vnode,
      parent
    };
    var inlineTemplate = vnode.data.inlineTemplate;
    if (isDef(inlineTemplate)) {
      options.render = inlineTemplate.render;
      options.staticRenderFns = inlineTemplate.staticRenderFns;
    }
    return new vnode.componentOptions.Ctor(options);
  }
  function installComponentHooks(data) {
    var hooks2 = data.hook || (data.hook = {});
    for (var i = 0; i < hooksToMerge.length; i++) {
      var key = hooksToMerge[i];
      var existing = hooks2[key];
      var toMerge = componentVNodeHooks[key];
      if (existing !== toMerge && !(existing && existing._merged)) {
        hooks2[key] = existing ? mergeHook$1(toMerge, existing) : toMerge;
      }
    }
  }
  function mergeHook$1(f1, f2) {
    var merged = function(a, b) {
      f1(a, b);
      f2(a, b);
    };
    merged._merged = true;
    return merged;
  }
  function transformModel(options, data) {
    var prop = options.model && options.model.prop || "value";
    var event = options.model && options.model.event || "input";
    (data.attrs || (data.attrs = {}))[prop] = data.model.value;
    var on2 = data.on || (data.on = {});
    var existing = on2[event];
    var callback = data.model.callback;
    if (isDef(existing)) {
      if (Array.isArray(existing) ? existing.indexOf(callback) === -1 : existing !== callback) {
        on2[event] = [callback].concat(existing);
      }
    } else {
      on2[event] = callback;
    }
  }
  var SIMPLE_NORMALIZE = 1;
  var ALWAYS_NORMALIZE = 2;
  function createElement(context, tag, data, children, normalizationType, alwaysNormalize) {
    if (Array.isArray(data) || isPrimitive(data)) {
      normalizationType = children;
      children = data;
      data = void 0;
    }
    if (isTrue(alwaysNormalize)) {
      normalizationType = ALWAYS_NORMALIZE;
    }
    return _createElement(context, tag, data, children, normalizationType);
  }
  function _createElement(context, tag, data, children, normalizationType) {
    if (isDef(data) && isDef(data.__ob__)) {
      return createEmptyVNode();
    }
    if (isDef(data) && isDef(data.is)) {
      tag = data.is;
    }
    if (!tag) {
      return createEmptyVNode();
    }
    if (false) {
      {
        warn("Avoid using non-primitive value as key, use string/number value instead.", context);
      }
    }
    if (Array.isArray(children) && typeof children[0] === "function") {
      data = data || {};
      data.scopedSlots = { default: children[0] };
      children.length = 0;
    }
    if (normalizationType === ALWAYS_NORMALIZE) {
      children = normalizeChildren(children);
    } else if (normalizationType === SIMPLE_NORMALIZE) {
      children = simpleNormalizeChildren(children);
    }
    var vnode, ns;
    if (typeof tag === "string") {
      var Ctor;
      ns = context.$vnode && context.$vnode.ns || config.getTagNamespace(tag);
      if (config.isReservedTag(tag)) {
        if (false) {
          warn("The .native modifier for v-on is only valid on components but it was used on <" + tag + ">.", context);
        }
        vnode = new VNode(config.parsePlatformTagName(tag), data, children, void 0, void 0, context);
      } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, "components", tag))) {
        vnode = createComponent(Ctor, data, context, children, tag);
      } else {
        vnode = new VNode(tag, data, children, void 0, void 0, context);
      }
    } else {
      vnode = createComponent(tag, data, context, children);
    }
    if (Array.isArray(vnode)) {
      return vnode;
    } else if (isDef(vnode)) {
      if (isDef(ns)) {
        applyNS(vnode, ns);
      }
      if (isDef(data)) {
        registerDeepBindings(data);
      }
      return vnode;
    } else {
      return createEmptyVNode();
    }
  }
  function applyNS(vnode, ns, force) {
    vnode.ns = ns;
    if (vnode.tag === "foreignObject") {
      ns = void 0;
      force = true;
    }
    if (isDef(vnode.children)) {
      for (var i = 0, l = vnode.children.length; i < l; i++) {
        var child = vnode.children[i];
        if (isDef(child.tag) && (isUndef(child.ns) || isTrue(force) && child.tag !== "svg")) {
          applyNS(child, ns, force);
        }
      }
    }
  }
  function registerDeepBindings(data) {
    if (isObject(data.style)) {
      traverse(data.style);
    }
    if (isObject(data.class)) {
      traverse(data.class);
    }
  }
  function initRender(vm) {
    vm._vnode = null;
    vm._staticTrees = null;
    var options = vm.$options;
    var parentVnode = vm.$vnode = options._parentVnode;
    var renderContext = parentVnode && parentVnode.context;
    vm.$slots = resolveSlots(options._renderChildren, renderContext);
    vm.$scopedSlots = emptyObject;
    vm._c = function(a, b, c, d) {
      return createElement(vm, a, b, c, d, false);
    };
    vm.$createElement = function(a, b, c, d) {
      return createElement(vm, a, b, c, d, true);
    };
    var parentData = parentVnode && parentVnode.data;
    if (false) {
      defineReactive$$1(vm, "$attrs", parentData && parentData.attrs || emptyObject, function() {
        !isUpdatingChildComponent && warn("$attrs is readonly.", vm);
      }, true);
      defineReactive$$1(vm, "$listeners", options._parentListeners || emptyObject, function() {
        !isUpdatingChildComponent && warn("$listeners is readonly.", vm);
      }, true);
    } else {
      defineReactive$$1(vm, "$attrs", parentData && parentData.attrs || emptyObject, null, true);
      defineReactive$$1(vm, "$listeners", options._parentListeners || emptyObject, null, true);
    }
  }
  var currentRenderingInstance = null;
  function renderMixin(Vue2) {
    installRenderHelpers(Vue2.prototype);
    Vue2.prototype.$nextTick = function(fn) {
      return nextTick(fn, this);
    };
    Vue2.prototype._render = function() {
      var vm = this;
      var ref2 = vm.$options;
      var render4 = ref2.render;
      var _parentVnode = ref2._parentVnode;
      if (_parentVnode) {
        vm.$scopedSlots = normalizeScopedSlots(_parentVnode.data.scopedSlots, vm.$slots, vm.$scopedSlots);
      }
      vm.$vnode = _parentVnode;
      var vnode;
      try {
        currentRenderingInstance = vm;
        vnode = render4.call(vm._renderProxy, vm.$createElement);
      } catch (e) {
        handleError(e, vm, "render");
        if (false) {
          try {
            vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e);
          } catch (e2) {
            handleError(e2, vm, "renderError");
            vnode = vm._vnode;
          }
        } else {
          vnode = vm._vnode;
        }
      } finally {
        currentRenderingInstance = null;
      }
      if (Array.isArray(vnode) && vnode.length === 1) {
        vnode = vnode[0];
      }
      if (!(vnode instanceof VNode)) {
        if (false) {
          warn("Multiple root nodes returned from render function. Render function should return a single root node.", vm);
        }
        vnode = createEmptyVNode();
      }
      vnode.parent = _parentVnode;
      return vnode;
    };
  }
  function ensureCtor(comp, base2) {
    if (comp.__esModule || hasSymbol && comp[Symbol.toStringTag] === "Module") {
      comp = comp.default;
    }
    return isObject(comp) ? base2.extend(comp) : comp;
  }
  function createAsyncPlaceholder(factory, data, context, children, tag) {
    var node = createEmptyVNode();
    node.asyncFactory = factory;
    node.asyncMeta = { data, context, children, tag };
    return node;
  }
  function resolveAsyncComponent(factory, baseCtor) {
    if (isTrue(factory.error) && isDef(factory.errorComp)) {
      return factory.errorComp;
    }
    if (isDef(factory.resolved)) {
      return factory.resolved;
    }
    var owner = currentRenderingInstance;
    if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
      factory.owners.push(owner);
    }
    if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
      return factory.loadingComp;
    }
    if (owner && !isDef(factory.owners)) {
      var owners = factory.owners = [owner];
      var sync = true;
      var timerLoading = null;
      var timerTimeout = null;
      owner.$on("hook:destroyed", function() {
        return remove(owners, owner);
      });
      var forceRender = function(renderCompleted) {
        for (var i = 0, l = owners.length; i < l; i++) {
          owners[i].$forceUpdate();
        }
        if (renderCompleted) {
          owners.length = 0;
          if (timerLoading !== null) {
            clearTimeout(timerLoading);
            timerLoading = null;
          }
          if (timerTimeout !== null) {
            clearTimeout(timerTimeout);
            timerTimeout = null;
          }
        }
      };
      var resolve = once(function(res2) {
        factory.resolved = ensureCtor(res2, baseCtor);
        if (!sync) {
          forceRender(true);
        } else {
          owners.length = 0;
        }
      });
      var reject = once(function(reason) {
        if (isDef(factory.errorComp)) {
          factory.error = true;
          forceRender(true);
        }
      });
      var res = factory(resolve, reject);
      if (isObject(res)) {
        if (isPromise(res)) {
          if (isUndef(factory.resolved)) {
            res.then(resolve, reject);
          }
        } else if (isPromise(res.component)) {
          res.component.then(resolve, reject);
          if (isDef(res.error)) {
            factory.errorComp = ensureCtor(res.error, baseCtor);
          }
          if (isDef(res.loading)) {
            factory.loadingComp = ensureCtor(res.loading, baseCtor);
            if (res.delay === 0) {
              factory.loading = true;
            } else {
              timerLoading = setTimeout(function() {
                timerLoading = null;
                if (isUndef(factory.resolved) && isUndef(factory.error)) {
                  factory.loading = true;
                  forceRender(false);
                }
              }, res.delay || 200);
            }
          }
          if (isDef(res.timeout)) {
            timerTimeout = setTimeout(function() {
              timerTimeout = null;
              if (isUndef(factory.resolved)) {
                reject(false ? "timeout (" + res.timeout + "ms)" : null);
              }
            }, res.timeout);
          }
        }
      }
      sync = false;
      return factory.loading ? factory.loadingComp : factory.resolved;
    }
  }
  function isAsyncPlaceholder(node) {
    return node.isComment && node.asyncFactory;
  }
  function getFirstComponentChild(children) {
    if (Array.isArray(children)) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
          return c;
        }
      }
    }
  }
  function initEvents(vm) {
    vm._events = /* @__PURE__ */ Object.create(null);
    vm._hasHookEvent = false;
    var listeners = vm.$options._parentListeners;
    if (listeners) {
      updateComponentListeners(vm, listeners);
    }
  }
  var target;
  function add(event, fn) {
    target.$on(event, fn);
  }
  function remove$1(event, fn) {
    target.$off(event, fn);
  }
  function createOnceHandler(event, fn) {
    var _target = target;
    return function onceHandler() {
      var res = fn.apply(null, arguments);
      if (res !== null) {
        _target.$off(event, onceHandler);
      }
    };
  }
  function updateComponentListeners(vm, listeners, oldListeners) {
    target = vm;
    updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm);
    target = void 0;
  }
  function eventsMixin(Vue2) {
    var hookRE = /^hook:/;
    Vue2.prototype.$on = function(event, fn) {
      var vm = this;
      if (Array.isArray(event)) {
        for (var i = 0, l = event.length; i < l; i++) {
          vm.$on(event[i], fn);
        }
      } else {
        (vm._events[event] || (vm._events[event] = [])).push(fn);
        if (hookRE.test(event)) {
          vm._hasHookEvent = true;
        }
      }
      return vm;
    };
    Vue2.prototype.$once = function(event, fn) {
      var vm = this;
      function on2() {
        vm.$off(event, on2);
        fn.apply(vm, arguments);
      }
      on2.fn = fn;
      vm.$on(event, on2);
      return vm;
    };
    Vue2.prototype.$off = function(event, fn) {
      var vm = this;
      if (!arguments.length) {
        vm._events = /* @__PURE__ */ Object.create(null);
        return vm;
      }
      if (Array.isArray(event)) {
        for (var i$1 = 0, l = event.length; i$1 < l; i$1++) {
          vm.$off(event[i$1], fn);
        }
        return vm;
      }
      var cbs = vm._events[event];
      if (!cbs) {
        return vm;
      }
      if (!fn) {
        vm._events[event] = null;
        return vm;
      }
      var cb;
      var i = cbs.length;
      while (i--) {
        cb = cbs[i];
        if (cb === fn || cb.fn === fn) {
          cbs.splice(i, 1);
          break;
        }
      }
      return vm;
    };
    Vue2.prototype.$emit = function(event) {
      var vm = this;
      if (false) {
        var lowerCaseEvent = event.toLowerCase();
        if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
          tip('Event "' + lowerCaseEvent + '" is emitted in component ' + formatComponentName(vm) + ' but the handler is registered for "' + event + '". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "' + hyphenate(event) + '" instead of "' + event + '".');
        }
      }
      var cbs = vm._events[event];
      if (cbs) {
        cbs = cbs.length > 1 ? toArray(cbs) : cbs;
        var args = toArray(arguments, 1);
        var info = 'event handler for "' + event + '"';
        for (var i = 0, l = cbs.length; i < l; i++) {
          invokeWithErrorHandling(cbs[i], vm, args, vm, info);
        }
      }
      return vm;
    };
  }
  var activeInstance = null;
  function setActiveInstance(vm) {
    var prevActiveInstance = activeInstance;
    activeInstance = vm;
    return function() {
      activeInstance = prevActiveInstance;
    };
  }
  function initLifecycle(vm) {
    var options = vm.$options;
    var parent = options.parent;
    if (parent && !options.abstract) {
      while (parent.$options.abstract && parent.$parent) {
        parent = parent.$parent;
      }
      parent.$children.push(vm);
    }
    vm.$parent = parent;
    vm.$root = parent ? parent.$root : vm;
    vm.$children = [];
    vm.$refs = {};
    vm._watcher = null;
    vm._inactive = null;
    vm._directInactive = false;
    vm._isMounted = false;
    vm._isDestroyed = false;
    vm._isBeingDestroyed = false;
  }
  function lifecycleMixin(Vue2) {
    Vue2.prototype._update = function(vnode, hydrating) {
      var vm = this;
      var prevEl = vm.$el;
      var prevVnode = vm._vnode;
      var restoreActiveInstance = setActiveInstance(vm);
      vm._vnode = vnode;
      if (!prevVnode) {
        vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false);
      } else {
        vm.$el = vm.__patch__(prevVnode, vnode);
      }
      restoreActiveInstance();
      if (prevEl) {
        prevEl.__vue__ = null;
      }
      if (vm.$el) {
        vm.$el.__vue__ = vm;
      }
      if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
        vm.$parent.$el = vm.$el;
      }
    };
    Vue2.prototype.$forceUpdate = function() {
      var vm = this;
      if (vm._watcher) {
        vm._watcher.update();
      }
    };
    Vue2.prototype.$destroy = function() {
      var vm = this;
      if (vm._isBeingDestroyed) {
        return;
      }
      callHook(vm, "beforeDestroy");
      vm._isBeingDestroyed = true;
      var parent = vm.$parent;
      if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
        remove(parent.$children, vm);
      }
      if (vm._watcher) {
        vm._watcher.teardown();
      }
      var i = vm._watchers.length;
      while (i--) {
        vm._watchers[i].teardown();
      }
      if (vm._data.__ob__) {
        vm._data.__ob__.vmCount--;
      }
      vm._isDestroyed = true;
      vm.__patch__(vm._vnode, null);
      callHook(vm, "destroyed");
      vm.$off();
      if (vm.$el) {
        vm.$el.__vue__ = null;
      }
      if (vm.$vnode) {
        vm.$vnode.parent = null;
      }
    };
  }
  function mountComponent(vm, el, hydrating) {
    vm.$el = el;
    if (!vm.$options.render) {
      vm.$options.render = createEmptyVNode;
      if (false) {
        if (vm.$options.template && vm.$options.template.charAt(0) !== "#" || vm.$options.el || el) {
          warn("You are using the runtime-only build of Vue where the template compiler is not available. Either pre-compile the templates into render functions, or use the compiler-included build.", vm);
        } else {
          warn("Failed to mount component: template or render function not defined.", vm);
        }
      }
    }
    callHook(vm, "beforeMount");
    var updateComponent;
    if (false) {
      updateComponent = function() {
        var name = vm._name;
        var id = vm._uid;
        var startTag = "vue-perf-start:" + id;
        var endTag2 = "vue-perf-end:" + id;
        mark(startTag);
        var vnode = vm._render();
        mark(endTag2);
        measure("vue " + name + " render", startTag, endTag2);
        mark(startTag);
        vm._update(vnode, hydrating);
        mark(endTag2);
        measure("vue " + name + " patch", startTag, endTag2);
      };
    } else {
      updateComponent = function() {
        vm._update(vm._render(), hydrating);
      };
    }
    new Watcher(vm, updateComponent, noop, {
      before: function before() {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, "beforeUpdate");
        }
      }
    }, true);
    hydrating = false;
    if (vm.$vnode == null) {
      vm._isMounted = true;
      callHook(vm, "mounted");
    }
    return vm;
  }
  function updateChildComponent(vm, propsData, listeners, parentVnode, renderChildren) {
    if (false) {
      isUpdatingChildComponent = true;
    }
    var newScopedSlots = parentVnode.data.scopedSlots;
    var oldScopedSlots = vm.$scopedSlots;
    var hasDynamicScopedSlot = !!(newScopedSlots && !newScopedSlots.$stable || oldScopedSlots !== emptyObject && !oldScopedSlots.$stable || newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key);
    var needsForceUpdate = !!(renderChildren || vm.$options._renderChildren || hasDynamicScopedSlot);
    vm.$options._parentVnode = parentVnode;
    vm.$vnode = parentVnode;
    if (vm._vnode) {
      vm._vnode.parent = parentVnode;
    }
    vm.$options._renderChildren = renderChildren;
    vm.$attrs = parentVnode.data.attrs || emptyObject;
    vm.$listeners = listeners || emptyObject;
    if (propsData && vm.$options.props) {
      toggleObserving(false);
      var props2 = vm._props;
      var propKeys = vm.$options._propKeys || [];
      for (var i = 0; i < propKeys.length; i++) {
        var key = propKeys[i];
        var propOptions = vm.$options.props;
        props2[key] = validateProp(key, propOptions, propsData, vm);
      }
      toggleObserving(true);
      vm.$options.propsData = propsData;
    }
    listeners = listeners || emptyObject;
    var oldListeners = vm.$options._parentListeners;
    vm.$options._parentListeners = listeners;
    updateComponentListeners(vm, listeners, oldListeners);
    if (needsForceUpdate) {
      vm.$slots = resolveSlots(renderChildren, parentVnode.context);
      vm.$forceUpdate();
    }
    if (false) {
      isUpdatingChildComponent = false;
    }
  }
  function isInInactiveTree(vm) {
    while (vm && (vm = vm.$parent)) {
      if (vm._inactive) {
        return true;
      }
    }
    return false;
  }
  function activateChildComponent(vm, direct) {
    if (direct) {
      vm._directInactive = false;
      if (isInInactiveTree(vm)) {
        return;
      }
    } else if (vm._directInactive) {
      return;
    }
    if (vm._inactive || vm._inactive === null) {
      vm._inactive = false;
      for (var i = 0; i < vm.$children.length; i++) {
        activateChildComponent(vm.$children[i]);
      }
      callHook(vm, "activated");
    }
  }
  function deactivateChildComponent(vm, direct) {
    if (direct) {
      vm._directInactive = true;
      if (isInInactiveTree(vm)) {
        return;
      }
    }
    if (!vm._inactive) {
      vm._inactive = true;
      for (var i = 0; i < vm.$children.length; i++) {
        deactivateChildComponent(vm.$children[i]);
      }
      callHook(vm, "deactivated");
    }
  }
  function callHook(vm, hook) {
    pushTarget();
    var handlers = vm.$options[hook];
    var info = hook + " hook";
    if (handlers) {
      for (var i = 0, j = handlers.length; i < j; i++) {
        invokeWithErrorHandling(handlers[i], vm, null, vm, info);
      }
    }
    if (vm._hasHookEvent) {
      vm.$emit("hook:" + hook);
    }
    popTarget();
  }
  var queue = [];
  var activatedChildren = [];
  var has = {};
  var waiting = false;
  var flushing = false;
  var index = 0;
  function resetSchedulerState() {
    index = queue.length = activatedChildren.length = 0;
    has = {};
    if (false) {
      circular = {};
    }
    waiting = flushing = false;
  }
  var currentFlushTimestamp = 0;
  var getNow = Date.now;
  if (inBrowser && !isIE) {
    performance2 = window.performance;
    if (performance2 && typeof performance2.now === "function" && getNow() > document.createEvent("Event").timeStamp) {
      getNow = function() {
        return performance2.now();
      };
    }
  }
  var performance2;
  function flushSchedulerQueue() {
    currentFlushTimestamp = getNow();
    flushing = true;
    var watcher, id;
    queue.sort(function(a, b) {
      return a.id - b.id;
    });
    for (index = 0; index < queue.length; index++) {
      watcher = queue[index];
      if (watcher.before) {
        watcher.before();
      }
      id = watcher.id;
      has[id] = null;
      watcher.run();
      if (false) {
        circular[id] = (circular[id] || 0) + 1;
        if (circular[id] > MAX_UPDATE_COUNT) {
          warn("You may have an infinite update loop " + (watcher.user ? 'in watcher with expression "' + watcher.expression + '"' : "in a component render function."), watcher.vm);
          break;
        }
      }
    }
    var activatedQueue = activatedChildren.slice();
    var updatedQueue = queue.slice();
    resetSchedulerState();
    callActivatedHooks(activatedQueue);
    callUpdatedHooks(updatedQueue);
    if (devtools && config.devtools) {
      devtools.emit("flush");
    }
  }
  function callUpdatedHooks(queue2) {
    var i = queue2.length;
    while (i--) {
      var watcher = queue2[i];
      var vm = watcher.vm;
      if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
        callHook(vm, "updated");
      }
    }
  }
  function queueActivatedComponent(vm) {
    vm._inactive = false;
    activatedChildren.push(vm);
  }
  function callActivatedHooks(queue2) {
    for (var i = 0; i < queue2.length; i++) {
      queue2[i]._inactive = true;
      activateChildComponent(queue2[i], true);
    }
  }
  function queueWatcher(watcher) {
    var id = watcher.id;
    if (has[id] == null) {
      has[id] = true;
      if (!flushing) {
        queue.push(watcher);
      } else {
        var i = queue.length - 1;
        while (i > index && queue[i].id > watcher.id) {
          i--;
        }
        queue.splice(i + 1, 0, watcher);
      }
      if (!waiting) {
        waiting = true;
        if (false) {
          flushSchedulerQueue();
          return;
        }
        nextTick(flushSchedulerQueue);
      }
    }
  }
  var uid$2 = 0;
  var Watcher = function Watcher2(vm, expOrFn, cb, options, isRenderWatcher) {
    this.vm = vm;
    if (isRenderWatcher) {
      vm._watcher = this;
    }
    vm._watchers.push(this);
    if (options) {
      this.deep = !!options.deep;
      this.user = !!options.user;
      this.lazy = !!options.lazy;
      this.sync = !!options.sync;
      this.before = options.before;
    } else {
      this.deep = this.user = this.lazy = this.sync = false;
    }
    this.cb = cb;
    this.id = ++uid$2;
    this.active = true;
    this.dirty = this.lazy;
    this.deps = [];
    this.newDeps = [];
    this.depIds = new _Set();
    this.newDepIds = new _Set();
    this.expression = false ? expOrFn.toString() : "";
    if (typeof expOrFn === "function") {
      this.getter = expOrFn;
    } else {
      this.getter = parsePath(expOrFn);
      if (!this.getter) {
        this.getter = noop;
      }
    }
    this.value = this.lazy ? void 0 : this.get();
  };
  Watcher.prototype.get = function get() {
    pushTarget(this);
    var value;
    var vm = this.vm;
    try {
      value = this.getter.call(vm, vm);
    } catch (e) {
      if (this.user) {
        handleError(e, vm, 'getter for watcher "' + this.expression + '"');
      } else {
        throw e;
      }
    } finally {
      if (this.deep) {
        traverse(value);
      }
      popTarget();
      this.cleanupDeps();
    }
    return value;
  };
  Watcher.prototype.addDep = function addDep(dep) {
    var id = dep.id;
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id);
      this.newDeps.push(dep);
      if (!this.depIds.has(id)) {
        dep.addSub(this);
      }
    }
  };
  Watcher.prototype.cleanupDeps = function cleanupDeps() {
    var i = this.deps.length;
    while (i--) {
      var dep = this.deps[i];
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this);
      }
    }
    var tmp = this.depIds;
    this.depIds = this.newDepIds;
    this.newDepIds = tmp;
    this.newDepIds.clear();
    tmp = this.deps;
    this.deps = this.newDeps;
    this.newDeps = tmp;
    this.newDeps.length = 0;
  };
  Watcher.prototype.update = function update() {
    if (this.lazy) {
      this.dirty = true;
    } else if (this.sync) {
      this.run();
    } else {
      queueWatcher(this);
    }
  };
  Watcher.prototype.run = function run() {
    if (this.active) {
      var value = this.get();
      if (value !== this.value || isObject(value) || this.deep) {
        var oldValue = this.value;
        this.value = value;
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue);
          } catch (e) {
            handleError(e, this.vm, 'callback for watcher "' + this.expression + '"');
          }
        } else {
          this.cb.call(this.vm, value, oldValue);
        }
      }
    }
  };
  Watcher.prototype.evaluate = function evaluate() {
    this.value = this.get();
    this.dirty = false;
  };
  Watcher.prototype.depend = function depend2() {
    var i = this.deps.length;
    while (i--) {
      this.deps[i].depend();
    }
  };
  Watcher.prototype.teardown = function teardown() {
    if (this.active) {
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this);
      }
      var i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
    }
  };
  var sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop
  };
  function proxy(target2, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter() {
      return this[sourceKey][key];
    };
    sharedPropertyDefinition.set = function proxySetter(val) {
      this[sourceKey][key] = val;
    };
    Object.defineProperty(target2, key, sharedPropertyDefinition);
  }
  function initState(vm) {
    vm._watchers = [];
    var opts = vm.$options;
    if (opts.props) {
      initProps(vm, opts.props);
    }
    if (opts.methods) {
      initMethods(vm, opts.methods);
    }
    if (opts.data) {
      initData(vm);
    } else {
      observe(vm._data = {}, true);
    }
    if (opts.computed) {
      initComputed(vm, opts.computed);
    }
    if (opts.watch && opts.watch !== nativeWatch) {
      initWatch(vm, opts.watch);
    }
  }
  function initProps(vm, propsOptions) {
    var propsData = vm.$options.propsData || {};
    var props2 = vm._props = {};
    var keys = vm.$options._propKeys = [];
    var isRoot = !vm.$parent;
    if (!isRoot) {
      toggleObserving(false);
    }
    var loop = function(key2) {
      keys.push(key2);
      var value = validateProp(key2, propsOptions, propsData, vm);
      if (false) {
        var hyphenatedKey = hyphenate(key2);
        if (isReservedAttribute(hyphenatedKey) || config.isReservedAttr(hyphenatedKey)) {
          warn('"' + hyphenatedKey + '" is a reserved attribute and cannot be used as component prop.', vm);
        }
        defineReactive$$1(props2, key2, value, function() {
          if (!isRoot && !isUpdatingChildComponent) {
            warn(`Avoid mutating a prop directly since the value will be overwritten whenever the parent component re-renders. Instead, use a data or computed property based on the prop's value. Prop being mutated: "` + key2 + '"', vm);
          }
        });
      } else {
        defineReactive$$1(props2, key2, value);
      }
      if (!(key2 in vm)) {
        proxy(vm, "_props", key2);
      }
    };
    for (var key in propsOptions)
      loop(key);
    toggleObserving(true);
  }
  function initData(vm) {
    var data = vm.$options.data;
    data = vm._data = typeof data === "function" ? getData(data, vm) : data || {};
    if (!isPlainObject(data)) {
      data = {};
    }
    var keys = Object.keys(data);
    var props2 = vm.$options.props;
    var methods = vm.$options.methods;
    var i = keys.length;
    while (i--) {
      var key = keys[i];
      if (false) {
        if (methods && hasOwn(methods, key)) {
          warn('Method "' + key + '" has already been defined as a data property.', vm);
        }
      }
      if (props2 && hasOwn(props2, key)) {
      } else if (!isReserved(key)) {
        proxy(vm, "_data", key);
      }
    }
    observe(data, true);
  }
  function getData(data, vm) {
    pushTarget();
    try {
      return data.call(vm, vm);
    } catch (e) {
      handleError(e, vm, "data()");
      return {};
    } finally {
      popTarget();
    }
  }
  var computedWatcherOptions = { lazy: true };
  function initComputed(vm, computed) {
    var watchers = vm._computedWatchers = /* @__PURE__ */ Object.create(null);
    var isSSR = isServerRendering();
    for (var key in computed) {
      var userDef = computed[key];
      var getter = typeof userDef === "function" ? userDef : userDef.get;
      if (false) {
        warn('Getter is missing for computed property "' + key + '".', vm);
      }
      if (!isSSR) {
        watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions);
      }
      if (!(key in vm)) {
        defineComputed(vm, key, userDef);
      } else if (false) {
        if (key in vm.$data) {
          warn('The computed property "' + key + '" is already defined in data.', vm);
        } else if (vm.$options.props && key in vm.$options.props) {
          warn('The computed property "' + key + '" is already defined as a prop.', vm);
        }
      }
    }
  }
  function defineComputed(target2, key, userDef) {
    var shouldCache = !isServerRendering();
    if (typeof userDef === "function") {
      sharedPropertyDefinition.get = shouldCache ? createComputedGetter(key) : createGetterInvoker(userDef);
      sharedPropertyDefinition.set = noop;
    } else {
      sharedPropertyDefinition.get = userDef.get ? shouldCache && userDef.cache !== false ? createComputedGetter(key) : createGetterInvoker(userDef.get) : noop;
      sharedPropertyDefinition.set = userDef.set || noop;
    }
    if (false) {
      sharedPropertyDefinition.set = function() {
        warn('Computed property "' + key + '" was assigned to but it has no setter.', this);
      };
    }
    Object.defineProperty(target2, key, sharedPropertyDefinition);
  }
  function createComputedGetter(key) {
    return function computedGetter() {
      var watcher = this._computedWatchers && this._computedWatchers[key];
      if (watcher) {
        if (watcher.dirty) {
          watcher.evaluate();
        }
        if (Dep.target) {
          watcher.depend();
        }
        return watcher.value;
      }
    };
  }
  function createGetterInvoker(fn) {
    return function computedGetter() {
      return fn.call(this, this);
    };
  }
  function initMethods(vm, methods) {
    var props2 = vm.$options.props;
    for (var key in methods) {
      if (false) {
        if (typeof methods[key] !== "function") {
          warn('Method "' + key + '" has type "' + typeof methods[key] + '" in the component definition. Did you reference the function correctly?', vm);
        }
        if (props2 && hasOwn(props2, key)) {
          warn('Method "' + key + '" has already been defined as a prop.', vm);
        }
        if (key in vm && isReserved(key)) {
          warn('Method "' + key + '" conflicts with an existing Vue instance method. Avoid defining component methods that start with _ or $.');
        }
      }
      vm[key] = typeof methods[key] !== "function" ? noop : bind(methods[key], vm);
    }
  }
  function initWatch(vm, watch) {
    for (var key in watch) {
      var handler = watch[key];
      if (Array.isArray(handler)) {
        for (var i = 0; i < handler.length; i++) {
          createWatcher(vm, key, handler[i]);
        }
      } else {
        createWatcher(vm, key, handler);
      }
    }
  }
  function createWatcher(vm, expOrFn, handler, options) {
    if (isPlainObject(handler)) {
      options = handler;
      handler = handler.handler;
    }
    if (typeof handler === "string") {
      handler = vm[handler];
    }
    return vm.$watch(expOrFn, handler, options);
  }
  function stateMixin(Vue2) {
    var dataDef = {};
    dataDef.get = function() {
      return this._data;
    };
    var propsDef = {};
    propsDef.get = function() {
      return this._props;
    };
    if (false) {
      dataDef.set = function() {
        warn("Avoid replacing instance root $data. Use nested data properties instead.", this);
      };
      propsDef.set = function() {
        warn("$props is readonly.", this);
      };
    }
    Object.defineProperty(Vue2.prototype, "$data", dataDef);
    Object.defineProperty(Vue2.prototype, "$props", propsDef);
    Vue2.prototype.$set = set;
    Vue2.prototype.$delete = del;
    Vue2.prototype.$watch = function(expOrFn, cb, options) {
      var vm = this;
      if (isPlainObject(cb)) {
        return createWatcher(vm, expOrFn, cb, options);
      }
      options = options || {};
      options.user = true;
      var watcher = new Watcher(vm, expOrFn, cb, options);
      if (options.immediate) {
        try {
          cb.call(vm, watcher.value);
        } catch (error) {
          handleError(error, vm, 'callback for immediate watcher "' + watcher.expression + '"');
        }
      }
      return function unwatchFn() {
        watcher.teardown();
      };
    };
  }
  var uid$3 = 0;
  function initMixin(Vue2) {
    Vue2.prototype._init = function(options) {
      var vm = this;
      vm._uid = uid$3++;
      var startTag, endTag2;
      if (false) {
        startTag = "vue-perf-start:" + vm._uid;
        endTag2 = "vue-perf-end:" + vm._uid;
        mark(startTag);
      }
      vm._isVue = true;
      if (options && options._isComponent) {
        initInternalComponent(vm, options);
      } else {
        vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options || {}, vm);
      }
      if (false) {
        initProxy(vm);
      } else {
        vm._renderProxy = vm;
      }
      vm._self = vm;
      initLifecycle(vm);
      initEvents(vm);
      initRender(vm);
      callHook(vm, "beforeCreate");
      initInjections(vm);
      initState(vm);
      initProvide(vm);
      callHook(vm, "created");
      if (false) {
        vm._name = formatComponentName(vm, false);
        mark(endTag2);
        measure("vue " + vm._name + " init", startTag, endTag2);
      }
      if (vm.$options.el) {
        vm.$mount(vm.$options.el);
      }
    };
  }
  function initInternalComponent(vm, options) {
    var opts = vm.$options = Object.create(vm.constructor.options);
    var parentVnode = options._parentVnode;
    opts.parent = options.parent;
    opts._parentVnode = parentVnode;
    var vnodeComponentOptions = parentVnode.componentOptions;
    opts.propsData = vnodeComponentOptions.propsData;
    opts._parentListeners = vnodeComponentOptions.listeners;
    opts._renderChildren = vnodeComponentOptions.children;
    opts._componentTag = vnodeComponentOptions.tag;
    if (options.render) {
      opts.render = options.render;
      opts.staticRenderFns = options.staticRenderFns;
    }
  }
  function resolveConstructorOptions(Ctor) {
    var options = Ctor.options;
    if (Ctor.super) {
      var superOptions = resolveConstructorOptions(Ctor.super);
      var cachedSuperOptions = Ctor.superOptions;
      if (superOptions !== cachedSuperOptions) {
        Ctor.superOptions = superOptions;
        var modifiedOptions = resolveModifiedOptions(Ctor);
        if (modifiedOptions) {
          extend(Ctor.extendOptions, modifiedOptions);
        }
        options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
        if (options.name) {
          options.components[options.name] = Ctor;
        }
      }
    }
    return options;
  }
  function resolveModifiedOptions(Ctor) {
    var modified;
    var latest = Ctor.options;
    var sealed = Ctor.sealedOptions;
    for (var key in latest) {
      if (latest[key] !== sealed[key]) {
        if (!modified) {
          modified = {};
        }
        modified[key] = latest[key];
      }
    }
    return modified;
  }
  function Vue(options) {
    if (false) {
      warn("Vue is a constructor and should be called with the `new` keyword");
    }
    this._init(options);
  }
  initMixin(Vue);
  stateMixin(Vue);
  eventsMixin(Vue);
  lifecycleMixin(Vue);
  renderMixin(Vue);
  function initUse(Vue2) {
    Vue2.use = function(plugin) {
      var installedPlugins = this._installedPlugins || (this._installedPlugins = []);
      if (installedPlugins.indexOf(plugin) > -1) {
        return this;
      }
      var args = toArray(arguments, 1);
      args.unshift(this);
      if (typeof plugin.install === "function") {
        plugin.install.apply(plugin, args);
      } else if (typeof plugin === "function") {
        plugin.apply(null, args);
      }
      installedPlugins.push(plugin);
      return this;
    };
  }
  function initMixin$1(Vue2) {
    Vue2.mixin = function(mixin) {
      this.options = mergeOptions(this.options, mixin);
      return this;
    };
  }
  function initExtend(Vue2) {
    Vue2.cid = 0;
    var cid = 1;
    Vue2.extend = function(extendOptions) {
      extendOptions = extendOptions || {};
      var Super = this;
      var SuperId = Super.cid;
      var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
      if (cachedCtors[SuperId]) {
        return cachedCtors[SuperId];
      }
      var name = extendOptions.name || Super.options.name;
      if (false) {
        validateComponentName(name);
      }
      var Sub = function VueComponent(options) {
        this._init(options);
      };
      Sub.prototype = Object.create(Super.prototype);
      Sub.prototype.constructor = Sub;
      Sub.cid = cid++;
      Sub.options = mergeOptions(Super.options, extendOptions);
      Sub["super"] = Super;
      if (Sub.options.props) {
        initProps$1(Sub);
      }
      if (Sub.options.computed) {
        initComputed$1(Sub);
      }
      Sub.extend = Super.extend;
      Sub.mixin = Super.mixin;
      Sub.use = Super.use;
      ASSET_TYPES.forEach(function(type) {
        Sub[type] = Super[type];
      });
      if (name) {
        Sub.options.components[name] = Sub;
      }
      Sub.superOptions = Super.options;
      Sub.extendOptions = extendOptions;
      Sub.sealedOptions = extend({}, Sub.options);
      cachedCtors[SuperId] = Sub;
      return Sub;
    };
  }
  function initProps$1(Comp) {
    var props2 = Comp.options.props;
    for (var key in props2) {
      proxy(Comp.prototype, "_props", key);
    }
  }
  function initComputed$1(Comp) {
    var computed = Comp.options.computed;
    for (var key in computed) {
      defineComputed(Comp.prototype, key, computed[key]);
    }
  }
  function initAssetRegisters(Vue2) {
    ASSET_TYPES.forEach(function(type) {
      Vue2[type] = function(id, definition) {
        if (!definition) {
          return this.options[type + "s"][id];
        } else {
          if (false) {
            validateComponentName(id);
          }
          if (type === "component" && isPlainObject(definition)) {
            definition.name = definition.name || id;
            definition = this.options._base.extend(definition);
          }
          if (type === "directive" && typeof definition === "function") {
            definition = { bind: definition, update: definition };
          }
          this.options[type + "s"][id] = definition;
          return definition;
        }
      };
    });
  }
  function getComponentName(opts) {
    return opts && (opts.Ctor.options.name || opts.tag);
  }
  function matches(pattern, name) {
    if (Array.isArray(pattern)) {
      return pattern.indexOf(name) > -1;
    } else if (typeof pattern === "string") {
      return pattern.split(",").indexOf(name) > -1;
    } else if (isRegExp(pattern)) {
      return pattern.test(name);
    }
    return false;
  }
  function pruneCache(keepAliveInstance, filter) {
    var cache2 = keepAliveInstance.cache;
    var keys = keepAliveInstance.keys;
    var _vnode = keepAliveInstance._vnode;
    for (var key in cache2) {
      var cachedNode = cache2[key];
      if (cachedNode) {
        var name = getComponentName(cachedNode.componentOptions);
        if (name && !filter(name)) {
          pruneCacheEntry(cache2, key, keys, _vnode);
        }
      }
    }
  }
  function pruneCacheEntry(cache2, key, keys, current) {
    var cached$$1 = cache2[key];
    if (cached$$1 && (!current || cached$$1.tag !== current.tag)) {
      cached$$1.componentInstance.$destroy();
    }
    cache2[key] = null;
    remove(keys, key);
  }
  var patternTypes = [String, RegExp, Array];
  var KeepAlive = {
    name: "keep-alive",
    abstract: true,
    props: {
      include: patternTypes,
      exclude: patternTypes,
      max: [String, Number]
    },
    created: function created() {
      this.cache = /* @__PURE__ */ Object.create(null);
      this.keys = [];
    },
    destroyed: function destroyed() {
      for (var key in this.cache) {
        pruneCacheEntry(this.cache, key, this.keys);
      }
    },
    mounted: function mounted() {
      var this$1 = this;
      this.$watch("include", function(val) {
        pruneCache(this$1, function(name) {
          return matches(val, name);
        });
      });
      this.$watch("exclude", function(val) {
        pruneCache(this$1, function(name) {
          return !matches(val, name);
        });
      });
    },
    render: function render() {
      var slot = this.$slots.default;
      var vnode = getFirstComponentChild(slot);
      var componentOptions = vnode && vnode.componentOptions;
      if (componentOptions) {
        var name = getComponentName(componentOptions);
        var ref2 = this;
        var include = ref2.include;
        var exclude = ref2.exclude;
        if (include && (!name || !matches(include, name)) || exclude && name && matches(exclude, name)) {
          return vnode;
        }
        var ref$12 = this;
        var cache2 = ref$12.cache;
        var keys = ref$12.keys;
        var key = vnode.key == null ? componentOptions.Ctor.cid + (componentOptions.tag ? "::" + componentOptions.tag : "") : vnode.key;
        if (cache2[key]) {
          vnode.componentInstance = cache2[key].componentInstance;
          remove(keys, key);
          keys.push(key);
        } else {
          cache2[key] = vnode;
          keys.push(key);
          if (this.max && keys.length > parseInt(this.max)) {
            pruneCacheEntry(cache2, keys[0], keys, this._vnode);
          }
        }
        vnode.data.keepAlive = true;
      }
      return vnode || slot && slot[0];
    }
  };
  var builtInComponents = {
    KeepAlive
  };
  function initGlobalAPI(Vue2) {
    var configDef = {};
    configDef.get = function() {
      return config;
    };
    if (false) {
      configDef.set = function() {
        warn("Do not replace the Vue.config object, set individual fields instead.");
      };
    }
    Object.defineProperty(Vue2, "config", configDef);
    Vue2.util = {
      warn,
      extend,
      mergeOptions,
      defineReactive: defineReactive$$1
    };
    Vue2.set = set;
    Vue2.delete = del;
    Vue2.nextTick = nextTick;
    Vue2.observable = function(obj) {
      observe(obj);
      return obj;
    };
    Vue2.options = /* @__PURE__ */ Object.create(null);
    ASSET_TYPES.forEach(function(type) {
      Vue2.options[type + "s"] = /* @__PURE__ */ Object.create(null);
    });
    Vue2.options._base = Vue2;
    extend(Vue2.options.components, builtInComponents);
    initUse(Vue2);
    initMixin$1(Vue2);
    initExtend(Vue2);
    initAssetRegisters(Vue2);
  }
  initGlobalAPI(Vue);
  Object.defineProperty(Vue.prototype, "$isServer", {
    get: isServerRendering
  });
  Object.defineProperty(Vue.prototype, "$ssrContext", {
    get: function get2() {
      return this.$vnode && this.$vnode.ssrContext;
    }
  });
  Object.defineProperty(Vue, "FunctionalRenderContext", {
    value: FunctionalRenderContext
  });
  Vue.version = "2.6.12";
  var isReservedAttr = makeMap("style,class");
  var acceptValue = makeMap("input,textarea,option,select,progress");
  var mustUseProp = function(tag, type, attr) {
    return attr === "value" && acceptValue(tag) && type !== "button" || attr === "selected" && tag === "option" || attr === "checked" && tag === "input" || attr === "muted" && tag === "video";
  };
  var isEnumeratedAttr = makeMap("contenteditable,draggable,spellcheck");
  var isValidContentEditableValue = makeMap("events,caret,typing,plaintext-only");
  var convertEnumeratedValue = function(key, value) {
    return isFalsyAttrValue(value) || value === "false" ? "false" : key === "contenteditable" && isValidContentEditableValue(value) ? value : "true";
  };
  var isBooleanAttr = makeMap("allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,translate,truespeed,typemustmatch,visible");
  var xlinkNS = "http://www.w3.org/1999/xlink";
  var isXlink = function(name) {
    return name.charAt(5) === ":" && name.slice(0, 5) === "xlink";
  };
  var getXlinkProp = function(name) {
    return isXlink(name) ? name.slice(6, name.length) : "";
  };
  var isFalsyAttrValue = function(val) {
    return val == null || val === false;
  };
  function genClassForVnode(vnode) {
    var data = vnode.data;
    var parentNode2 = vnode;
    var childNode = vnode;
    while (isDef(childNode.componentInstance)) {
      childNode = childNode.componentInstance._vnode;
      if (childNode && childNode.data) {
        data = mergeClassData(childNode.data, data);
      }
    }
    while (isDef(parentNode2 = parentNode2.parent)) {
      if (parentNode2 && parentNode2.data) {
        data = mergeClassData(data, parentNode2.data);
      }
    }
    return renderClass(data.staticClass, data.class);
  }
  function mergeClassData(child, parent) {
    return {
      staticClass: concat(child.staticClass, parent.staticClass),
      class: isDef(child.class) ? [child.class, parent.class] : parent.class
    };
  }
  function renderClass(staticClass, dynamicClass) {
    if (isDef(staticClass) || isDef(dynamicClass)) {
      return concat(staticClass, stringifyClass(dynamicClass));
    }
    return "";
  }
  function concat(a, b) {
    return a ? b ? a + " " + b : a : b || "";
  }
  function stringifyClass(value) {
    if (Array.isArray(value)) {
      return stringifyArray(value);
    }
    if (isObject(value)) {
      return stringifyObject(value);
    }
    if (typeof value === "string") {
      return value;
    }
    return "";
  }
  function stringifyArray(value) {
    var res = "";
    var stringified;
    for (var i = 0, l = value.length; i < l; i++) {
      if (isDef(stringified = stringifyClass(value[i])) && stringified !== "") {
        if (res) {
          res += " ";
        }
        res += stringified;
      }
    }
    return res;
  }
  function stringifyObject(value) {
    var res = "";
    for (var key in value) {
      if (value[key]) {
        if (res) {
          res += " ";
        }
        res += key;
      }
    }
    return res;
  }
  var namespaceMap = {
    svg: "http://www.w3.org/2000/svg",
    math: "http://www.w3.org/1998/Math/MathML"
  };
  var isHTMLTag = makeMap("html,body,base,head,link,meta,style,title,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,menuitem,summary,content,element,shadow,template,blockquote,iframe,tfoot");
  var isSVG = makeMap("svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view", true);
  var isPreTag = function(tag) {
    return tag === "pre";
  };
  var isReservedTag = function(tag) {
    return isHTMLTag(tag) || isSVG(tag);
  };
  function getTagNamespace(tag) {
    if (isSVG(tag)) {
      return "svg";
    }
    if (tag === "math") {
      return "math";
    }
  }
  var unknownElementCache = /* @__PURE__ */ Object.create(null);
  function isUnknownElement(tag) {
    if (!inBrowser) {
      return true;
    }
    if (isReservedTag(tag)) {
      return false;
    }
    tag = tag.toLowerCase();
    if (unknownElementCache[tag] != null) {
      return unknownElementCache[tag];
    }
    var el = document.createElement(tag);
    if (tag.indexOf("-") > -1) {
      return unknownElementCache[tag] = el.constructor === window.HTMLUnknownElement || el.constructor === window.HTMLElement;
    } else {
      return unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString());
    }
  }
  var isTextInputType = makeMap("text,number,password,search,email,tel,url");
  function query(el) {
    if (typeof el === "string") {
      var selected = document.querySelector(el);
      if (!selected) {
        return document.createElement("div");
      }
      return selected;
    } else {
      return el;
    }
  }
  function createElement$1(tagName2, vnode) {
    var elm = document.createElement(tagName2);
    if (tagName2 !== "select") {
      return elm;
    }
    if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== void 0) {
      elm.setAttribute("multiple", "multiple");
    }
    return elm;
  }
  function createElementNS(namespace, tagName2) {
    return document.createElementNS(namespaceMap[namespace], tagName2);
  }
  function createTextNode(text2) {
    return document.createTextNode(text2);
  }
  function createComment(text2) {
    return document.createComment(text2);
  }
  function insertBefore(parentNode2, newNode, referenceNode) {
    parentNode2.insertBefore(newNode, referenceNode);
  }
  function removeChild(node, child) {
    node.removeChild(child);
  }
  function appendChild(node, child) {
    node.appendChild(child);
  }
  function parentNode(node) {
    return node.parentNode;
  }
  function nextSibling(node) {
    return node.nextSibling;
  }
  function tagName(node) {
    return node.tagName;
  }
  function setTextContent(node, text2) {
    node.textContent = text2;
  }
  function setStyleScope(node, scopeId) {
    node.setAttribute(scopeId, "");
  }
  var nodeOps = /* @__PURE__ */ Object.freeze({
    createElement: createElement$1,
    createElementNS,
    createTextNode,
    createComment,
    insertBefore,
    removeChild,
    appendChild,
    parentNode,
    nextSibling,
    tagName,
    setTextContent,
    setStyleScope
  });
  var ref = {
    create: function create(_, vnode) {
      registerRef(vnode);
    },
    update: function update2(oldVnode, vnode) {
      if (oldVnode.data.ref !== vnode.data.ref) {
        registerRef(oldVnode, true);
        registerRef(vnode);
      }
    },
    destroy: function destroy2(vnode) {
      registerRef(vnode, true);
    }
  };
  function registerRef(vnode, isRemoval) {
    var key = vnode.data.ref;
    if (!isDef(key)) {
      return;
    }
    var vm = vnode.context;
    var ref2 = vnode.componentInstance || vnode.elm;
    var refs = vm.$refs;
    if (isRemoval) {
      if (Array.isArray(refs[key])) {
        remove(refs[key], ref2);
      } else if (refs[key] === ref2) {
        refs[key] = void 0;
      }
    } else {
      if (vnode.data.refInFor) {
        if (!Array.isArray(refs[key])) {
          refs[key] = [ref2];
        } else if (refs[key].indexOf(ref2) < 0) {
          refs[key].push(ref2);
        }
      } else {
        refs[key] = ref2;
      }
    }
  }
  var emptyNode = new VNode("", {}, []);
  var hooks = ["create", "activate", "update", "remove", "destroy"];
  function sameVnode(a, b) {
    return a.key === b.key && (a.tag === b.tag && a.isComment === b.isComment && isDef(a.data) === isDef(b.data) && sameInputType(a, b) || isTrue(a.isAsyncPlaceholder) && a.asyncFactory === b.asyncFactory && isUndef(b.asyncFactory.error));
  }
  function sameInputType(a, b) {
    if (a.tag !== "input") {
      return true;
    }
    var i;
    var typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type;
    var typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type;
    return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB);
  }
  function createKeyToOldIdx(children, beginIdx, endIdx) {
    var i, key;
    var map = {};
    for (i = beginIdx; i <= endIdx; ++i) {
      key = children[i].key;
      if (isDef(key)) {
        map[key] = i;
      }
    }
    return map;
  }
  function createPatchFunction(backend) {
    var i, j;
    var cbs = {};
    var modules2 = backend.modules;
    var nodeOps2 = backend.nodeOps;
    for (i = 0; i < hooks.length; ++i) {
      cbs[hooks[i]] = [];
      for (j = 0; j < modules2.length; ++j) {
        if (isDef(modules2[j][hooks[i]])) {
          cbs[hooks[i]].push(modules2[j][hooks[i]]);
        }
      }
    }
    function emptyNodeAt(elm) {
      return new VNode(nodeOps2.tagName(elm).toLowerCase(), {}, [], void 0, elm);
    }
    function createRmCb(childElm, listeners) {
      function remove$$12() {
        if (--remove$$12.listeners === 0) {
          removeNode(childElm);
        }
      }
      remove$$12.listeners = listeners;
      return remove$$12;
    }
    function removeNode(el) {
      var parent = nodeOps2.parentNode(el);
      if (isDef(parent)) {
        nodeOps2.removeChild(parent, el);
      }
    }
    function isUnknownElement$$1(vnode, inVPre) {
      return !inVPre && !vnode.ns && !(config.ignoredElements.length && config.ignoredElements.some(function(ignore) {
        return isRegExp(ignore) ? ignore.test(vnode.tag) : ignore === vnode.tag;
      })) && config.isUnknownElement(vnode.tag);
    }
    var creatingElmInVPre = 0;
    function createElm(vnode, insertedVnodeQueue, parentElm, refElm, nested, ownerArray, index2) {
      if (isDef(vnode.elm) && isDef(ownerArray)) {
        vnode = ownerArray[index2] = cloneVNode(vnode);
      }
      vnode.isRootInsert = !nested;
      if (createComponent2(vnode, insertedVnodeQueue, parentElm, refElm)) {
        return;
      }
      var data = vnode.data;
      var children = vnode.children;
      var tag = vnode.tag;
      if (isDef(tag)) {
        if (false) {
          if (data && data.pre) {
            creatingElmInVPre++;
          }
          if (isUnknownElement$$1(vnode, creatingElmInVPre)) {
            warn("Unknown custom element: <" + tag + '> - did you register the component correctly? For recursive components, make sure to provide the "name" option.', vnode.context);
          }
        }
        vnode.elm = vnode.ns ? nodeOps2.createElementNS(vnode.ns, tag) : nodeOps2.createElement(tag, vnode);
        setScope(vnode);
        {
          createChildren(vnode, children, insertedVnodeQueue);
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue);
          }
          insert2(parentElm, vnode.elm, refElm);
        }
        if (false) {
          creatingElmInVPre--;
        }
      } else if (isTrue(vnode.isComment)) {
        vnode.elm = nodeOps2.createComment(vnode.text);
        insert2(parentElm, vnode.elm, refElm);
      } else {
        vnode.elm = nodeOps2.createTextNode(vnode.text);
        insert2(parentElm, vnode.elm, refElm);
      }
    }
    function createComponent2(vnode, insertedVnodeQueue, parentElm, refElm) {
      var i2 = vnode.data;
      if (isDef(i2)) {
        var isReactivated = isDef(vnode.componentInstance) && i2.keepAlive;
        if (isDef(i2 = i2.hook) && isDef(i2 = i2.init)) {
          i2(vnode, false);
        }
        if (isDef(vnode.componentInstance)) {
          initComponent(vnode, insertedVnodeQueue);
          insert2(parentElm, vnode.elm, refElm);
          if (isTrue(isReactivated)) {
            reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
          }
          return true;
        }
      }
    }
    function initComponent(vnode, insertedVnodeQueue) {
      if (isDef(vnode.data.pendingInsert)) {
        insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert);
        vnode.data.pendingInsert = null;
      }
      vnode.elm = vnode.componentInstance.$el;
      if (isPatchable(vnode)) {
        invokeCreateHooks(vnode, insertedVnodeQueue);
        setScope(vnode);
      } else {
        registerRef(vnode);
        insertedVnodeQueue.push(vnode);
      }
    }
    function reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
      var i2;
      var innerNode = vnode;
      while (innerNode.componentInstance) {
        innerNode = innerNode.componentInstance._vnode;
        if (isDef(i2 = innerNode.data) && isDef(i2 = i2.transition)) {
          for (i2 = 0; i2 < cbs.activate.length; ++i2) {
            cbs.activate[i2](emptyNode, innerNode);
          }
          insertedVnodeQueue.push(innerNode);
          break;
        }
      }
      insert2(parentElm, vnode.elm, refElm);
    }
    function insert2(parent, elm, ref$$1) {
      if (isDef(parent)) {
        if (isDef(ref$$1)) {
          if (nodeOps2.parentNode(ref$$1) === parent) {
            nodeOps2.insertBefore(parent, elm, ref$$1);
          }
        } else {
          nodeOps2.appendChild(parent, elm);
        }
      }
    }
    function createChildren(vnode, children, insertedVnodeQueue) {
      if (Array.isArray(children)) {
        if (false) {
          checkDuplicateKeys(children);
        }
        for (var i2 = 0; i2 < children.length; ++i2) {
          createElm(children[i2], insertedVnodeQueue, vnode.elm, null, true, children, i2);
        }
      } else if (isPrimitive(vnode.text)) {
        nodeOps2.appendChild(vnode.elm, nodeOps2.createTextNode(String(vnode.text)));
      }
    }
    function isPatchable(vnode) {
      while (vnode.componentInstance) {
        vnode = vnode.componentInstance._vnode;
      }
      return isDef(vnode.tag);
    }
    function invokeCreateHooks(vnode, insertedVnodeQueue) {
      for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
        cbs.create[i$1](emptyNode, vnode);
      }
      i = vnode.data.hook;
      if (isDef(i)) {
        if (isDef(i.create)) {
          i.create(emptyNode, vnode);
        }
        if (isDef(i.insert)) {
          insertedVnodeQueue.push(vnode);
        }
      }
    }
    function setScope(vnode) {
      var i2;
      if (isDef(i2 = vnode.fnScopeId)) {
        nodeOps2.setStyleScope(vnode.elm, i2);
      } else {
        var ancestor = vnode;
        while (ancestor) {
          if (isDef(i2 = ancestor.context) && isDef(i2 = i2.$options._scopeId)) {
            nodeOps2.setStyleScope(vnode.elm, i2);
          }
          ancestor = ancestor.parent;
        }
      }
      if (isDef(i2 = activeInstance) && i2 !== vnode.context && i2 !== vnode.fnContext && isDef(i2 = i2.$options._scopeId)) {
        nodeOps2.setStyleScope(vnode.elm, i2);
      }
    }
    function addVnodes(parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
      for (; startIdx <= endIdx; ++startIdx) {
        createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx);
      }
    }
    function invokeDestroyHook(vnode) {
      var i2, j2;
      var data = vnode.data;
      if (isDef(data)) {
        if (isDef(i2 = data.hook) && isDef(i2 = i2.destroy)) {
          i2(vnode);
        }
        for (i2 = 0; i2 < cbs.destroy.length; ++i2) {
          cbs.destroy[i2](vnode);
        }
      }
      if (isDef(i2 = vnode.children)) {
        for (j2 = 0; j2 < vnode.children.length; ++j2) {
          invokeDestroyHook(vnode.children[j2]);
        }
      }
    }
    function removeVnodes(vnodes, startIdx, endIdx) {
      for (; startIdx <= endIdx; ++startIdx) {
        var ch = vnodes[startIdx];
        if (isDef(ch)) {
          if (isDef(ch.tag)) {
            removeAndInvokeRemoveHook(ch);
            invokeDestroyHook(ch);
          } else {
            removeNode(ch.elm);
          }
        }
      }
    }
    function removeAndInvokeRemoveHook(vnode, rm) {
      if (isDef(rm) || isDef(vnode.data)) {
        var i2;
        var listeners = cbs.remove.length + 1;
        if (isDef(rm)) {
          rm.listeners += listeners;
        } else {
          rm = createRmCb(vnode.elm, listeners);
        }
        if (isDef(i2 = vnode.componentInstance) && isDef(i2 = i2._vnode) && isDef(i2.data)) {
          removeAndInvokeRemoveHook(i2, rm);
        }
        for (i2 = 0; i2 < cbs.remove.length; ++i2) {
          cbs.remove[i2](vnode, rm);
        }
        if (isDef(i2 = vnode.data.hook) && isDef(i2 = i2.remove)) {
          i2(vnode, rm);
        } else {
          rm();
        }
      } else {
        removeNode(vnode.elm);
      }
    }
    function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
      var oldStartIdx = 0;
      var newStartIdx = 0;
      var oldEndIdx = oldCh.length - 1;
      var oldStartVnode = oldCh[0];
      var oldEndVnode = oldCh[oldEndIdx];
      var newEndIdx = newCh.length - 1;
      var newStartVnode = newCh[0];
      var newEndVnode = newCh[newEndIdx];
      var oldKeyToIdx, idxInOld, vnodeToMove, refElm;
      var canMove = !removeOnly;
      if (false) {
        checkDuplicateKeys(newCh);
      }
      while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (isUndef(oldStartVnode)) {
          oldStartVnode = oldCh[++oldStartIdx];
        } else if (isUndef(oldEndVnode)) {
          oldEndVnode = oldCh[--oldEndIdx];
        } else if (sameVnode(oldStartVnode, newStartVnode)) {
          patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
          oldStartVnode = oldCh[++oldStartIdx];
          newStartVnode = newCh[++newStartIdx];
        } else if (sameVnode(oldEndVnode, newEndVnode)) {
          patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
          oldEndVnode = oldCh[--oldEndIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldStartVnode, newEndVnode)) {
          patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
          canMove && nodeOps2.insertBefore(parentElm, oldStartVnode.elm, nodeOps2.nextSibling(oldEndVnode.elm));
          oldStartVnode = oldCh[++oldStartIdx];
          newEndVnode = newCh[--newEndIdx];
        } else if (sameVnode(oldEndVnode, newStartVnode)) {
          patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
          canMove && nodeOps2.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
          oldEndVnode = oldCh[--oldEndIdx];
          newStartVnode = newCh[++newStartIdx];
        } else {
          if (isUndef(oldKeyToIdx)) {
            oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
          }
          idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
          if (isUndef(idxInOld)) {
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
          } else {
            vnodeToMove = oldCh[idxInOld];
            if (sameVnode(vnodeToMove, newStartVnode)) {
              patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
              oldCh[idxInOld] = void 0;
              canMove && nodeOps2.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
            } else {
              createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
            }
          }
          newStartVnode = newCh[++newStartIdx];
        }
      }
      if (oldStartIdx > oldEndIdx) {
        refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
        addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
      } else if (newStartIdx > newEndIdx) {
        removeVnodes(oldCh, oldStartIdx, oldEndIdx);
      }
    }
    function checkDuplicateKeys(children) {
      var seenKeys = {};
      for (var i2 = 0; i2 < children.length; i2++) {
        var vnode = children[i2];
        var key = vnode.key;
        if (isDef(key)) {
          if (seenKeys[key]) {
            warn("Duplicate keys detected: '" + key + "'. This may cause an update error.", vnode.context);
          } else {
            seenKeys[key] = true;
          }
        }
      }
    }
    function findIdxInOld(node, oldCh, start, end) {
      for (var i2 = start; i2 < end; i2++) {
        var c = oldCh[i2];
        if (isDef(c) && sameVnode(node, c)) {
          return i2;
        }
      }
    }
    function patchVnode(oldVnode, vnode, insertedVnodeQueue, ownerArray, index2, removeOnly) {
      if (oldVnode === vnode) {
        return;
      }
      if (isDef(vnode.elm) && isDef(ownerArray)) {
        vnode = ownerArray[index2] = cloneVNode(vnode);
      }
      var elm = vnode.elm = oldVnode.elm;
      if (isTrue(oldVnode.isAsyncPlaceholder)) {
        if (isDef(vnode.asyncFactory.resolved)) {
          hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
        } else {
          vnode.isAsyncPlaceholder = true;
        }
        return;
      }
      if (isTrue(vnode.isStatic) && isTrue(oldVnode.isStatic) && vnode.key === oldVnode.key && (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))) {
        vnode.componentInstance = oldVnode.componentInstance;
        return;
      }
      var i2;
      var data = vnode.data;
      if (isDef(data) && isDef(i2 = data.hook) && isDef(i2 = i2.prepatch)) {
        i2(oldVnode, vnode);
      }
      var oldCh = oldVnode.children;
      var ch = vnode.children;
      if (isDef(data) && isPatchable(vnode)) {
        for (i2 = 0; i2 < cbs.update.length; ++i2) {
          cbs.update[i2](oldVnode, vnode);
        }
        if (isDef(i2 = data.hook) && isDef(i2 = i2.update)) {
          i2(oldVnode, vnode);
        }
      }
      if (isUndef(vnode.text)) {
        if (isDef(oldCh) && isDef(ch)) {
          if (oldCh !== ch) {
            updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly);
          }
        } else if (isDef(ch)) {
          if (false) {
            checkDuplicateKeys(ch);
          }
          if (isDef(oldVnode.text)) {
            nodeOps2.setTextContent(elm, "");
          }
          addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
        } else if (isDef(oldCh)) {
          removeVnodes(oldCh, 0, oldCh.length - 1);
        } else if (isDef(oldVnode.text)) {
          nodeOps2.setTextContent(elm, "");
        }
      } else if (oldVnode.text !== vnode.text) {
        nodeOps2.setTextContent(elm, vnode.text);
      }
      if (isDef(data)) {
        if (isDef(i2 = data.hook) && isDef(i2 = i2.postpatch)) {
          i2(oldVnode, vnode);
        }
      }
    }
    function invokeInsertHook(vnode, queue2, initial) {
      if (isTrue(initial) && isDef(vnode.parent)) {
        vnode.parent.data.pendingInsert = queue2;
      } else {
        for (var i2 = 0; i2 < queue2.length; ++i2) {
          queue2[i2].data.hook.insert(queue2[i2]);
        }
      }
    }
    var hydrationBailed = false;
    var isRenderedModule = makeMap("attrs,class,staticClass,staticStyle,key");
    function hydrate(elm, vnode, insertedVnodeQueue, inVPre) {
      var i2;
      var tag = vnode.tag;
      var data = vnode.data;
      var children = vnode.children;
      inVPre = inVPre || data && data.pre;
      vnode.elm = elm;
      if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
        vnode.isAsyncPlaceholder = true;
        return true;
      }
      if (false) {
        if (!assertNodeMatch(elm, vnode, inVPre)) {
          return false;
        }
      }
      if (isDef(data)) {
        if (isDef(i2 = data.hook) && isDef(i2 = i2.init)) {
          i2(vnode, true);
        }
        if (isDef(i2 = vnode.componentInstance)) {
          initComponent(vnode, insertedVnodeQueue);
          return true;
        }
      }
      if (isDef(tag)) {
        if (isDef(children)) {
          if (!elm.hasChildNodes()) {
            createChildren(vnode, children, insertedVnodeQueue);
          } else {
            if (isDef(i2 = data) && isDef(i2 = i2.domProps) && isDef(i2 = i2.innerHTML)) {
              if (i2 !== elm.innerHTML) {
                if (false) {
                  hydrationBailed = true;
                  console.warn("Parent: ", elm);
                  console.warn("server innerHTML: ", i2);
                  console.warn("client innerHTML: ", elm.innerHTML);
                }
                return false;
              }
            } else {
              var childrenMatch = true;
              var childNode = elm.firstChild;
              for (var i$1 = 0; i$1 < children.length; i$1++) {
                if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                  childrenMatch = false;
                  break;
                }
                childNode = childNode.nextSibling;
              }
              if (!childrenMatch || childNode) {
                if (false) {
                  hydrationBailed = true;
                  console.warn("Parent: ", elm);
                  console.warn("Mismatching childNodes vs. VNodes: ", elm.childNodes, children);
                }
                return false;
              }
            }
          }
        }
        if (isDef(data)) {
          var fullInvoke = false;
          for (var key in data) {
            if (!isRenderedModule(key)) {
              fullInvoke = true;
              invokeCreateHooks(vnode, insertedVnodeQueue);
              break;
            }
          }
          if (!fullInvoke && data["class"]) {
            traverse(data["class"]);
          }
        }
      } else if (elm.data !== vnode.text) {
        elm.data = vnode.text;
      }
      return true;
    }
    function assertNodeMatch(node, vnode, inVPre) {
      if (isDef(vnode.tag)) {
        return vnode.tag.indexOf("vue-component") === 0 || !isUnknownElement$$1(vnode, inVPre) && vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase());
      } else {
        return node.nodeType === (vnode.isComment ? 8 : 3);
      }
    }
    return function patch2(oldVnode, vnode, hydrating, removeOnly) {
      if (isUndef(vnode)) {
        if (isDef(oldVnode)) {
          invokeDestroyHook(oldVnode);
        }
        return;
      }
      var isInitialPatch = false;
      var insertedVnodeQueue = [];
      if (isUndef(oldVnode)) {
        isInitialPatch = true;
        createElm(vnode, insertedVnodeQueue);
      } else {
        var isRealElement = isDef(oldVnode.nodeType);
        if (!isRealElement && sameVnode(oldVnode, vnode)) {
          patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
        } else {
          if (isRealElement) {
            if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
              oldVnode.removeAttribute(SSR_ATTR);
              hydrating = true;
            }
            if (isTrue(hydrating)) {
              if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
                invokeInsertHook(vnode, insertedVnodeQueue, true);
                return oldVnode;
              } else if (false) {
                warn("The client-side rendered virtual DOM tree is not matching server-rendered content. This is likely caused by incorrect HTML markup, for example nesting block-level elements inside <p>, or missing <tbody>. Bailing hydration and performing full client-side render.");
              }
            }
            oldVnode = emptyNodeAt(oldVnode);
          }
          var oldElm = oldVnode.elm;
          var parentElm = nodeOps2.parentNode(oldElm);
          createElm(vnode, insertedVnodeQueue, oldElm._leaveCb ? null : parentElm, nodeOps2.nextSibling(oldElm));
          if (isDef(vnode.parent)) {
            var ancestor = vnode.parent;
            var patchable = isPatchable(vnode);
            while (ancestor) {
              for (var i2 = 0; i2 < cbs.destroy.length; ++i2) {
                cbs.destroy[i2](ancestor);
              }
              ancestor.elm = vnode.elm;
              if (patchable) {
                for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                  cbs.create[i$1](emptyNode, ancestor);
                }
                var insert3 = ancestor.data.hook.insert;
                if (insert3.merged) {
                  for (var i$2 = 1; i$2 < insert3.fns.length; i$2++) {
                    insert3.fns[i$2]();
                  }
                }
              } else {
                registerRef(ancestor);
              }
              ancestor = ancestor.parent;
            }
          }
          if (isDef(parentElm)) {
            removeVnodes([oldVnode], 0, 0);
          } else if (isDef(oldVnode.tag)) {
            invokeDestroyHook(oldVnode);
          }
        }
      }
      invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
      return vnode.elm;
    };
  }
  var directives = {
    create: updateDirectives,
    update: updateDirectives,
    destroy: function unbindDirectives(vnode) {
      updateDirectives(vnode, emptyNode);
    }
  };
  function updateDirectives(oldVnode, vnode) {
    if (oldVnode.data.directives || vnode.data.directives) {
      _update(oldVnode, vnode);
    }
  }
  function _update(oldVnode, vnode) {
    var isCreate = oldVnode === emptyNode;
    var isDestroy = vnode === emptyNode;
    var oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context);
    var newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context);
    var dirsWithInsert = [];
    var dirsWithPostpatch = [];
    var key, oldDir, dir;
    for (key in newDirs) {
      oldDir = oldDirs[key];
      dir = newDirs[key];
      if (!oldDir) {
        callHook$1(dir, "bind", vnode, oldVnode);
        if (dir.def && dir.def.inserted) {
          dirsWithInsert.push(dir);
        }
      } else {
        dir.oldValue = oldDir.value;
        dir.oldArg = oldDir.arg;
        callHook$1(dir, "update", vnode, oldVnode);
        if (dir.def && dir.def.componentUpdated) {
          dirsWithPostpatch.push(dir);
        }
      }
    }
    if (dirsWithInsert.length) {
      var callInsert = function() {
        for (var i = 0; i < dirsWithInsert.length; i++) {
          callHook$1(dirsWithInsert[i], "inserted", vnode, oldVnode);
        }
      };
      if (isCreate) {
        mergeVNodeHook(vnode, "insert", callInsert);
      } else {
        callInsert();
      }
    }
    if (dirsWithPostpatch.length) {
      mergeVNodeHook(vnode, "postpatch", function() {
        for (var i = 0; i < dirsWithPostpatch.length; i++) {
          callHook$1(dirsWithPostpatch[i], "componentUpdated", vnode, oldVnode);
        }
      });
    }
    if (!isCreate) {
      for (key in oldDirs) {
        if (!newDirs[key]) {
          callHook$1(oldDirs[key], "unbind", oldVnode, oldVnode, isDestroy);
        }
      }
    }
  }
  var emptyModifiers = /* @__PURE__ */ Object.create(null);
  function normalizeDirectives$1(dirs, vm) {
    var res = /* @__PURE__ */ Object.create(null);
    if (!dirs) {
      return res;
    }
    var i, dir;
    for (i = 0; i < dirs.length; i++) {
      dir = dirs[i];
      if (!dir.modifiers) {
        dir.modifiers = emptyModifiers;
      }
      res[getRawDirName(dir)] = dir;
      dir.def = resolveAsset(vm.$options, "directives", dir.name, true);
    }
    return res;
  }
  function getRawDirName(dir) {
    return dir.rawName || dir.name + "." + Object.keys(dir.modifiers || {}).join(".");
  }
  function callHook$1(dir, hook, vnode, oldVnode, isDestroy) {
    var fn = dir.def && dir.def[hook];
    if (fn) {
      try {
        fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
      } catch (e) {
        handleError(e, vnode.context, "directive " + dir.name + " " + hook + " hook");
      }
    }
  }
  var baseModules = [
    ref,
    directives
  ];
  function updateAttrs(oldVnode, vnode) {
    var opts = vnode.componentOptions;
    if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
      return;
    }
    if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
      return;
    }
    var key, cur, old;
    var elm = vnode.elm;
    var oldAttrs = oldVnode.data.attrs || {};
    var attrs2 = vnode.data.attrs || {};
    if (isDef(attrs2.__ob__)) {
      attrs2 = vnode.data.attrs = extend({}, attrs2);
    }
    for (key in attrs2) {
      cur = attrs2[key];
      old = oldAttrs[key];
      if (old !== cur) {
        setAttr(elm, key, cur);
      }
    }
    if ((isIE || isEdge) && attrs2.value !== oldAttrs.value) {
      setAttr(elm, "value", attrs2.value);
    }
    for (key in oldAttrs) {
      if (isUndef(attrs2[key])) {
        if (isXlink(key)) {
          elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
        } else if (!isEnumeratedAttr(key)) {
          elm.removeAttribute(key);
        }
      }
    }
  }
  function setAttr(el, key, value) {
    if (el.tagName.indexOf("-") > -1) {
      baseSetAttr(el, key, value);
    } else if (isBooleanAttr(key)) {
      if (isFalsyAttrValue(value)) {
        el.removeAttribute(key);
      } else {
        value = key === "allowfullscreen" && el.tagName === "EMBED" ? "true" : key;
        el.setAttribute(key, value);
      }
    } else if (isEnumeratedAttr(key)) {
      el.setAttribute(key, convertEnumeratedValue(key, value));
    } else if (isXlink(key)) {
      if (isFalsyAttrValue(value)) {
        el.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else {
        el.setAttributeNS(xlinkNS, key, value);
      }
    } else {
      baseSetAttr(el, key, value);
    }
  }
  function baseSetAttr(el, key, value) {
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key);
    } else {
      if (isIE && !isIE9 && el.tagName === "TEXTAREA" && key === "placeholder" && value !== "" && !el.__ieph) {
        var blocker = function(e) {
          e.stopImmediatePropagation();
          el.removeEventListener("input", blocker);
        };
        el.addEventListener("input", blocker);
        el.__ieph = true;
      }
      el.setAttribute(key, value);
    }
  }
  var attrs = {
    create: updateAttrs,
    update: updateAttrs
  };
  function updateClass(oldVnode, vnode) {
    var el = vnode.elm;
    var data = vnode.data;
    var oldData = oldVnode.data;
    if (isUndef(data.staticClass) && isUndef(data.class) && (isUndef(oldData) || isUndef(oldData.staticClass) && isUndef(oldData.class))) {
      return;
    }
    var cls = genClassForVnode(vnode);
    var transitionClass = el._transitionClasses;
    if (isDef(transitionClass)) {
      cls = concat(cls, stringifyClass(transitionClass));
    }
    if (cls !== el._prevClass) {
      el.setAttribute("class", cls);
      el._prevClass = cls;
    }
  }
  var klass = {
    create: updateClass,
    update: updateClass
  };
  var validDivisionCharRE = /[\w).+\-_$\]]/;
  function parseFilters(exp) {
    var inSingle = false;
    var inDouble = false;
    var inTemplateString = false;
    var inRegex = false;
    var curly = 0;
    var square = 0;
    var paren = 0;
    var lastFilterIndex = 0;
    var c, prev, i, expression, filters;
    for (i = 0; i < exp.length; i++) {
      prev = c;
      c = exp.charCodeAt(i);
      if (inSingle) {
        if (c === 39 && prev !== 92) {
          inSingle = false;
        }
      } else if (inDouble) {
        if (c === 34 && prev !== 92) {
          inDouble = false;
        }
      } else if (inTemplateString) {
        if (c === 96 && prev !== 92) {
          inTemplateString = false;
        }
      } else if (inRegex) {
        if (c === 47 && prev !== 92) {
          inRegex = false;
        }
      } else if (c === 124 && exp.charCodeAt(i + 1) !== 124 && exp.charCodeAt(i - 1) !== 124 && !curly && !square && !paren) {
        if (expression === void 0) {
          lastFilterIndex = i + 1;
          expression = exp.slice(0, i).trim();
        } else {
          pushFilter();
        }
      } else {
        switch (c) {
          case 34:
            inDouble = true;
            break;
          case 39:
            inSingle = true;
            break;
          case 96:
            inTemplateString = true;
            break;
          case 40:
            paren++;
            break;
          case 41:
            paren--;
            break;
          case 91:
            square++;
            break;
          case 93:
            square--;
            break;
          case 123:
            curly++;
            break;
          case 125:
            curly--;
            break;
        }
        if (c === 47) {
          var j = i - 1;
          var p = void 0;
          for (; j >= 0; j--) {
            p = exp.charAt(j);
            if (p !== " ") {
              break;
            }
          }
          if (!p || !validDivisionCharRE.test(p)) {
            inRegex = true;
          }
        }
      }
    }
    if (expression === void 0) {
      expression = exp.slice(0, i).trim();
    } else if (lastFilterIndex !== 0) {
      pushFilter();
    }
    function pushFilter() {
      (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim());
      lastFilterIndex = i + 1;
    }
    if (filters) {
      for (i = 0; i < filters.length; i++) {
        expression = wrapFilter(expression, filters[i]);
      }
    }
    return expression;
  }
  function wrapFilter(exp, filter) {
    var i = filter.indexOf("(");
    if (i < 0) {
      return '_f("' + filter + '")(' + exp + ")";
    } else {
      var name = filter.slice(0, i);
      var args = filter.slice(i + 1);
      return '_f("' + name + '")(' + exp + (args !== ")" ? "," + args : args);
    }
  }
  function baseWarn(msg, range) {
    console.error("[Vue compiler]: " + msg);
  }
  function pluckModuleFunction(modules2, key) {
    return modules2 ? modules2.map(function(m) {
      return m[key];
    }).filter(function(_) {
      return _;
    }) : [];
  }
  function addProp(el, name, value, range, dynamic) {
    (el.props || (el.props = [])).push(rangeSetItem({ name, value, dynamic }, range));
    el.plain = false;
  }
  function addAttr(el, name, value, range, dynamic) {
    var attrs2 = dynamic ? el.dynamicAttrs || (el.dynamicAttrs = []) : el.attrs || (el.attrs = []);
    attrs2.push(rangeSetItem({ name, value, dynamic }, range));
    el.plain = false;
  }
  function addRawAttr(el, name, value, range) {
    el.attrsMap[name] = value;
    el.attrsList.push(rangeSetItem({ name, value }, range));
  }
  function addDirective(el, name, rawName, value, arg, isDynamicArg, modifiers, range) {
    (el.directives || (el.directives = [])).push(rangeSetItem({
      name,
      rawName,
      value,
      arg,
      isDynamicArg,
      modifiers
    }, range));
    el.plain = false;
  }
  function prependModifierMarker(symbol, name, dynamic) {
    return dynamic ? "_p(" + name + ',"' + symbol + '")' : symbol + name;
  }
  function addHandler(el, name, value, modifiers, important, warn2, range, dynamic) {
    modifiers = modifiers || emptyObject;
    if (false) {
      warn2("passive and prevent can't be used together. Passive handler can't prevent default event.", range);
    }
    if (modifiers.right) {
      if (dynamic) {
        name = "(" + name + ")==='click'?'contextmenu':(" + name + ")";
      } else if (name === "click") {
        name = "contextmenu";
        delete modifiers.right;
      }
    } else if (modifiers.middle) {
      if (dynamic) {
        name = "(" + name + ")==='click'?'mouseup':(" + name + ")";
      } else if (name === "click") {
        name = "mouseup";
      }
    }
    if (modifiers.capture) {
      delete modifiers.capture;
      name = prependModifierMarker("!", name, dynamic);
    }
    if (modifiers.once) {
      delete modifiers.once;
      name = prependModifierMarker("~", name, dynamic);
    }
    if (modifiers.passive) {
      delete modifiers.passive;
      name = prependModifierMarker("&", name, dynamic);
    }
    var events2;
    if (modifiers.native) {
      delete modifiers.native;
      events2 = el.nativeEvents || (el.nativeEvents = {});
    } else {
      events2 = el.events || (el.events = {});
    }
    var newHandler = rangeSetItem({ value: value.trim(), dynamic }, range);
    if (modifiers !== emptyObject) {
      newHandler.modifiers = modifiers;
    }
    var handlers = events2[name];
    if (Array.isArray(handlers)) {
      important ? handlers.unshift(newHandler) : handlers.push(newHandler);
    } else if (handlers) {
      events2[name] = important ? [newHandler, handlers] : [handlers, newHandler];
    } else {
      events2[name] = newHandler;
    }
    el.plain = false;
  }
  function getRawBindingAttr(el, name) {
    return el.rawAttrsMap[":" + name] || el.rawAttrsMap["v-bind:" + name] || el.rawAttrsMap[name];
  }
  function getBindingAttr(el, name, getStatic) {
    var dynamicValue = getAndRemoveAttr(el, ":" + name) || getAndRemoveAttr(el, "v-bind:" + name);
    if (dynamicValue != null) {
      return parseFilters(dynamicValue);
    } else if (getStatic !== false) {
      var staticValue = getAndRemoveAttr(el, name);
      if (staticValue != null) {
        return JSON.stringify(staticValue);
      }
    }
  }
  function getAndRemoveAttr(el, name, removeFromMap) {
    var val;
    if ((val = el.attrsMap[name]) != null) {
      var list = el.attrsList;
      for (var i = 0, l = list.length; i < l; i++) {
        if (list[i].name === name) {
          list.splice(i, 1);
          break;
        }
      }
    }
    if (removeFromMap) {
      delete el.attrsMap[name];
    }
    return val;
  }
  function getAndRemoveAttrByRegex(el, name) {
    var list = el.attrsList;
    for (var i = 0, l = list.length; i < l; i++) {
      var attr = list[i];
      if (name.test(attr.name)) {
        list.splice(i, 1);
        return attr;
      }
    }
  }
  function rangeSetItem(item, range) {
    if (range) {
      if (range.start != null) {
        item.start = range.start;
      }
      if (range.end != null) {
        item.end = range.end;
      }
    }
    return item;
  }
  function genComponentModel(el, value, modifiers) {
    var ref2 = modifiers || {};
    var number3 = ref2.number;
    var trim = ref2.trim;
    var baseValueExpression = "$$v";
    var valueExpression = baseValueExpression;
    if (trim) {
      valueExpression = "(typeof " + baseValueExpression + " === 'string'? " + baseValueExpression + ".trim(): " + baseValueExpression + ")";
    }
    if (number3) {
      valueExpression = "_n(" + valueExpression + ")";
    }
    var assignment = genAssignmentCode(value, valueExpression);
    el.model = {
      value: "(" + value + ")",
      expression: JSON.stringify(value),
      callback: "function (" + baseValueExpression + ") {" + assignment + "}"
    };
  }
  function genAssignmentCode(value, assignment) {
    var res = parseModel(value);
    if (res.key === null) {
      return value + "=" + assignment;
    } else {
      return "$set(" + res.exp + ", " + res.key + ", " + assignment + ")";
    }
  }
  var len;
  var str;
  var chr;
  var index$1;
  var expressionPos;
  var expressionEndPos;
  function parseModel(val) {
    val = val.trim();
    len = val.length;
    if (val.indexOf("[") < 0 || val.lastIndexOf("]") < len - 1) {
      index$1 = val.lastIndexOf(".");
      if (index$1 > -1) {
        return {
          exp: val.slice(0, index$1),
          key: '"' + val.slice(index$1 + 1) + '"'
        };
      } else {
        return {
          exp: val,
          key: null
        };
      }
    }
    str = val;
    index$1 = expressionPos = expressionEndPos = 0;
    while (!eof()) {
      chr = next();
      if (isStringStart(chr)) {
        parseString(chr);
      } else if (chr === 91) {
        parseBracket(chr);
      }
    }
    return {
      exp: val.slice(0, expressionPos),
      key: val.slice(expressionPos + 1, expressionEndPos)
    };
  }
  function next() {
    return str.charCodeAt(++index$1);
  }
  function eof() {
    return index$1 >= len;
  }
  function isStringStart(chr2) {
    return chr2 === 34 || chr2 === 39;
  }
  function parseBracket(chr2) {
    var inBracket = 1;
    expressionPos = index$1;
    while (!eof()) {
      chr2 = next();
      if (isStringStart(chr2)) {
        parseString(chr2);
        continue;
      }
      if (chr2 === 91) {
        inBracket++;
      }
      if (chr2 === 93) {
        inBracket--;
      }
      if (inBracket === 0) {
        expressionEndPos = index$1;
        break;
      }
    }
  }
  function parseString(chr2) {
    var stringQuote = chr2;
    while (!eof()) {
      chr2 = next();
      if (chr2 === stringQuote) {
        break;
      }
    }
  }
  var warn$1;
  var RANGE_TOKEN = "__r";
  var CHECKBOX_RADIO_TOKEN = "__c";
  function model(el, dir, _warn) {
    warn$1 = _warn;
    var value = dir.value;
    var modifiers = dir.modifiers;
    var tag = el.tag;
    var type = el.attrsMap.type;
    if (false) {
      if (tag === "input" && type === "file") {
        warn$1("<" + el.tag + ' v-model="' + value + '" type="file">:\nFile inputs are read only. Use a v-on:change listener instead.', el.rawAttrsMap["v-model"]);
      }
    }
    if (el.component) {
      genComponentModel(el, value, modifiers);
      return false;
    } else if (tag === "select") {
      genSelect(el, value, modifiers);
    } else if (tag === "input" && type === "checkbox") {
      genCheckboxModel(el, value, modifiers);
    } else if (tag === "input" && type === "radio") {
      genRadioModel(el, value, modifiers);
    } else if (tag === "input" || tag === "textarea") {
      genDefaultModel(el, value, modifiers);
    } else if (!config.isReservedTag(tag)) {
      genComponentModel(el, value, modifiers);
      return false;
    } else if (false) {
      warn$1("<" + el.tag + ' v-model="' + value + `">: v-model is not supported on this element type. If you are working with contenteditable, it's recommended to wrap a library dedicated for that purpose inside a custom component.`, el.rawAttrsMap["v-model"]);
    }
    return true;
  }
  function genCheckboxModel(el, value, modifiers) {
    var number3 = modifiers && modifiers.number;
    var valueBinding = getBindingAttr(el, "value") || "null";
    var trueValueBinding = getBindingAttr(el, "true-value") || "true";
    var falseValueBinding = getBindingAttr(el, "false-value") || "false";
    addProp(el, "checked", "Array.isArray(" + value + ")?_i(" + value + "," + valueBinding + ")>-1" + (trueValueBinding === "true" ? ":(" + value + ")" : ":_q(" + value + "," + trueValueBinding + ")"));
    addHandler(el, "change", "var $$a=" + value + ",$$el=$event.target,$$c=$$el.checked?(" + trueValueBinding + "):(" + falseValueBinding + ");if(Array.isArray($$a)){var $$v=" + (number3 ? "_n(" + valueBinding + ")" : valueBinding) + ",$$i=_i($$a,$$v);if($$el.checked){$$i<0&&(" + genAssignmentCode(value, "$$a.concat([$$v])") + ")}else{$$i>-1&&(" + genAssignmentCode(value, "$$a.slice(0,$$i).concat($$a.slice($$i+1))") + ")}}else{" + genAssignmentCode(value, "$$c") + "}", null, true);
  }
  function genRadioModel(el, value, modifiers) {
    var number3 = modifiers && modifiers.number;
    var valueBinding = getBindingAttr(el, "value") || "null";
    valueBinding = number3 ? "_n(" + valueBinding + ")" : valueBinding;
    addProp(el, "checked", "_q(" + value + "," + valueBinding + ")");
    addHandler(el, "change", genAssignmentCode(value, valueBinding), null, true);
  }
  function genSelect(el, value, modifiers) {
    var number3 = modifiers && modifiers.number;
    var selectedVal = 'Array.prototype.filter.call($event.target.options,function(o){return o.selected}).map(function(o){var val = "_value" in o ? o._value : o.value;return ' + (number3 ? "_n(val)" : "val") + "})";
    var assignment = "$event.target.multiple ? $$selectedVal : $$selectedVal[0]";
    var code = "var $$selectedVal = " + selectedVal + ";";
    code = code + " " + genAssignmentCode(value, assignment);
    addHandler(el, "change", code, null, true);
  }
  function genDefaultModel(el, value, modifiers) {
    var type = el.attrsMap.type;
    if (false) {
      var value$1 = el.attrsMap["v-bind:value"] || el.attrsMap[":value"];
      var typeBinding = el.attrsMap["v-bind:type"] || el.attrsMap[":type"];
      if (value$1 && !typeBinding) {
        var binding = el.attrsMap["v-bind:value"] ? "v-bind:value" : ":value";
        warn$1(binding + '="' + value$1 + '" conflicts with v-model on the same element because the latter already expands to a value binding internally', el.rawAttrsMap[binding]);
      }
    }
    var ref2 = modifiers || {};
    var lazy = ref2.lazy;
    var number3 = ref2.number;
    var trim = ref2.trim;
    var needCompositionGuard = !lazy && type !== "range";
    var event = lazy ? "change" : type === "range" ? RANGE_TOKEN : "input";
    var valueExpression = "$event.target.value";
    if (trim) {
      valueExpression = "$event.target.value.trim()";
    }
    if (number3) {
      valueExpression = "_n(" + valueExpression + ")";
    }
    var code = genAssignmentCode(value, valueExpression);
    if (needCompositionGuard) {
      code = "if($event.target.composing)return;" + code;
    }
    addProp(el, "value", "(" + value + ")");
    addHandler(el, event, code, null, true);
    if (trim || number3) {
      addHandler(el, "blur", "$forceUpdate()");
    }
  }
  function normalizeEvents(on2) {
    if (isDef(on2[RANGE_TOKEN])) {
      var event = isIE ? "change" : "input";
      on2[event] = [].concat(on2[RANGE_TOKEN], on2[event] || []);
      delete on2[RANGE_TOKEN];
    }
    if (isDef(on2[CHECKBOX_RADIO_TOKEN])) {
      on2.change = [].concat(on2[CHECKBOX_RADIO_TOKEN], on2.change || []);
      delete on2[CHECKBOX_RADIO_TOKEN];
    }
  }
  var target$1;
  function createOnceHandler$1(event, handler, capture) {
    var _target = target$1;
    return function onceHandler() {
      var res = handler.apply(null, arguments);
      if (res !== null) {
        remove$2(event, onceHandler, capture, _target);
      }
    };
  }
  var useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53);
  function add$1(name, handler, capture, passive) {
    if (useMicrotaskFix) {
      var attachedTimestamp = currentFlushTimestamp;
      var original = handler;
      handler = original._wrapper = function(e) {
        if (e.target === e.currentTarget || e.timeStamp >= attachedTimestamp || e.timeStamp <= 0 || e.target.ownerDocument !== document) {
          return original.apply(this, arguments);
        }
      };
    }
    target$1.addEventListener(name, handler, supportsPassive ? { capture, passive } : capture);
  }
  function remove$2(name, handler, capture, _target) {
    (_target || target$1).removeEventListener(name, handler._wrapper || handler, capture);
  }
  function updateDOMListeners(oldVnode, vnode) {
    if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
      return;
    }
    var on2 = vnode.data.on || {};
    var oldOn = oldVnode.data.on || {};
    target$1 = vnode.elm;
    normalizeEvents(on2);
    updateListeners(on2, oldOn, add$1, remove$2, createOnceHandler$1, vnode.context);
    target$1 = void 0;
  }
  var events = {
    create: updateDOMListeners,
    update: updateDOMListeners
  };
  var svgContainer;
  function updateDOMProps(oldVnode, vnode) {
    if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
      return;
    }
    var key, cur;
    var elm = vnode.elm;
    var oldProps = oldVnode.data.domProps || {};
    var props2 = vnode.data.domProps || {};
    if (isDef(props2.__ob__)) {
      props2 = vnode.data.domProps = extend({}, props2);
    }
    for (key in oldProps) {
      if (!(key in props2)) {
        elm[key] = "";
      }
    }
    for (key in props2) {
      cur = props2[key];
      if (key === "textContent" || key === "innerHTML") {
        if (vnode.children) {
          vnode.children.length = 0;
        }
        if (cur === oldProps[key]) {
          continue;
        }
        if (elm.childNodes.length === 1) {
          elm.removeChild(elm.childNodes[0]);
        }
      }
      if (key === "value" && elm.tagName !== "PROGRESS") {
        elm._value = cur;
        var strCur = isUndef(cur) ? "" : String(cur);
        if (shouldUpdateValue(elm, strCur)) {
          elm.value = strCur;
        }
      } else if (key === "innerHTML" && isSVG(elm.tagName) && isUndef(elm.innerHTML)) {
        svgContainer = svgContainer || document.createElement("div");
        svgContainer.innerHTML = "<svg>" + cur + "</svg>";
        var svg = svgContainer.firstChild;
        while (elm.firstChild) {
          elm.removeChild(elm.firstChild);
        }
        while (svg.firstChild) {
          elm.appendChild(svg.firstChild);
        }
      } else if (cur !== oldProps[key]) {
        try {
          elm[key] = cur;
        } catch (e) {
        }
      }
    }
  }
  function shouldUpdateValue(elm, checkVal) {
    return !elm.composing && (elm.tagName === "OPTION" || isNotInFocusAndDirty(elm, checkVal) || isDirtyWithModifiers(elm, checkVal));
  }
  function isNotInFocusAndDirty(elm, checkVal) {
    var notInFocus = true;
    try {
      notInFocus = document.activeElement !== elm;
    } catch (e) {
    }
    return notInFocus && elm.value !== checkVal;
  }
  function isDirtyWithModifiers(elm, newVal) {
    var value = elm.value;
    var modifiers = elm._vModifiers;
    if (isDef(modifiers)) {
      if (modifiers.number) {
        return toNumber(value) !== toNumber(newVal);
      }
      if (modifiers.trim) {
        return value.trim() !== newVal.trim();
      }
    }
    return value !== newVal;
  }
  var domProps = {
    create: updateDOMProps,
    update: updateDOMProps
  };
  var parseStyleText = cached(function(cssText) {
    var res = {};
    var listDelimiter = /;(?![^(]*\))/g;
    var propertyDelimiter = /:(.+)/;
    cssText.split(listDelimiter).forEach(function(item) {
      if (item) {
        var tmp = item.split(propertyDelimiter);
        tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
      }
    });
    return res;
  });
  function normalizeStyleData(data) {
    var style2 = normalizeStyleBinding(data.style);
    return data.staticStyle ? extend(data.staticStyle, style2) : style2;
  }
  function normalizeStyleBinding(bindingStyle) {
    if (Array.isArray(bindingStyle)) {
      return toObject(bindingStyle);
    }
    if (typeof bindingStyle === "string") {
      return parseStyleText(bindingStyle);
    }
    return bindingStyle;
  }
  function getStyle(vnode, checkChild) {
    var res = {};
    var styleData;
    if (checkChild) {
      var childNode = vnode;
      while (childNode.componentInstance) {
        childNode = childNode.componentInstance._vnode;
        if (childNode && childNode.data && (styleData = normalizeStyleData(childNode.data))) {
          extend(res, styleData);
        }
      }
    }
    if (styleData = normalizeStyleData(vnode.data)) {
      extend(res, styleData);
    }
    var parentNode2 = vnode;
    while (parentNode2 = parentNode2.parent) {
      if (parentNode2.data && (styleData = normalizeStyleData(parentNode2.data))) {
        extend(res, styleData);
      }
    }
    return res;
  }
  var cssVarRE = /^--/;
  var importantRE = /\s*!important$/;
  var setProp = function(el, name, val) {
    if (cssVarRE.test(name)) {
      el.style.setProperty(name, val);
    } else if (importantRE.test(val)) {
      el.style.setProperty(hyphenate(name), val.replace(importantRE, ""), "important");
    } else {
      var normalizedName = normalize(name);
      if (Array.isArray(val)) {
        for (var i = 0, len2 = val.length; i < len2; i++) {
          el.style[normalizedName] = val[i];
        }
      } else {
        el.style[normalizedName] = val;
      }
    }
  };
  var vendorNames = ["Webkit", "Moz", "ms"];
  var emptyStyle;
  var normalize = cached(function(prop) {
    emptyStyle = emptyStyle || document.createElement("div").style;
    prop = camelize(prop);
    if (prop !== "filter" && prop in emptyStyle) {
      return prop;
    }
    var capName = prop.charAt(0).toUpperCase() + prop.slice(1);
    for (var i = 0; i < vendorNames.length; i++) {
      var name = vendorNames[i] + capName;
      if (name in emptyStyle) {
        return name;
      }
    }
  });
  function updateStyle(oldVnode, vnode) {
    var data = vnode.data;
    var oldData = oldVnode.data;
    if (isUndef(data.staticStyle) && isUndef(data.style) && isUndef(oldData.staticStyle) && isUndef(oldData.style)) {
      return;
    }
    var cur, name;
    var el = vnode.elm;
    var oldStaticStyle = oldData.staticStyle;
    var oldStyleBinding = oldData.normalizedStyle || oldData.style || {};
    var oldStyle = oldStaticStyle || oldStyleBinding;
    var style2 = normalizeStyleBinding(vnode.data.style) || {};
    vnode.data.normalizedStyle = isDef(style2.__ob__) ? extend({}, style2) : style2;
    var newStyle = getStyle(vnode, true);
    for (name in oldStyle) {
      if (isUndef(newStyle[name])) {
        setProp(el, name, "");
      }
    }
    for (name in newStyle) {
      cur = newStyle[name];
      if (cur !== oldStyle[name]) {
        setProp(el, name, cur == null ? "" : cur);
      }
    }
  }
  var style = {
    create: updateStyle,
    update: updateStyle
  };
  var whitespaceRE = /\s+/;
  function addClass(el, cls) {
    if (!cls || !(cls = cls.trim())) {
      return;
    }
    if (el.classList) {
      if (cls.indexOf(" ") > -1) {
        cls.split(whitespaceRE).forEach(function(c) {
          return el.classList.add(c);
        });
      } else {
        el.classList.add(cls);
      }
    } else {
      var cur = " " + (el.getAttribute("class") || "") + " ";
      if (cur.indexOf(" " + cls + " ") < 0) {
        el.setAttribute("class", (cur + cls).trim());
      }
    }
  }
  function removeClass(el, cls) {
    if (!cls || !(cls = cls.trim())) {
      return;
    }
    if (el.classList) {
      if (cls.indexOf(" ") > -1) {
        cls.split(whitespaceRE).forEach(function(c) {
          return el.classList.remove(c);
        });
      } else {
        el.classList.remove(cls);
      }
      if (!el.classList.length) {
        el.removeAttribute("class");
      }
    } else {
      var cur = " " + (el.getAttribute("class") || "") + " ";
      var tar = " " + cls + " ";
      while (cur.indexOf(tar) >= 0) {
        cur = cur.replace(tar, " ");
      }
      cur = cur.trim();
      if (cur) {
        el.setAttribute("class", cur);
      } else {
        el.removeAttribute("class");
      }
    }
  }
  function resolveTransition(def$$1) {
    if (!def$$1) {
      return;
    }
    if (typeof def$$1 === "object") {
      var res = {};
      if (def$$1.css !== false) {
        extend(res, autoCssTransition(def$$1.name || "v"));
      }
      extend(res, def$$1);
      return res;
    } else if (typeof def$$1 === "string") {
      return autoCssTransition(def$$1);
    }
  }
  var autoCssTransition = cached(function(name) {
    return {
      enterClass: name + "-enter",
      enterToClass: name + "-enter-to",
      enterActiveClass: name + "-enter-active",
      leaveClass: name + "-leave",
      leaveToClass: name + "-leave-to",
      leaveActiveClass: name + "-leave-active"
    };
  });
  var hasTransition = inBrowser && !isIE9;
  var TRANSITION = "transition";
  var ANIMATION = "animation";
  var transitionProp = "transition";
  var transitionEndEvent = "transitionend";
  var animationProp = "animation";
  var animationEndEvent = "animationend";
  if (hasTransition) {
    if (window.ontransitionend === void 0 && window.onwebkittransitionend !== void 0) {
      transitionProp = "WebkitTransition";
      transitionEndEvent = "webkitTransitionEnd";
    }
    if (window.onanimationend === void 0 && window.onwebkitanimationend !== void 0) {
      animationProp = "WebkitAnimation";
      animationEndEvent = "webkitAnimationEnd";
    }
  }
  var raf = inBrowser ? window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : setTimeout : function(fn) {
    return fn();
  };
  function nextFrame(fn) {
    raf(function() {
      raf(fn);
    });
  }
  function addTransitionClass(el, cls) {
    var transitionClasses = el._transitionClasses || (el._transitionClasses = []);
    if (transitionClasses.indexOf(cls) < 0) {
      transitionClasses.push(cls);
      addClass(el, cls);
    }
  }
  function removeTransitionClass(el, cls) {
    if (el._transitionClasses) {
      remove(el._transitionClasses, cls);
    }
    removeClass(el, cls);
  }
  function whenTransitionEnds(el, expectedType, cb) {
    var ref2 = getTransitionInfo(el, expectedType);
    var type = ref2.type;
    var timeout = ref2.timeout;
    var propCount = ref2.propCount;
    if (!type) {
      return cb();
    }
    var event = type === TRANSITION ? transitionEndEvent : animationEndEvent;
    var ended = 0;
    var end = function() {
      el.removeEventListener(event, onEnd);
      cb();
    };
    var onEnd = function(e) {
      if (e.target === el) {
        if (++ended >= propCount) {
          end();
        }
      }
    };
    setTimeout(function() {
      if (ended < propCount) {
        end();
      }
    }, timeout + 1);
    el.addEventListener(event, onEnd);
  }
  var transformRE = /\b(transform|all)(,|$)/;
  function getTransitionInfo(el, expectedType) {
    var styles = window.getComputedStyle(el);
    var transitionDelays = (styles[transitionProp + "Delay"] || "").split(", ");
    var transitionDurations = (styles[transitionProp + "Duration"] || "").split(", ");
    var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
    var animationDelays = (styles[animationProp + "Delay"] || "").split(", ");
    var animationDurations = (styles[animationProp + "Duration"] || "").split(", ");
    var animationTimeout = getTimeout(animationDelays, animationDurations);
    var type;
    var timeout = 0;
    var propCount = 0;
    if (expectedType === TRANSITION) {
      if (transitionTimeout > 0) {
        type = TRANSITION;
        timeout = transitionTimeout;
        propCount = transitionDurations.length;
      }
    } else if (expectedType === ANIMATION) {
      if (animationTimeout > 0) {
        type = ANIMATION;
        timeout = animationTimeout;
        propCount = animationDurations.length;
      }
    } else {
      timeout = Math.max(transitionTimeout, animationTimeout);
      type = timeout > 0 ? transitionTimeout > animationTimeout ? TRANSITION : ANIMATION : null;
      propCount = type ? type === TRANSITION ? transitionDurations.length : animationDurations.length : 0;
    }
    var hasTransform = type === TRANSITION && transformRE.test(styles[transitionProp + "Property"]);
    return {
      type,
      timeout,
      propCount,
      hasTransform
    };
  }
  function getTimeout(delays, durations) {
    while (delays.length < durations.length) {
      delays = delays.concat(delays);
    }
    return Math.max.apply(null, durations.map(function(d, i) {
      return toMs(d) + toMs(delays[i]);
    }));
  }
  function toMs(s) {
    return Number(s.slice(0, -1).replace(",", ".")) * 1e3;
  }
  function enter(vnode, toggleDisplay) {
    var el = vnode.elm;
    if (isDef(el._leaveCb)) {
      el._leaveCb.cancelled = true;
      el._leaveCb();
    }
    var data = resolveTransition(vnode.data.transition);
    if (isUndef(data)) {
      return;
    }
    if (isDef(el._enterCb) || el.nodeType !== 1) {
      return;
    }
    var css = data.css;
    var type = data.type;
    var enterClass = data.enterClass;
    var enterToClass = data.enterToClass;
    var enterActiveClass = data.enterActiveClass;
    var appearClass = data.appearClass;
    var appearToClass = data.appearToClass;
    var appearActiveClass = data.appearActiveClass;
    var beforeEnter = data.beforeEnter;
    var enter2 = data.enter;
    var afterEnter = data.afterEnter;
    var enterCancelled = data.enterCancelled;
    var beforeAppear = data.beforeAppear;
    var appear = data.appear;
    var afterAppear = data.afterAppear;
    var appearCancelled = data.appearCancelled;
    var duration = data.duration;
    var context = activeInstance;
    var transitionNode = activeInstance.$vnode;
    while (transitionNode && transitionNode.parent) {
      context = transitionNode.context;
      transitionNode = transitionNode.parent;
    }
    var isAppear = !context._isMounted || !vnode.isRootInsert;
    if (isAppear && !appear && appear !== "") {
      return;
    }
    var startClass = isAppear && appearClass ? appearClass : enterClass;
    var activeClass = isAppear && appearActiveClass ? appearActiveClass : enterActiveClass;
    var toClass = isAppear && appearToClass ? appearToClass : enterToClass;
    var beforeEnterHook = isAppear ? beforeAppear || beforeEnter : beforeEnter;
    var enterHook = isAppear ? typeof appear === "function" ? appear : enter2 : enter2;
    var afterEnterHook = isAppear ? afterAppear || afterEnter : afterEnter;
    var enterCancelledHook = isAppear ? appearCancelled || enterCancelled : enterCancelled;
    var explicitEnterDuration = toNumber(isObject(duration) ? duration.enter : duration);
    if (false) {
      checkDuration(explicitEnterDuration, "enter", vnode);
    }
    var expectsCSS = css !== false && !isIE9;
    var userWantsControl = getHookArgumentsLength(enterHook);
    var cb = el._enterCb = once(function() {
      if (expectsCSS) {
        removeTransitionClass(el, toClass);
        removeTransitionClass(el, activeClass);
      }
      if (cb.cancelled) {
        if (expectsCSS) {
          removeTransitionClass(el, startClass);
        }
        enterCancelledHook && enterCancelledHook(el);
      } else {
        afterEnterHook && afterEnterHook(el);
      }
      el._enterCb = null;
    });
    if (!vnode.data.show) {
      mergeVNodeHook(vnode, "insert", function() {
        var parent = el.parentNode;
        var pendingNode = parent && parent._pending && parent._pending[vnode.key];
        if (pendingNode && pendingNode.tag === vnode.tag && pendingNode.elm._leaveCb) {
          pendingNode.elm._leaveCb();
        }
        enterHook && enterHook(el, cb);
      });
    }
    beforeEnterHook && beforeEnterHook(el);
    if (expectsCSS) {
      addTransitionClass(el, startClass);
      addTransitionClass(el, activeClass);
      nextFrame(function() {
        removeTransitionClass(el, startClass);
        if (!cb.cancelled) {
          addTransitionClass(el, toClass);
          if (!userWantsControl) {
            if (isValidDuration(explicitEnterDuration)) {
              setTimeout(cb, explicitEnterDuration);
            } else {
              whenTransitionEnds(el, type, cb);
            }
          }
        }
      });
    }
    if (vnode.data.show) {
      toggleDisplay && toggleDisplay();
      enterHook && enterHook(el, cb);
    }
    if (!expectsCSS && !userWantsControl) {
      cb();
    }
  }
  function leave(vnode, rm) {
    var el = vnode.elm;
    if (isDef(el._enterCb)) {
      el._enterCb.cancelled = true;
      el._enterCb();
    }
    var data = resolveTransition(vnode.data.transition);
    if (isUndef(data) || el.nodeType !== 1) {
      return rm();
    }
    if (isDef(el._leaveCb)) {
      return;
    }
    var css = data.css;
    var type = data.type;
    var leaveClass = data.leaveClass;
    var leaveToClass = data.leaveToClass;
    var leaveActiveClass = data.leaveActiveClass;
    var beforeLeave = data.beforeLeave;
    var leave2 = data.leave;
    var afterLeave = data.afterLeave;
    var leaveCancelled = data.leaveCancelled;
    var delayLeave = data.delayLeave;
    var duration = data.duration;
    var expectsCSS = css !== false && !isIE9;
    var userWantsControl = getHookArgumentsLength(leave2);
    var explicitLeaveDuration = toNumber(isObject(duration) ? duration.leave : duration);
    if (false) {
      checkDuration(explicitLeaveDuration, "leave", vnode);
    }
    var cb = el._leaveCb = once(function() {
      if (el.parentNode && el.parentNode._pending) {
        el.parentNode._pending[vnode.key] = null;
      }
      if (expectsCSS) {
        removeTransitionClass(el, leaveToClass);
        removeTransitionClass(el, leaveActiveClass);
      }
      if (cb.cancelled) {
        if (expectsCSS) {
          removeTransitionClass(el, leaveClass);
        }
        leaveCancelled && leaveCancelled(el);
      } else {
        rm();
        afterLeave && afterLeave(el);
      }
      el._leaveCb = null;
    });
    if (delayLeave) {
      delayLeave(performLeave);
    } else {
      performLeave();
    }
    function performLeave() {
      if (cb.cancelled) {
        return;
      }
      if (!vnode.data.show && el.parentNode) {
        (el.parentNode._pending || (el.parentNode._pending = {}))[vnode.key] = vnode;
      }
      beforeLeave && beforeLeave(el);
      if (expectsCSS) {
        addTransitionClass(el, leaveClass);
        addTransitionClass(el, leaveActiveClass);
        nextFrame(function() {
          removeTransitionClass(el, leaveClass);
          if (!cb.cancelled) {
            addTransitionClass(el, leaveToClass);
            if (!userWantsControl) {
              if (isValidDuration(explicitLeaveDuration)) {
                setTimeout(cb, explicitLeaveDuration);
              } else {
                whenTransitionEnds(el, type, cb);
              }
            }
          }
        });
      }
      leave2 && leave2(el, cb);
      if (!expectsCSS && !userWantsControl) {
        cb();
      }
    }
  }
  function isValidDuration(val) {
    return typeof val === "number" && !isNaN(val);
  }
  function getHookArgumentsLength(fn) {
    if (isUndef(fn)) {
      return false;
    }
    var invokerFns = fn.fns;
    if (isDef(invokerFns)) {
      return getHookArgumentsLength(Array.isArray(invokerFns) ? invokerFns[0] : invokerFns);
    } else {
      return (fn._length || fn.length) > 1;
    }
  }
  function _enter(_, vnode) {
    if (vnode.data.show !== true) {
      enter(vnode);
    }
  }
  var transition = inBrowser ? {
    create: _enter,
    activate: _enter,
    remove: function remove$$1(vnode, rm) {
      if (vnode.data.show !== true) {
        leave(vnode, rm);
      } else {
        rm();
      }
    }
  } : {};
  var platformModules = [
    attrs,
    klass,
    events,
    domProps,
    style,
    transition
  ];
  var modules = platformModules.concat(baseModules);
  var patch = createPatchFunction({ nodeOps, modules });
  if (isIE9) {
    document.addEventListener("selectionchange", function() {
      var el = document.activeElement;
      if (el && el.vmodel) {
        trigger(el, "input");
      }
    });
  }
  var directive = {
    inserted: function inserted(el, binding, vnode, oldVnode) {
      if (vnode.tag === "select") {
        if (oldVnode.elm && !oldVnode.elm._vOptions) {
          mergeVNodeHook(vnode, "postpatch", function() {
            directive.componentUpdated(el, binding, vnode);
          });
        } else {
          setSelected(el, binding, vnode.context);
        }
        el._vOptions = [].map.call(el.options, getValue);
      } else if (vnode.tag === "textarea" || isTextInputType(el.type)) {
        el._vModifiers = binding.modifiers;
        if (!binding.modifiers.lazy) {
          el.addEventListener("compositionstart", onCompositionStart);
          el.addEventListener("compositionend", onCompositionEnd);
          el.addEventListener("change", onCompositionEnd);
          if (isIE9) {
            el.vmodel = true;
          }
        }
      }
    },
    componentUpdated: function componentUpdated(el, binding, vnode) {
      if (vnode.tag === "select") {
        setSelected(el, binding, vnode.context);
        var prevOptions = el._vOptions;
        var curOptions = el._vOptions = [].map.call(el.options, getValue);
        if (curOptions.some(function(o, i) {
          return !looseEqual(o, prevOptions[i]);
        })) {
          var needReset = el.multiple ? binding.value.some(function(v) {
            return hasNoMatchingOption(v, curOptions);
          }) : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions);
          if (needReset) {
            trigger(el, "change");
          }
        }
      }
    }
  };
  function setSelected(el, binding, vm) {
    actuallySetSelected(el, binding, vm);
    if (isIE || isEdge) {
      setTimeout(function() {
        actuallySetSelected(el, binding, vm);
      }, 0);
    }
  }
  function actuallySetSelected(el, binding, vm) {
    var value = binding.value;
    var isMultiple = el.multiple;
    if (isMultiple && !Array.isArray(value)) {
      return;
    }
    var selected, option;
    for (var i = 0, l = el.options.length; i < l; i++) {
      option = el.options[i];
      if (isMultiple) {
        selected = looseIndexOf(value, getValue(option)) > -1;
        if (option.selected !== selected) {
          option.selected = selected;
        }
      } else {
        if (looseEqual(getValue(option), value)) {
          if (el.selectedIndex !== i) {
            el.selectedIndex = i;
          }
          return;
        }
      }
    }
    if (!isMultiple) {
      el.selectedIndex = -1;
    }
  }
  function hasNoMatchingOption(value, options) {
    return options.every(function(o) {
      return !looseEqual(o, value);
    });
  }
  function getValue(option) {
    return "_value" in option ? option._value : option.value;
  }
  function onCompositionStart(e) {
    e.target.composing = true;
  }
  function onCompositionEnd(e) {
    if (!e.target.composing) {
      return;
    }
    e.target.composing = false;
    trigger(e.target, "input");
  }
  function trigger(el, type) {
    var e = document.createEvent("HTMLEvents");
    e.initEvent(type, true, true);
    el.dispatchEvent(e);
  }
  function locateNode(vnode) {
    return vnode.componentInstance && (!vnode.data || !vnode.data.transition) ? locateNode(vnode.componentInstance._vnode) : vnode;
  }
  var show = {
    bind: function bind2(el, ref2, vnode) {
      var value = ref2.value;
      vnode = locateNode(vnode);
      var transition$$1 = vnode.data && vnode.data.transition;
      var originalDisplay = el.__vOriginalDisplay = el.style.display === "none" ? "" : el.style.display;
      if (value && transition$$1) {
        vnode.data.show = true;
        enter(vnode, function() {
          el.style.display = originalDisplay;
        });
      } else {
        el.style.display = value ? originalDisplay : "none";
      }
    },
    update: function update3(el, ref2, vnode) {
      var value = ref2.value;
      var oldValue = ref2.oldValue;
      if (!value === !oldValue) {
        return;
      }
      vnode = locateNode(vnode);
      var transition$$1 = vnode.data && vnode.data.transition;
      if (transition$$1) {
        vnode.data.show = true;
        if (value) {
          enter(vnode, function() {
            el.style.display = el.__vOriginalDisplay;
          });
        } else {
          leave(vnode, function() {
            el.style.display = "none";
          });
        }
      } else {
        el.style.display = value ? el.__vOriginalDisplay : "none";
      }
    },
    unbind: function unbind(el, binding, vnode, oldVnode, isDestroy) {
      if (!isDestroy) {
        el.style.display = el.__vOriginalDisplay;
      }
    }
  };
  var platformDirectives = {
    model: directive,
    show
  };
  var transitionProps = {
    name: String,
    appear: Boolean,
    css: Boolean,
    mode: String,
    type: String,
    enterClass: String,
    leaveClass: String,
    enterToClass: String,
    leaveToClass: String,
    enterActiveClass: String,
    leaveActiveClass: String,
    appearClass: String,
    appearActiveClass: String,
    appearToClass: String,
    duration: [Number, String, Object]
  };
  function getRealChild(vnode) {
    var compOptions = vnode && vnode.componentOptions;
    if (compOptions && compOptions.Ctor.options.abstract) {
      return getRealChild(getFirstComponentChild(compOptions.children));
    } else {
      return vnode;
    }
  }
  function extractTransitionData(comp) {
    var data = {};
    var options = comp.$options;
    for (var key in options.propsData) {
      data[key] = comp[key];
    }
    var listeners = options._parentListeners;
    for (var key$1 in listeners) {
      data[camelize(key$1)] = listeners[key$1];
    }
    return data;
  }
  function placeholder(h, rawChild) {
    if (/\d-keep-alive$/.test(rawChild.tag)) {
      return h("keep-alive", {
        props: rawChild.componentOptions.propsData
      });
    }
  }
  function hasParentTransition(vnode) {
    while (vnode = vnode.parent) {
      if (vnode.data.transition) {
        return true;
      }
    }
  }
  function isSameChild(child, oldChild) {
    return oldChild.key === child.key && oldChild.tag === child.tag;
  }
  var isNotTextNode = function(c) {
    return c.tag || isAsyncPlaceholder(c);
  };
  var isVShowDirective = function(d) {
    return d.name === "show";
  };
  var Transition = {
    name: "transition",
    props: transitionProps,
    abstract: true,
    render: function render2(h) {
      var this$1 = this;
      var children = this.$slots.default;
      if (!children) {
        return;
      }
      children = children.filter(isNotTextNode);
      if (!children.length) {
        return;
      }
      if (false) {
        warn("<transition> can only be used on a single element. Use <transition-group> for lists.", this.$parent);
      }
      var mode = this.mode;
      if (false) {
        warn("invalid <transition> mode: " + mode, this.$parent);
      }
      var rawChild = children[0];
      if (hasParentTransition(this.$vnode)) {
        return rawChild;
      }
      var child = getRealChild(rawChild);
      if (!child) {
        return rawChild;
      }
      if (this._leaving) {
        return placeholder(h, rawChild);
      }
      var id = "__transition-" + this._uid + "-";
      child.key = child.key == null ? child.isComment ? id + "comment" : id + child.tag : isPrimitive(child.key) ? String(child.key).indexOf(id) === 0 ? child.key : id + child.key : child.key;
      var data = (child.data || (child.data = {})).transition = extractTransitionData(this);
      var oldRawChild = this._vnode;
      var oldChild = getRealChild(oldRawChild);
      if (child.data.directives && child.data.directives.some(isVShowDirective)) {
        child.data.show = true;
      }
      if (oldChild && oldChild.data && !isSameChild(child, oldChild) && !isAsyncPlaceholder(oldChild) && !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)) {
        var oldData = oldChild.data.transition = extend({}, data);
        if (mode === "out-in") {
          this._leaving = true;
          mergeVNodeHook(oldData, "afterLeave", function() {
            this$1._leaving = false;
            this$1.$forceUpdate();
          });
          return placeholder(h, rawChild);
        } else if (mode === "in-out") {
          if (isAsyncPlaceholder(child)) {
            return oldRawChild;
          }
          var delayedLeave;
          var performLeave = function() {
            delayedLeave();
          };
          mergeVNodeHook(data, "afterEnter", performLeave);
          mergeVNodeHook(data, "enterCancelled", performLeave);
          mergeVNodeHook(oldData, "delayLeave", function(leave2) {
            delayedLeave = leave2;
          });
        }
      }
      return rawChild;
    }
  };
  var props = extend({
    tag: String,
    moveClass: String
  }, transitionProps);
  delete props.mode;
  var TransitionGroup = {
    props,
    beforeMount: function beforeMount() {
      var this$1 = this;
      var update4 = this._update;
      this._update = function(vnode, hydrating) {
        var restoreActiveInstance = setActiveInstance(this$1);
        this$1.__patch__(this$1._vnode, this$1.kept, false, true);
        this$1._vnode = this$1.kept;
        restoreActiveInstance();
        update4.call(this$1, vnode, hydrating);
      };
    },
    render: function render3(h) {
      var tag = this.tag || this.$vnode.data.tag || "span";
      var map = /* @__PURE__ */ Object.create(null);
      var prevChildren = this.prevChildren = this.children;
      var rawChildren = this.$slots.default || [];
      var children = this.children = [];
      var transitionData = extractTransitionData(this);
      for (var i = 0; i < rawChildren.length; i++) {
        var c = rawChildren[i];
        if (c.tag) {
          if (c.key != null && String(c.key).indexOf("__vlist") !== 0) {
            children.push(c);
            map[c.key] = c;
            (c.data || (c.data = {})).transition = transitionData;
          } else if (false) {
            var opts = c.componentOptions;
            var name = opts ? opts.Ctor.options.name || opts.tag || "" : c.tag;
            warn("<transition-group> children must be keyed: <" + name + ">");
          }
        }
      }
      if (prevChildren) {
        var kept = [];
        var removed = [];
        for (var i$1 = 0; i$1 < prevChildren.length; i$1++) {
          var c$1 = prevChildren[i$1];
          c$1.data.transition = transitionData;
          c$1.data.pos = c$1.elm.getBoundingClientRect();
          if (map[c$1.key]) {
            kept.push(c$1);
          } else {
            removed.push(c$1);
          }
        }
        this.kept = h(tag, null, kept);
        this.removed = removed;
      }
      return h(tag, null, children);
    },
    updated: function updated() {
      var children = this.prevChildren;
      var moveClass = this.moveClass || (this.name || "v") + "-move";
      if (!children.length || !this.hasMove(children[0].elm, moveClass)) {
        return;
      }
      children.forEach(callPendingCbs);
      children.forEach(recordPosition);
      children.forEach(applyTranslation);
      this._reflow = document.body.offsetHeight;
      children.forEach(function(c) {
        if (c.data.moved) {
          var el = c.elm;
          var s = el.style;
          addTransitionClass(el, moveClass);
          s.transform = s.WebkitTransform = s.transitionDuration = "";
          el.addEventListener(transitionEndEvent, el._moveCb = function cb(e) {
            if (e && e.target !== el) {
              return;
            }
            if (!e || /transform$/.test(e.propertyName)) {
              el.removeEventListener(transitionEndEvent, cb);
              el._moveCb = null;
              removeTransitionClass(el, moveClass);
            }
          });
        }
      });
    },
    methods: {
      hasMove: function hasMove(el, moveClass) {
        if (!hasTransition) {
          return false;
        }
        if (this._hasMove) {
          return this._hasMove;
        }
        var clone = el.cloneNode();
        if (el._transitionClasses) {
          el._transitionClasses.forEach(function(cls) {
            removeClass(clone, cls);
          });
        }
        addClass(clone, moveClass);
        clone.style.display = "none";
        this.$el.appendChild(clone);
        var info = getTransitionInfo(clone);
        this.$el.removeChild(clone);
        return this._hasMove = info.hasTransform;
      }
    }
  };
  function callPendingCbs(c) {
    if (c.elm._moveCb) {
      c.elm._moveCb();
    }
    if (c.elm._enterCb) {
      c.elm._enterCb();
    }
  }
  function recordPosition(c) {
    c.data.newPos = c.elm.getBoundingClientRect();
  }
  function applyTranslation(c) {
    var oldPos = c.data.pos;
    var newPos = c.data.newPos;
    var dx = oldPos.left - newPos.left;
    var dy = oldPos.top - newPos.top;
    if (dx || dy) {
      c.data.moved = true;
      var s = c.elm.style;
      s.transform = s.WebkitTransform = "translate(" + dx + "px," + dy + "px)";
      s.transitionDuration = "0s";
    }
  }
  var platformComponents = {
    Transition,
    TransitionGroup
  };
  Vue.config.mustUseProp = mustUseProp;
  Vue.config.isReservedTag = isReservedTag;
  Vue.config.isReservedAttr = isReservedAttr;
  Vue.config.getTagNamespace = getTagNamespace;
  Vue.config.isUnknownElement = isUnknownElement;
  extend(Vue.options.directives, platformDirectives);
  extend(Vue.options.components, platformComponents);
  Vue.prototype.__patch__ = inBrowser ? patch : noop;
  Vue.prototype.$mount = function(el, hydrating) {
    el = el && inBrowser ? query(el) : void 0;
    return mountComponent(this, el, hydrating);
  };
  if (inBrowser) {
    setTimeout(function() {
      if (config.devtools) {
        if (devtools) {
          devtools.emit("init", Vue);
        } else if (false) {
          console[console.info ? "info" : "log"]("Download the Vue Devtools extension for a better development experience:\nhttps://github.com/vuejs/vue-devtools");
        }
      }
      if (false) {
        console[console.info ? "info" : "log"]("You are running Vue in development mode.\nMake sure to turn on production mode when deploying for production.\nSee more tips at https://vuejs.org/guide/deployment.html");
      }
    }, 0);
  }
  var defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
  var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;
  var buildRegex = cached(function(delimiters2) {
    var open = delimiters2[0].replace(regexEscapeRE, "\\$&");
    var close = delimiters2[1].replace(regexEscapeRE, "\\$&");
    return new RegExp(open + "((?:.|\\n)+?)" + close, "g");
  });
  function parseText(text2, delimiters2) {
    var tagRE = delimiters2 ? buildRegex(delimiters2) : defaultTagRE;
    if (!tagRE.test(text2)) {
      return;
    }
    var tokens = [];
    var rawTokens = [];
    var lastIndex = tagRE.lastIndex = 0;
    var match, index2, tokenValue;
    while (match = tagRE.exec(text2)) {
      index2 = match.index;
      if (index2 > lastIndex) {
        rawTokens.push(tokenValue = text2.slice(lastIndex, index2));
        tokens.push(JSON.stringify(tokenValue));
      }
      var exp = parseFilters(match[1].trim());
      tokens.push("_s(" + exp + ")");
      rawTokens.push({ "@binding": exp });
      lastIndex = index2 + match[0].length;
    }
    if (lastIndex < text2.length) {
      rawTokens.push(tokenValue = text2.slice(lastIndex));
      tokens.push(JSON.stringify(tokenValue));
    }
    return {
      expression: tokens.join("+"),
      tokens: rawTokens
    };
  }
  function transformNode(el, options) {
    var warn2 = options.warn || baseWarn;
    var staticClass = getAndRemoveAttr(el, "class");
    if (false) {
      var res = parseText(staticClass, options.delimiters);
      if (res) {
        warn2('class="' + staticClass + '": Interpolation inside attributes has been removed. Use v-bind or the colon shorthand instead. For example, instead of <div class="{{ val }}">, use <div :class="val">.', el.rawAttrsMap["class"]);
      }
    }
    if (staticClass) {
      el.staticClass = JSON.stringify(staticClass);
    }
    var classBinding = getBindingAttr(el, "class", false);
    if (classBinding) {
      el.classBinding = classBinding;
    }
  }
  function genData(el) {
    var data = "";
    if (el.staticClass) {
      data += "staticClass:" + el.staticClass + ",";
    }
    if (el.classBinding) {
      data += "class:" + el.classBinding + ",";
    }
    return data;
  }
  var klass$1 = {
    staticKeys: ["staticClass"],
    transformNode,
    genData
  };
  function transformNode$1(el, options) {
    var warn2 = options.warn || baseWarn;
    var staticStyle = getAndRemoveAttr(el, "style");
    if (staticStyle) {
      if (false) {
        var res = parseText(staticStyle, options.delimiters);
        if (res) {
          warn2('style="' + staticStyle + '": Interpolation inside attributes has been removed. Use v-bind or the colon shorthand instead. For example, instead of <div style="{{ val }}">, use <div :style="val">.', el.rawAttrsMap["style"]);
        }
      }
      el.staticStyle = JSON.stringify(parseStyleText(staticStyle));
    }
    var styleBinding = getBindingAttr(el, "style", false);
    if (styleBinding) {
      el.styleBinding = styleBinding;
    }
  }
  function genData$1(el) {
    var data = "";
    if (el.staticStyle) {
      data += "staticStyle:" + el.staticStyle + ",";
    }
    if (el.styleBinding) {
      data += "style:(" + el.styleBinding + "),";
    }
    return data;
  }
  var style$1 = {
    staticKeys: ["staticStyle"],
    transformNode: transformNode$1,
    genData: genData$1
  };
  var decoder;
  var he = {
    decode: function decode(html2) {
      decoder = decoder || document.createElement("div");
      decoder.innerHTML = html2;
      return decoder.textContent;
    }
  };
  var isUnaryTag = makeMap("area,base,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr");
  var canBeLeftOpenTag = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source");
  var isNonPhrasingTag = makeMap("address,article,aside,base,blockquote,body,caption,col,colgroup,dd,details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,title,tr,track");
  var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
  var dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
  var ncname = "[a-zA-Z_][\\-\\.0-9_a-zA-Z" + unicodeRegExp.source + "]*";
  var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
  var startTagOpen = new RegExp("^<" + qnameCapture);
  var startTagClose = /^\s*(\/?)>/;
  var endTag = new RegExp("^<\\/" + qnameCapture + "[^>]*>");
  var doctype = /^<!DOCTYPE [^>]+>/i;
  var comment = /^<!\--/;
  var conditionalComment = /^<!\[/;
  var isPlainTextElement = makeMap("script,style,textarea", true);
  var reCache = {};
  var decodingMap = {
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&amp;": "&",
    "&#10;": "\n",
    "&#9;": "	",
    "&#39;": "'"
  };
  var encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
  var encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;
  var isIgnoreNewlineTag = makeMap("pre,textarea", true);
  var shouldIgnoreFirstNewline = function(tag, html2) {
    return tag && isIgnoreNewlineTag(tag) && html2[0] === "\n";
  };
  function decodeAttr(value, shouldDecodeNewlines2) {
    var re = shouldDecodeNewlines2 ? encodedAttrWithNewLines : encodedAttr;
    return value.replace(re, function(match) {
      return decodingMap[match];
    });
  }
  function parseHTML(html2, options) {
    var stack = [];
    var expectHTML = options.expectHTML;
    var isUnaryTag$$1 = options.isUnaryTag || no;
    var canBeLeftOpenTag$$1 = options.canBeLeftOpenTag || no;
    var index2 = 0;
    var last, lastTag;
    while (html2) {
      last = html2;
      if (!lastTag || !isPlainTextElement(lastTag)) {
        var textEnd = html2.indexOf("<");
        if (textEnd === 0) {
          if (comment.test(html2)) {
            var commentEnd = html2.indexOf("-->");
            if (commentEnd >= 0) {
              if (options.shouldKeepComment) {
                options.comment(html2.substring(4, commentEnd), index2, index2 + commentEnd + 3);
              }
              advance(commentEnd + 3);
              continue;
            }
          }
          if (conditionalComment.test(html2)) {
            var conditionalEnd = html2.indexOf("]>");
            if (conditionalEnd >= 0) {
              advance(conditionalEnd + 2);
              continue;
            }
          }
          var doctypeMatch = html2.match(doctype);
          if (doctypeMatch) {
            advance(doctypeMatch[0].length);
            continue;
          }
          var endTagMatch = html2.match(endTag);
          if (endTagMatch) {
            var curIndex = index2;
            advance(endTagMatch[0].length);
            parseEndTag(endTagMatch[1], curIndex, index2);
            continue;
          }
          var startTagMatch = parseStartTag();
          if (startTagMatch) {
            handleStartTag(startTagMatch);
            if (shouldIgnoreFirstNewline(startTagMatch.tagName, html2)) {
              advance(1);
            }
            continue;
          }
        }
        var text2 = void 0, rest = void 0, next2 = void 0;
        if (textEnd >= 0) {
          rest = html2.slice(textEnd);
          while (!endTag.test(rest) && !startTagOpen.test(rest) && !comment.test(rest) && !conditionalComment.test(rest)) {
            next2 = rest.indexOf("<", 1);
            if (next2 < 0) {
              break;
            }
            textEnd += next2;
            rest = html2.slice(textEnd);
          }
          text2 = html2.substring(0, textEnd);
        }
        if (textEnd < 0) {
          text2 = html2;
        }
        if (text2) {
          advance(text2.length);
        }
        if (options.chars && text2) {
          options.chars(text2, index2 - text2.length, index2);
        }
      } else {
        var endTagLength = 0;
        var stackedTag = lastTag.toLowerCase();
        var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp("([\\s\\S]*?)(</" + stackedTag + "[^>]*>)", "i"));
        var rest$1 = html2.replace(reStackedTag, function(all, text3, endTag2) {
          endTagLength = endTag2.length;
          if (!isPlainTextElement(stackedTag) && stackedTag !== "noscript") {
            text3 = text3.replace(/<!\--([\s\S]*?)-->/g, "$1").replace(/<!\[CDATA\[([\s\S]*?)]]>/g, "$1");
          }
          if (shouldIgnoreFirstNewline(stackedTag, text3)) {
            text3 = text3.slice(1);
          }
          if (options.chars) {
            options.chars(text3);
          }
          return "";
        });
        index2 += html2.length - rest$1.length;
        html2 = rest$1;
        parseEndTag(stackedTag, index2 - endTagLength, index2);
      }
      if (html2 === last) {
        options.chars && options.chars(html2);
        if (false) {
          options.warn('Mal-formatted tag at end of template: "' + html2 + '"', { start: index2 + html2.length });
        }
        break;
      }
    }
    parseEndTag();
    function advance(n) {
      index2 += n;
      html2 = html2.substring(n);
    }
    function parseStartTag() {
      var start = html2.match(startTagOpen);
      if (start) {
        var match = {
          tagName: start[1],
          attrs: [],
          start: index2
        };
        advance(start[0].length);
        var end, attr;
        while (!(end = html2.match(startTagClose)) && (attr = html2.match(dynamicArgAttribute) || html2.match(attribute))) {
          attr.start = index2;
          advance(attr[0].length);
          attr.end = index2;
          match.attrs.push(attr);
        }
        if (end) {
          match.unarySlash = end[1];
          advance(end[0].length);
          match.end = index2;
          return match;
        }
      }
    }
    function handleStartTag(match) {
      var tagName2 = match.tagName;
      var unarySlash = match.unarySlash;
      if (expectHTML) {
        if (lastTag === "p" && isNonPhrasingTag(tagName2)) {
          parseEndTag(lastTag);
        }
        if (canBeLeftOpenTag$$1(tagName2) && lastTag === tagName2) {
          parseEndTag(tagName2);
        }
      }
      var unary = isUnaryTag$$1(tagName2) || !!unarySlash;
      var l = match.attrs.length;
      var attrs2 = new Array(l);
      for (var i = 0; i < l; i++) {
        var args = match.attrs[i];
        var value = args[3] || args[4] || args[5] || "";
        var shouldDecodeNewlines2 = tagName2 === "a" && args[1] === "href" ? options.shouldDecodeNewlinesForHref : options.shouldDecodeNewlines;
        attrs2[i] = {
          name: args[1],
          value: decodeAttr(value, shouldDecodeNewlines2)
        };
        if (false) {
          attrs2[i].start = args.start + args[0].match(/^\s*/).length;
          attrs2[i].end = args.end;
        }
      }
      if (!unary) {
        stack.push({ tag: tagName2, lowerCasedTag: tagName2.toLowerCase(), attrs: attrs2, start: match.start, end: match.end });
        lastTag = tagName2;
      }
      if (options.start) {
        options.start(tagName2, attrs2, unary, match.start, match.end);
      }
    }
    function parseEndTag(tagName2, start, end) {
      var pos, lowerCasedTagName;
      if (start == null) {
        start = index2;
      }
      if (end == null) {
        end = index2;
      }
      if (tagName2) {
        lowerCasedTagName = tagName2.toLowerCase();
        for (pos = stack.length - 1; pos >= 0; pos--) {
          if (stack[pos].lowerCasedTag === lowerCasedTagName) {
            break;
          }
        }
      } else {
        pos = 0;
      }
      if (pos >= 0) {
        for (var i = stack.length - 1; i >= pos; i--) {
          if (false) {
            options.warn("tag <" + stack[i].tag + "> has no matching end tag.", { start: stack[i].start, end: stack[i].end });
          }
          if (options.end) {
            options.end(stack[i].tag, start, end);
          }
        }
        stack.length = pos;
        lastTag = pos && stack[pos - 1].tag;
      } else if (lowerCasedTagName === "br") {
        if (options.start) {
          options.start(tagName2, [], true, start, end);
        }
      } else if (lowerCasedTagName === "p") {
        if (options.start) {
          options.start(tagName2, [], false, start, end);
        }
        if (options.end) {
          options.end(tagName2, start, end);
        }
      }
    }
  }
  var onRE = /^@|^v-on:/;
  var dirRE = /^v-|^@|^:|^#/;
  var forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
  var forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
  var stripParensRE = /^\(|\)$/g;
  var dynamicArgRE = /^\[.*\]$/;
  var argRE = /:(.*)$/;
  var bindRE = /^:|^\.|^v-bind:/;
  var modifierRE = /\.[^.\]]+(?=[^\]]*$)/g;
  var slotRE = /^v-slot(:|$)|^#/;
  var lineBreakRE = /[\r\n]/;
  var whitespaceRE$1 = /\s+/g;
  var decodeHTMLCached = cached(he.decode);
  var emptySlotScopeToken = "_empty_";
  var warn$2;
  var delimiters;
  var transforms;
  var preTransforms;
  var postTransforms;
  var platformIsPreTag;
  var platformMustUseProp;
  var platformGetTagNamespace;
  var maybeComponent;
  function createASTElement(tag, attrs2, parent) {
    return {
      type: 1,
      tag,
      attrsList: attrs2,
      attrsMap: makeAttrsMap(attrs2),
      rawAttrsMap: {},
      parent,
      children: []
    };
  }
  function parse(template2, options) {
    warn$2 = options.warn || baseWarn;
    platformIsPreTag = options.isPreTag || no;
    platformMustUseProp = options.mustUseProp || no;
    platformGetTagNamespace = options.getTagNamespace || no;
    var isReservedTag2 = options.isReservedTag || no;
    maybeComponent = function(el) {
      return !!el.component || !isReservedTag2(el.tag);
    };
    transforms = pluckModuleFunction(options.modules, "transformNode");
    preTransforms = pluckModuleFunction(options.modules, "preTransformNode");
    postTransforms = pluckModuleFunction(options.modules, "postTransformNode");
    delimiters = options.delimiters;
    var stack = [];
    var preserveWhitespace = options.preserveWhitespace !== false;
    var whitespaceOption = options.whitespace;
    var root;
    var currentParent;
    var inVPre = false;
    var inPre = false;
    var warned = false;
    function warnOnce(msg, range) {
      if (!warned) {
        warned = true;
        warn$2(msg, range);
      }
    }
    function closeElement(element) {
      trimEndingWhitespace(element);
      if (!inVPre && !element.processed) {
        element = processElement(element, options);
      }
      if (!stack.length && element !== root) {
        if (root.if && (element.elseif || element.else)) {
          if (false) {
            checkRootConstraints(element);
          }
          addIfCondition(root, {
            exp: element.elseif,
            block: element
          });
        } else if (false) {
          warnOnce("Component template should contain exactly one root element. If you are using v-if on multiple elements, use v-else-if to chain them instead.", { start: element.start });
        }
      }
      if (currentParent && !element.forbidden) {
        if (element.elseif || element.else) {
          processIfConditions(element, currentParent);
        } else {
          if (element.slotScope) {
            var name = element.slotTarget || '"default"';
            (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element;
          }
          currentParent.children.push(element);
          element.parent = currentParent;
        }
      }
      element.children = element.children.filter(function(c) {
        return !c.slotScope;
      });
      trimEndingWhitespace(element);
      if (element.pre) {
        inVPre = false;
      }
      if (platformIsPreTag(element.tag)) {
        inPre = false;
      }
      for (var i = 0; i < postTransforms.length; i++) {
        postTransforms[i](element, options);
      }
    }
    function trimEndingWhitespace(el) {
      if (!inPre) {
        var lastNode;
        while ((lastNode = el.children[el.children.length - 1]) && lastNode.type === 3 && lastNode.text === " ") {
          el.children.pop();
        }
      }
    }
    function checkRootConstraints(el) {
      if (el.tag === "slot" || el.tag === "template") {
        warnOnce("Cannot use <" + el.tag + "> as component root element because it may contain multiple nodes.", { start: el.start });
      }
      if (el.attrsMap.hasOwnProperty("v-for")) {
        warnOnce("Cannot use v-for on stateful component root element because it renders multiple elements.", el.rawAttrsMap["v-for"]);
      }
    }
    parseHTML(template2, {
      warn: warn$2,
      expectHTML: options.expectHTML,
      isUnaryTag: options.isUnaryTag,
      canBeLeftOpenTag: options.canBeLeftOpenTag,
      shouldDecodeNewlines: options.shouldDecodeNewlines,
      shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
      shouldKeepComment: options.comments,
      outputSourceRange: options.outputSourceRange,
      start: function start(tag, attrs2, unary, start$1, end) {
        var ns = currentParent && currentParent.ns || platformGetTagNamespace(tag);
        if (isIE && ns === "svg") {
          attrs2 = guardIESVGBug(attrs2);
        }
        var element = createASTElement(tag, attrs2, currentParent);
        if (ns) {
          element.ns = ns;
        }
        if (false) {
          if (options.outputSourceRange) {
            element.start = start$1;
            element.end = end;
            element.rawAttrsMap = element.attrsList.reduce(function(cumulated, attr) {
              cumulated[attr.name] = attr;
              return cumulated;
            }, {});
          }
          attrs2.forEach(function(attr) {
            if (invalidAttributeRE.test(attr.name)) {
              warn$2("Invalid dynamic argument expression: attribute names cannot contain spaces, quotes, <, >, / or =.", {
                start: attr.start + attr.name.indexOf("["),
                end: attr.start + attr.name.length
              });
            }
          });
        }
        if (isForbiddenTag(element) && !isServerRendering()) {
          element.forbidden = true;
        }
        for (var i = 0; i < preTransforms.length; i++) {
          element = preTransforms[i](element, options) || element;
        }
        if (!inVPre) {
          processPre(element);
          if (element.pre) {
            inVPre = true;
          }
        }
        if (platformIsPreTag(element.tag)) {
          inPre = true;
        }
        if (inVPre) {
          processRawAttrs(element);
        } else if (!element.processed) {
          processFor(element);
          processIf(element);
          processOnce(element);
        }
        if (!root) {
          root = element;
          if (false) {
            checkRootConstraints(root);
          }
        }
        if (!unary) {
          currentParent = element;
          stack.push(element);
        } else {
          closeElement(element);
        }
      },
      end: function end(tag, start, end$1) {
        var element = stack[stack.length - 1];
        stack.length -= 1;
        currentParent = stack[stack.length - 1];
        if (false) {
          element.end = end$1;
        }
        closeElement(element);
      },
      chars: function chars(text2, start, end) {
        if (!currentParent) {
          if (false) {
            if (text2 === template2) {
              warnOnce("Component template requires a root element, rather than just text.", { start });
            } else if (text2 = text2.trim()) {
              warnOnce('text "' + text2 + '" outside root element will be ignored.', { start });
            }
          }
          return;
        }
        if (isIE && currentParent.tag === "textarea" && currentParent.attrsMap.placeholder === text2) {
          return;
        }
        var children = currentParent.children;
        if (inPre || text2.trim()) {
          text2 = isTextTag(currentParent) ? text2 : decodeHTMLCached(text2);
        } else if (!children.length) {
          text2 = "";
        } else if (whitespaceOption) {
          if (whitespaceOption === "condense") {
            text2 = lineBreakRE.test(text2) ? "" : " ";
          } else {
            text2 = " ";
          }
        } else {
          text2 = preserveWhitespace ? " " : "";
        }
        if (text2) {
          if (!inPre && whitespaceOption === "condense") {
            text2 = text2.replace(whitespaceRE$1, " ");
          }
          var res;
          var child;
          if (!inVPre && text2 !== " " && (res = parseText(text2, delimiters))) {
            child = {
              type: 2,
              expression: res.expression,
              tokens: res.tokens,
              text: text2
            };
          } else if (text2 !== " " || !children.length || children[children.length - 1].text !== " ") {
            child = {
              type: 3,
              text: text2
            };
          }
          if (child) {
            if (false) {
              child.start = start;
              child.end = end;
            }
            children.push(child);
          }
        }
      },
      comment: function comment2(text2, start, end) {
        if (currentParent) {
          var child = {
            type: 3,
            text: text2,
            isComment: true
          };
          if (false) {
            child.start = start;
            child.end = end;
          }
          currentParent.children.push(child);
        }
      }
    });
    return root;
  }
  function processPre(el) {
    if (getAndRemoveAttr(el, "v-pre") != null) {
      el.pre = true;
    }
  }
  function processRawAttrs(el) {
    var list = el.attrsList;
    var len2 = list.length;
    if (len2) {
      var attrs2 = el.attrs = new Array(len2);
      for (var i = 0; i < len2; i++) {
        attrs2[i] = {
          name: list[i].name,
          value: JSON.stringify(list[i].value)
        };
        if (list[i].start != null) {
          attrs2[i].start = list[i].start;
          attrs2[i].end = list[i].end;
        }
      }
    } else if (!el.pre) {
      el.plain = true;
    }
  }
  function processElement(element, options) {
    processKey(element);
    element.plain = !element.key && !element.scopedSlots && !element.attrsList.length;
    processRef(element);
    processSlotContent(element);
    processSlotOutlet(element);
    processComponent(element);
    for (var i = 0; i < transforms.length; i++) {
      element = transforms[i](element, options) || element;
    }
    processAttrs(element);
    return element;
  }
  function processKey(el) {
    var exp = getBindingAttr(el, "key");
    if (exp) {
      if (false) {
        if (el.tag === "template") {
          warn$2("<template> cannot be keyed. Place the key on real elements instead.", getRawBindingAttr(el, "key"));
        }
        if (el.for) {
          var iterator = el.iterator2 || el.iterator1;
          var parent = el.parent;
          if (iterator && iterator === exp && parent && parent.tag === "transition-group") {
            warn$2("Do not use v-for index as key on <transition-group> children, this is the same as not using keys.", getRawBindingAttr(el, "key"), true);
          }
        }
      }
      el.key = exp;
    }
  }
  function processRef(el) {
    var ref2 = getBindingAttr(el, "ref");
    if (ref2) {
      el.ref = ref2;
      el.refInFor = checkInFor(el);
    }
  }
  function processFor(el) {
    var exp;
    if (exp = getAndRemoveAttr(el, "v-for")) {
      var res = parseFor(exp);
      if (res) {
        extend(el, res);
      } else if (false) {
        warn$2("Invalid v-for expression: " + exp, el.rawAttrsMap["v-for"]);
      }
    }
  }
  function parseFor(exp) {
    var inMatch = exp.match(forAliasRE);
    if (!inMatch) {
      return;
    }
    var res = {};
    res.for = inMatch[2].trim();
    var alias = inMatch[1].trim().replace(stripParensRE, "");
    var iteratorMatch = alias.match(forIteratorRE);
    if (iteratorMatch) {
      res.alias = alias.replace(forIteratorRE, "").trim();
      res.iterator1 = iteratorMatch[1].trim();
      if (iteratorMatch[2]) {
        res.iterator2 = iteratorMatch[2].trim();
      }
    } else {
      res.alias = alias;
    }
    return res;
  }
  function processIf(el) {
    var exp = getAndRemoveAttr(el, "v-if");
    if (exp) {
      el.if = exp;
      addIfCondition(el, {
        exp,
        block: el
      });
    } else {
      if (getAndRemoveAttr(el, "v-else") != null) {
        el.else = true;
      }
      var elseif = getAndRemoveAttr(el, "v-else-if");
      if (elseif) {
        el.elseif = elseif;
      }
    }
  }
  function processIfConditions(el, parent) {
    var prev = findPrevElement(parent.children);
    if (prev && prev.if) {
      addIfCondition(prev, {
        exp: el.elseif,
        block: el
      });
    } else if (false) {
      warn$2("v-" + (el.elseif ? 'else-if="' + el.elseif + '"' : "else") + " used on element <" + el.tag + "> without corresponding v-if.", el.rawAttrsMap[el.elseif ? "v-else-if" : "v-else"]);
    }
  }
  function findPrevElement(children) {
    var i = children.length;
    while (i--) {
      if (children[i].type === 1) {
        return children[i];
      } else {
        if (false) {
          warn$2('text "' + children[i].text.trim() + '" between v-if and v-else(-if) will be ignored.', children[i]);
        }
        children.pop();
      }
    }
  }
  function addIfCondition(el, condition) {
    if (!el.ifConditions) {
      el.ifConditions = [];
    }
    el.ifConditions.push(condition);
  }
  function processOnce(el) {
    var once$$1 = getAndRemoveAttr(el, "v-once");
    if (once$$1 != null) {
      el.once = true;
    }
  }
  function processSlotContent(el) {
    var slotScope;
    if (el.tag === "template") {
      slotScope = getAndRemoveAttr(el, "scope");
      if (false) {
        warn$2('the "scope" attribute for scoped slots have been deprecated and replaced by "slot-scope" since 2.5. The new "slot-scope" attribute can also be used on plain elements in addition to <template> to denote scoped slots.', el.rawAttrsMap["scope"], true);
      }
      el.slotScope = slotScope || getAndRemoveAttr(el, "slot-scope");
    } else if (slotScope = getAndRemoveAttr(el, "slot-scope")) {
      if (false) {
        warn$2("Ambiguous combined usage of slot-scope and v-for on <" + el.tag + "> (v-for takes higher priority). Use a wrapper <template> for the scoped slot to make it clearer.", el.rawAttrsMap["slot-scope"], true);
      }
      el.slotScope = slotScope;
    }
    var slotTarget = getBindingAttr(el, "slot");
    if (slotTarget) {
      el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget;
      el.slotTargetDynamic = !!(el.attrsMap[":slot"] || el.attrsMap["v-bind:slot"]);
      if (el.tag !== "template" && !el.slotScope) {
        addAttr(el, "slot", slotTarget, getRawBindingAttr(el, "slot"));
      }
    }
    {
      if (el.tag === "template") {
        var slotBinding = getAndRemoveAttrByRegex(el, slotRE);
        if (slotBinding) {
          if (false) {
            if (el.slotTarget || el.slotScope) {
              warn$2("Unexpected mixed usage of different slot syntaxes.", el);
            }
            if (el.parent && !maybeComponent(el.parent)) {
              warn$2("<template v-slot> can only appear at the root level inside the receiving component", el);
            }
          }
          var ref2 = getSlotName(slotBinding);
          var name = ref2.name;
          var dynamic = ref2.dynamic;
          el.slotTarget = name;
          el.slotTargetDynamic = dynamic;
          el.slotScope = slotBinding.value || emptySlotScopeToken;
        }
      } else {
        var slotBinding$1 = getAndRemoveAttrByRegex(el, slotRE);
        if (slotBinding$1) {
          if (false) {
            if (!maybeComponent(el)) {
              warn$2("v-slot can only be used on components or <template>.", slotBinding$1);
            }
            if (el.slotScope || el.slotTarget) {
              warn$2("Unexpected mixed usage of different slot syntaxes.", el);
            }
            if (el.scopedSlots) {
              warn$2("To avoid scope ambiguity, the default slot should also use <template> syntax when there are other named slots.", slotBinding$1);
            }
          }
          var slots = el.scopedSlots || (el.scopedSlots = {});
          var ref$12 = getSlotName(slotBinding$1);
          var name$1 = ref$12.name;
          var dynamic$1 = ref$12.dynamic;
          var slotContainer = slots[name$1] = createASTElement("template", [], el);
          slotContainer.slotTarget = name$1;
          slotContainer.slotTargetDynamic = dynamic$1;
          slotContainer.children = el.children.filter(function(c) {
            if (!c.slotScope) {
              c.parent = slotContainer;
              return true;
            }
          });
          slotContainer.slotScope = slotBinding$1.value || emptySlotScopeToken;
          el.children = [];
          el.plain = false;
        }
      }
    }
  }
  function getSlotName(binding) {
    var name = binding.name.replace(slotRE, "");
    if (!name) {
      if (binding.name[0] !== "#") {
        name = "default";
      } else if (false) {
        warn$2("v-slot shorthand syntax requires a slot name.", binding);
      }
    }
    return dynamicArgRE.test(name) ? { name: name.slice(1, -1), dynamic: true } : { name: '"' + name + '"', dynamic: false };
  }
  function processSlotOutlet(el) {
    if (el.tag === "slot") {
      el.slotName = getBindingAttr(el, "name");
      if (false) {
        warn$2("`key` does not work on <slot> because slots are abstract outlets and can possibly expand into multiple elements. Use the key on a wrapping element instead.", getRawBindingAttr(el, "key"));
      }
    }
  }
  function processComponent(el) {
    var binding;
    if (binding = getBindingAttr(el, "is")) {
      el.component = binding;
    }
    if (getAndRemoveAttr(el, "inline-template") != null) {
      el.inlineTemplate = true;
    }
  }
  function processAttrs(el) {
    var list = el.attrsList;
    var i, l, name, rawName, value, modifiers, syncGen, isDynamic;
    for (i = 0, l = list.length; i < l; i++) {
      name = rawName = list[i].name;
      value = list[i].value;
      if (dirRE.test(name)) {
        el.hasBindings = true;
        modifiers = parseModifiers(name.replace(dirRE, ""));
        if (modifiers) {
          name = name.replace(modifierRE, "");
        }
        if (bindRE.test(name)) {
          name = name.replace(bindRE, "");
          value = parseFilters(value);
          isDynamic = dynamicArgRE.test(name);
          if (isDynamic) {
            name = name.slice(1, -1);
          }
          if (false) {
            warn$2('The value for a v-bind expression cannot be empty. Found in "v-bind:' + name + '"');
          }
          if (modifiers) {
            if (modifiers.prop && !isDynamic) {
              name = camelize(name);
              if (name === "innerHtml") {
                name = "innerHTML";
              }
            }
            if (modifiers.camel && !isDynamic) {
              name = camelize(name);
            }
            if (modifiers.sync) {
              syncGen = genAssignmentCode(value, "$event");
              if (!isDynamic) {
                addHandler(el, "update:" + camelize(name), syncGen, null, false, warn$2, list[i]);
                if (hyphenate(name) !== camelize(name)) {
                  addHandler(el, "update:" + hyphenate(name), syncGen, null, false, warn$2, list[i]);
                }
              } else {
                addHandler(el, '"update:"+(' + name + ")", syncGen, null, false, warn$2, list[i], true);
              }
            }
          }
          if (modifiers && modifiers.prop || !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)) {
            addProp(el, name, value, list[i], isDynamic);
          } else {
            addAttr(el, name, value, list[i], isDynamic);
          }
        } else if (onRE.test(name)) {
          name = name.replace(onRE, "");
          isDynamic = dynamicArgRE.test(name);
          if (isDynamic) {
            name = name.slice(1, -1);
          }
          addHandler(el, name, value, modifiers, false, warn$2, list[i], isDynamic);
        } else {
          name = name.replace(dirRE, "");
          var argMatch = name.match(argRE);
          var arg = argMatch && argMatch[1];
          isDynamic = false;
          if (arg) {
            name = name.slice(0, -(arg.length + 1));
            if (dynamicArgRE.test(arg)) {
              arg = arg.slice(1, -1);
              isDynamic = true;
            }
          }
          addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i]);
          if (false) {
            checkForAliasModel(el, value);
          }
        }
      } else {
        if (false) {
          var res = parseText(value, delimiters);
          if (res) {
            warn$2(name + '="' + value + '": Interpolation inside attributes has been removed. Use v-bind or the colon shorthand instead. For example, instead of <div id="{{ val }}">, use <div :id="val">.', list[i]);
          }
        }
        addAttr(el, name, JSON.stringify(value), list[i]);
        if (!el.component && name === "muted" && platformMustUseProp(el.tag, el.attrsMap.type, name)) {
          addProp(el, name, "true", list[i]);
        }
      }
    }
  }
  function checkInFor(el) {
    var parent = el;
    while (parent) {
      if (parent.for !== void 0) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }
  function parseModifiers(name) {
    var match = name.match(modifierRE);
    if (match) {
      var ret = {};
      match.forEach(function(m) {
        ret[m.slice(1)] = true;
      });
      return ret;
    }
  }
  function makeAttrsMap(attrs2) {
    var map = {};
    for (var i = 0, l = attrs2.length; i < l; i++) {
      if (false) {
        warn$2("duplicate attribute: " + attrs2[i].name, attrs2[i]);
      }
      map[attrs2[i].name] = attrs2[i].value;
    }
    return map;
  }
  function isTextTag(el) {
    return el.tag === "script" || el.tag === "style";
  }
  function isForbiddenTag(el) {
    return el.tag === "style" || el.tag === "script" && (!el.attrsMap.type || el.attrsMap.type === "text/javascript");
  }
  var ieNSBug = /^xmlns:NS\d+/;
  var ieNSPrefix = /^NS\d+:/;
  function guardIESVGBug(attrs2) {
    var res = [];
    for (var i = 0; i < attrs2.length; i++) {
      var attr = attrs2[i];
      if (!ieNSBug.test(attr.name)) {
        attr.name = attr.name.replace(ieNSPrefix, "");
        res.push(attr);
      }
    }
    return res;
  }
  function preTransformNode(el, options) {
    if (el.tag === "input") {
      var map = el.attrsMap;
      if (!map["v-model"]) {
        return;
      }
      var typeBinding;
      if (map[":type"] || map["v-bind:type"]) {
        typeBinding = getBindingAttr(el, "type");
      }
      if (!map.type && !typeBinding && map["v-bind"]) {
        typeBinding = "(" + map["v-bind"] + ").type";
      }
      if (typeBinding) {
        var ifCondition = getAndRemoveAttr(el, "v-if", true);
        var ifConditionExtra = ifCondition ? "&&(" + ifCondition + ")" : "";
        var hasElse = getAndRemoveAttr(el, "v-else", true) != null;
        var elseIfCondition = getAndRemoveAttr(el, "v-else-if", true);
        var branch0 = cloneASTElement(el);
        processFor(branch0);
        addRawAttr(branch0, "type", "checkbox");
        processElement(branch0, options);
        branch0.processed = true;
        branch0.if = "(" + typeBinding + ")==='checkbox'" + ifConditionExtra;
        addIfCondition(branch0, {
          exp: branch0.if,
          block: branch0
        });
        var branch1 = cloneASTElement(el);
        getAndRemoveAttr(branch1, "v-for", true);
        addRawAttr(branch1, "type", "radio");
        processElement(branch1, options);
        addIfCondition(branch0, {
          exp: "(" + typeBinding + ")==='radio'" + ifConditionExtra,
          block: branch1
        });
        var branch2 = cloneASTElement(el);
        getAndRemoveAttr(branch2, "v-for", true);
        addRawAttr(branch2, ":type", typeBinding);
        processElement(branch2, options);
        addIfCondition(branch0, {
          exp: ifCondition,
          block: branch2
        });
        if (hasElse) {
          branch0.else = true;
        } else if (elseIfCondition) {
          branch0.elseif = elseIfCondition;
        }
        return branch0;
      }
    }
  }
  function cloneASTElement(el) {
    return createASTElement(el.tag, el.attrsList.slice(), el.parent);
  }
  var model$1 = {
    preTransformNode
  };
  var modules$1 = [
    klass$1,
    style$1,
    model$1
  ];
  function text(el, dir) {
    if (dir.value) {
      addProp(el, "textContent", "_s(" + dir.value + ")", dir);
    }
  }
  function html(el, dir) {
    if (dir.value) {
      addProp(el, "innerHTML", "_s(" + dir.value + ")", dir);
    }
  }
  var directives$1 = {
    model,
    text,
    html
  };
  var baseOptions = {
    expectHTML: true,
    modules: modules$1,
    directives: directives$1,
    isPreTag,
    isUnaryTag,
    mustUseProp,
    canBeLeftOpenTag,
    isReservedTag,
    getTagNamespace,
    staticKeys: genStaticKeys(modules$1)
  };
  var isStaticKey;
  var isPlatformReservedTag;
  var genStaticKeysCached = cached(genStaticKeys$1);
  function optimize(root, options) {
    if (!root) {
      return;
    }
    isStaticKey = genStaticKeysCached(options.staticKeys || "");
    isPlatformReservedTag = options.isReservedTag || no;
    markStatic$1(root);
    markStaticRoots(root, false);
  }
  function genStaticKeys$1(keys) {
    return makeMap("type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap" + (keys ? "," + keys : ""));
  }
  function markStatic$1(node) {
    node.static = isStatic(node);
    if (node.type === 1) {
      if (!isPlatformReservedTag(node.tag) && node.tag !== "slot" && node.attrsMap["inline-template"] == null) {
        return;
      }
      for (var i = 0, l = node.children.length; i < l; i++) {
        var child = node.children[i];
        markStatic$1(child);
        if (!child.static) {
          node.static = false;
        }
      }
      if (node.ifConditions) {
        for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
          var block = node.ifConditions[i$1].block;
          markStatic$1(block);
          if (!block.static) {
            node.static = false;
          }
        }
      }
    }
  }
  function markStaticRoots(node, isInFor) {
    if (node.type === 1) {
      if (node.static || node.once) {
        node.staticInFor = isInFor;
      }
      if (node.static && node.children.length && !(node.children.length === 1 && node.children[0].type === 3)) {
        node.staticRoot = true;
        return;
      } else {
        node.staticRoot = false;
      }
      if (node.children) {
        for (var i = 0, l = node.children.length; i < l; i++) {
          markStaticRoots(node.children[i], isInFor || !!node.for);
        }
      }
      if (node.ifConditions) {
        for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
          markStaticRoots(node.ifConditions[i$1].block, isInFor);
        }
      }
    }
  }
  function isStatic(node) {
    if (node.type === 2) {
      return false;
    }
    if (node.type === 3) {
      return true;
    }
    return !!(node.pre || !node.hasBindings && !node.if && !node.for && !isBuiltInTag(node.tag) && isPlatformReservedTag(node.tag) && !isDirectChildOfTemplateFor(node) && Object.keys(node).every(isStaticKey));
  }
  function isDirectChildOfTemplateFor(node) {
    while (node.parent) {
      node = node.parent;
      if (node.tag !== "template") {
        return false;
      }
      if (node.for) {
        return true;
      }
    }
    return false;
  }
  var fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/;
  var fnInvokeRE = /\([^)]*?\);*$/;
  var simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;
  var keyCodes = {
    esc: 27,
    tab: 9,
    enter: 13,
    space: 32,
    up: 38,
    left: 37,
    right: 39,
    down: 40,
    "delete": [8, 46]
  };
  var keyNames = {
    esc: ["Esc", "Escape"],
    tab: "Tab",
    enter: "Enter",
    space: [" ", "Spacebar"],
    up: ["Up", "ArrowUp"],
    left: ["Left", "ArrowLeft"],
    right: ["Right", "ArrowRight"],
    down: ["Down", "ArrowDown"],
    "delete": ["Backspace", "Delete", "Del"]
  };
  var genGuard = function(condition) {
    return "if(" + condition + ")return null;";
  };
  var modifierCode = {
    stop: "$event.stopPropagation();",
    prevent: "$event.preventDefault();",
    self: genGuard("$event.target !== $event.currentTarget"),
    ctrl: genGuard("!$event.ctrlKey"),
    shift: genGuard("!$event.shiftKey"),
    alt: genGuard("!$event.altKey"),
    meta: genGuard("!$event.metaKey"),
    left: genGuard("'button' in $event && $event.button !== 0"),
    middle: genGuard("'button' in $event && $event.button !== 1"),
    right: genGuard("'button' in $event && $event.button !== 2")
  };
  function genHandlers(events2, isNative2) {
    var prefix = isNative2 ? "nativeOn:" : "on:";
    var staticHandlers = "";
    var dynamicHandlers = "";
    for (var name in events2) {
      var handlerCode = genHandler(events2[name]);
      if (events2[name] && events2[name].dynamic) {
        dynamicHandlers += name + "," + handlerCode + ",";
      } else {
        staticHandlers += '"' + name + '":' + handlerCode + ",";
      }
    }
    staticHandlers = "{" + staticHandlers.slice(0, -1) + "}";
    if (dynamicHandlers) {
      return prefix + "_d(" + staticHandlers + ",[" + dynamicHandlers.slice(0, -1) + "])";
    } else {
      return prefix + staticHandlers;
    }
  }
  function genHandler(handler) {
    if (!handler) {
      return "function(){}";
    }
    if (Array.isArray(handler)) {
      return "[" + handler.map(function(handler2) {
        return genHandler(handler2);
      }).join(",") + "]";
    }
    var isMethodPath = simplePathRE.test(handler.value);
    var isFunctionExpression = fnExpRE.test(handler.value);
    var isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, ""));
    if (!handler.modifiers) {
      if (isMethodPath || isFunctionExpression) {
        return handler.value;
      }
      return "function($event){" + (isFunctionInvocation ? "return " + handler.value : handler.value) + "}";
    } else {
      var code = "";
      var genModifierCode = "";
      var keys = [];
      for (var key in handler.modifiers) {
        if (modifierCode[key]) {
          genModifierCode += modifierCode[key];
          if (keyCodes[key]) {
            keys.push(key);
          }
        } else if (key === "exact") {
          var modifiers = handler.modifiers;
          genModifierCode += genGuard(["ctrl", "shift", "alt", "meta"].filter(function(keyModifier) {
            return !modifiers[keyModifier];
          }).map(function(keyModifier) {
            return "$event." + keyModifier + "Key";
          }).join("||"));
        } else {
          keys.push(key);
        }
      }
      if (keys.length) {
        code += genKeyFilter(keys);
      }
      if (genModifierCode) {
        code += genModifierCode;
      }
      var handlerCode = isMethodPath ? "return " + handler.value + "($event)" : isFunctionExpression ? "return (" + handler.value + ")($event)" : isFunctionInvocation ? "return " + handler.value : handler.value;
      return "function($event){" + code + handlerCode + "}";
    }
  }
  function genKeyFilter(keys) {
    return "if(!$event.type.indexOf('key')&&" + keys.map(genFilterCode).join("&&") + ")return null;";
  }
  function genFilterCode(key) {
    var keyVal = parseInt(key, 10);
    if (keyVal) {
      return "$event.keyCode!==" + keyVal;
    }
    var keyCode = keyCodes[key];
    var keyName = keyNames[key];
    return "_k($event.keyCode," + JSON.stringify(key) + "," + JSON.stringify(keyCode) + ",$event.key," + JSON.stringify(keyName) + ")";
  }
  function on(el, dir) {
    if (false) {
      warn("v-on without argument does not support modifiers.");
    }
    el.wrapListeners = function(code) {
      return "_g(" + code + "," + dir.value + ")";
    };
  }
  function bind$1(el, dir) {
    el.wrapData = function(code) {
      return "_b(" + code + ",'" + el.tag + "'," + dir.value + "," + (dir.modifiers && dir.modifiers.prop ? "true" : "false") + (dir.modifiers && dir.modifiers.sync ? ",true" : "") + ")";
    };
  }
  var baseDirectives = {
    on,
    bind: bind$1,
    cloak: noop
  };
  var CodegenState = function CodegenState2(options) {
    this.options = options;
    this.warn = options.warn || baseWarn;
    this.transforms = pluckModuleFunction(options.modules, "transformCode");
    this.dataGenFns = pluckModuleFunction(options.modules, "genData");
    this.directives = extend(extend({}, baseDirectives), options.directives);
    var isReservedTag2 = options.isReservedTag || no;
    this.maybeComponent = function(el) {
      return !!el.component || !isReservedTag2(el.tag);
    };
    this.onceId = 0;
    this.staticRenderFns = [];
    this.pre = false;
  };
  function generate(ast, options) {
    var state = new CodegenState(options);
    var code = ast ? genElement(ast, state) : '_c("div")';
    return {
      render: "with(this){return " + code + "}",
      staticRenderFns: state.staticRenderFns
    };
  }
  function genElement(el, state) {
    if (el.parent) {
      el.pre = el.pre || el.parent.pre;
    }
    if (el.staticRoot && !el.staticProcessed) {
      return genStatic(el, state);
    } else if (el.once && !el.onceProcessed) {
      return genOnce(el, state);
    } else if (el.for && !el.forProcessed) {
      return genFor(el, state);
    } else if (el.if && !el.ifProcessed) {
      return genIf(el, state);
    } else if (el.tag === "template" && !el.slotTarget && !state.pre) {
      return genChildren(el, state) || "void 0";
    } else if (el.tag === "slot") {
      return genSlot(el, state);
    } else {
      var code;
      if (el.component) {
        code = genComponent(el.component, el, state);
      } else {
        var data;
        if (!el.plain || el.pre && state.maybeComponent(el)) {
          data = genData$2(el, state);
        }
        var children = el.inlineTemplate ? null : genChildren(el, state, true);
        code = "_c('" + el.tag + "'" + (data ? "," + data : "") + (children ? "," + children : "") + ")";
      }
      for (var i = 0; i < state.transforms.length; i++) {
        code = state.transforms[i](el, code);
      }
      return code;
    }
  }
  function genStatic(el, state) {
    el.staticProcessed = true;
    var originalPreState = state.pre;
    if (el.pre) {
      state.pre = el.pre;
    }
    state.staticRenderFns.push("with(this){return " + genElement(el, state) + "}");
    state.pre = originalPreState;
    return "_m(" + (state.staticRenderFns.length - 1) + (el.staticInFor ? ",true" : "") + ")";
  }
  function genOnce(el, state) {
    el.onceProcessed = true;
    if (el.if && !el.ifProcessed) {
      return genIf(el, state);
    } else if (el.staticInFor) {
      var key = "";
      var parent = el.parent;
      while (parent) {
        if (parent.for) {
          key = parent.key;
          break;
        }
        parent = parent.parent;
      }
      if (!key) {
        return genElement(el, state);
      }
      return "_o(" + genElement(el, state) + "," + state.onceId++ + "," + key + ")";
    } else {
      return genStatic(el, state);
    }
  }
  function genIf(el, state, altGen, altEmpty) {
    el.ifProcessed = true;
    return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty);
  }
  function genIfConditions(conditions, state, altGen, altEmpty) {
    if (!conditions.length) {
      return altEmpty || "_e()";
    }
    var condition = conditions.shift();
    if (condition.exp) {
      return "(" + condition.exp + ")?" + genTernaryExp(condition.block) + ":" + genIfConditions(conditions, state, altGen, altEmpty);
    } else {
      return "" + genTernaryExp(condition.block);
    }
    function genTernaryExp(el) {
      return altGen ? altGen(el, state) : el.once ? genOnce(el, state) : genElement(el, state);
    }
  }
  function genFor(el, state, altGen, altHelper) {
    var exp = el.for;
    var alias = el.alias;
    var iterator1 = el.iterator1 ? "," + el.iterator1 : "";
    var iterator2 = el.iterator2 ? "," + el.iterator2 : "";
    if (false) {
      state.warn("<" + el.tag + ' v-for="' + alias + " in " + exp + '">: component lists rendered with v-for should have explicit keys. See https://vuejs.org/guide/list.html#key for more info.', el.rawAttrsMap["v-for"], true);
    }
    el.forProcessed = true;
    return (altHelper || "_l") + "((" + exp + "),function(" + alias + iterator1 + iterator2 + "){return " + (altGen || genElement)(el, state) + "})";
  }
  function genData$2(el, state) {
    var data = "{";
    var dirs = genDirectives(el, state);
    if (dirs) {
      data += dirs + ",";
    }
    if (el.key) {
      data += "key:" + el.key + ",";
    }
    if (el.ref) {
      data += "ref:" + el.ref + ",";
    }
    if (el.refInFor) {
      data += "refInFor:true,";
    }
    if (el.pre) {
      data += "pre:true,";
    }
    if (el.component) {
      data += 'tag:"' + el.tag + '",';
    }
    for (var i = 0; i < state.dataGenFns.length; i++) {
      data += state.dataGenFns[i](el);
    }
    if (el.attrs) {
      data += "attrs:" + genProps(el.attrs) + ",";
    }
    if (el.props) {
      data += "domProps:" + genProps(el.props) + ",";
    }
    if (el.events) {
      data += genHandlers(el.events, false) + ",";
    }
    if (el.nativeEvents) {
      data += genHandlers(el.nativeEvents, true) + ",";
    }
    if (el.slotTarget && !el.slotScope) {
      data += "slot:" + el.slotTarget + ",";
    }
    if (el.scopedSlots) {
      data += genScopedSlots(el, el.scopedSlots, state) + ",";
    }
    if (el.model) {
      data += "model:{value:" + el.model.value + ",callback:" + el.model.callback + ",expression:" + el.model.expression + "},";
    }
    if (el.inlineTemplate) {
      var inlineTemplate = genInlineTemplate(el, state);
      if (inlineTemplate) {
        data += inlineTemplate + ",";
      }
    }
    data = data.replace(/,$/, "") + "}";
    if (el.dynamicAttrs) {
      data = "_b(" + data + ',"' + el.tag + '",' + genProps(el.dynamicAttrs) + ")";
    }
    if (el.wrapData) {
      data = el.wrapData(data);
    }
    if (el.wrapListeners) {
      data = el.wrapListeners(data);
    }
    return data;
  }
  function genDirectives(el, state) {
    var dirs = el.directives;
    if (!dirs) {
      return;
    }
    var res = "directives:[";
    var hasRuntime = false;
    var i, l, dir, needRuntime;
    for (i = 0, l = dirs.length; i < l; i++) {
      dir = dirs[i];
      needRuntime = true;
      var gen = state.directives[dir.name];
      if (gen) {
        needRuntime = !!gen(el, dir, state.warn);
      }
      if (needRuntime) {
        hasRuntime = true;
        res += '{name:"' + dir.name + '",rawName:"' + dir.rawName + '"' + (dir.value ? ",value:(" + dir.value + "),expression:" + JSON.stringify(dir.value) : "") + (dir.arg ? ",arg:" + (dir.isDynamicArg ? dir.arg : '"' + dir.arg + '"') : "") + (dir.modifiers ? ",modifiers:" + JSON.stringify(dir.modifiers) : "") + "},";
      }
    }
    if (hasRuntime) {
      return res.slice(0, -1) + "]";
    }
  }
  function genInlineTemplate(el, state) {
    var ast = el.children[0];
    if (false) {
      state.warn("Inline-template components must have exactly one child element.", { start: el.start });
    }
    if (ast && ast.type === 1) {
      var inlineRenderFns = generate(ast, state.options);
      return "inlineTemplate:{render:function(){" + inlineRenderFns.render + "},staticRenderFns:[" + inlineRenderFns.staticRenderFns.map(function(code) {
        return "function(){" + code + "}";
      }).join(",") + "]}";
    }
  }
  function genScopedSlots(el, slots, state) {
    var needsForceUpdate = el.for || Object.keys(slots).some(function(key) {
      var slot = slots[key];
      return slot.slotTargetDynamic || slot.if || slot.for || containsSlotChild(slot);
    });
    var needsKey = !!el.if;
    if (!needsForceUpdate) {
      var parent = el.parent;
      while (parent) {
        if (parent.slotScope && parent.slotScope !== emptySlotScopeToken || parent.for) {
          needsForceUpdate = true;
          break;
        }
        if (parent.if) {
          needsKey = true;
        }
        parent = parent.parent;
      }
    }
    var generatedSlots = Object.keys(slots).map(function(key) {
      return genScopedSlot(slots[key], state);
    }).join(",");
    return "scopedSlots:_u([" + generatedSlots + "]" + (needsForceUpdate ? ",null,true" : "") + (!needsForceUpdate && needsKey ? ",null,false," + hash(generatedSlots) : "") + ")";
  }
  function hash(str2) {
    var hash2 = 5381;
    var i = str2.length;
    while (i) {
      hash2 = hash2 * 33 ^ str2.charCodeAt(--i);
    }
    return hash2 >>> 0;
  }
  function containsSlotChild(el) {
    if (el.type === 1) {
      if (el.tag === "slot") {
        return true;
      }
      return el.children.some(containsSlotChild);
    }
    return false;
  }
  function genScopedSlot(el, state) {
    var isLegacySyntax = el.attrsMap["slot-scope"];
    if (el.if && !el.ifProcessed && !isLegacySyntax) {
      return genIf(el, state, genScopedSlot, "null");
    }
    if (el.for && !el.forProcessed) {
      return genFor(el, state, genScopedSlot);
    }
    var slotScope = el.slotScope === emptySlotScopeToken ? "" : String(el.slotScope);
    var fn = "function(" + slotScope + "){return " + (el.tag === "template" ? el.if && isLegacySyntax ? "(" + el.if + ")?" + (genChildren(el, state) || "undefined") + ":undefined" : genChildren(el, state) || "undefined" : genElement(el, state)) + "}";
    var reverseProxy = slotScope ? "" : ",proxy:true";
    return "{key:" + (el.slotTarget || '"default"') + ",fn:" + fn + reverseProxy + "}";
  }
  function genChildren(el, state, checkSkip, altGenElement, altGenNode) {
    var children = el.children;
    if (children.length) {
      var el$1 = children[0];
      if (children.length === 1 && el$1.for && el$1.tag !== "template" && el$1.tag !== "slot") {
        var normalizationType = checkSkip ? state.maybeComponent(el$1) ? ",1" : ",0" : "";
        return "" + (altGenElement || genElement)(el$1, state) + normalizationType;
      }
      var normalizationType$1 = checkSkip ? getNormalizationType(children, state.maybeComponent) : 0;
      var gen = altGenNode || genNode;
      return "[" + children.map(function(c) {
        return gen(c, state);
      }).join(",") + "]" + (normalizationType$1 ? "," + normalizationType$1 : "");
    }
  }
  function getNormalizationType(children, maybeComponent2) {
    var res = 0;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.type !== 1) {
        continue;
      }
      if (needsNormalization(el) || el.ifConditions && el.ifConditions.some(function(c) {
        return needsNormalization(c.block);
      })) {
        res = 2;
        break;
      }
      if (maybeComponent2(el) || el.ifConditions && el.ifConditions.some(function(c) {
        return maybeComponent2(c.block);
      })) {
        res = 1;
      }
    }
    return res;
  }
  function needsNormalization(el) {
    return el.for !== void 0 || el.tag === "template" || el.tag === "slot";
  }
  function genNode(node, state) {
    if (node.type === 1) {
      return genElement(node, state);
    } else if (node.type === 3 && node.isComment) {
      return genComment(node);
    } else {
      return genText(node);
    }
  }
  function genText(text2) {
    return "_v(" + (text2.type === 2 ? text2.expression : transformSpecialNewlines(JSON.stringify(text2.text))) + ")";
  }
  function genComment(comment2) {
    return "_e(" + JSON.stringify(comment2.text) + ")";
  }
  function genSlot(el, state) {
    var slotName = el.slotName || '"default"';
    var children = genChildren(el, state);
    var res = "_t(" + slotName + (children ? "," + children : "");
    var attrs2 = el.attrs || el.dynamicAttrs ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(function(attr) {
      return {
        name: camelize(attr.name),
        value: attr.value,
        dynamic: attr.dynamic
      };
    })) : null;
    var bind$$1 = el.attrsMap["v-bind"];
    if ((attrs2 || bind$$1) && !children) {
      res += ",null";
    }
    if (attrs2) {
      res += "," + attrs2;
    }
    if (bind$$1) {
      res += (attrs2 ? "" : ",null") + "," + bind$$1;
    }
    return res + ")";
  }
  function genComponent(componentName, el, state) {
    var children = el.inlineTemplate ? null : genChildren(el, state, true);
    return "_c(" + componentName + "," + genData$2(el, state) + (children ? "," + children : "") + ")";
  }
  function genProps(props2) {
    var staticProps = "";
    var dynamicProps = "";
    for (var i = 0; i < props2.length; i++) {
      var prop = props2[i];
      var value = transformSpecialNewlines(prop.value);
      if (prop.dynamic) {
        dynamicProps += prop.name + "," + value + ",";
      } else {
        staticProps += '"' + prop.name + '":' + value + ",";
      }
    }
    staticProps = "{" + staticProps.slice(0, -1) + "}";
    if (dynamicProps) {
      return "_d(" + staticProps + ",[" + dynamicProps.slice(0, -1) + "])";
    } else {
      return staticProps;
    }
  }
  function transformSpecialNewlines(text2) {
    return text2.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  var prohibitedKeywordRE = new RegExp("\\b" + "do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,super,throw,while,yield,delete,export,import,return,switch,default,extends,finally,continue,debugger,function,arguments".split(",").join("\\b|\\b") + "\\b");
  var unaryOperatorsRE = new RegExp("\\b" + "delete,typeof,void".split(",").join("\\s*\\([^\\)]*\\)|\\b") + "\\s*\\([^\\)]*\\)");
  function createFunction(code, errors) {
    try {
      return new Function(code);
    } catch (err) {
      errors.push({ err, code });
      return noop;
    }
  }
  function createCompileToFunctionFn(compile2) {
    var cache2 = /* @__PURE__ */ Object.create(null);
    return function compileToFunctions2(template2, options, vm) {
      options = extend({}, options);
      var warn$$1 = options.warn || warn;
      delete options.warn;
      if (false) {
        try {
          new Function("return 1");
        } catch (e) {
          if (e.toString().match(/unsafe-eval|CSP/)) {
            warn$$1("It seems you are using the standalone build of Vue.js in an environment with Content Security Policy that prohibits unsafe-eval. The template compiler cannot work in this environment. Consider relaxing the policy to allow unsafe-eval or pre-compiling your templates into render functions.");
          }
        }
      }
      var key = options.delimiters ? String(options.delimiters) + template2 : template2;
      if (cache2[key]) {
        return cache2[key];
      }
      var compiled = compile2(template2, options);
      if (false) {
        if (compiled.errors && compiled.errors.length) {
          if (options.outputSourceRange) {
            compiled.errors.forEach(function(e) {
              warn$$1("Error compiling template:\n\n" + e.msg + "\n\n" + generateCodeFrame(template2, e.start, e.end), vm);
            });
          } else {
            warn$$1("Error compiling template:\n\n" + template2 + "\n\n" + compiled.errors.map(function(e) {
              return "- " + e;
            }).join("\n") + "\n", vm);
          }
        }
        if (compiled.tips && compiled.tips.length) {
          if (options.outputSourceRange) {
            compiled.tips.forEach(function(e) {
              return tip(e.msg, vm);
            });
          } else {
            compiled.tips.forEach(function(msg) {
              return tip(msg, vm);
            });
          }
        }
      }
      var res = {};
      var fnGenErrors = [];
      res.render = createFunction(compiled.render, fnGenErrors);
      res.staticRenderFns = compiled.staticRenderFns.map(function(code) {
        return createFunction(code, fnGenErrors);
      });
      if (false) {
        if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
          warn$$1("Failed to generate render function:\n\n" + fnGenErrors.map(function(ref2) {
            var err = ref2.err;
            var code = ref2.code;
            return err.toString() + " in\n\n" + code + "\n";
          }).join("\n"), vm);
        }
      }
      return cache2[key] = res;
    };
  }
  function createCompilerCreator(baseCompile2) {
    return function createCompiler2(baseOptions2) {
      function compile2(template2, options) {
        var finalOptions = Object.create(baseOptions2);
        var errors = [];
        var tips = [];
        var warn2 = function(msg, range, tip) {
          (tip ? tips : errors).push(msg);
        };
        if (options) {
          if (false) {
            var leadingSpaceLength = template2.match(/^\s*/)[0].length;
            warn2 = function(msg, range, tip) {
              var data = { msg };
              if (range) {
                if (range.start != null) {
                  data.start = range.start + leadingSpaceLength;
                }
                if (range.end != null) {
                  data.end = range.end + leadingSpaceLength;
                }
              }
              (tip ? tips : errors).push(data);
            };
          }
          if (options.modules) {
            finalOptions.modules = (baseOptions2.modules || []).concat(options.modules);
          }
          if (options.directives) {
            finalOptions.directives = extend(Object.create(baseOptions2.directives || null), options.directives);
          }
          for (var key in options) {
            if (key !== "modules" && key !== "directives") {
              finalOptions[key] = options[key];
            }
          }
        }
        finalOptions.warn = warn2;
        var compiled = baseCompile2(template2.trim(), finalOptions);
        if (false) {
          detectErrors(compiled.ast, warn2);
        }
        compiled.errors = errors;
        compiled.tips = tips;
        return compiled;
      }
      return {
        compile: compile2,
        compileToFunctions: createCompileToFunctionFn(compile2)
      };
    };
  }
  var createCompiler = createCompilerCreator(function baseCompile(template2, options) {
    var ast = parse(template2.trim(), options);
    if (options.optimize !== false) {
      optimize(ast, options);
    }
    var code = generate(ast, options);
    return {
      ast,
      render: code.render,
      staticRenderFns: code.staticRenderFns
    };
  });
  var ref$1 = createCompiler(baseOptions);
  var compile = ref$1.compile;
  var compileToFunctions = ref$1.compileToFunctions;
  var div;
  function getShouldDecode(href) {
    div = div || document.createElement("div");
    div.innerHTML = href ? '<a href="\n"/>' : '<div a="\n"/>';
    return div.innerHTML.indexOf("&#10;") > 0;
  }
  var shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false;
  var shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false;
  var idToTemplate = cached(function(id) {
    var el = query(id);
    return el && el.innerHTML;
  });
  var mount = Vue.prototype.$mount;
  Vue.prototype.$mount = function(el, hydrating) {
    el = el && query(el);
    if (el === document.body || el === document.documentElement) {
      return this;
    }
    var options = this.$options;
    if (!options.render) {
      var template2 = options.template;
      if (template2) {
        if (typeof template2 === "string") {
          if (template2.charAt(0) === "#") {
            template2 = idToTemplate(template2);
            if (false) {
              warn("Template element not found or is empty: " + options.template, this);
            }
          }
        } else if (template2.nodeType) {
          template2 = template2.innerHTML;
        } else {
          if (false) {
            warn("invalid template option:" + template2, this);
          }
          return this;
        }
      } else if (el) {
        template2 = getOuterHTML(el);
      }
      if (template2) {
        if (false) {
          mark("compile");
        }
        var ref2 = compileToFunctions(template2, {
          outputSourceRange: false,
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments
        }, this);
        var render4 = ref2.render;
        var staticRenderFns = ref2.staticRenderFns;
        options.render = render4;
        options.staticRenderFns = staticRenderFns;
        if (false) {
          mark("compile end");
          measure("vue " + this._name + " compile", "compile", "compile end");
        }
      }
    }
    return mount.call(this, el, hydrating);
  };
  function getOuterHTML(el) {
    if (el.outerHTML) {
      return el.outerHTML;
    } else {
      var container = document.createElement("div");
      container.appendChild(el.cloneNode(true));
      return container.innerHTML;
    }
  }
  Vue.compile = compileToFunctions;
  var vue_esm_default = Vue;

  // frontend/common/translations.js
  var import_sbp = __toESM(__require("@sbp/sbp"));
  var import_dompurify2 = __toESM(require_purify());

  // frontend/common/vSafeHtml.js
  var import_dompurify = __toESM(require_purify());

  // frontend/model/contracts/shared/giLodash.js
  function omit(o, props2) {
    const x = {};
    for (const k in o) {
      if (!props2.includes(k)) {
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
  function merge(obj, src2) {
    for (const key in src2) {
      const clone = isMergeableObject(src2[key]) ? cloneDeep(src2[key]) : void 0;
      if (clone && isMergeableObject(obj[key])) {
        merge(obj[key], clone);
        continue;
      }
      obj[key] = clone || src2[key];
    }
    return obj;
  }
  function deepEqualJSONType(a, b) {
    if (a === b)
      return true;
    if (a === null || b === null || typeof a !== typeof b)
      return false;
    if (typeof a !== "object")
      return a === b;
    if (Array.isArray(a)) {
      if (a.length !== b.length)
        return false;
    } else if (a.constructor.name !== "Object") {
      throw new Error(`not JSON type: ${a}`);
    }
    for (const key in a) {
      if (!deepEqualJSONType(a[key], b[key]))
        return false;
    }
    return true;
  }
  var has2 = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

  // frontend/common/vSafeHtml.js
  var defaultConfig = {
    ALLOWED_ATTR: ["class"],
    ALLOWED_TAGS: ["b", "br", "em", "i", "p", "small", "span", "strong", "sub", "sup", "u", "s", "code", "ul", "li", "pre", "blockquote", "del"],
    RETURN_DOM_FRAGMENT: true
  };
  var transform = (el, binding) => {
    if (binding.oldValue !== binding.value) {
      let config2 = defaultConfig;
      if (binding.arg === "a") {
        config2 = cloneDeep(config2);
        config2.ALLOWED_ATTR.push("href", "target");
        config2.ALLOWED_TAGS.push("a");
      }
      el.textContent = "";
      el.appendChild(import_dompurify.default.sanitize(binding.value, config2));
    }
  };
  vue_esm_default.directive("safe-html", {
    bind: transform,
    update: transform
  });

  // frontend/common/stringTemplate.js
  var nargs = /\{([0-9a-zA-Z_]+)\}/g;
  function template(string3, ...args) {
    const firstArg = args[0];
    const replacementsByKey = typeof firstArg === "object" && firstArg !== null ? firstArg : args;
    return string3.replace(nargs, function replaceArg(match, capture, index2) {
      if (string3[index2 - 1] === "{" && string3[index2 + match.length] === "}") {
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
  vue_esm_default.prototype.L = L;
  vue_esm_default.prototype.LTags = LTags;
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
  (0, import_sbp.default)("sbp/selectors/register", {
    "translations/init": async function init2(language) {
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
        currentTranslationTable = await (0, import_sbp.default)("backend/translations/get", language) || defaultTranslationTable;
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
    return import_dompurify2.default.sanitize(inputString, dompurifyConfig);
  }
  vue_esm_default.component("i18n", {
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
      const text2 = context.children[0].text;
      const translation = L(text2, context.props.args || {});
      if (!translation) {
        console.warn("The following i18n text was not translated correctly:", text2);
        return h(context.props.tag, context.data, text2);
      }
      if (context.props.tag === "a" && context.data.attrs.target === "_blank") {
        context.data.attrs.rel = "noopener noreferrer";
      }
      if (context.props.compile) {
        const result = vue_esm_default.compile("<wrap>" + sanitize(translation) + "</wrap>");
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

  // frontend/common/errors.js
  var errors_exports = {};
  __export(errors_exports, {
    GIErrorIgnoreAndBan: () => GIErrorIgnoreAndBan,
    GIErrorMissingSigningKeyError: () => GIErrorMissingSigningKeyError,
    GIErrorUIRuntimeError: () => GIErrorUIRuntimeError
  });

  // shared/domains/chelonia/errors.js
  var ChelErrorGenerator = (name, base2 = Error) => class extends base2 {
    constructor(...params) {
      super(...params);
      this.name = name;
      if (params[1]?.cause !== this.cause) {
        Object.defineProperty(this, "cause", { value: params[1].cause });
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
  var ChelErrorUnrecoverable = ChelErrorGenerator("ChelErrorUnrecoverable");
  var ChelErrorDecryptionError = ChelErrorGenerator("ChelErrorDecryptionError");
  var ChelErrorDecryptionKeyNotFound = ChelErrorGenerator("ChelErrorDecryptionKeyNotFound", ChelErrorDecryptionError);
  var ChelErrorSignatureError = ChelErrorGenerator("ChelErrorSignatureError");
  var ChelErrorSignatureKeyUnauthorized = ChelErrorGenerator("ChelErrorSignatureKeyUnauthorized", ChelErrorSignatureError);
  var ChelErrorSignatureKeyNotFound = ChelErrorGenerator("ChelErrorSignatureKeyNotFound", ChelErrorSignatureError);
  var ChelErrorFetchServerTimeFailed = ChelErrorGenerator("ChelErrorFetchServerTimeFailed");

  // frontend/common/errors.js
  var GIErrorIgnoreAndBan = ChelErrorGenerator("GIErrorIgnoreAndBan");
  var GIErrorUIRuntimeError = ChelErrorGenerator("GIErrorUIRuntimeError");
  var GIErrorMissingSigningKeyError = ChelErrorGenerator("GIErrorMissingSigningKeyError");

  // frontend/model/contracts/group.js
  var import_sbp7 = __toESM(__require("@sbp/sbp"));

  // frontend/utils/events.js
  var JOINED_GROUP = "joined-group";
  var LEFT_CHATROOM = "left-chatroom";
  var DELETED_CHATROOM = "deleted-chatroom";

  // frontend/model/contracts/misc/flowTyper.js
  var EMPTY_VALUE = Symbol("@@empty");
  var isEmpty = (v) => v === EMPTY_VALUE;
  var isNil = (v) => v === null;
  var isUndef2 = (v) => typeof v === "undefined";
  var isBoolean = (v) => typeof v === "boolean";
  var isNumber = (v) => typeof v === "number";
  var isString = (v) => typeof v === "string";
  var isObject2 = (v) => !isNil(v) && typeof v === "object";
  var isFunction = (v) => typeof v === "function";
  var getType2 = (typeFn, _options) => {
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
    return new TypeValidatorError(message, expectedType || getType2(typeFn), valueType || typeof value, JSON.stringify(value), typeFn.name, scope);
  };
  var arrayOf = (typeFn, _scope = "Array") => {
    function array(value) {
      if (isEmpty(value))
        return [typeFn(value)];
      if (Array.isArray(value)) {
        let index2 = 0;
        return value.map((v) => typeFn(v, `${_scope}[${index2++}]`));
      }
      throw validatorError(array, value, _scope);
    }
    array.type = () => `Array<${getType2(typeFn)}>`;
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
    mapOf2.type = () => `{ [_:${getType2(keyTypeFn)}]: ${getType2(typeFn)} }`;
    return mapOf2;
  };
  var object = function(value) {
    if (isEmpty(value))
      return {};
    if (isObject2(value) && !Array.isArray(value)) {
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
        throw validatorError(object2, o[undefAttr], `${_scope}.${undefAttr}`, `empty object property '${undefAttr}' for ${_scope} type`, `void | null | ${getType2(typeObj[undefAttr]).substr(1)}`, "-");
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
      const props2 = Object.keys(typeObj).map((key) => {
        const ret = typeObj[key].name.includes("optional") ? `${key}?: ${getType2(typeObj[key], { noVoid: true })}` : `${key}: ${getType2(typeObj[key])}`;
        return ret;
      });
      return `{|
 ${props2.join(",\n  ")} 
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
    optional2.type = ({ noVoid }) => !noVoid ? getType2(unionFn) : getType2(typeFn);
    return optional2;
  };
  function undef(value, _scope = "") {
    if (isEmpty(value) || isUndef2(value))
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
  var number = function number2(value, _scope = "") {
    if (isEmpty(value))
      return 0;
    if (isNumber(value))
      return value;
    throw validatorError(number2, value, _scope);
  };
  var numberRange = (from3, to, key = "") => {
    if (!isNumber(from3) || !isNumber(to)) {
      throw new TypeError("Params for numberRange must be numbers");
    }
    if (from3 >= to) {
      throw new TypeError('Params "to" should be bigger than "from"');
    }
    function numberRange2(value, _scope = "") {
      number(value, _scope);
      if (value >= from3 && value <= to)
        return value;
      throw validatorError(numberRange2, value, _scope, key ? `number type '${key}' must be within the range of [${from3}, ${to}]` : `must be within the range of [${from3}, ${to}]`);
    }
    numberRange2.type = `number(range: [${from3}, ${to}])`;
    return numberRange2;
  };
  var string = function string2(value, _scope = "") {
    if (isEmpty(value))
      return "";
    if (isString(value))
      return value;
    throw validatorError(string2, value, _scope);
  };
  var stringMax = (numChar, key = "") => {
    if (!isNumber(numChar)) {
      throw new Error("param for stringMax must be number");
    }
    function stringMax2(value, _scope = "") {
      string(value, _scope);
      if (value.length <= numChar)
        return value;
      throw validatorError(stringMax2, value, _scope, key ? `string type '${key}' cannot exceed ${numChar} characters` : `cannot exceed ${numChar} characters`);
    }
    stringMax2.type = () => `string(max: ${numChar})`;
    return stringMax2;
  };
  function tupleOf_(...typeFuncs) {
    function tuple(value, _scope = "") {
      const cardinality = typeFuncs.length;
      if (isEmpty(value))
        return typeFuncs.map((fn) => fn(value));
      if (Array.isArray(value) && value.length === cardinality) {
        const tupleValue = [];
        for (let i = 0; i < cardinality; i += 1) {
          tupleValue.push(typeFuncs[i](value[i], _scope));
        }
        return tupleValue;
      }
      throw validatorError(tuple, value, _scope);
    }
    tuple.type = () => `[${typeFuncs.map((fn) => getType2(fn)).join(", ")}]`;
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
    union.type = () => `(${typeFuncs.map((fn) => getType2(fn)).join(" | ")})`;
    return union;
  }
  var unionOf = unionOf_;
  var actionRequireInnerSignature = (next2) => (data, props2) => {
    const innerSigningContractID = props2.message.innerSigningContractID;
    if (!innerSigningContractID || innerSigningContractID === props2.contractID) {
      throw new Error("Missing inner signature");
    }
    return next2(data, props2);
  };

  // frontend/model/notifications/mutationKeys.js
  var REMOVE_NOTIFICATION = "removeNotification";

  // shared/domains/chelonia/utils.js
  var import_sbp4 = __toESM(__require("@sbp/sbp"));

  // shared/functions.js
  var import_tweetnacl = __toESM(require_nacl_fast());

  // shared/blake2bstream.js
  var import_blakejs = __toESM(require_blakejs());

  // shared/multiformats/bytes.js
  var empty = new Uint8Array(0);
  function equals(aa, bb) {
    if (aa === bb) {
      return true;
    }
    if (aa.byteLength !== bb.byteLength) {
      return false;
    }
    for (let ii = 0; ii < aa.byteLength; ii++) {
      if (aa[ii] !== bb[ii]) {
        return false;
      }
    }
    return true;
  }
  function coerce(o) {
    if (o instanceof Uint8Array && o.constructor.name === "Uint8Array") {
      return o;
    }
    if (o instanceof ArrayBuffer) {
      return new Uint8Array(o);
    }
    if (ArrayBuffer.isView(o)) {
      return new Uint8Array(o.buffer, o.byteOffset, o.byteLength);
    }
    throw new Error("Unknown type, must be binary type");
  }

  // shared/multiformats/vendor/varint.js
  var encode_1 = encode;
  var MSB = 128;
  var REST = 127;
  var MSBALL = ~REST;
  var INT = Math.pow(2, 31);
  function encode(num, out, offset) {
    out = out || [];
    offset = offset || 0;
    var oldOffset = offset;
    while (num >= INT) {
      out[offset++] = num & 255 | MSB;
      num /= 128;
    }
    while (num & MSBALL) {
      out[offset++] = num & 255 | MSB;
      num >>>= 7;
    }
    out[offset] = num | 0;
    encode.bytes = offset - oldOffset + 1;
    return out;
  }
  var decode2 = read;
  var MSB$1 = 128;
  var REST$1 = 127;
  function read(buf, offset) {
    var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf.length;
    do {
      if (counter >= l) {
        read.bytes = 0;
        throw new RangeError("Could not decode varint");
      }
      b = buf[counter++];
      res += shift < 28 ? (b & REST$1) << shift : (b & REST$1) * Math.pow(2, shift);
      shift += 7;
    } while (b >= MSB$1);
    read.bytes = counter - offset;
    return res;
  }
  var N1 = Math.pow(2, 7);
  var N2 = Math.pow(2, 14);
  var N3 = Math.pow(2, 21);
  var N4 = Math.pow(2, 28);
  var N5 = Math.pow(2, 35);
  var N6 = Math.pow(2, 42);
  var N7 = Math.pow(2, 49);
  var N8 = Math.pow(2, 56);
  var N9 = Math.pow(2, 63);
  var length = function(value) {
    return value < N1 ? 1 : value < N2 ? 2 : value < N3 ? 3 : value < N4 ? 4 : value < N5 ? 5 : value < N6 ? 6 : value < N7 ? 7 : value < N8 ? 8 : value < N9 ? 9 : 10;
  };
  var varint = {
    encode: encode_1,
    decode: decode2,
    encodingLength: length
  };
  var _brrp_varint = varint;
  var varint_default = _brrp_varint;

  // shared/multiformats/varint.js
  function decode3(data, offset = 0) {
    const code = varint_default.decode(data, offset);
    return [code, varint_default.decode.bytes];
  }
  function encodeTo(int, target2, offset = 0) {
    varint_default.encode(int, target2, offset);
    return target2;
  }
  function encodingLength(int) {
    return varint_default.encodingLength(int);
  }

  // shared/multiformats/hashes/digest.js
  function create2(code, digest) {
    const size = digest.byteLength;
    const sizeOffset = encodingLength(code);
    const digestOffset = sizeOffset + encodingLength(size);
    const bytes = new Uint8Array(digestOffset + size);
    encodeTo(code, bytes, 0);
    encodeTo(size, bytes, sizeOffset);
    bytes.set(digest, digestOffset);
    return new Digest(code, size, digest, bytes);
  }
  function decode4(multihash) {
    const bytes = coerce(multihash);
    const [code, sizeOffset] = decode3(bytes);
    const [size, digestOffset] = decode3(bytes.subarray(sizeOffset));
    const digest = bytes.subarray(sizeOffset + digestOffset);
    if (digest.byteLength !== size) {
      throw new Error("Incorrect length");
    }
    return new Digest(code, size, digest, bytes);
  }
  function equals2(a, b) {
    if (a === b) {
      return true;
    } else {
      const data = b;
      return a.code === data.code && a.size === data.size && data.bytes instanceof Uint8Array && equals(a.bytes, data.bytes);
    }
  }
  var Digest = class {
    code;
    size;
    digest;
    bytes;
    constructor(code, size, digest, bytes) {
      this.code = code;
      this.size = size;
      this.digest = digest;
      this.bytes = bytes;
    }
  };

  // shared/multiformats/hasher.js
  function from({ name, code, encode: encode3 }) {
    return new Hasher(name, code, encode3);
  }
  var Hasher = class {
    name;
    code;
    encode;
    constructor(name, code, encode3) {
      this.name = name;
      this.code = code;
      this.encode = encode3;
    }
    digest(input) {
      if (input instanceof Uint8Array || input instanceof ReadableStream) {
        const result = this.encode(input);
        return result instanceof Uint8Array ? create2(this.code, result) : result.then((digest) => create2(this.code, digest));
      } else {
        throw Error("Unknown type, must be binary type");
      }
    }
  };

  // shared/blake2bstream.js
  var { blake2b, blake2bInit, blake2bUpdate, blake2bFinal } = import_blakejs.default;
  var blake2b256stream = from({
    name: "blake2b-256",
    code: 45600,
    encode: async (input) => {
      if (input instanceof ReadableStream) {
        const ctx = blake2bInit(32);
        const reader = input.getReader();
        for (; ; ) {
          const result = await reader.read();
          if (result.done)
            break;
          blake2bUpdate(ctx, coerce(result.value));
        }
        return blake2bFinal(ctx);
      } else {
        return coerce(blake2b(input, void 0, 32));
      }
    }
  });

  // shared/multiformats/base-x.js
  function base(ALPHABET, name) {
    if (ALPHABET.length >= 255) {
      throw new TypeError("Alphabet too long");
    }
    var BASE_MAP = new Uint8Array(256);
    for (var j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }
    for (var i = 0; i < ALPHABET.length; i++) {
      var x = ALPHABET.charAt(i);
      var xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + " is ambiguous");
      }
      BASE_MAP[xc] = i;
    }
    var BASE = ALPHABET.length;
    var LEADER = ALPHABET.charAt(0);
    var FACTOR = Math.log(BASE) / Math.log(256);
    var iFACTOR = Math.log(256) / Math.log(BASE);
    function encode3(source) {
      if (source instanceof Uint8Array)
        ;
      else if (ArrayBuffer.isView(source)) {
        source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
      } else if (Array.isArray(source)) {
        source = Uint8Array.from(source);
      }
      if (!(source instanceof Uint8Array)) {
        throw new TypeError("Expected Uint8Array");
      }
      if (source.length === 0) {
        return "";
      }
      var zeroes = 0;
      var length2 = 0;
      var pbegin = 0;
      var pend = source.length;
      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }
      var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      var b58 = new Uint8Array(size);
      while (pbegin !== pend) {
        var carry = source[pbegin];
        var i2 = 0;
        for (var it1 = size - 1; (carry !== 0 || i2 < length2) && it1 !== -1; it1--, i2++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i2;
        pbegin++;
      }
      var it2 = size - length2;
      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }
      var str2 = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str2 += ALPHABET.charAt(b58[it2]);
      }
      return str2;
    }
    function decodeUnsafe(source) {
      if (typeof source !== "string") {
        throw new TypeError("Expected String");
      }
      if (source.length === 0) {
        return new Uint8Array();
      }
      var psz = 0;
      if (source[psz] === " ") {
        return;
      }
      var zeroes = 0;
      var length2 = 0;
      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }
      var size = (source.length - psz) * FACTOR + 1 >>> 0;
      var b256 = new Uint8Array(size);
      while (source[psz]) {
        var carry = BASE_MAP[source.charCodeAt(psz)];
        if (carry === 255) {
          return;
        }
        var i2 = 0;
        for (var it3 = size - 1; (carry !== 0 || i2 < length2) && it3 !== -1; it3--, i2++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length2 = i2;
        psz++;
      }
      if (source[psz] === " ") {
        return;
      }
      var it4 = size - length2;
      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }
      var vch = new Uint8Array(zeroes + (size - it4));
      var j2 = zeroes;
      while (it4 !== size) {
        vch[j2++] = b256[it4++];
      }
      return vch;
    }
    function decode6(string3) {
      var buffer = decodeUnsafe(string3);
      if (buffer) {
        return buffer;
      }
      throw new Error(`Non-${name} character`);
    }
    return {
      encode: encode3,
      decodeUnsafe,
      decode: decode6
    };
  }
  var src = base;
  var _brrp__multiformats_scope_baseX = src;
  var base_x_default = _brrp__multiformats_scope_baseX;

  // shared/multiformats/bases/base.js
  var Encoder = class {
    name;
    prefix;
    baseEncode;
    constructor(name, prefix, baseEncode) {
      this.name = name;
      this.prefix = prefix;
      this.baseEncode = baseEncode;
    }
    encode(bytes) {
      if (bytes instanceof Uint8Array) {
        return `${this.prefix}${this.baseEncode(bytes)}`;
      } else {
        throw Error("Unknown type, must be binary type");
      }
    }
  };
  var Decoder = class {
    name;
    prefix;
    baseDecode;
    prefixCodePoint;
    constructor(name, prefix, baseDecode) {
      this.name = name;
      this.prefix = prefix;
      if (prefix.codePointAt(0) === void 0) {
        throw new Error("Invalid prefix character");
      }
      this.prefixCodePoint = prefix.codePointAt(0);
      this.baseDecode = baseDecode;
    }
    decode(text2) {
      if (typeof text2 === "string") {
        if (text2.codePointAt(0) !== this.prefixCodePoint) {
          throw Error(`Unable to decode multibase string ${JSON.stringify(text2)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
        }
        return this.baseDecode(text2.slice(this.prefix.length));
      } else {
        throw Error("Can only multibase decode strings");
      }
    }
    or(decoder2) {
      return or(this, decoder2);
    }
  };
  var ComposedDecoder = class {
    decoders;
    constructor(decoders) {
      this.decoders = decoders;
    }
    or(decoder2) {
      return or(this, decoder2);
    }
    decode(input) {
      const prefix = input[0];
      const decoder2 = this.decoders[prefix];
      if (decoder2 != null) {
        return decoder2.decode(input);
      } else {
        throw RangeError(`Unable to decode multibase string ${JSON.stringify(input)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
      }
    }
  };
  function or(left, right) {
    return new ComposedDecoder({
      ...left.decoders ?? { [left.prefix]: left },
      ...right.decoders ?? { [right.prefix]: right }
    });
  }
  var Codec = class {
    name;
    prefix;
    baseEncode;
    baseDecode;
    encoder;
    decoder;
    constructor(name, prefix, baseEncode, baseDecode) {
      this.name = name;
      this.prefix = prefix;
      this.baseEncode = baseEncode;
      this.baseDecode = baseDecode;
      this.encoder = new Encoder(name, prefix, baseEncode);
      this.decoder = new Decoder(name, prefix, baseDecode);
    }
    encode(input) {
      return this.encoder.encode(input);
    }
    decode(input) {
      return this.decoder.decode(input);
    }
  };
  function from2({ name, prefix, encode: encode3, decode: decode6 }) {
    return new Codec(name, prefix, encode3, decode6);
  }
  function baseX({ name, prefix, alphabet }) {
    const { encode: encode3, decode: decode6 } = base_x_default(alphabet, name);
    return from2({
      prefix,
      name,
      encode: encode3,
      decode: (text2) => coerce(decode6(text2))
    });
  }
  function decode5(string3, alphabet, bitsPerChar, name) {
    const codes = {};
    for (let i = 0; i < alphabet.length; ++i) {
      codes[alphabet[i]] = i;
    }
    let end = string3.length;
    while (string3[end - 1] === "=") {
      --end;
    }
    const out = new Uint8Array(end * bitsPerChar / 8 | 0);
    let bits = 0;
    let buffer = 0;
    let written = 0;
    for (let i = 0; i < end; ++i) {
      const value = codes[string3[i]];
      if (value === void 0) {
        throw new SyntaxError(`Non-${name} character`);
      }
      buffer = buffer << bitsPerChar | value;
      bits += bitsPerChar;
      if (bits >= 8) {
        bits -= 8;
        out[written++] = 255 & buffer >> bits;
      }
    }
    if (bits >= bitsPerChar || (255 & buffer << 8 - bits) !== 0) {
      throw new SyntaxError("Unexpected end of data");
    }
    return out;
  }
  function encode2(data, alphabet, bitsPerChar) {
    const pad = alphabet[alphabet.length - 1] === "=";
    const mask = (1 << bitsPerChar) - 1;
    let out = "";
    let bits = 0;
    let buffer = 0;
    for (let i = 0; i < data.length; ++i) {
      buffer = buffer << 8 | data[i];
      bits += 8;
      while (bits > bitsPerChar) {
        bits -= bitsPerChar;
        out += alphabet[mask & buffer >> bits];
      }
    }
    if (bits !== 0) {
      out += alphabet[mask & buffer << bitsPerChar - bits];
    }
    if (pad) {
      while ((out.length * bitsPerChar & 7) !== 0) {
        out += "=";
      }
    }
    return out;
  }
  function rfc4648({ name, prefix, bitsPerChar, alphabet }) {
    return from2({
      prefix,
      name,
      encode(input) {
        return encode2(input, alphabet, bitsPerChar);
      },
      decode(input) {
        return decode5(input, alphabet, bitsPerChar, name);
      }
    });
  }

  // shared/multiformats/bases/base58.js
  var base58btc = baseX({
    name: "base58btc",
    prefix: "z",
    alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  });
  var base58flickr = baseX({
    name: "base58flickr",
    prefix: "Z",
    alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"
  });

  // shared/multiformats/blake2b.js
  var import_blakejs2 = __toESM(require_blakejs());
  var { blake2b: blake2b2 } = import_blakejs2.default;
  var blake2b8 = from({
    name: "blake2b-8",
    code: 45569,
    encode: (input) => coerce(blake2b2(input, void 0, 1))
  });
  var blake2b16 = from({
    name: "blake2b-16",
    code: 45570,
    encode: (input) => coerce(blake2b2(input, void 0, 2))
  });
  var blake2b24 = from({
    name: "blake2b-24",
    code: 45571,
    encode: (input) => coerce(blake2b2(input, void 0, 3))
  });
  var blake2b32 = from({
    name: "blake2b-32",
    code: 45572,
    encode: (input) => coerce(blake2b2(input, void 0, 4))
  });
  var blake2b40 = from({
    name: "blake2b-40",
    code: 45573,
    encode: (input) => coerce(blake2b2(input, void 0, 5))
  });
  var blake2b48 = from({
    name: "blake2b-48",
    code: 45574,
    encode: (input) => coerce(blake2b2(input, void 0, 6))
  });
  var blake2b56 = from({
    name: "blake2b-56",
    code: 45575,
    encode: (input) => coerce(blake2b2(input, void 0, 7))
  });
  var blake2b64 = from({
    name: "blake2b-64",
    code: 45576,
    encode: (input) => coerce(blake2b2(input, void 0, 8))
  });
  var blake2b72 = from({
    name: "blake2b-72",
    code: 45577,
    encode: (input) => coerce(blake2b2(input, void 0, 9))
  });
  var blake2b80 = from({
    name: "blake2b-80",
    code: 45578,
    encode: (input) => coerce(blake2b2(input, void 0, 10))
  });
  var blake2b88 = from({
    name: "blake2b-88",
    code: 45579,
    encode: (input) => coerce(blake2b2(input, void 0, 11))
  });
  var blake2b96 = from({
    name: "blake2b-96",
    code: 45580,
    encode: (input) => coerce(blake2b2(input, void 0, 12))
  });
  var blake2b104 = from({
    name: "blake2b-104",
    code: 45581,
    encode: (input) => coerce(blake2b2(input, void 0, 13))
  });
  var blake2b112 = from({
    name: "blake2b-112",
    code: 45582,
    encode: (input) => coerce(blake2b2(input, void 0, 14))
  });
  var blake2b120 = from({
    name: "blake2b-120",
    code: 45583,
    encode: (input) => coerce(blake2b2(input, void 0, 15))
  });
  var blake2b128 = from({
    name: "blake2b-128",
    code: 45584,
    encode: (input) => coerce(blake2b2(input, void 0, 16))
  });
  var blake2b136 = from({
    name: "blake2b-136",
    code: 45585,
    encode: (input) => coerce(blake2b2(input, void 0, 17))
  });
  var blake2b144 = from({
    name: "blake2b-144",
    code: 45586,
    encode: (input) => coerce(blake2b2(input, void 0, 18))
  });
  var blake2b152 = from({
    name: "blake2b-152",
    code: 45587,
    encode: (input) => coerce(blake2b2(input, void 0, 19))
  });
  var blake2b160 = from({
    name: "blake2b-160",
    code: 45588,
    encode: (input) => coerce(blake2b2(input, void 0, 20))
  });
  var blake2b168 = from({
    name: "blake2b-168",
    code: 45589,
    encode: (input) => coerce(blake2b2(input, void 0, 21))
  });
  var blake2b176 = from({
    name: "blake2b-176",
    code: 45590,
    encode: (input) => coerce(blake2b2(input, void 0, 22))
  });
  var blake2b184 = from({
    name: "blake2b-184",
    code: 45591,
    encode: (input) => coerce(blake2b2(input, void 0, 23))
  });
  var blake2b192 = from({
    name: "blake2b-192",
    code: 45592,
    encode: (input) => coerce(blake2b2(input, void 0, 24))
  });
  var blake2b200 = from({
    name: "blake2b-200",
    code: 45593,
    encode: (input) => coerce(blake2b2(input, void 0, 25))
  });
  var blake2b208 = from({
    name: "blake2b-208",
    code: 45594,
    encode: (input) => coerce(blake2b2(input, void 0, 26))
  });
  var blake2b216 = from({
    name: "blake2b-216",
    code: 45595,
    encode: (input) => coerce(blake2b2(input, void 0, 27))
  });
  var blake2b224 = from({
    name: "blake2b-224",
    code: 45596,
    encode: (input) => coerce(blake2b2(input, void 0, 28))
  });
  var blake2b232 = from({
    name: "blake2b-232",
    code: 45597,
    encode: (input) => coerce(blake2b2(input, void 0, 29))
  });
  var blake2b240 = from({
    name: "blake2b-240",
    code: 45598,
    encode: (input) => coerce(blake2b2(input, void 0, 30))
  });
  var blake2b248 = from({
    name: "blake2b-248",
    code: 45599,
    encode: (input) => coerce(blake2b2(input, void 0, 31))
  });
  var blake2b256 = from({
    name: "blake2b-256",
    code: 45600,
    encode: (input) => coerce(blake2b2(input, void 0, 32))
  });
  var blake2b264 = from({
    name: "blake2b-264",
    code: 45601,
    encode: (input) => coerce(blake2b2(input, void 0, 33))
  });
  var blake2b272 = from({
    name: "blake2b-272",
    code: 45602,
    encode: (input) => coerce(blake2b2(input, void 0, 34))
  });
  var blake2b280 = from({
    name: "blake2b-280",
    code: 45603,
    encode: (input) => coerce(blake2b2(input, void 0, 35))
  });
  var blake2b288 = from({
    name: "blake2b-288",
    code: 45604,
    encode: (input) => coerce(blake2b2(input, void 0, 36))
  });
  var blake2b296 = from({
    name: "blake2b-296",
    code: 45605,
    encode: (input) => coerce(blake2b2(input, void 0, 37))
  });
  var blake2b304 = from({
    name: "blake2b-304",
    code: 45606,
    encode: (input) => coerce(blake2b2(input, void 0, 38))
  });
  var blake2b312 = from({
    name: "blake2b-312",
    code: 45607,
    encode: (input) => coerce(blake2b2(input, void 0, 39))
  });
  var blake2b320 = from({
    name: "blake2b-320",
    code: 45608,
    encode: (input) => coerce(blake2b2(input, void 0, 40))
  });
  var blake2b328 = from({
    name: "blake2b-328",
    code: 45609,
    encode: (input) => coerce(blake2b2(input, void 0, 41))
  });
  var blake2b336 = from({
    name: "blake2b-336",
    code: 45610,
    encode: (input) => coerce(blake2b2(input, void 0, 42))
  });
  var blake2b344 = from({
    name: "blake2b-344",
    code: 45611,
    encode: (input) => coerce(blake2b2(input, void 0, 43))
  });
  var blake2b352 = from({
    name: "blake2b-352",
    code: 45612,
    encode: (input) => coerce(blake2b2(input, void 0, 44))
  });
  var blake2b360 = from({
    name: "blake2b-360",
    code: 45613,
    encode: (input) => coerce(blake2b2(input, void 0, 45))
  });
  var blake2b368 = from({
    name: "blake2b-368",
    code: 45614,
    encode: (input) => coerce(blake2b2(input, void 0, 46))
  });
  var blake2b376 = from({
    name: "blake2b-376",
    code: 45615,
    encode: (input) => coerce(blake2b2(input, void 0, 47))
  });
  var blake2b384 = from({
    name: "blake2b-384",
    code: 45616,
    encode: (input) => coerce(blake2b2(input, void 0, 48))
  });
  var blake2b392 = from({
    name: "blake2b-392",
    code: 45617,
    encode: (input) => coerce(blake2b2(input, void 0, 49))
  });
  var blake2b400 = from({
    name: "blake2b-400",
    code: 45618,
    encode: (input) => coerce(blake2b2(input, void 0, 50))
  });
  var blake2b408 = from({
    name: "blake2b-408",
    code: 45619,
    encode: (input) => coerce(blake2b2(input, void 0, 51))
  });
  var blake2b416 = from({
    name: "blake2b-416",
    code: 45620,
    encode: (input) => coerce(blake2b2(input, void 0, 52))
  });
  var blake2b424 = from({
    name: "blake2b-424",
    code: 45621,
    encode: (input) => coerce(blake2b2(input, void 0, 53))
  });
  var blake2b432 = from({
    name: "blake2b-432",
    code: 45622,
    encode: (input) => coerce(blake2b2(input, void 0, 54))
  });
  var blake2b440 = from({
    name: "blake2b-440",
    code: 45623,
    encode: (input) => coerce(blake2b2(input, void 0, 55))
  });
  var blake2b448 = from({
    name: "blake2b-448",
    code: 45624,
    encode: (input) => coerce(blake2b2(input, void 0, 56))
  });
  var blake2b456 = from({
    name: "blake2b-456",
    code: 45625,
    encode: (input) => coerce(blake2b2(input, void 0, 57))
  });
  var blake2b464 = from({
    name: "blake2b-464",
    code: 45626,
    encode: (input) => coerce(blake2b2(input, void 0, 58))
  });
  var blake2b472 = from({
    name: "blake2b-472",
    code: 45627,
    encode: (input) => coerce(blake2b2(input, void 0, 59))
  });
  var blake2b480 = from({
    name: "blake2b-480",
    code: 45628,
    encode: (input) => coerce(blake2b2(input, void 0, 60))
  });
  var blake2b488 = from({
    name: "blake2b-488",
    code: 45629,
    encode: (input) => coerce(blake2b2(input, void 0, 61))
  });
  var blake2b496 = from({
    name: "blake2b-496",
    code: 45630,
    encode: (input) => coerce(blake2b2(input, void 0, 62))
  });
  var blake2b504 = from({
    name: "blake2b-504",
    code: 45631,
    encode: (input) => coerce(blake2b2(input, void 0, 63))
  });
  var blake2b512 = from({
    name: "blake2b-512",
    code: 45632,
    encode: (input) => coerce(blake2b2(input, void 0, 64))
  });

  // shared/multiformats/bases/base32.js
  var base32 = rfc4648({
    prefix: "b",
    name: "base32",
    alphabet: "abcdefghijklmnopqrstuvwxyz234567",
    bitsPerChar: 5
  });
  var base32upper = rfc4648({
    prefix: "B",
    name: "base32upper",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    bitsPerChar: 5
  });
  var base32pad = rfc4648({
    prefix: "c",
    name: "base32pad",
    alphabet: "abcdefghijklmnopqrstuvwxyz234567=",
    bitsPerChar: 5
  });
  var base32padupper = rfc4648({
    prefix: "C",
    name: "base32padupper",
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=",
    bitsPerChar: 5
  });
  var base32hex = rfc4648({
    prefix: "v",
    name: "base32hex",
    alphabet: "0123456789abcdefghijklmnopqrstuv",
    bitsPerChar: 5
  });
  var base32hexupper = rfc4648({
    prefix: "V",
    name: "base32hexupper",
    alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
    bitsPerChar: 5
  });
  var base32hexpad = rfc4648({
    prefix: "t",
    name: "base32hexpad",
    alphabet: "0123456789abcdefghijklmnopqrstuv=",
    bitsPerChar: 5
  });
  var base32hexpadupper = rfc4648({
    prefix: "T",
    name: "base32hexpadupper",
    alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=",
    bitsPerChar: 5
  });
  var base32z = rfc4648({
    prefix: "h",
    name: "base32z",
    alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769",
    bitsPerChar: 5
  });

  // shared/multiformats/cid.js
  function format(link, base2) {
    const { bytes, version } = link;
    switch (version) {
      case 0:
        return toStringV0(bytes, baseCache(link), base2 ?? base58btc.encoder);
      default:
        return toStringV1(bytes, baseCache(link), base2 ?? base32.encoder);
    }
  }
  var cache = /* @__PURE__ */ new WeakMap();
  function baseCache(cid) {
    const baseCache2 = cache.get(cid);
    if (baseCache2 == null) {
      const baseCache3 = /* @__PURE__ */ new Map();
      cache.set(cid, baseCache3);
      return baseCache3;
    }
    return baseCache2;
  }
  var CID = class {
    code;
    version;
    multihash;
    bytes;
    "/";
    constructor(version, code, multihash, bytes) {
      this.code = code;
      this.version = version;
      this.multihash = multihash;
      this.bytes = bytes;
      this["/"] = bytes;
    }
    get asCID() {
      return this;
    }
    get byteOffset() {
      return this.bytes.byteOffset;
    }
    get byteLength() {
      return this.bytes.byteLength;
    }
    toV0() {
      switch (this.version) {
        case 0: {
          return this;
        }
        case 1: {
          const { code, multihash } = this;
          if (code !== DAG_PB_CODE) {
            throw new Error("Cannot convert a non dag-pb CID to CIDv0");
          }
          if (multihash.code !== SHA_256_CODE) {
            throw new Error("Cannot convert non sha2-256 multihash CID to CIDv0");
          }
          return CID.createV0(multihash);
        }
        default: {
          throw Error(`Can not convert CID version ${this.version} to version 0. This is a bug please report`);
        }
      }
    }
    toV1() {
      switch (this.version) {
        case 0: {
          const { code, digest } = this.multihash;
          const multihash = create2(code, digest);
          return CID.createV1(this.code, multihash);
        }
        case 1: {
          return this;
        }
        default: {
          throw Error(`Can not convert CID version ${this.version} to version 1. This is a bug please report`);
        }
      }
    }
    equals(other) {
      return CID.equals(this, other);
    }
    static equals(self2, other) {
      const unknown = other;
      return unknown != null && self2.code === unknown.code && self2.version === unknown.version && equals2(self2.multihash, unknown.multihash);
    }
    toString(base2) {
      return format(this, base2);
    }
    toJSON() {
      return { "/": format(this) };
    }
    link() {
      return this;
    }
    [Symbol.toStringTag] = "CID";
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return `CID(${this.toString()})`;
    }
    static asCID(input) {
      if (input == null) {
        return null;
      }
      const value = input;
      if (value instanceof CID) {
        return value;
      } else if (value["/"] != null && value["/"] === value.bytes || value.asCID === value) {
        const { version, code, multihash, bytes } = value;
        return new CID(version, code, multihash, bytes ?? encodeCID(version, code, multihash.bytes));
      } else if (value[cidSymbol] === true) {
        const { version, multihash, code } = value;
        const digest = decode4(multihash);
        return CID.create(version, code, digest);
      } else {
        return null;
      }
    }
    static create(version, code, digest) {
      if (typeof code !== "number") {
        throw new Error("String codecs are no longer supported");
      }
      if (!(digest.bytes instanceof Uint8Array)) {
        throw new Error("Invalid digest");
      }
      switch (version) {
        case 0: {
          if (code !== DAG_PB_CODE) {
            throw new Error(`Version 0 CID must use dag-pb (code: ${DAG_PB_CODE}) block encoding`);
          } else {
            return new CID(version, code, digest, digest.bytes);
          }
        }
        case 1: {
          const bytes = encodeCID(version, code, digest.bytes);
          return new CID(version, code, digest, bytes);
        }
        default: {
          throw new Error("Invalid version");
        }
      }
    }
    static createV0(digest) {
      return CID.create(0, DAG_PB_CODE, digest);
    }
    static createV1(code, digest) {
      return CID.create(1, code, digest);
    }
    static decode(bytes) {
      const [cid, remainder] = CID.decodeFirst(bytes);
      if (remainder.length !== 0) {
        throw new Error("Incorrect length");
      }
      return cid;
    }
    static decodeFirst(bytes) {
      const specs = CID.inspectBytes(bytes);
      const prefixSize = specs.size - specs.multihashSize;
      const multihashBytes = coerce(bytes.subarray(prefixSize, prefixSize + specs.multihashSize));
      if (multihashBytes.byteLength !== specs.multihashSize) {
        throw new Error("Incorrect length");
      }
      const digestBytes = multihashBytes.subarray(specs.multihashSize - specs.digestSize);
      const digest = new Digest(specs.multihashCode, specs.digestSize, digestBytes, multihashBytes);
      const cid = specs.version === 0 ? CID.createV0(digest) : CID.createV1(specs.codec, digest);
      return [cid, bytes.subarray(specs.size)];
    }
    static inspectBytes(initialBytes) {
      let offset = 0;
      const next2 = () => {
        const [i, length2] = decode3(initialBytes.subarray(offset));
        offset += length2;
        return i;
      };
      let version = next2();
      let codec = DAG_PB_CODE;
      if (version === 18) {
        version = 0;
        offset = 0;
      } else {
        codec = next2();
      }
      if (version !== 0 && version !== 1) {
        throw new RangeError(`Invalid CID version ${version}`);
      }
      const prefixSize = offset;
      const multihashCode = next2();
      const digestSize = next2();
      const size = offset + digestSize;
      const multihashSize = size - prefixSize;
      return { version, codec, multihashCode, digestSize, multihashSize, size };
    }
    static parse(source, base2) {
      const [prefix, bytes] = parseCIDtoBytes(source, base2);
      const cid = CID.decode(bytes);
      if (cid.version === 0 && source[0] !== "Q") {
        throw Error("Version 0 CID string must not include multibase prefix");
      }
      baseCache(cid).set(prefix, source);
      return cid;
    }
  };
  function parseCIDtoBytes(source, base2) {
    switch (source[0]) {
      case "Q": {
        const decoder2 = base2 ?? base58btc;
        return [
          base58btc.prefix,
          decoder2.decode(`${base58btc.prefix}${source}`)
        ];
      }
      case base58btc.prefix: {
        const decoder2 = base2 ?? base58btc;
        return [base58btc.prefix, decoder2.decode(source)];
      }
      case base32.prefix: {
        const decoder2 = base2 ?? base32;
        return [base32.prefix, decoder2.decode(source)];
      }
      default: {
        if (base2 == null) {
          throw Error("To parse non base32 or base58btc encoded CID multibase decoder must be provided");
        }
        return [source[0], base2.decode(source)];
      }
    }
  }
  function toStringV0(bytes, cache2, base2) {
    const { prefix } = base2;
    if (prefix !== base58btc.prefix) {
      throw Error(`Cannot string encode V0 in ${base2.name} encoding`);
    }
    const cid = cache2.get(prefix);
    if (cid == null) {
      const cid2 = base2.encode(bytes).slice(1);
      cache2.set(prefix, cid2);
      return cid2;
    } else {
      return cid;
    }
  }
  function toStringV1(bytes, cache2, base2) {
    const { prefix } = base2;
    const cid = cache2.get(prefix);
    if (cid == null) {
      const cid2 = base2.encode(bytes);
      cache2.set(prefix, cid2);
      return cid2;
    } else {
      return cid;
    }
  }
  var DAG_PB_CODE = 112;
  var SHA_256_CODE = 18;
  function encodeCID(version, code, multihash) {
    const codeOffset = encodingLength(version);
    const hashOffset = codeOffset + encodingLength(code);
    const bytes = new Uint8Array(hashOffset + multihash.byteLength);
    encodeTo(version, bytes, 0);
    encodeTo(code, bytes, codeOffset);
    bytes.set(multihash, hashOffset);
    return bytes;
  }
  var cidSymbol = Symbol.for("@ipld/js-cid/CID");

  // shared/functions.js
  var multicodes = { JSON: 512, RAW: 0 };
  if (typeof globalThis === "object" && !has2(globalThis, "Buffer")) {
    const { Buffer: Buffer2 } = require_buffer();
    globalThis.Buffer = Buffer2;
  }
  function createCID(data, multicode = multicodes.RAW) {
    const uint8array = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const digest = blake2b256.digest(uint8array);
    return CID.create(1, multicode, digest).toString(base58btc.encoder);
  }
  function blake32Hash(data) {
    const uint8array = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const digest = blake2b256.digest(uint8array);
    return base58btc.encode(digest.bytes);
  }
  var b64ToBuf = (b64) => Buffer.from(b64, "base64");
  var strToBuf = (str2) => Buffer.from(str2, "utf8");
  var bytesToB64 = (ary) => Buffer.from(ary).toString("base64");

  // shared/domains/chelonia/crypto.js
  var import_tweetnacl2 = __toESM(require_nacl_fast());
  var import_scrypt_async = __toESM(require_scrypt_async());
  var EDWARDS25519SHA512BATCH = "edwards25519sha512batch";
  var CURVE25519XSALSA20POLY1305 = "curve25519xsalsa20poly1305";
  var XSALSA20POLY1305 = "xsalsa20poly1305";
  var bytesOrObjectToB64 = (ary) => {
    if (!(ary instanceof Uint8Array)) {
      throw Error("Unsupported type");
    }
    return bytesToB64(ary);
  };
  var serializeKey = (key, saveSecretKey) => {
    if (false) {
      return JSON.stringify([
        key.type,
        saveSecretKey ? null : key.publicKey,
        saveSecretKey ? key.secretKey : null
      ], void 0, 0);
    }
    if (key.type === EDWARDS25519SHA512BATCH || key.type === CURVE25519XSALSA20POLY1305) {
      if (!saveSecretKey) {
        if (!key.publicKey) {
          throw new Error("Unsupported operation: no public key to export");
        }
        return JSON.stringify([
          key.type,
          bytesOrObjectToB64(key.publicKey),
          null
        ], void 0, 0);
      }
      if (!key.secretKey) {
        throw new Error("Unsupported operation: no secret key to export");
      }
      return JSON.stringify([
        key.type,
        null,
        bytesOrObjectToB64(key.secretKey)
      ], void 0, 0);
    } else if (key.type === XSALSA20POLY1305) {
      if (!saveSecretKey) {
        throw new Error("Unsupported operation: no public key to export");
      }
      if (!key.secretKey) {
        throw new Error("Unsupported operation: no secret key to export");
      }
      return JSON.stringify([
        key.type,
        null,
        bytesOrObjectToB64(key.secretKey)
      ], void 0, 0);
    }
    throw new Error("Unsupported key type");
  };
  var deserializeKey = (data) => {
    const keyData = JSON.parse(data);
    if (!keyData || keyData.length !== 3) {
      throw new Error("Invalid key object");
    }
    if (false) {
      const res = {
        type: keyData[0]
      };
      if (keyData[2]) {
        Object.defineProperty(res, "secretKey", { value: keyData[2] });
        res.publicKey = keyData[2];
      } else {
        res.publicKey = keyData[1];
      }
      return res;
    }
    if (keyData[0] === EDWARDS25519SHA512BATCH) {
      if (keyData[2]) {
        const key = import_tweetnacl2.default.sign.keyPair.fromSecretKey(b64ToBuf(keyData[2]));
        const res = {
          type: keyData[0],
          publicKey: key.publicKey
        };
        Object.defineProperty(res, "secretKey", { value: key.secretKey });
        return res;
      } else if (keyData[1]) {
        return {
          type: keyData[0],
          publicKey: new Uint8Array(b64ToBuf(keyData[1]))
        };
      }
      throw new Error("Missing secret or public key");
    } else if (keyData[0] === CURVE25519XSALSA20POLY1305) {
      if (keyData[2]) {
        const key = import_tweetnacl2.default.box.keyPair.fromSecretKey(b64ToBuf(keyData[2]));
        const res = {
          type: keyData[0],
          publicKey: key.publicKey
        };
        Object.defineProperty(res, "secretKey", { value: key.secretKey });
        return res;
      } else if (keyData[1]) {
        return {
          type: keyData[0],
          publicKey: new Uint8Array(b64ToBuf(keyData[1]))
        };
      }
      throw new Error("Missing secret or public key");
    } else if (keyData[0] === XSALSA20POLY1305) {
      if (!keyData[2]) {
        throw new Error("Secret key missing");
      }
      const res = {
        type: keyData[0]
      };
      Object.defineProperty(res, "secretKey", { value: new Uint8Array(b64ToBuf(keyData[2])) });
      return res;
    }
    throw new Error("Unsupported key type");
  };
  var keyId = (inKey) => {
    const key = Object(inKey) instanceof String ? deserializeKey(inKey) : inKey;
    const serializedKey = serializeKey(key, !key.publicKey);
    return blake32Hash(serializedKey);
  };
  var verifySignature = (inKey, data, signature) => {
    const key = Object(inKey) instanceof String ? deserializeKey(inKey) : inKey;
    if (false) {
      if (!key.publicKey) {
        throw new Error("Public key missing");
      }
      if (key.publicKey + ";" + blake32Hash(data) !== signature) {
        throw new Error("Invalid signature");
      }
      return;
    }
    if (key.type !== EDWARDS25519SHA512BATCH) {
      throw new Error("Unsupported algorithm");
    }
    if (!key.publicKey) {
      throw new Error("Public key missing");
    }
    const decodedSignature = b64ToBuf(signature);
    const messageUint8 = strToBuf(data);
    const result = import_tweetnacl2.default.sign.detached.verify(messageUint8, decodedSignature, key.publicKey);
    if (!result) {
      throw new Error("Invalid signature");
    }
  };
  var decrypt = (inKey, data, ad) => {
    const key = Object(inKey) instanceof String ? deserializeKey(inKey) : inKey;
    if (false) {
      if (!key.secretKey) {
        throw new Error("Secret key missing");
      }
      if (!data.startsWith(key.secretKey + ";") || !data.endsWith(";" + (ad ?? ""))) {
        throw new Error("Additional data mismatch");
      }
      return data.slice(String(key.secretKey).length + 1, data.length - 1 - (ad ?? "").length);
    }
    if (key.type === XSALSA20POLY1305) {
      if (!key.secretKey) {
        throw new Error("Secret key missing");
      }
      const messageWithNonceAsUint8Array = b64ToBuf(data);
      const nonce = messageWithNonceAsUint8Array.slice(0, import_tweetnacl2.default.secretbox.nonceLength);
      const message = messageWithNonceAsUint8Array.slice(import_tweetnacl2.default.secretbox.nonceLength, messageWithNonceAsUint8Array.length);
      if (ad) {
        const adHash = import_tweetnacl2.default.hash(strToBuf(ad));
        const len2 = Math.min(adHash.length, nonce.length);
        for (let i = 0; i < len2; i++) {
          nonce[i] ^= adHash[i];
        }
      }
      const decrypted = import_tweetnacl2.default.secretbox.open(message, nonce, key.secretKey);
      if (!decrypted) {
        throw new Error("Could not decrypt message");
      }
      return Buffer.from(decrypted).toString("utf-8");
    } else if (key.type === CURVE25519XSALSA20POLY1305) {
      if (!key.secretKey) {
        throw new Error("Secret key missing");
      }
      const messageWithNonceAsUint8Array = b64ToBuf(data);
      const ephemeralPublicKey = messageWithNonceAsUint8Array.slice(0, import_tweetnacl2.default.box.publicKeyLength);
      const nonce = messageWithNonceAsUint8Array.slice(import_tweetnacl2.default.box.publicKeyLength, import_tweetnacl2.default.box.publicKeyLength + import_tweetnacl2.default.box.nonceLength);
      const message = messageWithNonceAsUint8Array.slice(import_tweetnacl2.default.box.publicKeyLength + import_tweetnacl2.default.box.nonceLength);
      if (ad) {
        const adHash = import_tweetnacl2.default.hash(strToBuf(ad));
        const len2 = Math.min(adHash.length, nonce.length);
        for (let i = 0; i < len2; i++) {
          nonce[i] ^= adHash[i];
        }
      }
      const decrypted = import_tweetnacl2.default.box.open(message, nonce, ephemeralPublicKey, key.secretKey);
      if (!decrypted) {
        throw new Error("Could not decrypt message");
      }
      return Buffer.from(decrypted).toString("utf-8");
    }
    throw new Error("Unsupported algorithm");
  };

  // shared/domains/chelonia/encryptedData.js
  var import_sbp3 = __toESM(__require("@sbp/sbp"));

  // shared/domains/chelonia/signedData.js
  var import_sbp2 = __toESM(__require("@sbp/sbp"));
  var rootStateFn = () => (0, import_sbp2.default)("chelonia/rootState");
  var proto = Object.create(null, {
    _isSignedData: {
      value: true
    }
  });
  var wrapper = (o) => {
    return Object.setPrototypeOf(o, proto);
  };
  var isSignedData = (o) => {
    return !!o && !!Object.getPrototypeOf(o)?._isSignedData;
  };
  var verifySignatureData = function(height, data, additionalData) {
    if (!this) {
      throw new ChelErrorSignatureError("Missing contract state");
    }
    if (!isRawSignedData(data)) {
      throw new ChelErrorSignatureError("Invalid message format");
    }
    if (!Number.isSafeInteger(height) || height < 0) {
      throw new ChelErrorSignatureError(`Height ${height} is invalid or out of range`);
    }
    const [serializedMessage, sKeyId, signature] = data._signedData;
    const designatedKey = this._vm?.authorizedKeys?.[sKeyId];
    if (!designatedKey || height > designatedKey._notAfterHeight || height < designatedKey._notBeforeHeight || !designatedKey.purpose.includes("sig")) {
      if ("") {
        console.error(`Key ${sKeyId} is unauthorized or expired for the current contract`, { designatedKey, height, state: JSON.parse(JSON.stringify((0, import_sbp2.default)("state/vuex/state"))) });
        Promise.reject(new ChelErrorSignatureKeyUnauthorized(`Key ${sKeyId} is unauthorized or expired for the current contract`));
      }
      throw new ChelErrorSignatureKeyUnauthorized(`Key ${sKeyId} is unauthorized or expired for the current contract`);
    }
    const deserializedKey = designatedKey.data;
    const payloadToSign = blake32Hash(`${blake32Hash(additionalData)}${blake32Hash(serializedMessage)}`);
    try {
      verifySignature(deserializedKey, payloadToSign, signature);
      const message = JSON.parse(serializedMessage);
      return [sKeyId, message];
    } catch (e) {
      throw new ChelErrorSignatureError(e?.message || e);
    }
  };
  var signedIncomingData = (contractID, state, data, height, additionalData, mapperFn) => {
    const stringValueFn = () => data;
    let verifySignedValue;
    const verifySignedValueFn = () => {
      if (verifySignedValue) {
        return verifySignedValue[1];
      }
      verifySignedValue = verifySignatureData.call(state || rootStateFn()[contractID], height, data, additionalData);
      if (mapperFn)
        verifySignedValue[1] = mapperFn(verifySignedValue[1]);
      return verifySignedValue[1];
    };
    return wrapper({
      get signingKeyId() {
        if (verifySignedValue)
          return verifySignedValue[0];
        return signedDataKeyId(data);
      },
      get serialize() {
        return stringValueFn;
      },
      get context() {
        return [contractID, data, height, additionalData];
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return verifySignedValueFn;
      },
      get toJSON() {
        return this.serialize;
      },
      get get() {
        return (k) => k !== "_signedData" ? data[k] : void 0;
      }
    });
  };
  var signedDataKeyId = (data) => {
    if (!isRawSignedData(data)) {
      throw new ChelErrorSignatureError("Invalid message format");
    }
    return data._signedData[1];
  };
  var isRawSignedData = (data) => {
    if (!data || typeof data !== "object" || !has2(data, "_signedData") || !Array.isArray(data._signedData) || data._signedData.length !== 3 || data._signedData.map((v) => typeof v).filter((v) => v !== "string").length !== 0) {
      return false;
    }
    return true;
  };
  var rawSignedIncomingData = (data) => {
    if (!isRawSignedData(data)) {
      throw new ChelErrorSignatureError("Invalid message format");
    }
    const stringValueFn = () => data;
    let verifySignedValue;
    const verifySignedValueFn = () => {
      if (verifySignedValue) {
        return verifySignedValue[1];
      }
      verifySignedValue = [data._signedData[1], JSON.parse(data._signedData[0])];
      return verifySignedValue[1];
    };
    return wrapper({
      get signingKeyId() {
        if (verifySignedValue)
          return verifySignedValue[0];
        return signedDataKeyId(data);
      },
      get serialize() {
        return stringValueFn;
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return verifySignedValueFn;
      },
      get toJSON() {
        return this.serialize;
      },
      get get() {
        return (k) => k !== "_signedData" ? data[k] : void 0;
      }
    });
  };

  // shared/domains/chelonia/encryptedData.js
  var rootStateFn2 = () => (0, import_sbp3.default)("chelonia/rootState");
  var proto2 = Object.create(null, {
    _isEncryptedData: {
      value: true
    }
  });
  var wrapper2 = (o) => {
    return Object.setPrototypeOf(o, proto2);
  };
  var isEncryptedData = (o) => {
    return !!o && !!Object.getPrototypeOf(o)?._isEncryptedData;
  };
  var decryptData = function(height, data, additionalKeys, additionalData, validatorFn) {
    if (!this) {
      throw new ChelErrorDecryptionError("Missing contract state");
    }
    if (typeof data.valueOf === "function")
      data = data.valueOf();
    if (!isRawEncryptedData(data)) {
      throw new ChelErrorDecryptionError("Invalid message format");
    }
    const [eKeyId, message] = data;
    const key = additionalKeys[eKeyId];
    if (!key) {
      throw new ChelErrorDecryptionKeyNotFound(`Key ${eKeyId} not found`);
    }
    const designatedKey = this._vm?.authorizedKeys?.[eKeyId];
    if (!designatedKey || height > designatedKey._notAfterHeight || height < designatedKey._notBeforeHeight || !designatedKey.purpose.includes("enc")) {
      throw new ChelErrorUnexpected(`Key ${eKeyId} is unauthorized or expired for the current contract`);
    }
    const deserializedKey = typeof key === "string" ? deserializeKey(key) : key;
    try {
      const result = JSON.parse(decrypt(deserializedKey, message, additionalData));
      if (typeof validatorFn === "function")
        validatorFn(result, eKeyId);
      return result;
    } catch (e) {
      throw new ChelErrorDecryptionError(e?.message || e);
    }
  };
  var encryptedIncomingData = (contractID, state, data, height, additionalKeys, additionalData, validatorFn) => {
    let decryptedValue;
    const decryptedValueFn = () => {
      if (decryptedValue) {
        return decryptedValue;
      }
      if (!state || !additionalKeys) {
        const rootState = rootStateFn2();
        state = state || rootState[contractID];
        additionalKeys = additionalKeys ?? rootState.secretKeys;
      }
      decryptedValue = decryptData.call(state, height, data, additionalKeys, additionalData || "", validatorFn);
      if (isRawSignedData(decryptedValue)) {
        decryptedValue = signedIncomingData(contractID, state, decryptedValue, height, additionalData || "");
      }
      return decryptedValue;
    };
    return wrapper2({
      get encryptionKeyId() {
        return encryptedDataKeyId(data);
      },
      get serialize() {
        return () => data;
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return decryptedValueFn;
      },
      get toJSON() {
        return this.serialize;
      }
    });
  };
  var encryptedIncomingForeignData = (contractID, _0, data, _1, additionalKeys, additionalData, validatorFn) => {
    let decryptedValue;
    const decryptedValueFn = () => {
      if (decryptedValue) {
        return decryptedValue;
      }
      const rootState = rootStateFn2();
      const state = rootState[contractID];
      decryptedValue = decryptData.call(state, NaN, data, additionalKeys ?? rootState.secretKeys, additionalData || "", validatorFn);
      if (isRawSignedData(decryptedValue)) {
        return signedIncomingData(contractID, state, decryptedValue, NaN, additionalData || "");
      }
      return decryptedValue;
    };
    return wrapper2({
      get encryptionKeyId() {
        return encryptedDataKeyId(data);
      },
      get serialize() {
        return () => data;
      },
      get toString() {
        return () => JSON.stringify(this.serialize());
      },
      get valueOf() {
        return decryptedValueFn;
      },
      get toJSON() {
        return this.serialize;
      }
    });
  };
  var encryptedDataKeyId = (data) => {
    if (!isRawEncryptedData(data)) {
      throw new ChelErrorDecryptionError("Invalid message format");
    }
    return data[0];
  };
  var isRawEncryptedData = (data) => {
    if (!Array.isArray(data) || data.length !== 2 || data.map((v) => typeof v).filter((v) => v !== "string").length !== 0) {
      return false;
    }
    return true;
  };
  var unwrapMaybeEncryptedData = (data) => {
    if (isEncryptedData(data)) {
      if (false)
        return;
      try {
        return {
          encryptionKeyId: data.encryptionKeyId,
          data: data.valueOf()
        };
      } catch (e) {
        console.warn("unwrapMaybeEncryptedData: Unable to decrypt", e);
      }
    } else {
      return {
        encryptionKeyId: null,
        data
      };
    }
  };
  var maybeEncryptedIncomingData = (contractID, state, data, height, additionalKeys, additionalData, validatorFn) => {
    if (isRawEncryptedData(data)) {
      return encryptedIncomingData(contractID, state, data, height, additionalKeys, additionalData, validatorFn);
    } else {
      validatorFn?.(data, "");
      return data;
    }
  };

  // shared/serdes/index.js
  var raw = Symbol("raw");
  var serdesTagSymbol = Symbol("tag");
  var serdesSerializeSymbol = Symbol("serialize");
  var serdesDeserializeSymbol = Symbol("deserialize");
  var rawResult = (obj) => {
    Object.defineProperty(obj, raw, { value: true });
    return obj;
  };
  var serializer = (data) => {
    const verbatim = [];
    const transferables = /* @__PURE__ */ new Set();
    const revokables = /* @__PURE__ */ new Set();
    const result = JSON.parse(JSON.stringify(data, (_key, value) => {
      if (value && value[raw])
        return value;
      if (value === void 0)
        return rawResult(["_", "_"]);
      if (!value)
        return value;
      if (Array.isArray(value) && value[0] === "_")
        return rawResult(["_", "_", ...value]);
      if (value instanceof Map) {
        return rawResult(["_", "Map", Array.from(value.entries())]);
      }
      if (value instanceof Set) {
        return rawResult(["_", "Set", Array.from(value.entries())]);
      }
      if (value instanceof Error || value instanceof Blob || value instanceof File) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        return rawResult(["_", "_ref", pos]);
      }
      if (value instanceof MessagePort || value instanceof ReadableStream || value instanceof WritableStream || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        transferables.add(value);
        return rawResult(["_", "_ref", pos]);
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
        return rawResult(["_", "_fn", mc.port2]);
      }
      const proto3 = Object.getPrototypeOf(value);
      if (proto3?.constructor?.[serdesTagSymbol] && proto3.constructor[serdesSerializeSymbol]) {
        return rawResult(["_", "_custom", proto3.constructor[serdesTagSymbol], proto3.constructor[serdesSerializeSymbol](value)]);
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
    const verbatim = [];
    return JSON.parse(JSON.stringify(data, (_key, value) => {
      if (value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
        const pos = verbatim.length;
        verbatim[verbatim.length] = value;
        return rawResult(["_", "_ref", pos]);
      }
      return value;
    }), (_key, value) => {
      if (Array.isArray(value) && value[0] === "_") {
        switch (value[1]) {
          case "_":
            if (value.length >= 3) {
              return value.slice(2);
            } else {
              return void 0;
            }
          case "Map":
            return new Map(value[2]);
          case "Set":
            return new Set(value[2]);
          case "_custom":
            if (deserializerTable[value[2]]) {
              return deserializerTable[value[2]](value[3]);
            } else {
              throw new Error("Invalid or unknown tag: " + value[2]);
            }
          case "_ref":
            return verbatim[value[2]];
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
  deserializer.register = (y) => {
    if (typeof y === "function" && typeof y[serdesTagSymbol] === "string" && typeof y[serdesDeserializeSymbol] === "function") {
      deserializerTable[y[serdesTagSymbol]] = y[serdesDeserializeSymbol].bind(y);
    }
  };

  // shared/domains/chelonia/GIMessage.js
  var decryptedAndVerifiedDeserializedMessage = (head, headJSON, contractID, parsedMessage, additionalKeys, state) => {
    const op = head.op;
    const height = head.height;
    const message = op === GIMessage.OP_ACTION_ENCRYPTED ? encryptedIncomingData(contractID, state, parsedMessage, height, additionalKeys, headJSON, void 0) : parsedMessage;
    if ([GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_UPDATE].includes(op)) {
      return message.map((key) => {
        return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, (key2, eKeyId) => {
          if (key2.meta?.private?.content) {
            key2.meta.private.content = encryptedIncomingData(contractID, state, key2.meta.private.content, height, additionalKeys, headJSON, (value) => {
              const computedKeyId = keyId(value);
              if (computedKeyId !== key2.id) {
                throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key2.id} but got ${computedKeyId}`);
              }
            });
          }
          if (key2.meta?.keyRequest?.reference) {
            try {
              key2.meta.keyRequest.reference = maybeEncryptedIncomingData(contractID, state, key2.meta.keyRequest.reference, height, additionalKeys, headJSON)?.valueOf();
            } catch {
              delete key2.meta.keyRequest.reference;
            }
          }
          if (key2.meta?.keyRequest?.contractID) {
            try {
              key2.meta.keyRequest.contractID = maybeEncryptedIncomingData(contractID, state, key2.meta.keyRequest.contractID, height, additionalKeys, headJSON)?.valueOf();
            } catch {
              delete key2.meta.keyRequest.contractID;
            }
          }
        });
      });
    }
    if (op === GIMessage.OP_CONTRACT) {
      message.keys = message.keys?.map((key, eKeyId) => {
        return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, (key2) => {
          if (!key2.meta?.private?.content)
            return;
          const decryptionFn = message.foreignContractID ? encryptedIncomingForeignData : encryptedIncomingData;
          const decryptionContract = message.foreignContractID ? message.foreignContractID : contractID;
          key2.meta.private.content = decryptionFn(decryptionContract, state, key2.meta.private.content, height, additionalKeys, headJSON, (value) => {
            const computedKeyId = keyId(value);
            if (computedKeyId !== key2.id) {
              throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key2.id} but got ${computedKeyId}`);
            }
          });
        });
      });
    }
    if (op === GIMessage.OP_KEY_SHARE) {
      return maybeEncryptedIncomingData(contractID, state, message, height, additionalKeys, headJSON, (message2) => {
        message2.keys?.forEach((key) => {
          if (!key.meta?.private?.content)
            return;
          const decryptionFn = message2.foreignContractID ? encryptedIncomingForeignData : encryptedIncomingData;
          const decryptionContract = message2.foreignContractID || contractID;
          key.meta.private.content = decryptionFn(decryptionContract, state, key.meta.private.content, height, additionalKeys, headJSON, (value) => {
            const computedKeyId = keyId(value);
            if (computedKeyId !== key.id) {
              throw new Error(`Key ID mismatch. Expected to decrypt key ID ${key.id} but got ${computedKeyId}`);
            }
          });
        });
      });
    }
    if (op === GIMessage.OP_KEY_REQUEST) {
      return maybeEncryptedIncomingData(contractID, state, message, height, additionalKeys, headJSON, (msg) => {
        msg.replyWith = signedIncomingData(msg.contractID, void 0, msg.replyWith, msg.height, headJSON);
      });
    }
    if (op === GIMessage.OP_ACTION_UNENCRYPTED && isRawSignedData(message)) {
      return signedIncomingData(contractID, state, message, height, headJSON);
    }
    if (op === GIMessage.OP_ACTION_ENCRYPTED) {
      return message;
    }
    if (op === GIMessage.OP_KEY_DEL) {
      return message.map((key) => {
        return maybeEncryptedIncomingData(contractID, state, key, height, additionalKeys, headJSON, void 0);
      });
    }
    if (op === GIMessage.OP_KEY_REQUEST_SEEN) {
      return maybeEncryptedIncomingData(contractID, state, parsedMessage, height, additionalKeys, headJSON, void 0);
    }
    if (op === GIMessage.OP_ATOMIC) {
      return message.map(([opT, opV]) => [
        opT,
        decryptedAndVerifiedDeserializedMessage({ ...head, op: opT }, headJSON, contractID, opV, additionalKeys, state)
      ]);
    }
    return message;
  };
  var _GIMessage = class {
    _mapping;
    _head;
    _message;
    _signedMessageData;
    _direction;
    _decryptedValue;
    static createV1_0({
      contractID,
      originatingContractID,
      originatingContractHeight,
      previousHEAD = null,
      height = 0,
      op,
      manifest
    }) {
      const head = {
        version: "1.0.0",
        previousHEAD,
        height,
        contractID,
        originatingContractID,
        originatingContractHeight,
        op: op[0],
        manifest
      };
      return new this(messageToParams(head, op[1]));
    }
    static cloneWith(targetHead, targetOp, sources) {
      const head = Object.assign({}, targetHead, sources);
      return new this(messageToParams(head, targetOp[1]));
    }
    static deserialize(value, additionalKeys, state) {
      if (!value)
        throw new Error(`deserialize bad value: ${value}`);
      const { head: headJSON, ...parsedValue } = JSON.parse(value);
      const head = JSON.parse(headJSON);
      const contractID = head.op === _GIMessage.OP_CONTRACT ? createCID(value) : head.contractID;
      if (!state?._vm?.authorizedKeys && head.op === _GIMessage.OP_CONTRACT) {
        const value2 = rawSignedIncomingData(parsedValue);
        const authorizedKeys = Object.fromEntries(value2.valueOf()?.keys.map((k) => [k.id, k]));
        state = {
          _vm: {
            authorizedKeys
          }
        };
      }
      const signedMessageData = signedIncomingData(contractID, state, parsedValue, head.height, headJSON, (message) => decryptedAndVerifiedDeserializedMessage(head, headJSON, contractID, message, additionalKeys, state));
      return new this({
        direction: "incoming",
        mapping: { key: createCID(value), value },
        head,
        signedMessageData
      });
    }
    static deserializeHEAD(value) {
      if (!value)
        throw new Error(`deserialize bad value: ${value}`);
      let head, hash2;
      const result = {
        get head() {
          if (head === void 0) {
            head = JSON.parse(JSON.parse(value).head);
          }
          return head;
        },
        get hash() {
          if (!hash2) {
            hash2 = createCID(value);
          }
          return hash2;
        },
        get contractID() {
          return result.head?.contractID ?? result.hash;
        },
        description() {
          const type = this.head.op;
          return `<op_${type}|${this.hash} of ${this.contractID}>`;
        },
        get isFirstMessage() {
          return !result.head?.contractID;
        }
      };
      return result;
    }
    constructor(params) {
      this._direction = params.direction;
      this._mapping = params.mapping;
      this._head = params.head;
      this._signedMessageData = params.signedMessageData;
      const type = this.opType();
      let atomicTopLevel = true;
      const validate = (type2, message) => {
        switch (type2) {
          case _GIMessage.OP_CONTRACT:
            if (!this.isFirstMessage() || !atomicTopLevel)
              throw new Error("OP_CONTRACT: must be first message");
            break;
          case _GIMessage.OP_ATOMIC:
            if (!atomicTopLevel) {
              throw new Error("OP_ATOMIC not allowed inside of OP_ATOMIC");
            }
            if (!Array.isArray(message)) {
              throw new TypeError("OP_ATOMIC must be of an array type");
            }
            atomicTopLevel = false;
            message.forEach(([t, m]) => validate(t, m));
            break;
          case _GIMessage.OP_KEY_ADD:
          case _GIMessage.OP_KEY_DEL:
          case _GIMessage.OP_KEY_UPDATE:
            if (!Array.isArray(message))
              throw new TypeError("OP_KEY_{ADD|DEL|UPDATE} must be of an array type");
            break;
          case _GIMessage.OP_KEY_SHARE:
          case _GIMessage.OP_KEY_REQUEST:
          case _GIMessage.OP_KEY_REQUEST_SEEN:
          case _GIMessage.OP_ACTION_ENCRYPTED:
          case _GIMessage.OP_ACTION_UNENCRYPTED:
            break;
          default:
            throw new Error(`unsupported op: ${type2}`);
        }
      };
      Object.defineProperty(this, "_message", {
        get: ((validated) => () => {
          const message = this._signedMessageData.valueOf();
          if (!validated) {
            validate(type, message);
            validated = true;
          }
          return message;
        })()
      });
    }
    decryptedValue() {
      if (this._decryptedValue)
        return this._decryptedValue;
      try {
        const value = this.message();
        const data = unwrapMaybeEncryptedData(value);
        if (data?.data) {
          if (isSignedData(data.data)) {
            this._decryptedValue = data.data.valueOf();
          } else {
            this._decryptedValue = data.data;
          }
        }
        return this._decryptedValue;
      } catch {
        return void 0;
      }
    }
    head() {
      return this._head;
    }
    message() {
      return this._message;
    }
    op() {
      return [this.head().op, this.message()];
    }
    rawOp() {
      return [this.head().op, this._signedMessageData];
    }
    opType() {
      return this.head().op;
    }
    opValue() {
      return this.message();
    }
    signingKeyId() {
      return this._signedMessageData.signingKeyId;
    }
    manifest() {
      return this.head().manifest;
    }
    description() {
      const type = this.opType();
      let desc = `<op_${type}`;
      if (type === _GIMessage.OP_ACTION_UNENCRYPTED) {
        const value = this.opValue();
        if (typeof value.type === "string") {
          desc += `|${value.type}`;
        }
      }
      return `${desc}|${this.hash()} of ${this.contractID()}>`;
    }
    isFirstMessage() {
      return !this.head().contractID;
    }
    contractID() {
      return this.head().contractID || this.hash();
    }
    originatingContractID() {
      return this.head().originatingContractID || this.contractID();
    }
    serialize() {
      return this._mapping.value;
    }
    hash() {
      return this._mapping.key;
    }
    height() {
      return this._head.height;
    }
    id() {
      throw new Error("GIMessage.id() was called but it has been removed");
    }
    direction() {
      return this._direction;
    }
    static get [serdesTagSymbol]() {
      return "GIMessage";
    }
    static [serdesSerializeSymbol](m) {
      return [m.serialize(), m.direction(), m.decryptedValue()];
    }
    static [serdesDeserializeSymbol]([serialized, direction, decryptedValue]) {
      const m = _GIMessage.deserialize(serialized);
      m._direction = direction;
      m._decryptedValue = decryptedValue;
      return m;
    }
  };
  var GIMessage = _GIMessage;
  __publicField(GIMessage, "OP_CONTRACT", "c");
  __publicField(GIMessage, "OP_ACTION_ENCRYPTED", "ae");
  __publicField(GIMessage, "OP_ACTION_UNENCRYPTED", "au");
  __publicField(GIMessage, "OP_KEY_ADD", "ka");
  __publicField(GIMessage, "OP_KEY_DEL", "kd");
  __publicField(GIMessage, "OP_KEY_UPDATE", "ku");
  __publicField(GIMessage, "OP_PROTOCOL_UPGRADE", "pu");
  __publicField(GIMessage, "OP_PROP_SET", "ps");
  __publicField(GIMessage, "OP_PROP_DEL", "pd");
  __publicField(GIMessage, "OP_CONTRACT_AUTH", "ca");
  __publicField(GIMessage, "OP_CONTRACT_DEAUTH", "cd");
  __publicField(GIMessage, "OP_ATOMIC", "a");
  __publicField(GIMessage, "OP_KEY_SHARE", "ks");
  __publicField(GIMessage, "OP_KEY_REQUEST", "kr");
  __publicField(GIMessage, "OP_KEY_REQUEST_SEEN", "krs");
  function messageToParams(head, message) {
    let mapping;
    return {
      direction: has2(message, "recreate") ? "outgoing" : "incoming",
      get mapping() {
        if (!mapping) {
          const headJSON = JSON.stringify(head);
          const messageJSON = { ...message.serialize(headJSON), head: headJSON };
          const value = JSON.stringify(messageJSON);
          mapping = {
            key: createCID(value),
            value
          };
        }
        return mapping;
      },
      head,
      signedMessageData: message
    };
  }

  // shared/domains/chelonia/Secret.js
  var Secret = class {
    _content;
    static [serdesDeserializeSymbol](secret) {
      return new this(secret);
    }
    static [serdesSerializeSymbol](secret) {
      return secret._content;
    }
    static get [serdesTagSymbol]() {
      return "__chelonia_Secret";
    }
    constructor(value) {
      this._content = value;
    }
    valueOf() {
      return this._content;
    }
  };

  // shared/domains/chelonia/constants.js
  var INVITE_STATUS = {
    REVOKED: "revoked",
    VALID: "valid",
    USED: "used"
  };

  // shared/domains/chelonia/utils.js
  var MAX_EVENTS_AFTER = Number.parseInt("", 10) || Infinity;
  var findKeyIdByName = (state, name) => state._vm?.authorizedKeys && Object.values(state._vm.authorizedKeys).find((k) => k.name === name && k._notAfterHeight == null)?.id;
  var findForeignKeysByContractID = (state, contractID) => state._vm?.authorizedKeys && Object.values(state._vm.authorizedKeys).filter((k) => k._notAfterHeight == null && k.foreignKey?.includes(contractID)).map((k) => k.id);

  // frontend/model/contracts/shared/constants.js
  var MAX_HASH_LEN = 300;
  var MAX_MEMO_LEN = 4096;
  var INVITE_INITIAL_CREATOR = "invite-initial-creator";
  var PROFILE_STATUS = {
    ACTIVE: "active",
    PENDING: "pending",
    REMOVED: "removed"
  };
  var GROUP_NAME_MAX_CHAR = 50;
  var GROUP_DESCRIPTION_MAX_CHAR = 500;
  var GROUP_PAYMENT_METHOD_MAX_CHAR = 250;
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
    ON_BOARDING: 30,
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
    MULTIPLE_CHOICES: "multiple-votes"
  };

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
  var import_sbp5 = __toESM(__require("@sbp/sbp"));

  // frontend/model/contracts/shared/time.js
  var MINS_MILLIS = 6e4;
  var HOURS_MILLIS = 60 * MINS_MILLIS;
  var DAYS_MILLIS = 24 * HOURS_MILLIS;
  var MONTHS_MILLIS = 30 * DAYS_MILLIS;
  var plusOnePeriodLength = (timestamp, periodLength) => dateToPeriodStamp(addTimeToDate(timestamp, periodLength));
  var minusOnePeriodLength = (timestamp, periodLength) => dateToPeriodStamp(addTimeToDate(timestamp, -periodLength));
  function periodStampsForDate(date, { knownSortedStamps, periodLength, guess }) {
    if (!(isIsoString(date) || Object.prototype.toString.call(date) === "[object Date]")) {
      throw new TypeError("must be ISO string or Date object");
    }
    const timestamp = typeof date === "string" ? date : date.toISOString();
    let previous, current, next2;
    if (knownSortedStamps.length) {
      const latest = knownSortedStamps[knownSortedStamps.length - 1];
      const earliest = knownSortedStamps[0];
      if (timestamp >= latest) {
        current = periodStampGivenDate({ recentDate: timestamp, periodStart: latest, periodLength });
        next2 = plusOnePeriodLength(current, periodLength);
        previous = current > latest ? minusOnePeriodLength(current, periodLength) : knownSortedStamps[knownSortedStamps.length - 2];
      } else if (guess && timestamp < earliest) {
        current = periodStampGivenDate({ recentDate: timestamp, periodStart: earliest, periodLength });
        next2 = plusOnePeriodLength(current, periodLength);
        previous = minusOnePeriodLength(current, periodLength);
      } else {
        for (let i = knownSortedStamps.length - 2; i >= 0; i--) {
          if (timestamp >= knownSortedStamps[i]) {
            current = knownSortedStamps[i];
            next2 = knownSortedStamps[i + 1];
            previous = i > 0 ? knownSortedStamps[i - 1] : guess ? minusOnePeriodLength(current, periodLength) : void 0;
            break;
          }
        }
      }
    }
    return { previous, current, next: next2 };
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
        if (!Array.isArray(childContractIDs))
          childContractIDs = [childContractIDs];
        if (op !== "retain" && op !== "release")
          throw new Error("Invalid operation");
        for (const childContractID of childContractIDs) {
          const key = `${selector}-${parentContractID}-${childContractID}`;
          const count = (0, import_sbp5.default)("okTurtles.data/get", key);
          (0, import_sbp5.default)("okTurtles.data/set", key, (count || 0) + delta[op]);
          if (count != null)
            return;
          (0, import_sbp5.default)("chelonia/queueInvocation", parentContractID, () => {
            const count2 = (0, import_sbp5.default)("okTurtles.data/get", key);
            (0, import_sbp5.default)("okTurtles.data/delete", key);
            if (count2 && count2 !== Math.sign(count2)) {
              console.warn(`[${selector}] Unexpected value`, parentContractID, childContractID, count2);
              if ("") {
                Promise.reject(new Error(`[${selector}] Unexpected value ${parentContractID} ${childContractID}: ${count2}`));
              }
            }
            switch (Math.sign(count2)) {
              case -1:
                (0, import_sbp5.default)("chelonia/contract/release", childContractID).catch((e) => {
                  console.error(`[${selector}] Error calling release`, parentContractID, childContractID, e);
                });
                break;
              case 1:
                (0, import_sbp5.default)("chelonia/contract/retain", childContractID).catch((e) => console.error(`[${selector}] Error calling retain`, parentContractID, childContractID, e));
                break;
            }
          }).catch((e) => {
            console.error(`[${selector}] Error in queued invocation`, parentContractID, childContractID, e);
          });
        }
      }
    };
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
    groupSettings(state, getters) {
      return getters.currentGroupState.settings || {};
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
    groupProfile(state, getters) {
      return (member) => {
        const profiles = getters.currentGroupState.profiles;
        return profiles && profiles[member] && {
          ...profiles[member],
          get lastLoggedIn() {
            return getters.currentGroupLastLoggedIn[member] || this.joinedDate;
          }
        };
      };
    },
    groupProfiles(state, getters) {
      const profiles = {};
      for (const member in getters.currentGroupState.profiles || {}) {
        const profile = getters.groupProfile(member);
        if (profile.status === PROFILE_STATUS.ACTIVE) {
          profiles[member] = profile;
        }
      }
      return profiles;
    },
    groupCreatedDate(state, getters) {
      return getters.groupProfile(getters.currentGroupOwnerID).joinedDate;
    },
    groupMincomeAmount(state, getters) {
      return getters.groupSettings.mincomeAmount;
    },
    groupMincomeCurrency(state, getters) {
      return getters.groupSettings.mincomeCurrency;
    },
    groupSortedPeriodKeys(state, getters) {
      const { distributionDate, distributionPeriodLength } = getters.groupSettings;
      if (!distributionDate)
        return [];
      const keys = Object.keys(getters.groupPeriodPayments).sort();
      if (!keys.length && MAX_SAVED_PERIODS > 0) {
        keys.push(dateToPeriodStamp(addTimeToDate(distributionDate, -distributionPeriodLength)));
      }
      if (keys[keys.length - 1] !== distributionDate) {
        keys.push(distributionDate);
      }
      return keys;
    },
    periodStampGivenDate(state, getters) {
      return (date, periods) => {
        return periodStampsForDate(date, {
          knownSortedStamps: periods || getters.groupSortedPeriodKeys,
          periodLength: getters.groupSettings.distributionPeriodLength
        }).current;
      };
    },
    periodBeforePeriod(state, getters) {
      return (periodStamp, periods) => {
        return periodStampsForDate(periodStamp, {
          knownSortedStamps: periods || getters.groupSortedPeriodKeys,
          periodLength: getters.groupSettings.distributionPeriodLength
        }).previous;
      };
    },
    periodAfterPeriod(state, getters) {
      return (periodStamp, periods) => {
        return periodStampsForDate(periodStamp, {
          knownSortedStamps: periods || getters.groupSortedPeriodKeys,
          periodLength: getters.groupSettings.distributionPeriodLength
        }).next;
      };
    },
    dueDateForPeriod(state, getters) {
      return (periodStamp, periods) => {
        return getters.periodAfterPeriod(periodStamp, periods);
      };
    },
    paymentHashesForPeriod(state, getters) {
      return (periodStamp) => {
        const periodPayments = getters.groupPeriodPayments[periodStamp];
        if (periodPayments) {
          return paymentHashesFromPaymentPeriod(periodPayments);
        }
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
    groupPeriodPayments(state, getters) {
      return getters.currentGroupState.paymentsByPeriod || {};
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
    haveNeedsForThisPeriod(state, getters) {
      return (currentPeriod) => {
        const groupProfiles = getters.groupProfiles;
        const haveNeeds = [];
        for (const memberID in groupProfiles) {
          const { incomeDetailsType, joinedDate } = groupProfiles[memberID];
          if (incomeDetailsType) {
            const amount = groupProfiles[memberID][incomeDetailsType];
            const haveNeed = incomeDetailsType === "incomeAmount" ? amount - getters.groupMincomeAmount : amount;
            let when = dateFromPeriodStamp(currentPeriod).toISOString();
            if (dateIsWithinPeriod({
              date: joinedDate,
              periodStart: currentPeriod,
              periodLength: getters.groupSettings.distributionPeriodLength
            })) {
              when = joinedDate;
            }
            haveNeeds.push({ memberID, haveNeed, when });
          }
        }
        return haveNeeds;
      };
    },
    paymentsForPeriod(state, getters) {
      return (periodStamp) => {
        const hashes = getters.paymentHashesForPeriod(periodStamp);
        const events2 = [];
        if (hashes && hashes.length > 0) {
          const payments = getters.currentGroupState.payments;
          for (const paymentHash of hashes) {
            const payment = payments[paymentHash];
            if (payment.data.status === PAYMENT_COMPLETED) {
              events2.push(createPaymentInfo(paymentHash, payment));
            }
          }
        }
        return events2;
      };
    }
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
    creatorID: optional(string),
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
    }),
    attachments: arrayOf(objectOf({
      name: string,
      mimeType: string,
      dimension: optional(objectOf({
        width: number,
        height: number
      })),
      downloadData: objectOf({
        manifestCid: string,
        downloadParams: optional(object)
      })
    })),
    replyingMessage: objectOf({
      hash: string,
      text: string
    }),
    pollData: objectOf({
      question: string,
      options: arrayOf(objectOf({ id: string, value: string })),
      expires_date_ms: number,
      hideVoters: boolean,
      pollType: unionOf(...Object.values(POLL_TYPES).map((v) => literalOf(v)))
    }),
    onlyVisibleTo: arrayOf(string)
  });

  // frontend/model/contracts/shared/voting/proposals.js
  var import_sbp6 = __toESM(__require("@sbp/sbp"));

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
    vue_esm_default.delete(state.proposals, proposalHash);
    (0, import_sbp6.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/makeNotificationWhenProposalClosed", state, contractID, meta, height, proposal]);
    (0, import_sbp6.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/archiveProposal", contractID, proposalHash, proposal]);
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
    (0, import_sbp6.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_AGAINST, data);
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
        await (0, import_sbp6.default)("gi.contracts/group/invite/process", forMessage, state);
        (0, import_sbp6.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
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
        await (0, import_sbp6.default)("gi.contracts/group/removeMember/process", forMessage, state);
        (0, import_sbp6.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/removeMember/sideEffect", forMessage]);
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
        await (0, import_sbp6.default)("gi.contracts/group/updateSettings/process", forMessage, state);
        (0, import_sbp6.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/updateSettings/sideEffect", forMessage]);
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
        await (0, import_sbp6.default)("gi.contracts/group/updateAllVotingRules/process", forMessage, state);
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
        (0, import_sbp6.default)("okTurtles.events/emit", PROPOSAL_RESULT, state, VOTE_FOR, data);
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
      initialCurrency: getters.groupMincomeCurrency,
      mincomeExchangeRate: 1,
      paymentsFrom: {},
      lastAdjustedDistribution: null,
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
    (0, import_sbp7.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/archivePayments", contractID, archivingPayments]);
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
      fullMonthlySupport: 0,
      onTimePayments: {},
      missedPayments: {},
      noVotes: {}
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
    if (!state._volatile)
      state["_volatile"] = /* @__PURE__ */ Object.create(null);
    if (!state._volatile.pendingKeyRevocations)
      state._volatile["pendingKeyRevocations"] = /* @__PURE__ */ Object.create(null);
    const CSKid = findKeyIdByName(state, "csk");
    const CEKid = findKeyIdByName(state, "cek");
    state._volatile.pendingKeyRevocations[CSKid] = true;
    state._volatile.pendingKeyRevocations[CEKid] = true;
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
    if (streaks.lastStreakPeriod === cPeriod)
      return;
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
    const totalContributionGoal = thisPeriodHaveNeeds.reduce((total, item) => item.haveNeed < 0 ? total + -1 * item.haveNeed : total, 0);
    const totalPledgesDone = thisPeriodPaymentDetails.reduce((total, paymentItem) => paymentItem.amount + total, 0);
    const fullMonthlySupportCurrent = fetchInitKV(streaks, "fullMonthlySupport", 0);
    streaks["fullMonthlySupport"] = totalPledgesDone > 0 && totalPledgesDone >= totalContributionGoal ? fullMonthlySupportCurrent + 1 : 0;
    for (const memberID in getters.groupProfiles) {
      if (!isPledgingMember(memberID))
        continue;
      const myMissedPaymentsInThisPeriod = filterMyItems(thisPeriodDistribution, memberID);
      const userCurrentStreak = fetchInitKV(streaks.onTimePayments, memberID, 0);
      streaks.onTimePayments[memberID] = noPaymentsAtAll ? 0 : myMissedPaymentsInThisPeriod.length === 0 && filterMyItems(thisPeriodPaymentDetails, memberID).every((p) => p.isLate === false) ? userCurrentStreak + 1 : 0;
      const myMissedPaymentsStreak = fetchInitKV(streaks.missedPayments, memberID, 0);
      streaks.missedPayments[memberID] = noPaymentsAtAll ? myMissedPaymentsStreak + 1 : myMissedPaymentsInThisPeriod.length >= 1 ? myMissedPaymentsStreak + 1 : 0;
    }
  }
  var removeGroupChatroomProfile = (state, chatRoomID, memberID, ourselvesLeaving) => {
    if (!state.chatRooms[chatRoomID].members[memberID])
      return;
    state.chatRooms[chatRoomID].members[memberID].status = PROFILE_STATUS.REMOVED;
  };
  var leaveChatRoomAction = async (groupID, state, chatRoomID, memberID, actorID, leavingGroup) => {
    const sendingData = leavingGroup || actorID !== memberID ? { memberID } : {};
    if (state?.chatRooms?.[chatRoomID]?.members?.[memberID]?.status !== PROFILE_STATUS.REMOVED) {
      return;
    }
    const extraParams = {};
    if (leavingGroup) {
      const encryptionKeyId = await (0, import_sbp7.default)("chelonia/contract/currentKeyIdByName", state, "cek", true);
      const signingKeyId = await (0, import_sbp7.default)("chelonia/contract/currentKeyIdByName", state, "csk", true);
      if (!signingKeyId) {
        return;
      }
      extraParams.encryptionKeyId = encryptionKeyId;
      extraParams.signingKeyId = signingKeyId;
      extraParams.innerSigningContractID = null;
    }
    (0, import_sbp7.default)("gi.actions/chatroom/leave", {
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
    return Promise.all(Object.keys(chatRooms).filter((cID) => chatRooms[cID].members?.[memberID]?.status === PROFILE_STATUS.REMOVED).map((chatRoomID) => leaveChatRoomAction(groupID, state, chatRoomID, memberID, actorID, true)));
  };
  var actionRequireActiveMember = (next2) => (data, props2) => {
    const innerSigningContractID = props2.message.innerSigningContractID;
    if (!innerSigningContractID || innerSigningContractID === props2.contractID) {
      throw new Error("Missing inner signature");
    }
    return next2(data, props2);
  };
  var GIGroupAlreadyJoinedError = ChelErrorGenerator("GIGroupAlreadyJoinedError");
  var GIGroupNotJoinedError = ChelErrorGenerator("GIGroupNotJoinedError");
  (0, import_sbp7.default)("chelonia/defineContract", {
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
    getters: {
      currentGroupState(state) {
        return state;
      },
      currentGroupLastLoggedIn() {
        return {};
      },
      ...group_default
    },
    actions: {
      "gi.contracts/group": {
        validate: objectMaybeOf({
          settings: objectMaybeOf({
            groupName: stringMax(GROUP_NAME_MAX_CHAR, "groupName"),
            groupPicture: unionOf(string, objectOf({
              manifestCid: stringMax(MAX_HASH_LEN, "manifestCid"),
              downloadParams: optional(object)
            })),
            sharedValues: stringMax(GROUP_DESCRIPTION_MAX_CHAR, "sharedValues"),
            mincomeAmount: numberRange(1, GROUP_MINCOME_MAX),
            mincomeCurrency: stringMax(GROUP_CURRENCY_MAX_CHAR, "mincomeCurrency"),
            distributionDate: isPeriodStamp,
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
            invites: {},
            proposals: {},
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
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, async () => {
              const state2 = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
              if (!state2 || state2.generalChatRoomId)
                return;
              const CSKid = findKeyIdByName(state2, "csk");
              const CEKid = findKeyIdByName(state2, "cek");
              (0, import_sbp7.default)("gi.actions/group/addChatRoom", {
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
          toMemberID: stringMax(MAX_HASH_LEN, "toMemberID"),
          amount: numberRange(0, GROUP_MINCOME_MAX),
          currencyFromTo: tupleOf(string, string),
          exchangeRate: numberRange(0, GROUP_MINCOME_MAX),
          txid: stringMax(MAX_HASH_LEN, "txid"),
          status: paymentStatusType,
          paymentType,
          details: optional(object),
          memo: optional(stringMax(MAX_MEMO_LEN, "memo"))
        })),
        process({ data, meta, hash: hash2, contractID, height, innerSigningContractID }, { state, getters }) {
          if (data.status === PAYMENT_COMPLETED) {
            console.error(`payment: payment ${hash2} cannot have status = 'completed'!`, { data, meta, hash: hash2 });
            throw new errors_exports.GIErrorIgnoreAndBan("payments cannot be instantly completed!");
          }
          state.payments[hash2] = {
            data: {
              ...data,
              fromMemberID: innerSigningContractID,
              groupMincome: getters.groupMincomeAmount
            },
            height,
            meta,
            history: [[meta.createdDate, hash2]]
          };
          const { paymentsFrom } = initFetchPeriodPayments({ contractID, meta, state, getters });
          const fromMemberID = fetchInitKV(paymentsFrom, innerSigningContractID, {});
          const toMemberID = fetchInitKV(fromMemberID, data.toMemberID, []);
          toMemberID.push(hash2);
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
        process({ data, meta, hash: hash2, contractID, innerSigningContractID }, { state, getters }) {
          const payment = state.payments[data.paymentHash];
          if (!payment) {
            console.error(`paymentUpdate: no payment ${data.paymentHash}`, { data, meta, hash: hash2 });
            throw new errors_exports.GIErrorIgnoreAndBan("paymentUpdate without existing payment");
          }
          if (innerSigningContractID !== payment.data.fromMemberID && innerSigningContractID !== payment.data.toMemberID) {
            console.error(`paymentUpdate: bad member ${innerSigningContractID} != ${payment.data.fromMemberID} != ${payment.data.toMemberID}`, { data, meta, hash: hash2 });
            throw new errors_exports.GIErrorIgnoreAndBan("paymentUpdate from bad user!");
          }
          payment.history.push([meta.createdDate, hash2]);
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
            const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
            const payment = state.payments[data.paymentHash];
            if (loggedIn.identityContractID === payment.data.toMemberID) {
              const myProfile = getters.groupProfile(loggedIn.identityContractID);
              if (isActionNewerThanUserJoinedDate(height, myProfile)) {
                (0, import_sbp7.default)("gi.notifications/emit", "PAYMENT_RECEIVED", {
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
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
          if (data.toMemberID === loggedIn.identityContractID) {
            const myProfile = getters.groupProfile(loggedIn.identityContractID);
            if (isActionNewerThanUserJoinedDate(height, myProfile)) {
              (0, import_sbp7.default)("gi.notifications/emit", "PAYMENT_THANKYOU_SENT", {
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
            votingRule: ruleType,
            expires_date_ms: numberRange(0, Number.MAX_SAFE_INTEGER)
          })(data);
          const dataToCompare = omit(data.proposalData, ["reason"]);
          for (const hash2 in state.proposals) {
            const prop = state.proposals[hash2];
            if (prop.status !== STATUS_OPEN || prop.data.proposalType !== data.proposalType) {
              continue;
            }
            if (deepEqualJSONType(omit(prop.data.proposalData, ["reason"]), dataToCompare)) {
              throw new TypeError(L("There is an identical open proposal."));
            }
          }
        }),
        process({ data, meta, hash: hash2, height, innerSigningContractID }, { state }) {
          state.proposals[hash2] = {
            data,
            meta,
            height,
            creatorID: innerSigningContractID,
            votes: { [innerSigningContractID]: VOTE_FOR },
            status: STATUS_OPEN,
            notifiedBeforeExpire: false,
            payload: null
          };
        },
        sideEffect({ contractID, meta, data, height, innerSigningContractID }, { getters }) {
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
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
            (0, import_sbp7.default)("gi.notifications/emit", "NEW_PROPOSAL", {
              createdDate: meta.createdDate,
              groupID: contractID,
              creatorID: innerSigningContractID,
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
        })),
        async process(message, { state, getters }) {
          const { data, hash: hash2, meta, innerSigningContractID } = message;
          const proposal = state.proposals[data.proposalHash];
          if (!proposal) {
            console.error(`proposalVote: no proposal for ${data.proposalHash}!`, { data, meta, hash: hash2 });
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
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
          const myProfile = getters.groupProfile(loggedIn.identityContractID);
          if (isActionNewerThanUserJoinedDate(height, myProfile)) {
            for (const proposalId of data.proposalIds) {
              const proposal = state.proposals[proposalId];
              (0, import_sbp7.default)("gi.notifications/emit", "PROPOSAL_EXPIRING", {
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
          const identityContractID = (0, import_sbp7.default)("state/vuex/state").loggedIn?.identityContractID;
          if (memberID === identityContractID) {
            const ourChatrooms = Object.entries(state?.chatRooms || {}).filter(([, state2]) => state2.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID);
            if (ourChatrooms.length) {
              (0, import_sbp7.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/referenceTally", contractID, ourChatrooms, "release"]);
            }
          }
          memberLeaves({ memberID, dateLeft: meta.createdDate, heightLeft: height, ourselvesLeaving: memberID === identityContractID }, { contractID, meta, state, getters });
        },
        sideEffect({ data, meta, contractID, height, innerSigningContractID, proposalHash }, { state, getters }) {
          const memberID = data.memberID || innerSigningContractID;
          (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, memberID, "release");
          (0, import_sbp7.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp7.default)("gi.contracts/group/leaveGroup", {
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
        sideEffect({ meta, contractID, height, innerSigningContractID }) {
          const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
          (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, innerSigningContractID, "retain");
          (0, import_sbp7.default)("chelonia/queueInvocation", contractID, async () => {
            const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
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
              await (0, import_sbp7.default)("gi.actions/identity/addJoinDirectMessageKey", userID, contractID, "csk");
              const generalChatRoomId = state.generalChatRoomId;
              if (generalChatRoomId) {
                if (state.chatRooms[generalChatRoomId]?.members?.[userID]?.status !== PROFILE_STATUS.ACTIVE) {
                  (0, import_sbp7.default)("gi.actions/group/joinChatRoom", {
                    contractID,
                    data: { chatRoomID: generalChatRoomId }
                  }).catch((e) => {
                    if (e?.name === "GIErrorUIRuntimeError" && e.cause?.name === "GIGroupAlreadyJoinedError")
                      return;
                    console.error("Error while joining the #General chatroom", e);
                    const errMsg = L("Couldn't join the #{chatroomName} in the group. An error occurred: {error}", { chatroomName: CHATROOM_GENERAL_NAME, error: e?.message || e });
                    const promptOptions = {
                      heading: L("Error while joining a chatroom"),
                      question: errMsg,
                      primaryButton: L("Close")
                    };
                    (0, import_sbp7.default)("gi.ui/prompt", promptOptions);
                  });
                }
              } else {
                (async () => {
                  alert(L("Couldn't join the #{chatroomName} in the group. Doesn't exist.", { chatroomName: CHATROOM_GENERAL_NAME }));
                })();
              }
              (0, import_sbp7.default)("okTurtles.events/emit", JOINED_GROUP, { identityContractID: userID, groupContractID: contractID });
            } else if (isActionNewerThanUserJoinedDate(height, state?.profiles?.[userID])) {
              (0, import_sbp7.default)("gi.notifications/emit", "MEMBER_ADDED", {
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
        validate: actionRequireActiveMember((data, { getters, meta, message: { innerSigningContractID } }) => {
          objectMaybeOf({
            groupName: stringMax(GROUP_NAME_MAX_CHAR, "groupName"),
            groupPicture: (x) => typeof x === "string",
            sharedValues: stringMax(GROUP_DESCRIPTION_MAX_CHAR, "sharedValues"),
            mincomeAmount: (x) => typeof x === "number" && x > 0,
            mincomeCurrency: stringMax(GROUP_CURRENCY_MAX_CHAR, "mincomeCurrency"),
            distributionDate: (x) => typeof x === "string",
            allowPublicChannels: (x) => typeof x === "boolean"
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
            (0, import_sbp7.default)("gi.contracts/group/pushSideEffect", contractID, [
              "gi.contracts/group/sendMincomeChangedNotification",
              contractID,
              meta,
              {
                toAmount: data.mincomeAmount,
                fromAmount: mincomeCache
              },
              height,
              innerSigningContractID
            ]);
          }
        }
      },
      "gi.contracts/group/groupProfileUpdate": {
        validate: actionRequireActiveMember(objectMaybeOf({
          incomeDetailsType: (x) => ["incomeAmount", "pledgeAmount"].includes(x),
          incomeAmount: (x) => typeof x === "number" && x >= 0,
          pledgeAmount: numberRange(0, GROUP_MAX_PLEDGE_AMOUNT, "pledgeAmount"),
          nonMonetaryAdd: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "nonMonetaryAdd"),
          nonMonetaryEdit: objectOf({
            replace: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "replace"),
            with: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "with")
          }),
          nonMonetaryRemove: stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR, "nonMonetaryRemove"),
          nonMonetaryReplace: arrayOf(stringMax(GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR)),
          paymentMethods: arrayOf(objectOf({
            name: stringMax(GROUP_NAME_MAX_CHAR),
            value: stringMax(GROUP_PAYMENT_METHOD_MAX_CHAR, "paymentMethods.value")
          }))
        })),
        process({ data, meta, contractID, innerSigningContractID }, { state, getters }) {
          const groupProfile = state.profiles[innerSigningContractID];
          const nonMonetary = groupProfile.nonMonetaryContributions;
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
          if (data.incomeDetailsType) {
            groupProfile["incomeDetailsLastUpdatedDate"] = meta.createdDate;
            updateCurrentDistribution({ contractID, meta, state, getters });
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
          if (Object.keys(state.chatRooms).length === 1) {
            (0, import_sbp7.default)("state/vuex/commit", "setCurrentChatRoomId", {
              groupID: contractID,
              chatRoomID: state.generalChatRoomId
            });
          }
          if (data.chatRoomID === state.generalChatRoomId) {
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, () => {
              const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
              if (state.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE && state.chatRooms?.[contractID]?.members[identityContractID]?.status !== PROFILE_STATUS.ACTIVE) {
                (0, import_sbp7.default)("gi.actions/group/joinChatRoom", {
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
          const identityContractID = (0, import_sbp7.default)("state/vuex/state").loggedIn?.identityContractID;
          if (identityContractID && state?.chatRooms[data.chatRoomID]?.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE) {
            (0, import_sbp7.default)("gi.contracts/group/pushSideEffect", contractID, ["gi.contracts/group/referenceTally", contractID, data.chatRoomID, "release"]);
          }
          delete state.chatRooms[data.chatRoomID];
        },
        sideEffect({ data, contractID, innerSigningContractID }) {
          (0, import_sbp7.default)("okTurtles.events/emit", DELETED_CHATROOM, { groupContractID: contractID, chatRoomID: data.chatRoomID });
          const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
          if (identityContractID === innerSigningContractID) {
            (0, import_sbp7.default)("gi.actions/chatroom/delete", { contractID: data.chatRoomID, data: {} }).catch((e) => {
              console.log(`Error sending chatroom removal action for ${data.chatRoomID}`, e);
            });
          }
        }
      },
      "gi.contracts/group/leaveChatRoom": {
        validate: actionRequireActiveMember(objectOf({
          chatRoomID: stringMax(MAX_HASH_LEN, "chatRoomID"),
          memberID: optional(stringMax(MAX_HASH_LEN), "memberID"),
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
          const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
          if (innerSigningContractID === identityContractID) {
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, async () => {
              const state2 = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
              if (state2?.profiles?.[innerSigningContractID]?.status === PROFILE_STATUS.ACTIVE && state2.chatRooms?.[data.chatRoomID]?.members[memberID]?.status === PROFILE_STATUS.REMOVED && state2.chatRooms[data.chatRoomID].members[memberID].joinedHeight === data.joinedHeight) {
                await leaveChatRoomAction(contractID, state2, data.chatRoomID, memberID, innerSigningContractID);
              }
            }).catch((e) => {
              console.error(`[gi.contracts/group/leaveChatRoom/sideEffect] Error for ${contractID}`, { contractID, data, error: e });
            });
          }
          if (memberID === identityContractID) {
            (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, data.chatRoomID, "release");
            (0, import_sbp7.default)("okTurtles.events/emit", LEFT_CHATROOM, {
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
          const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
          if (memberID === identityContractID) {
            (0, import_sbp7.default)("gi.contracts/group/referenceTally", contractID, data.chatRoomID, "retain");
          }
          if (innerSigningContractID === identityContractID) {
            (0, import_sbp7.default)("chelonia/queueInvocation", contractID, () => (0, import_sbp7.default)("gi.contracts/group/joinGroupChatrooms", contractID, data.chatRoomID, identityContractID, memberID, height)).catch((e) => {
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
      "gi.contracts/group/upgradeFrom1.0.7": {
        validate: actionRequireActiveMember(optional),
        process({ height }, { state }) {
          let changed = false;
          Object.values(state.chatRooms).forEach((chatroom) => {
            Object.values(chatroom.members).forEach((member) => {
              if (member.status === PROFILE_STATUS.ACTIVE && member.joinedHeight == null) {
                member.joinedHeight = height;
                changed = true;
              }
            });
          });
          if (!changed) {
            throw new Error("[gi.contracts/group/upgradeFrom1.0.7/process] Invalid or duplicate upgrade action");
          }
        }
      },
      ...""
    },
    methods: {
      "gi.contracts/group/_cleanup": ({ contractID, state }) => {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const dependentContractIDs = [
          ...Object.entries(state?.profiles || {}).filter(([, state2]) => state2.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID),
          ...Object.entries(state?.chatRooms || {}).filter(([, state2]) => state2.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE).map(([cID]) => cID)
        ];
        if (dependentContractIDs.length) {
          (0, import_sbp7.default)("chelonia/contract/release", dependentContractIDs).catch((e) => {
            console.error("[gi.contracts/group/_cleanup] Error calling release", contractID, e);
          });
        }
        Promise.all([
          () => (0, import_sbp7.default)("gi.contracts/group/removeArchivedProposals", contractID),
          () => (0, import_sbp7.default)("gi.contracts/group/removeArchivedPayments", contractID)
        ]).catch((e) => {
          console.error(`[gi.contracts/group/_cleanup] Error removing entries for archive for ${contractID}`, e);
        });
      },
      "gi.contracts/group/archiveProposal": async function(contractID, proposalHash, proposal) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const key = `proposals/${identityContractID}/${contractID}`;
        const proposals2 = await (0, import_sbp7.default)("gi.db/archive/load", key) || [];
        if (proposals2.some(([archivedProposalHash]) => archivedProposalHash === proposalHash)) {
          return;
        }
        proposals2.unshift([proposalHash, proposal]);
        while (proposals2.length > MAX_ARCHIVED_PROPOSALS) {
          proposals2.pop();
        }
        await (0, import_sbp7.default)("gi.db/archive/save", key, proposals2);
        (0, import_sbp7.default)("okTurtles.events/emit", PROPOSAL_ARCHIVED, contractID, proposalHash, proposal);
      },
      "gi.contracts/group/archivePayments": async function(contractID, archivingPayments) {
        const { paymentsByPeriod, payments } = archivingPayments;
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`;
        const archPaymentsByPeriod = await (0, import_sbp7.default)("gi.db/archive/load", archPaymentsByPeriodKey) || {};
        const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`;
        const archSentOrReceivedPayments = await (0, import_sbp7.default)("gi.db/archive/load", archSentOrReceivedPaymentsKey) || { sent: [], received: [] };
        const sortPayments = (payments2) => payments2.sort((f, l) => l.height - f.height);
        for (const period of Object.keys(paymentsByPeriod).sort()) {
          archPaymentsByPeriod[period] = paymentsByPeriod[period];
          const newSentOrReceivedPayments = { sent: [], received: [] };
          const { paymentsFrom } = paymentsByPeriod[period];
          for (const fromMemberID of Object.keys(paymentsFrom)) {
            for (const toMemberID of Object.keys(paymentsFrom[fromMemberID])) {
              if (toMemberID === identityContractID || fromMemberID === identityContractID) {
                const receivedOrSent = toMemberID === identityContractID ? "received" : "sent";
                for (const hash2 of paymentsFrom[fromMemberID][toMemberID]) {
                  const { data, meta, height } = payments[hash2];
                  newSentOrReceivedPayments[receivedOrSent].push({ hash: hash2, period, height, data, meta, amount: data.amount });
                }
              }
            }
          }
          archSentOrReceivedPayments.sent = [...sortPayments(newSentOrReceivedPayments.sent), ...archSentOrReceivedPayments.sent];
          archSentOrReceivedPayments.received = [...sortPayments(newSentOrReceivedPayments.received), ...archSentOrReceivedPayments.received];
          const archPaymentsKey = `payments/${identityContractID}/${period}/${contractID}`;
          const hashes = paymentHashesFromPaymentPeriod(paymentsByPeriod[period]);
          const archPayments = Object.fromEntries(hashes.map((hash2) => [hash2, payments[hash2]]));
          while (Object.keys(archPaymentsByPeriod).length > MAX_ARCHIVED_PERIODS) {
            const shouldBeDeletedPeriod = Object.keys(archPaymentsByPeriod).sort().shift();
            const paymentHashes = paymentHashesFromPaymentPeriod(archPaymentsByPeriod[shouldBeDeletedPeriod]);
            await (0, import_sbp7.default)("gi.db/archive/delete", `payments/${shouldBeDeletedPeriod}/${identityContractID}/${contractID}`);
            delete archPaymentsByPeriod[shouldBeDeletedPeriod];
            archSentOrReceivedPayments.sent = archSentOrReceivedPayments.sent.filter((payment) => !paymentHashes.includes(payment.hash));
            archSentOrReceivedPayments.received = archSentOrReceivedPayments.received.filter((payment) => !paymentHashes.includes(payment.hash));
          }
          await (0, import_sbp7.default)("gi.db/archive/save", archPaymentsKey, archPayments);
        }
        await (0, import_sbp7.default)("gi.db/archive/save", archPaymentsByPeriodKey, archPaymentsByPeriod);
        await (0, import_sbp7.default)("gi.db/archive/save", archSentOrReceivedPaymentsKey, archSentOrReceivedPayments);
        (0, import_sbp7.default)("okTurtles.events/emit", PAYMENTS_ARCHIVED, { paymentsByPeriod, payments });
      },
      "gi.contracts/group/removeArchivedProposals": async function(contractID) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const key = `proposals/${identityContractID}/${contractID}`;
        await (0, import_sbp7.default)("gi.db/archive/delete", key);
      },
      "gi.contracts/group/removeArchivedPayments": async function(contractID) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const archPaymentsByPeriodKey = `paymentsByPeriod/${identityContractID}/${contractID}`;
        const periods = Object.keys(await (0, import_sbp7.default)("gi.db/archive/load", archPaymentsByPeriodKey) || {});
        const archSentOrReceivedPaymentsKey = `sentOrReceivedPayments/${identityContractID}/${contractID}`;
        for (const period of periods) {
          const archPaymentsKey = `payments/${identityContractID}/${period}/${contractID}`;
          await (0, import_sbp7.default)("gi.db/archive/delete", archPaymentsKey);
        }
        await (0, import_sbp7.default)("gi.db/archive/delete", archPaymentsByPeriodKey);
        await (0, import_sbp7.default)("gi.db/archive/delete", archSentOrReceivedPaymentsKey);
      },
      "gi.contracts/group/makeNotificationWhenProposalClosed": function(state, contractID, meta, height, proposal) {
        const { loggedIn } = (0, import_sbp7.default)("state/vuex/state");
        if (isActionNewerThanUserJoinedDate(height, state.profiles[loggedIn.identityContractID])) {
          (0, import_sbp7.default)("gi.notifications/emit", "PROPOSAL_CLOSED", { createdDate: meta.createdDate, groupID: contractID, proposal });
        }
      },
      "gi.contracts/group/sendMincomeChangedNotification": async function(contractID, meta, data, height, innerSigningContractID) {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const myProfile = (await (0, import_sbp7.default)("chelonia/contract/state", contractID)).profiles[identityContractID];
        const { fromAmount, toAmount } = data;
        if (isActionNewerThanUserJoinedDate(height, myProfile) && myProfile.incomeDetailsType) {
          const memberType = myProfile.incomeDetailsType === "pledgeAmount" ? "pledging" : "receiving";
          const mincomeIncreased = toAmount > fromAmount;
          const actionNeeded = mincomeIncreased || memberType === "receiving" && !mincomeIncreased && myProfile.incomeAmount < fromAmount && myProfile.incomeAmount > toAmount;
          if (!actionNeeded) {
            return;
          }
          if (memberType === "receiving" && !mincomeIncreased) {
            await (0, import_sbp7.default)("gi.actions/group/groupProfileUpdate", {
              contractID,
              data: {
                incomeDetailsType: "pledgeAmount",
                pledgeAmount: 0
              }
            });
            await (0, import_sbp7.default)("gi.actions/group/displayMincomeChangedPrompt", {
              contractID,
              data: {
                amount: toAmount,
                memberType,
                increased: mincomeIncreased
              }
            });
          }
          (0, import_sbp7.default)("gi.notifications/emit", "MINCOME_CHANGED", {
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
        const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
        const actorID = (0, import_sbp7.default)("state/vuex/state").loggedIn.identityContractID;
        if (actorID !== originalActorID) {
          return;
        }
        if (state?.profiles?.[actorID]?.status !== PROFILE_STATUS.ACTIVE || state?.profiles?.[memberID]?.status !== PROFILE_STATUS.ACTIVE || state?.chatRooms?.[chatRoomID]?.members[memberID]?.status !== PROFILE_STATUS.ACTIVE || state?.chatRooms?.[chatRoomID]?.members[memberID]?.joinedHeight !== height) {
          (0, import_sbp7.default)("okTurtles.data/set", `gi.contracts/group/chatroom-skipped-${contractID}-${chatRoomID}-${height}`, true);
          return;
        }
        {
          await (0, import_sbp7.default)("chelonia/contract/retain", chatRoomID, { ephemeral: true });
          if (!await (0, import_sbp7.default)("chelonia/contract/hasKeysToPerformOperation", chatRoomID, "gi.contracts/chatroom/join")) {
            throw new Error(`Missing keys to join chatroom ${chatRoomID}`);
          }
          const encryptionKeyId = (0, import_sbp7.default)("chelonia/contract/currentKeyIdByName", state, "cek", true);
          (0, import_sbp7.default)("gi.actions/chatroom/join", {
            contractID: chatRoomID,
            data: actorID === memberID ? {} : { memberID },
            encryptionKeyId
          }).catch((e) => {
            if (e.name === "GIErrorUIRuntimeError" && e.cause?.name === "GIChatroomAlreadyMemberError") {
              return;
            }
            console.warn(`Unable to join ${memberID} to chatroom ${chatRoomID} for group ${contractID}`, e);
          }).finally(() => {
            (0, import_sbp7.default)("chelonia/contract/release", chatRoomID, { ephemeral: true }).catch((e) => console.error("[gi.contracts/group/joinGroupChatrooms] Error during release", e));
          });
        }
      },
      "gi.contracts/group/leaveGroup": async ({ data, meta, contractID, height, getters, innerSigningContractID, proposalHash }) => {
        const { identityContractID } = (0, import_sbp7.default)("state/vuex/state").loggedIn;
        const memberID = data.memberID || innerSigningContractID;
        const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
        if (!state) {
          console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: contract has been removed`);
          return;
        }
        if (state.profiles?.[memberID]?.status !== PROFILE_STATUS.REMOVED) {
          console.info(`[gi.contracts/group/leaveGroup] for ${contractID}: member has not left`, { contractID, memberID, status: state.profiles?.[memberID]?.status });
          return;
        }
        if (memberID === identityContractID) {
          for (const notification of (0, import_sbp7.default)("state/vuex/getters").notificationsByGroup(contractID)) {
            (0, import_sbp7.default)("state/vuex/commit", REMOVE_NOTIFICATION, notification.hash);
          }
          const areWeRejoining = async () => {
            const pendingKeyShares = await (0, import_sbp7.default)("chelonia/contract/waitingForKeyShareTo", state, identityContractID);
            if (pendingKeyShares) {
              console.info("[gi.contracts/group/leaveGroup] Not removing group contract because it has a pending key share for ourselves", contractID);
              return true;
            }
            const sentKeyShares = await (0, import_sbp7.default)("chelonia/contract/successfulKeySharesByContractID", state, identityContractID);
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
          (0, import_sbp7.default)("gi.actions/identity/leaveGroup", {
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
              (0, import_sbp7.default)("gi.notifications/emit", memberRemovedThemselves ? "MEMBER_LEFT" : "MEMBER_REMOVED", {
                createdDate: meta.createdDate,
                groupID: contractID,
                memberID
              });
            }
            Promise.resolve().then(() => (0, import_sbp7.default)("gi.contracts/group/rotateKeys", contractID)).then(() => (0, import_sbp7.default)("gi.contracts/group/revokeGroupKeyAndRotateOurPEK", contractID)).catch((e) => {
              console.warn(`[gi.contracts/group/leaveGroup] for ${contractID}: Error rotating group keys or our PEK`, e);
            });
            (0, import_sbp7.default)("gi.contracts/group/removeForeignKeys", contractID, memberID, state);
          }
        }
      },
      "gi.contracts/group/rotateKeys": async (contractID) => {
        const state = await (0, import_sbp7.default)("chelonia/contract/state", contractID);
        const pendingKeyRevocations = state?._volatile?.pendingKeyRevocations;
        if (!pendingKeyRevocations || Object.keys(pendingKeyRevocations).length === 0) {
          return;
        }
        (0, import_sbp7.default)("gi.actions/out/rotateKeys", contractID, "gi.contracts/group", "pending", "gi.actions/group/shareNewKeys").catch((e) => {
          console.warn(`rotateKeys: ${e.name} thrown:`, e);
        });
      },
      "gi.contracts/group/revokeGroupKeyAndRotateOurPEK": (groupContractID) => {
        const rootState = (0, import_sbp7.default)("state/vuex/state");
        const { identityContractID } = rootState.loggedIn;
        const state = rootState[identityContractID];
        if (!state._volatile)
          state["_volatile"] = /* @__PURE__ */ Object.create(null);
        if (!state._volatile.pendingKeyRevocations)
          state._volatile["pendingKeyRevocations"] = /* @__PURE__ */ Object.create(null);
        const PEKid = findKeyIdByName(state, "pek");
        state._volatile.pendingKeyRevocations[PEKid] = true;
        (0, import_sbp7.default)("chelonia/queueInvocation", identityContractID, ["gi.actions/out/rotateKeys", identityContractID, "gi.contracts/identity", "pending", "gi.actions/identity/shareNewPEK"]).catch((e) => {
          console.warn(`revokeGroupKeyAndRotateOurPEK: ${e.name} thrown during queueEvent to ${identityContractID}:`, e);
        });
      },
      "gi.contracts/group/removeForeignKeys": (contractID, userID, state) => {
        const keyIds = findForeignKeysByContractID(state, userID);
        if (!keyIds?.length)
          return;
        const CSKid = findKeyIdByName(state, "csk");
        (0, import_sbp7.default)("chelonia/out/keyDel", {
          contractID,
          contractName: "gi.contracts/group",
          data: keyIds,
          signingKeyId: CSKid
        }).catch((e) => {
          console.warn(`removeForeignKeys: ${e.name} error thrown:`, e);
        });
      },
      ...referenceTally("gi.contracts/group/referenceTally")
    }
  });
})();
/*!
 * Fast "async" scrypt implementation in JavaScript.
 * Copyright (c) 2013-2016 Dmitry Chestnykh | BSD License
 * https://github.com/dchest/scrypt-async-js
 */
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/*!
 * Vue.js v2.6.12
 * (c) 2014-2020 Evan You
 * Released under the MIT License.
 */
/*! @license DOMPurify | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/2.2.2/LICENSE */
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
