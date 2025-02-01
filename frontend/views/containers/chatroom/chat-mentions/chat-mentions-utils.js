export type DomObject = {
  tagName: string | null,
  attributes: Object, // can be an empty object too.
  text?: string,
  children?: Array<DomObject>
}

export function htmlStringToDomObjectTree (htmlString: string): Array<DomObject> {
  // Use DOMParser to parse the HTML string into a DOM tree.
  // Reference 1. (DOMParser API): https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
  // Refernce 2. (Converting html to virtual DOM): https://medium.com/@fulit103/converting-html-to-a-virtual-dom-in-javascript-3a6db0f563b1)

  const parser = new DOMParser()

  // Below is a bug-fix for the issue #2130 (https://github.com/okTurtles/group-income/issues/2130)
  // DOMParser.parseFromString() has some caveats re how it interprets &lt; and &gt;
  // so manually wrap them with <span> tags.
  htmlString = replaceMultiple(htmlString, { '&lt;': '(&lt;)', '&gt;': '(&gt;)' })

  const doc = parser.parseFromString(htmlString, 'text/html')
  const rootNode = doc.body

  return createRecursiveDomObjects(rootNode)?.children || []
}

function isOnlyNewlines (str: any): boolean {
  return /^[\n]*$/.test(str)
}

function replaceMultiple (input: string, replacements: Object): string {
  return Object.entries(replacements).reduce(
    // $FlowFixMe[prop-missing]
    (str, [from, to]) => str.replaceAll(from, to),
    input
  )
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

  const isNodeTypeText = element?.nodeType === Node.TEXT_NODE
  const isNodeCodeElement = element?.nodeName === 'CODE' // <code> ... </code> element needs a special treatment in the chat.

  const nodeObj: DomObject = isNodeTypeText
    ? {
        tagName: null,
        attributes: {},
        text: replaceMultiple(element.textContent, { '(<)': '&lt;', '(>)': '&gt;' })
      }
    : {
        tagName: element.tagName,
        text: isNodeCodeElement
          // $FlowFixMe[prop-missing]
          ? replaceMultiple(element.innerText,
            {
              '<br>': '',
              '&gt;': '>',
              '&lt;': '<',
              '(<)': '<',
              '(>)': '>'
            })
          : undefined,
        attributes: {}
      }

  if (element.attributes?.length) {
    for (const attr of element.attributes) {
      nodeObj.attributes[attr.name] = attr.value
    }
  }

  if (!isNodeCodeElement && element.childNodes?.length) {
    nodeObj.children = []

    for (const child of element.childNodes) {
      // recursively create a dom object when encountering another html tag as children
      nodeObj.children.push(createRecursiveDomObjects(child))
    }

    nodeObj.children = nodeObj.children.filter(child => {
      if (child.tagName) return true
      else return Boolean(child.text?.length) && !isOnlyNewlines(child.text)
    })
  }

  return nodeObj
}
