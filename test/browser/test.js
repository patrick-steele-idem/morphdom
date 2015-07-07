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

function markDescendentsRemoved(node) {
    var curNode = node.firstChild;
    while(curNode) {
        if (curNode.$testOnFromNodeFlag) {
            throw new Error('Descendent of removed node was incorrectly visited. Node: ' + curNode);
        }

        curNode.$testRemovedDescendentFlag = true;

        if (curNode.nodeType === 1) {
            markDescendentsRemoved(curNode);            
        }

        curNode = curNode.nextSibling;
    }
}

function runTest(name, htmlStrings) {
    var fromHtml = htmlStrings.from;
    var toHtml = htmlStrings.to;

    var fromNode = parseHtml(fromHtml);
    var toNode = parseHtml(toHtml);

    var allFromNodes = collectNodes(fromNode);

    var expectedSerialized = serializeNode(toNode);

    var elLookupBefore = buildElLookup(fromNode);

    function onFromNodeFound(node) {
        if (node.$testOnFromNodeFlag) {
            throw new Error('Duplicate onFromNodeFound for: ' + node);
        }

        if (node.$testRemovedDescendentFlag) {
            throw new Error('Descendent of a removed "from" node is incorrectly being visited. Node: ' + node);
        }

        node.$testOnFromNodeFlag = true;


    }

    function onFromNodeRemoved(node) {
        if (node.$testOnFromNodeRemovedFlag) {
            throw new Error('Duplicate onFromNodeRemoved for: ' + node);
        }

        node.$testOnFromNodeRemovedFlag = true;

        markDescendentsRemoved(node);
    }

    var morphedNode = morphdom(fromNode, toNode, {
        onFromNodeFound: onFromNodeFound,
        onFromNodeRemoved: onFromNodeRemoved
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
        if (node.$testOnFromNodeFlag && node.$testRemovedDescendentFlag) {
            throw new Error('Descendent of a removed "from" node was visited. Node: ' + node);
        }

        if (!node.$testOnFromNodeFlag && !node.$testRemovedDescendentFlag) {
            throw new Error('"from" node not found during morph ' + node);
        }
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

    it('should transform an input el', function() {
        var el1 = document.createElement('input');
        el1.type = 'text';
        el1.value = 'Hello World';

        var el2 = document.createElement('input');
        el2.setAttribute('type', 'text');
        el2.setAttribute('value', 'Hello World 2');

        morphdom(el1, el2);

        expect(el1.value).to.equal('Hello World 2');
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
});



