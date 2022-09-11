const EMPTY_VALUE = Symbol("@@empty");
const isEmpty = (v) => v === EMPTY_VALUE;
const isNil = (v) => v === null;
const isUndef = (v) => typeof v === "undefined";
const isBoolean = (v) => typeof v === "boolean";
const isNumber = (v) => typeof v === "number";
const isString = (v) => typeof v === "string";
const isObject = (v) => !isNil(v) && typeof v === "object";
const isFunction = (v) => typeof v === "function";
const isType = (typeFn) => (v, _scope = "") => {
  try {
    typeFn(v, _scope);
    return true;
  } catch (_) {
    return false;
  }
};
const typeOf = (schema) => schema(EMPTY_VALUE, "");
const getType = (typeFn, _options) => {
  if (isFunction(typeFn.type))
    return typeFn.type(_options);
  return typeFn.name || "?";
};
class TypeValidatorError extends Error {
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
}
const validatorError = (typeFn, value, scope, message, expectedType, valueType) => {
  return new TypeValidatorError(message, expectedType || getType(typeFn), valueType || typeof value, JSON.stringify(value), typeFn.name, scope);
};
const arrayOf = (typeFn, _scope = "Array") => {
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
const literalOf = (primitive) => {
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
const mapOf = (keyTypeFn, typeFn) => {
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
const isPrimitiveFn = (typeName) => ["undefined", "null", "boolean", "number", "string"].includes(typeName);
const maybe = (typeFn) => {
  function maybe2(value, _scope = "") {
    return isNil(value) || isUndef(value) ? value : typeFn(value, _scope);
  }
  maybe2.type = () => !isPrimitiveFn(typeFn.name) ? `?(${getType(typeFn)})` : `?${getType(typeFn)}`;
  return maybe2;
};
const mixed = function mixed2(value) {
  return value;
};
const object = function(value) {
  if (isEmpty(value))
    return {};
  if (isObject(value) && !Array.isArray(value)) {
    return Object.assign({}, value);
  }
  throw validatorError(object, value);
};
const objectOf = (typeObj, _scope = "Object") => {
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
const optional = (typeFn) => {
  const unionFn = unionOf(typeFn, undef);
  function optional2(v) {
    return unionFn(v);
  }
  optional2.type = ({ noVoid }) => !noVoid ? getType(unionFn) : getType(typeFn);
  return optional2;
};
const nil = function nil2(value) {
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
const boolean = function boolean2(value, _scope = "") {
  if (isEmpty(value))
    return false;
  if (isBoolean(value))
    return value;
  throw validatorError(boolean2, value, _scope);
};
const number = function number2(value, _scope = "") {
  if (isEmpty(value))
    return 0;
  if (isNumber(value))
    return value;
  throw validatorError(number2, value, _scope);
};
const string = function string2(value, _scope = "") {
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
const tupleOf = tupleOf_;
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
const unionOf = unionOf_;
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
//# sourceMappingURL=flowTyper.js.map
