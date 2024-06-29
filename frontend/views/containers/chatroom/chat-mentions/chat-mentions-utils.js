export type DomObject = {
  tagName: string | null,
  attributes: Object, // can be an empty object too.
  text?: string,
  children?: Array<DomObject>
}

export function htmlStringToDomObjectTree (htmlString: any): Array<DomObject> {
  // Use DOMParser to parse the HTML string into a DOM tree.
  // Reference 1. (DOMParser API): https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
  // Refernce 2. (Converting html to virtual DOM): https://medium.com/@fulit103/converting-html-to-a-virtual-dom-in-javascript-3a6db0f563b1)

  const parser = new DOMParser()

  // Below is a bug-fix for the issue #2130 (https://github.com/okTurtles/group-income/issues/2130)
  // DOMParser.parseFromString() has some caveats re how it interprets &lt; and &gt;
  // so manually wrap them with <span> tags
  htmlString = htmlString.replaceAll('&lt;', '<span>&lt;</span>')
    .replaceAll('&gt;', '<span>&gt;</span>')

  const doc = parser.parseFromString(htmlString, 'text/html')
  const rootNode = doc.body

  return createRecursiveDomObjects(rootNode)?.children || []
}

function createRecursiveDomObjects (element: any): DomObject {
  /*
    This function takes the virtual DOM tree generated as a reult of calling the DOMParser method,
    and then turn into the equivalent recursive object literal structures, which looks like below for example.

    {
      tagName: 'div',
      attributes: { id: ..., ... },
      children: [
        {
          tagName: 'ul',
          attributes: { class: '...', ... },
          children: [
            { tagName: 'li', attributes: { ... }, children: [ ... ] },
            { tagName: 'li', attributes: { ... }, children: [ ... ] }
            ...
          ]
        },
        {
          tagName: 'a',
          attributes: { href: '...', target: '_blank', ... },
          children: [ { tagName: null, text: 'This is the link' } ]
        },
        {
          tagName: null,
          text: 'A text segment'
        },
        ...
      ]
    }

    This outcome will be used by a Vue render function to render converted markdown cleanly without breaking the html structure.
  */

  const isNodeTypeText = (el: any): boolean => el?.nodeType === Node.TEXT_NODE

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

    nodeObj.children = nodeObj.children.filter(
      child => child.tagName || (child.text || '').trim().length
    )
  }

  return nodeObj
}
