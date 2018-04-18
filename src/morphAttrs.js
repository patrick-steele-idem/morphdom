import { hasAttributeNS } from './util';

export default function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        attrName = attr.name;
        attrNamespaceURI = attr.namespaceURI;
        attrValue = attr.value;

        if (attrNamespaceURI) {
            var attrLocalName = attr.localName;

            // Important: getAttributeNS expects the localName of a namespaced attribute
            // but setAttributeNS requires the fully qualified name
            // ref: https://dom.spec.whatwg.org/#dom-element-getattributens
            // ref: https://www.w3.org/TR/DOM-Level-2-Core/glossary.html#dt-localname
            // ref: https://dom.spec.whatwg.org/#dom-element-setattributens
            // ref: https://www.w3.org/TR/DOM-Level-2-Core/glossary.html#dt-qualifiedname
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrLocalName);
            if (fromValue !== attrValue) {
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            }
        } else {
            fromValue = fromNode.getAttribute(attrName);

            if (fromValue !== attrValue) {
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
                    fromNode.removeAttributeNS(attrNamespaceURI, attrName);
                }
            } else {
                if (!hasAttributeNS(toNode, null, attrName)) {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}