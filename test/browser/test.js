var chai = require('chai');
var expect = chai.expect;
var morphdom = require('../../lib/index');
var resultTemplate = require('./result.marko');

function parseHtml(html) {
    var tmp = document.createElement('body');
    tmp.innerHTML = html;
    return tmp.firstChild;
}


function serializeNode(node) {
    var html = '';

    function serializeElHelper(el, indent) {
        html += indent + '<' + el.tagName;

        var attributes = el.attributes;
        var attributesArray = [];

        for (var i=0; i<attributes.length; i++) {
            var attr = attributes[i];
            if (attr.specified !== false) {
                attributesArray.push(' ' + attr.name + '="' + attr.value + '"');
            }
        }

        attributesArray.sort();

        html += attributesArray.join('');

        html += '>\n';

        var childNodes = el.childNodes;

        if (childNodes && childNodes.length) {
            for (i=0; i<childNodes.length; i++) {
                serializeHelper(childNodes[i], indent + '  ');
            }
        }
    }

    function serializeTextHelper(node, indent) {
        html += indent + JSON.stringify(node.nodeValue) + '\n';
    }

    function serializeHelper(node, indent) {
        if (node.nodeType === 1) {
            serializeElHelper(node, indent);
        } else if (node.nodeType === 3) {
            serializeTextHelper(node, indent);
        } else {
            throw new Error('Unexpected node type');
        }
    }

    serializeHelper(node, '');

    return html;
}

function buildElLookup(node) {
    var map = {};

    function buildMapHelper(node) {
        if (node.nodeType !== 1) {
            return;
        }

        var id = node.getAttribute('id');
        if (id) {
            map[id] = node;
        }

        var curNode = node.firstChild;
        while(curNode) {
            buildMapHelper(curNode);
            curNode = curNode.nextSibling;
        }
    }

    buildMapHelper(node);
    return map;
}

function collectNodes(rootNode) {
    var allNodes = [];

    function buildArrayHelper(node) {
        allNodes.push(node);
        var curNode = node.firstChild;
        while(curNode) {
            buildArrayHelper(curNode);
            curNode = curNode.nextSibling;
        }
    }

    buildArrayHelper(rootNode);
    return allNodes;
}

function isNodeInTree(node, rootNode) {
    if (node == null) {
        throw new Error('Invalid arguments');
    }
    var currentNode = node;

    while (true) {
        if (currentNode == null) {
            return false;
        } else if (currentNode == rootNode) {
            return true;
        }

        currentNode = currentNode.parentNode;
    }

    return false;
}

function runTest(name, htmlStrings) {
    var fromHtml = htmlStrings.from;
    var toHtml = htmlStrings.to;

    var fromNode = parseHtml(fromHtml);
    var toNode = parseHtml(toHtml);

    var allFromNodes = collectNodes(fromNode);

    var expectedSerialized = serializeNode(toNode);

    var elLookupBefore = buildElLookup(fromNode);

    function onNodeDiscarded(node) {
        if (node.$onNodeDiscarded) {
            throw new Error('Duplicate onNodeDiscarded for: ' + serializeNode(node));
        }

        node.$onNodeDiscarded = true;
    }

    function onBeforeMorphEl(node) {
        if (node.$onBeforeMorphEl) {
            throw new Error('Duplicate onBeforeMorphEl for: ' + serializeNode(node));
        }

        node.$onBeforeMorphEl = true;
    }

    function onBeforeMorphElChildren(node) {
        if (node.$onBeforeMorphElChildren) {
            throw new Error('Duplicate onBeforeMorphElChildren for: ' + serializeNode(node));
        }

        node.$onBeforeMorphElChildren = true;
    }

    var morphedNode = morphdom(fromNode, toNode, {
        onNodeDiscarded: onNodeDiscarded,
        onBeforeMorphEl: onBeforeMorphEl,
        onBeforeMorphElChildren: onBeforeMorphElChildren
    });

    var elLookupAfter = buildElLookup(morphedNode);

    var resultHtml = resultTemplate.renderSync({
        name: name,
        fromHtml: fromHtml,
        expectedHtml: toHtml,
        actualHtml: morphedNode.outerHTML
    });

    var containerEl = document.createElement('div');
    containerEl.innerHTML = resultHtml;
    document.getElementById('test').appendChild(containerEl);
    // console.log('elLookupBefore: ', elLookupBefore);

    var morphedNodeSerialized = serializeNode(morphedNode);

    expect(morphedNodeSerialized).to.equal(expectedSerialized);

    // console.log(morphedNodeSerialized);

    // Make sure any nodes with an ID that were in both the before and
    // after nodes are identical
    Object.keys(elLookupBefore).forEach(function(elId) {
        var afterEl =  elLookupAfter[elId];
        if (afterEl) {
            expect(afterEl).to.equal(elLookupBefore[elId]);
        }
    });

    allFromNodes.forEach(function(node) {
        if (node.$onNodeDiscarded && isNodeInTree(node, morphedNode)) {
            throw new Error('"from" node was reported as being discarded, but it still in the final DOM tree. Node: ' + serializeNode(node));
        }

        if (node.nodeType === 1 && node.$onNodeDiscarded !== true) {
            if (!node.$onBeforeMorphEl) {
                throw new Error('"from" element was not reported as being discarded, but it was not morphed. Node: ' + serializeNode(node));
            }
        }

        // if (isNodeInTree(node, morphedNode)) {
        //     if (node.$testOnFromNodeRemovedFlag) {
        //         throw new Error('onFromNodeRemoved(node) called for node that is in the final DOM tree: ' + node);
        //     }
        // } else {
        //     if (!node.$testOnFromNodeRemovedFlag) {
        //         throw new Error('"from" node was removed but onFromNodeRemoved(node) was not called: ' + node);
        //     }
        // }
    });
}

