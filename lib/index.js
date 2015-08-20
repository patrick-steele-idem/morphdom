// Create a range object for efficently rendering strings to elements.
var range;

function toElement(str) {
    if (!range) {
        range = document.createRange();
        range.selectNode(document.body);
    }

    var fragment;
    if (range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = document.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think
     * that "selected" is an attribute when reading
     * over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        if ((fromEl.selected = toEl.selected)) {
            fromEl.setAttribute('selected', '');
        } else {
            fromEl.removeAttribute('selected', '');
        }
    },
    /**
     * The "value" attribute is special for the <input> element
     * since it sets the initial value. Changing the "value"
     * attribute without changing the "value" property will have
     * no effect since it is only used to the set the initial value.
     * Similar for the "checked" attribute.
     */
    INPUT: function(fromEl, toEl) {
        fromEl.checked = toEl.checked;
        fromEl.value = toEl.value;

        if (!toEl.hasAttribute('checked')) {
            fromEl.removeAttribute('checked');
        }

        if (!toEl.hasAttribute('value')) {
            fromEl.removeAttribute('value');
        }
    }
};

function noop() {}

/**
 * Loop over all of the attributes on the target node and make sure the
 * original DOM node has the same attributes. If an attribute
 * found on the original node is not on the new node then remove it from
 * the original node
 * @param  {HTMLElement} fromNode
 * @param  {HTMLElement} toNode
 */
function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrValue;
    var foundAttrs = {};

    for (i=attrs.length-1; i>=0; i--) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrValue = attr.value;
            foundAttrs[attrName] = true;

            if (fromNode.getAttribute(attrName) !== attrValue) {
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Delete any extra attributes found on the original DOM element that weren't
    // found on the target element.
    attrs = fromNode.attributes;

    for (i=attrs.length-1; i>=0; i--) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            if (!foundAttrs.hasOwnProperty(attrName)) {
                fromNode.removeAttribute(attrName);
            }
        }
    }
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(from, to) {
    var curChild = from.firstChild;
    while(curChild) {
        var nextChild = curChild.nextSibling;
        to.appendChild(curChild);
        curChild = nextChild;
    }
    return to;
}

