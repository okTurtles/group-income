// wrap to prevent fragment instances:
// http://vuejs.org/guide/components.html#Fragment-Instance
export function wrap (s, tag = 'div') {
  return `<${tag}>${s}</${tag}>`
}
