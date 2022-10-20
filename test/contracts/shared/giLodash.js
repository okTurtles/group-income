// frontend/model/contracts/shared/giLodash.js
function mapValues(obj, fn, o = {}) {
  for (const key in obj) {
    o[key] = fn(obj[key]);
  }
  return o;
}
function mapObject(obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(fn));
}
function pick(o, props) {
  const x = {};
  for (const k of props) {
    x[k] = o[k];
  }
  return x;
}
function pickWhere(o, where) {
  const x = {};
  for (const k in o) {
    if (where(o[k])) {
      x[k] = o[k];
    }
  }
  return x;
}
function choose(array, indices) {
  const x = [];
  for (const idx of indices) {
    x.push(array[idx]);
  }
  return x;
}
function omit(o, props) {
  const x = {};
  for (const k in o) {
    if (!props.includes(k)) {
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
function delay(msec) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msec);
  });
}
function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
function randomHexString(length) {
  return Array.from(randomBytes(length), (byte) => (byte % 16).toString(16)).join("");
}
function randomIntFromRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function flatten(arr) {
  let flat = [];
  for (let i = 0; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      flat = flat.concat(arr[i]);
    } else {
      flat.push(arr[i]);
    }
  }
  return flat;
}
function zip() {
  const arr = Array.prototype.slice.call(arguments);
  const zipped = [];
  let max = 0;
  arr.forEach((current) => max = Math.max(max, current.length));
  for (const current of arr) {
    for (let i = 0; i < max; i++) {
      zipped[i] = zipped[i] || [];
      zipped[i].push(current[i]);
    }
  }
  return zipped;
}
function uniq(array) {
  return Array.from(new Set(array));
}
function union(...arrays) {
  return uniq([].concat.apply([], arrays));
}
function intersection(a1, ...arrays) {
  return uniq(a1).filter((v1) => arrays.every((v2) => v2.indexOf(v1) >= 0));
}
function difference(a1, ...arrays) {
  const a2 = [].concat.apply([], arrays);
  return a1.filter((v) => a2.indexOf(v) === -1);
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
function debounce(func, wait, immediate) {
  let timeout, args, context, timestamp, result;
  if (wait == null)
    wait = 100;
  function later() {
    const last = Date.now() - timestamp;
    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        context = args = null;
      }
    }
  }
  const debounced = function() {
    context = this;
    args = arguments;
    timestamp = Date.now();
    const callNow = immediate && !timeout;
    if (!timeout)
      timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }
    return result;
  };
  debounced.clear = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  debounced.flush = function() {
    if (timeout) {
      result = func.apply(context, args);
      context = args = null;
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debounced;
}
function get(obj, path, defaultValue) {
  if (!path.length) {
    return obj;
  } else if (obj === void 0) {
    return defaultValue;
  }
  let result = obj;
  let i = 0;
  while (result && i < path.length) {
    result = result[path[i]];
    i++;
  }
  return result === void 0 ? defaultValue : result;
}
export {
  choose,
  cloneDeep,
  debounce,
  deepEqualJSONType,
  delay,
  difference,
  flatten,
  get,
  intersection,
  mapObject,
  mapValues,
  merge,
  omit,
  pick,
  pickWhere,
  randomBytes,
  randomFromArray,
  randomHexString,
  randomIntFromRange,
  union,
  uniq,
  zip
};
//# sourceMappingURL=giLodash.js.map