function morphdom(fromNode, toNode, options) {
    if (!options) {
        options = {};
    }

    if (typeof toNode === 'string') {
        toNode = toElement(toNode);
    }

    var savedEls = {}; // Used to save off DOM elements with IDs
    var unmatchedEls = {};
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeMorphEl = options.onBeforeMorphEl || noop;
    var onBeforeMorphElChildren = options.onBeforeMorphElChildren || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var childrenOnly = options.childrenOnly === true;

    function removeNodeHelper(node, nestedInSavedEl) {
        var id = node.id;
        // If the node has an ID then save it off since we will want
        // to reuse it in case the target DOM tree has a DOM element
        // with the same ID
        if (id) {
            savedEls[id] = node;
        } else if (!nestedInSavedEl) {
            // If we are not nested in a saved element then we know that this node has been
            // completely discarded and will not exist in the final DOM.
            onNodeDiscarded(node);
        }

        if (node.nodeType === 1) {
            var curChild = node.firstChild;
            while(curChild) {
                removeNodeHelper(curChild, nestedInSavedEl || id);
                curChild = curChild.nextSibling;
            }
        }
    }

    function walkDiscardedChildNodes(node) {
        if (node.nodeType === 1) {
            var curChild = node.firstChild;
            while(curChild) {


                if (!curChild.id) {
                    // We only want to handle nodes that don't have an ID to avoid double
                    // walking the same saved element.

                    onNodeDiscarded(curChild);

                    // Walk recursively
                    walkDiscardedChildNodes(curChild);
                }

                curChild = curChild.nextSibling;
            }
        }
    }

    function removeNode(node, parentNode, alreadyVisited) {
        if (onBeforeNodeDiscarded(node) === false) {
            return;
        }

        parentNode.removeChild(node);
        if (alreadyVisited) {
            if (!node.id) {
                onNodeDiscarded(node);
                walkDiscardedChildNodes(node);
            }
        } else {
            removeNodeHelper(node);
        }
    }

    function morphEl(fromNode, toNode, alreadyVisited, childrenOnly) {
        if (toNode.id) {
            // If an element with an ID is being morphed then it is will be in the final
            // DOM so clear it out of the saved elements collection
            delete savedEls[toNode.id];
        }

        if (!childrenOnly) {
            if (onBeforeMorphEl(fromNode, toNode) === false) {
                return;
            }

            morphAttrs(fromNode, toNode);

            if (onBeforeMorphElChildren(fromNode, toNode) === false) {
                return;
            }
        }

        var curToNodeChild = toNode.firstChild;
        var curFromNodeChild = fromNode.firstChild;
        var curToNodeId;

        var fromNextSibling;
        var toNextSibling;
        var savedEl;
        var unmatchedEl;

        outer: while(curToNodeChild) {
            toNextSibling = curToNodeChild.nextSibling;
            curToNodeId = curToNodeChild.id;

            while(curFromNodeChild) {
                var curFromNodeId = curFromNodeChild.id;
                fromNextSibling = curFromNodeChild.nextSibling;

                if (!alreadyVisited) {
                    if (curFromNodeId && (unmatchedEl = unmatchedEls[curFromNodeId])) {
                        unmatchedEl.parentNode.replaceChild(curFromNodeChild, unmatchedEl);
                        morphEl(curFromNodeChild, unmatchedEl, alreadyVisited);
                        curFromNodeChild = fromNextSibling;
                        continue;
                    }
                }

                var curFromNodeType = curFromNodeChild.nodeType;

                if (curFromNodeType === curToNodeChild.nodeType) {
                    var isCompatible = false;

                    if (curFromNodeType === 1) { // Both nodes being compared are Element nodes
                        if (curFromNodeChild.tagName === curToNodeChild.tagName) {
                            // We have compatible DOM elements
                            if (curFromNodeId || curToNodeId) {
                                // If either DOM element has an ID then we handle
                                // those differently since we want to match up
                                // by ID
                                if (curToNodeId === curFromNodeId) {
                                    isCompatible = true;
                                }
                            } else {
                                isCompatible = true;
                            }
                        }

                        if (isCompatible) {
                            // We found compatible DOM elements so transform the current "from" node
                            // to match the current target DOM node.
                            morphEl(curFromNodeChild, curToNodeChild, alreadyVisited);
                        }
                    } else if (curFromNodeType === 3) { // Both nodes being compared are Text nodes
                        isCompatible = true;
                        // Simply update nodeValue on the original node to change the text value
                        curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                    }

                    if (isCompatible) {
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }
                }

                // No compatible match so remove the old node from the DOM and continue trying
                // to find a match in the original DOM
                removeNode(curFromNodeChild, fromNode, alreadyVisited);
                curFromNodeChild = fromNextSibling;
            }

            if (curToNodeId) {
                if ((savedEl = savedEls[curToNodeId])) {
                    morphEl(savedEl, curToNodeChild, true);
                    curToNodeChild = savedEl; // We want to append the saved element instead
                } else {
                    // The current DOM element in the target tree has an ID
                    // but we did not find a match in any of the corresponding
                    // siblings. We just put the target element in the old DOM tree
                    // but if we later find an element in the old DOM tree that has
                    // a matching ID then we will replace the target element
                    // with the corresponding old element and morph the old element
                    unmatchedEls[curToNodeId] = curToNodeChild;
                }
            }

            // If we got this far then we did not find a candidate match for our "to node"
            // and we exhausted all of the children "from" nodes. Therefore, we will just
            // append the current "to node" to the end
            fromNode.appendChild(curToNodeChild);

            curToNodeChild = toNextSibling;
            curFromNodeChild = fromNextSibling;
        }

        // We have processed all of the "to nodes". If curFromNodeChild is non-null then
        // we still have some from nodes left over that need to be removed
        while(curFromNodeChild) {
            fromNextSibling = curFromNodeChild.nextSibling;
            removeNode(curFromNodeChild, fromNode, alreadyVisited);
            curFromNodeChild = fromNextSibling;
        }

        var specialElHandler = specialElHandlers[fromNode.tagName];
        if (specialElHandler) {
            specialElHandler(fromNode, toNode);
        }
    }

    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;

    if (!childrenOnly) {
        // Handle the case where we are given two DOM nodes that are not
        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
        if (morphedNodeType === 1) {
            if (toNodeType === 1) {
                if (morphedNode.tagName !== toNode.tagName) {
                    onNodeDiscarded(fromNode);
                    morphedNode = moveChildren(morphedNode, document.createElement(toNode.tagName));
                }
            } else {
                // Going from an element node to a text node
                return toNode;
            }
        } else if (morphedNodeType === 3) { // Text node
            if (toNodeType === 3) {
                morphedNode.nodeValue = toNode.nodeValue;
                return morphedNode;
            } else {
                onNodeDiscarded(fromNode);
                // Text node to something else
                return toNode;
            }
        }
    }

    morphEl(morphedNode, toNode, false, childrenOnly);

    // Fire the "onNodeDiscarded" event for any saved elements
    // that never found a new home in the morphed DOM
    for (var savedElId in savedEls) {
        if (savedEls.hasOwnProperty(savedElId)) {
            var savedEl = savedEls[savedElId];
            onNodeDiscarded(savedEl);
            walkDiscardedChildNodes(savedEl);
        }
    }

    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        // If we had to swap out the from node with a new node because the old
        // node was not compatible with the target node then we need to
        // replace the old DOM node in the original DOM tree. This is only
        // possible if the original DOM node was part of a DOM tree which
        // we know is the case if it has a parent node.
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }

    return morphedNode;
}

module.exports = morphdom;