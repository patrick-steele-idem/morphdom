var range; // Create a range object for efficently rendering strings to elements.
var NS_XHTML = 'http://www.w3.org/1999/xhtml';

export var doc = typeof document === 'undefined' ? undefined : document;
var HAS_TEMPLATE_SUPPORT = !!doc && 'content' in doc.createElement('template');
var HAS_RANGE_SUPPORT = !!doc && doc.createRange && 'createContextualFragment' in doc.createRange();

/**
 * Create element from string.
 *
 * @param {ReadOnly<string>} str The string to convert to a DOM node.
 *
 * @return {ChildNode} The DOM node for the given string.
 */
function createFragmentFromTemplate(str) {
    var template = doc.createElement('template');
    template.innerHTML = str;
    return template.content.childNodes[0];
}

/**
 * Create element from string.
 *
 * @param {ReadOnly<string>} str The string to convert to a DOM node.
 *
 * @return {ChildNode} The DOM node for the given string.
 */
function createFragmentFromRange(str) {
    if (!range) {
        // Throw a specific error if document doesn't exist.
        if (!doc) {
            throw new Error('DOM document is not present.');
        }
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    /** @type {DocumentFragment} */
    var fragment = range.createContextualFragment(str);
    return fragment.childNodes[0];
}

/**
 * Creates HTML fragments from wrap.
 *
 * @param {ReadOnly<String>} str The string to convert to a DOM node.
 *
 * @return {ChildNode} The DOM node for the given string.
 */
function createFragmentFromWrap(str) {
    /** @type {HTMLBodyElement} */
    var fragment = doc.createElement('body');
    fragment.innerHTML = str;
    return fragment.content.childNodes[0];
}

/**
 * This is about the same
 * var html = new DOMParser().parseFromString(str, 'text/html');
 * return html.body.firstChild;
 *
 * @method toElement
 * @param {ReadOnly<String>} str
 *
 * @return {ChildNode}
 */
export function toElement(str) {
    var trimmedStr = str.trim();
    if (HAS_TEMPLATE_SUPPORT) {
      // avoid restrictions on content for things like `<tr><th>Hi</th></tr>` which
      // createContextualFragment doesn't support
      // <template> support not available in IE
      return createFragmentFromTemplate(trimmedStr);
    } else if (HAS_RANGE_SUPPORT) {
      return createFragmentFromRange(trimmedStr);
    }

    return createFragmentFromWrap(trimmedStr);
}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} fromEl The source element.
 * @param {Element} toEl The target element
 *
 * @return {boolean} True if the node names are the same.
 */
export function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;
    var fromCodeStart, toCodeStart;

    if (fromNodeName === toNodeName) {
        return true;
    }

    fromCodeStart = fromNodeName.charCodeAt(0);
    toCodeStart = toNodeName.charCodeAt(0);

    // If the target element is a virtual DOM node or SVG node then we may
    // need to normalize the tag name before comparing. Normal HTML elements that are
    // in the "http://www.w3.org/1999/xhtml"
    // are converted to upper case
    if (fromCodeStart <= 90 && toCodeStart >= 97) { // from is upper and to is lower
        return fromNodeName === toNodeName.toUpperCase();
    } else if (toCodeStart <= 90 && fromCodeStart >= 97) { // to is upper and from is lower
        return toNodeName === fromNodeName.toUpperCase();
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
 * 
 * @param {Element} fromEl The source element.
 * @param {Element} toEl The target element.
 *
 * @return {Element} toEl The target element with moved children.
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