describe('morphdom' , function() {
    this.timeout(0);

    beforeEach(function() {
    });

    describe('auto tests', function() {
        var htmlStrings = require('../mocha-phantomjs/generated/html-strings');

        Object.keys(htmlStrings).forEach(function(name) {
            var test = htmlStrings[name];
            var itFunc = test.only ? it.only : it;

            itFunc(name, function() {
                runTest(name, test);
            });
        });
    });

    it('should transform a simple el', function() {
        var el1 = document.createElement('div');
        el1.className = 'foo';

        var el2 = document.createElement('div');
        el2.className = 'bar';

        morphdom(el1, el2);

        expect(el1.className).to.equal('bar');
    });

    it('should transform an text input el', function() {
        var el1 = document.createElement('input');
        el1.type = 'text';
        el1.value = 'Hello World';

        var el2 = document.createElement('input');
        el2.setAttribute('type', 'text');
        el2.setAttribute('value', 'Hello World 2');

        morphdom(el1, el2);

        expect(el1.value).to.equal('Hello World 2');
    });

    it('should transform a checkbox input el', function() {
        var el1 = document.createElement('input');
        el1.type = 'checkbox';
        el1.setAttribute('checked', '');
        el1.checked = false;

        var el2 = document.createElement('input');
        el2.setAttribute('type', 'text');
        el2.setAttribute('checked', '');

        morphdom(el1, el2);

        expect(el1.checked).to.equal(true);
    });

    it('should transform an incompatible node and maintain the same parent', function() {
        var parentEl = document.createElement('div');


        var el1 = document.createElement('input');
        el1.type = 'text';
        el1.value = 'Hello World';
        parentEl.appendChild(el1);

        var el2 = document.createElement('p');
        var morphedNode = morphdom(el1, el2);

        expect(morphedNode.parentNode).to.equal(parentEl);
    });

    it('should handle the "disabled" attribute correctly', function() {
        var el1 = document.createElement('input');
        el1.disabled = true;

        el1.value = 'Hello World';

        var el2 = document.createElement('input');
        el2.setAttribute('value', 'Hello World 2');

        morphdom(el1, el2);

        expect(el2.disabled).to.equal(false);
    });

    it('should allow morphing to be skipped for a node', function() {
        var el1a = document.createElement('div');
        var el1b = document.createElement('b');
        el1b.setAttribute('class', 'foo');
        el1a.appendChild(el1b);

        var el2a = document.createElement('div');
        var el2b = document.createElement('b');
        el2b.setAttribute('class', 'bar');
        el2a.appendChild(el2b);


        morphdom(el1a, el2a, {
            onBeforeMorphEl: function(el) {
                if (el.tagName === 'B') {
                    return false;
                }
            }
        });

        expect(el1a.childNodes[0].className).to.equal('foo');
    });
});



