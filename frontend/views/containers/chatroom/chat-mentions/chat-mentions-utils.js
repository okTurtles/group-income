export type DomObject = {
  tagName: string | null,
  attributes: Object, // can be an empty object too.
  text?: string,
  children?: Array<DomObject>
}

export function htmlStringToDomObjectTree (htmlString: string): Array<DomObject> {
  // Use DOMParser to parse the HTML string into a DOM tree.
  // (reference: https://medium.com/@fulit103/converting-html-to-a-virtual-dom-in-javascript-3a6db0f563b1)
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')
  const rootNode = doc.body

  return createRecursiveDomObjects(rootNode)?.children || []
}

function createRecursiveDomObjects (element: any): DomObject {
  const isNodeTypeText = (el: any) => el?.nodeType === Node.TEXT_NODE

  const nodeObj: DomObject = isNodeTypeText(element)
    ? { tagName: null, attributes: {}, text: element.textContent }
    : { tagName: element.tagName, attributes: {} }

  if (element.attributes?.length) {
    for (const attr of element.attributes) {
      nodeObj.attributes[attr.name] = attr.value
    }
  }

  if (element.childNodes?.length) {
    nodeObj.children = []

    for (const child of element.childNodes) {
      // recursively create a dom object when encountering another html tag as children
      nodeObj.children.push(createRecursiveDomObjects(child))
    }
  }

  return nodeObj
}
