var range; // Create a range object for efficently rendering strings to elements.
var NS_XHTML = 'http://www.w3.org/1999/xhtml';
var ELEMENT_NODE = 1;
var DOCUMENT_FRAGMENT_NODE = 11;

export var doc = typeof document === 'undefined' ? undefined : document;
var HAS_TEMPLATE_SUPPORT = !!doc && 'content' in doc.createElement('template');
var HAS_RANGE_SUPPORT = !!doc && doc.createRange && 'createContextualFragment' in doc.createRange();

function createFragmentFromTemplate(str) {
    var template = doc.createElement('template');
    template.innerHTML = str;
    return template.content.childNodes[0];
}

function createFragmentFromRange(str) {
    if (!range) {
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    var fragment = range.createContextualFragment(str);
    return fragment.childNodes[0];
}

function createFragmentFromWrap(str) {
    var fragment = doc.createElement('body');
    fragment.innerHTML = str;
    return fragment.childNodes[0];
}

/**
 * This is about the same
 * var html = new DOMParser().parseFromString(str, 'text/html');
 * return html.body.firstChild;
 *
 * @method toElement
 * @param {String} str
 */
export function toElement(str) {
    str = str.trim();
    if (HAS_TEMPLATE_SUPPORT) {
      // avoid restrictions on content for things like `<tr><th>Hi</th></tr>` which
      // createContextualFragment doesn't support
      // <template> support not available in IE
      return createFragmentFromTemplate(str);
    } else if (HAS_RANGE_SUPPORT) {
      return createFragmentFromRange(str);
    }

    return createFragmentFromWrap(str);
}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} a
 * @param {Element} b The target element
 * @return {boolean}
 */
export function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;

    if (fromNodeName === toNodeName) {
        return true;
    }

    if (toEl.actualize &&
        fromNodeName.charCodeAt(0) < 91 && /* from tag name is upper case */
        toNodeName.charCodeAt(0) > 90 /* target tag name is lower case */) {
        // If the target element is a virtual DOM node then we may need to normalize the tag name
        // before comparing. Normal HTML elements that are in the "http://www.w3.org/1999/xhtml"
        // are converted to upper case
        return fromNodeName === toNodeName.toUpperCase();
    } else {
        return false;
    }
}

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
export function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ?
        doc.createElement(name) :
        doc.createElementNS(namespaceURI, name);
}

/**
 * Copies the children of one DOM element to another DOM element
 */
export function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

export function transformCheckbox(from, to) {
    // pass off checked property
    to.checked = from.checked;
}

export function isCheckable(node) {
    return node instanceof HTMLInputElement && (node.type === 'checkbox' || node.type === 'radio');
}

/**
 * Use this function when toNode was a string. The checked property could have been lost in
 * translation (since it is an idl property).
 *
 * This is only relevant for responses that are a string (assuming they were serialized and sent by the server)
 * If toNode was an HTMLElement to begin with, then it is unsafe to use this function
 *
 * @function morphCheckboxProperties
 * @param {HTMLElement} toNode
 * @param {HTMLElement} fromNode
 */
export function morphCheckboxProperties(toNode, fromNode) {
    if (isCheckable(toNode) && isCheckable(fromNode)) {
        return transformCheckbox(fromNode, toNode);
    }

    if (toNode.nodeType === ELEMENT_NODE || toNode.nodeType === DOCUMENT_FRAGMENT_NODE) {
        var curChild = toNode.firstChild;
        while (curChild) {
            if (isCheckable(curChild)) {
              var input;
              if (curChild.id) {
                input = fromNode.querySelector('#' + curChild.id);
              } else if (curChild.name) {
                input = fromNode.querySelector('[name=' +  curChild.name + ']');
              }

              if (input) {
                  transformCheckbox(input, curChild);
              }
            }

            // Walk recursively
            morphCheckboxProperties(curChild, fromNode);

            curChild = curChild.nextSibling;
        }
    }
}

