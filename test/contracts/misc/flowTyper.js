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
var isType = (typeFn) => (v, _scope = "") => {
  try {
    typeFn(v, _scope);
    return true;
  } catch (_) {
    return false;
  }
};
var typeOf = (schema) => schema(EMPTY_VALUE, "");
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
var isPrimitiveFn = (typeName) => ["undefined", "null", "boolean", "number", "string"].includes(typeName);
var maybe = (typeFn) => {
  function maybe2(value, _scope = "") {
    return isNil(value) || isUndef(value) ? value : typeFn(value, _scope);
  }
  maybe2.type = () => !isPrimitiveFn(typeFn.name) ? `?(${getType(typeFn)})` : `?${getType(typeFn)}`;
  return maybe2;
};
var mixed = function mixed2(value) {
  return value;
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
var nil = function nil2(value) {
  if (isEmpty(value) || isNil(value))
    return null;
  throw validatorError(nil2, value);
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
export {
  EMPTY_VALUE,
  TypeValidatorError,
  arrayOf,
  boolean,
  getType,
  isBoolean,
  isEmpty,
  isFunction,
  isNil,
  isNumber,
  isObject,
  isString,
  isType,
  isUndef,
  literalOf,
  mapOf,
  maybe,
  mixed,
  nil,
  number,
  object,
  objectMaybeOf,
  objectOf,
  optional,
  string,
  tupleOf,
  typeOf,
  undef,
  unionOf
};
