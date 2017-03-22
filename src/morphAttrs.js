import { hasAttributeNS } from './util';

export default function morphAttrs(fromNode, toNode, options) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    var onBeforeElAttributeAdded = options.onBeforeElAttributeAdded;
    var onBeforeElAttributeUpdated = options.onBeforeElAttributeUpdated;
    var onBeforeElAttributeRemoved = options.onBeforeElAttributeRemoved;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        attrName = attr.name;
        attrNamespaceURI = attr.namespaceURI;
        attrValue = attr.value;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
            if ( ! hasAttributeNS(fromNode, attrNamespaceURI, attrName)) {
                // onBeforeElAttributeAdded
                if (onBeforeElAttributeAdded && onBeforeElAttributeAdded(fromNode, toNode, attrName, attrValue) === false) continue;
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            } else if (fromValue !== attrValue) {
                // onBeforeElAttributeAdded
                if (onBeforeElAttributeUpdated && onBeforeElAttributeUpdated(fromNode, toNode, attrName, fromValue, attrValue) === false) continue;
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            }
        } else {
            fromValue = fromNode.getAttribute(attrName);
            if ( ! fromNode.hasAttribute(attrName)) {
                // onBeforeElAttributeAdded
                if (onBeforeElAttributeAdded && onBeforeElAttributeAdded(fromNode, toNode, attrName, attrValue) === false) continue;
                fromNode.setAttribute(attrName, attrValue);
            } else if (fromValue !== attrValue) {
                // onBeforeElAttributeAdded
                if (onBeforeElAttributeUpdated && onBeforeElAttributeUpdated(fromNode, toNode, attrName, fromValue, attrValue) === false) continue;
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;

                if (!hasAttributeNS(toNode, attrNamespaceURI, attrName)) {
                    if (onBeforeElAttributeRemoved && onBeforeElAttributeRemoved(fromNode, toNode, attrName) === false) continue;
                    fromNode.removeAttributeNS(attrNamespaceURI, attrName);
                }
            } else {
                if (!hasAttributeNS(toNode, null, attrName)) {
                    if (onBeforeElAttributeRemoved && onBeforeElAttributeRemoved(fromNode, toNode, attrName) === false) continue;
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}
