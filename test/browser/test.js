var chai = require('chai');
var expect = chai.expect;
var morphdom = require('../../');
var resultTemplate = require('./test-result.marko');
var markoVDOM = require('marko-vdom');
var markoVDOMVirtualize = require('marko-vdom/virtualize');

function parseHtml(html) {
    var tmp = document.createElement('body');
    tmp.innerHTML = html;
    return tmp.firstChild;
}

function startsWith(str, prefix) {
    if (str.length < prefix.length) {
        return false;
    }

    return str.substring(0, prefix.length) == prefix;
}

function serializeNode(node) {

    // NOTE: We don't use XMLSerializer because we need to sort the attributes to correctly compare output HTML strings
    // BAD: return (new XMLSerializer()).serializeToString(node);
    var html = '';
    function serializeHelper(node, indent) {
        if (node.nodeType === 1) {
            serializeElHelper(node, indent);
        } else if (node.nodeType === 3) {
            serializeTextHelper(node, indent);
        } else {
            throw new Error('Unexpected node type');
        }
    }

    function serializeElHelper(el, indent) {
        var nodeName = el.tagName;

        var namespaceURI = el.namespaceURI;

        if (namespaceURI === 'http://www.w3.org/2000/svg') {
            nodeName = 'svg:' + nodeName;
        } else if (namespaceURI === 'http://www.w3.org/1998/Math/MathML') {
            nodeName = 'math:' + nodeName;
        } else if (namespaceURI !== 'http://www.w3.org/1999/xhtml') {
            nodeName = namespaceURI + ':' + nodeName;
        }

        html += indent + '<' + nodeName;

        var attributes = el.attributes;
        var attributesArray = [];

        for (var i=0; i<attributes.length; i++) {
            var attr = attributes[i];
            if (attr.specified !== false) {
                if (startsWith(attr.name, 'xmlns')) {
                    return;
                }
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

function outerHTML(node) {
    var placeholderEl = document.createElement('span');
    node.parentNode.replaceChild(placeholderEl, node);


    var container = document.createElement('body');
    container.appendChild(node);
    var html = container.innerHTML;

    placeholderEl.parentNode.replaceChild(node, placeholderEl);

    return html;
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

function runTest(name, autoTest, virtual) {
    var fromHtml = autoTest.from;
    var toHtml = autoTest.to;
    var moduleStr = autoTest.module;

    var fromNode = parseHtml(fromHtml);
    var toNode = parseHtml(toHtml);

    var allFromNodes = collectNodes(fromNode);

    var expectedSerialized = serializeNode(toNode);

    if (virtual) {
        toNode = markoVDOMVirtualize(toNode);
    }

    var elLookupBefore = buildElLookup(fromNode);

    function onBeforeNodeAdded(node) {
        if (node.$onBeforeNodeAdded) {
            throw new Error('Duplicate onBeforeNodeAdded for: ' + serializeNode(node));
        }

        node.$onBeforeNodeAdded = true;
    }
    function onNodeAdded(node) {
        if (node.$onNodeAdded) {
            throw new Error('Duplicate onNodeAdded for: ' + serializeNode(node));
        }

        node.$onNodeAdded = true;
    }

    function onBeforeElUpdated(node) {
        if (node.$onBeforeElUpdated) {
            throw new Error('Duplicate onBeforeElUpdated for: ' + serializeNode(node));
        }

        node.$onBeforeElUpdated = true;
    }
    function onElUpdated(node) {
        if (node.$onElUpdated) {
            throw new Error('Duplicate onElUpdated for: ' + serializeNode(node));
        }

        node.$onElUpdated = true;
    }

    function onBeforeNodeDiscarded(node) {
        if (node.$onBeforeNodeDiscarded) {
            throw new Error('Duplicate oonBeforeNodeDiscarded for: ' + serializeNode(node));
        }

        node.$onBeforeNodeDiscarded = true;
    }
    function onNodeDiscarded(node) {
        if (node.$onNodeDiscarded) {
            throw new Error('Duplicate onNodeDiscarded for: ' + serializeNode(node));
        }

        node.$onNodeDiscarded = true;
    }

    function onBeforeNodeChildrenUpdated(node) {
        if (node.$onBeforeNodeChildrenUpdated) {
            throw new Error('Duplicate onBeforeNodeChildrenUpdated for: ' + serializeNode(node));
        }

        node.$onBeforeNodeChildrenUpdated = true;
    }

    var morphedNode = morphdom(fromNode, toNode, {
        onBeforeNodeAdded: onBeforeNodeAdded,
        onNodeAdded: onNodeAdded,
        onBeforeElUpdated: onBeforeElUpdated,
        onElUpdated: onElUpdated,
        onBeforeNodeDiscarded: onBeforeNodeDiscarded,
        onNodeDiscarded: onNodeDiscarded,
        onBeforeNodeChildrenUpdated: onBeforeNodeChildrenUpdated
    });

    var elLookupAfter = buildElLookup(morphedNode);

    var resultHtml = resultTemplate.renderToString({
        name: name,
        fromHtml: fromHtml,
        expectedHtml: toHtml,
        actualHtml: outerHTML(morphedNode)
    });

    var containerEl = document.createElement('div');
    containerEl.innerHTML = resultHtml;
    document.getElementById('test-results').appendChild(containerEl);
    // console.log('elLookupBefore: ', elLookupBefore);

    var morphedNodeSerialized = serializeNode(morphedNode);

    expect(morphedNodeSerialized).to.equal(expectedSerialized);

    // console.log('morphedNodeSerialized: ' + morphedNodeSerialized);
    // console.log('expectedSerialized: ' + expectedSerialized);
    // console.log('morphedNode.outerHTML: ' + outerHTML(morphedNode));

    // console.log(morphedNodeSerialized);

    // Make sure any nodes with an ID that were in both the before and
    // after nodes are identical
    Object.keys(elLookupBefore).forEach(function(elId) {
        var afterEl =  elLookupAfter[elId];
        if (afterEl) {
            var beforeEl = elLookupBefore[elId];
            if (afterEl.tagName === beforeEl.tagName) {
                expect(afterEl).to.equal(beforeEl);
            }
        }
    });

    allFromNodes.forEach(function(node) {
        if (node.$onNodeDiscarded && isNodeInTree(node, morphedNode)) {
            throw new Error('"from" node was reported as being discarded, but it still in the final DOM tree. Node: ' + serializeNode(node));
        }

        if (node.nodeType === 1 && node.$onNodeDiscarded !== true) {
            if (!node.$onBeforeElUpdated) {
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

    if (moduleStr) {
        var autoTestExports = {};
        var moduleFactory = eval('(function(exports) { ' + moduleStr + ' })');
        moduleFactory(autoTestExports);

        var verify = autoTestExports.verify;
        if (verify) {
            var verifyContext = {
                rootNode:  morphedNode
            };

            verify(verifyContext, expect);
        }
    }
}

function node(tag, attrs, body) {
    var el = document.createElement(tag);

    if (typeof attrs === 'string') {
        var id = attrs;
        el.id = id;
    } else if (attrs != null) {
        for (var attr in attrs) {
            el.setAttribute(attr, attrs[attr]);
        }
    }

    if (body) {
        el.innerHTML = body;
    }
    return el;
}

describe('morphdom' , function() {
    this.timeout(0);

    beforeEach(function() {
    });

    describe('auto tests', function() {
        var autoTests = require('../mocha-phantomjs/generated/auto-tests');

        Object.keys(autoTests).forEach(function(name) {
            var test = autoTests[name];
            var itFunc = test.only ? it.only : it;

            itFunc(name, function() {
                runTest(name, test);
            });
        });
    });

    describe('auto tests - vdom', function() {
        var autoTests = require('../mocha-phantomjs/generated/auto-tests');

        Object.keys(autoTests).forEach(function(name) {

            var test = autoTests[name];
            var itFunc = test.only ? it.only : it;

            itFunc(name + ' (vdom)', function() {
                runTest(name, test, true /* virtual */);
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

    it('should transform a text input el', function() {
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

    it('should allow adding to be skipped for a node', function() {
        var el1a = document.createElement('div');
        var el1b = document.createElement('b');
        el1a.appendChild(el1b);

        var el2a = document.createElement('div');
        var el2b = document.createElement('b');
        var el2c = document.createElement('i');
        el2a.appendChild(el2b);
        el2a.appendChild(el2c);

        morphdom(el1a, el2a, {
            onBeforeNodeAdded: function(el) {
                if (el.nodeName === 'I') {
                    return false;
                }
            }
        });

        expect(el1a.childNodes.length).to.equal(1);
    });

    it('should emit when a node is added', function() {
        var el1a = document.createElement('div');
        var el1b = document.createElement('b');
        el1a.appendChild(el1b);

        var el2a = document.createElement('div');
        var el2b = document.createElement('b');
        var el2c = document.createElement('i');
        el2a.appendChild(el2b);
        el2a.appendChild(el2c);

        var addedNode;

        morphdom(el1a, el2a, {
            onNodeAdded: function(el) {
                addedNode = el;
            }
        });

        expect(addedNode).to.equal(el2c);
    });

    it('should allow updating to be skipped for a node', function() {
        var el1a = document.createElement('div');
        var el1b = document.createElement('b');
        el1b.setAttribute('class', 'foo');
        el1a.appendChild(el1b);

        var el2a = document.createElement('div');
        var el2b = document.createElement('b');
        el2b.setAttribute('class', 'bar');
        el2a.appendChild(el2b);

        morphdom(el1a, el2a, {
            onBeforeElUpdated: function(el) {
                if (el.nodeName === 'B') {
                    return false;
                }
            }
        });

        expect(el1a.childNodes[0].className).to.equal('foo');
    });

    it('should emit when a node is updated', function() {
        var el1a = document.createElement('div');
        var el1b = document.createElement('b');
        el1b.setAttribute('class', 'foo');
        el1a.appendChild(el1b);

        var el2a = document.createElement('div');
        var el2b = document.createElement('b');
        el2b.setAttribute('class', 'bar');
        el2a.appendChild(el2b);

        var updatedNode;

        morphdom(el1a, el2a, {
            onElUpdated: function(el) {
                updatedNode = el;
            }
        });

        expect(updatedNode).to.equal(el1b);
    });

    it('should allow discarding to be skipped for a node', function() {
        var el1a = document.createElement('div');
        var el1b = document.createElement('b');
        var el1c = document.createElement('span');
        var el1d = document.createElement('a');
        el1a.appendChild(el1b);
        el1a.appendChild(el1c);
        el1a.appendChild(el1d);

        var el2a = document.createElement('div');
        var el2b = document.createElement('a');
        el2a.appendChild(el2b);

        morphdom(el1a, el2a, {
            onBeforeNodeDiscarded: function(el) {
                if (el.nodeName === 'B') {
                    return false;
                }
            }
        });

        expect(el1a.childNodes[0].nodeName).to.equal('B');
        expect(el1a.childNodes[1].nodeName).to.equal('A');
    });

    it('should emit when a node is discarded', function() {
        var el1a = document.createElement('div');
        var el1b = document.createElement('b');
        el1a.appendChild(el1b);

        var el2a = document.createElement('div');

        var discardedNode;

        morphdom(el1a, el2a, {
            onNodeDiscarded: function(el) {
                discardedNode = el;
            }
        });

        expect(discardedNode).to.equal(el1b);
    });

    it('should transform a simple el to a target HTML string', function() {
        var el1 = document.createElement('div');
        el1.innerHTML  = '<button>Click Me</button>';

        morphdom(el1, '<div class="bar"><button>Click Me</button>');

        expect(el1.className).to.equal('bar');
        expect(el1.firstChild.nodeName).to.equal('BUTTON');
    });

    it('should allow updates to child nodes only', function() {
        var el1 = document.createElement('div');
        el1.className = 'foo';
        el1.innerHTML  = '<button class="hello">A</button>';

        var morphedEl = morphdom(el1, '<div class="bar"><button class="world">B</button></div>', {
            childrenOnly: true
        });

        expect(morphedEl).to.equal(el1);

        var button = el1.querySelector('button');

        expect(el1.className).to.equal('foo');
        expect(button.className).to.equal('world');
        expect(button.innerHTML).to.equal('B');
    });

    it('should transform a textarea el', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<textarea>foo</textarea>';
        el1.firstChild.value = 'foo2';

        var el2 = document.createElement('div');
        el2.innerHTML = '<textarea>bar</textarea>';

        morphdom(el1, el2);

        expect(el1.firstChild.value).to.equal('bar');
    });

    it('should preserve placeholder in an empty textarea el', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<textarea placeholder="foo"></textarea>';
        var textarea1 = el1.firstChild;

        // Special test for IE behavior.
        if (textarea1.firstChild && textarea1.firstChild.nodeValue === 'foo') {
          var el2 = document.createElement('div');
          el2.innerHTML = '<textarea placeholder="foo"></textarea>';

          morphdom(el1, el2);

          expect(textarea1.firstChild.nodeValue).to.equal('foo');
        }
    });

    it('should not change caret position if input value did not change', function() {
        var inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.value = 'HELLO';
        inputEl.id = 'focusInput';
        document.body.appendChild(inputEl);

        inputEl.focus();

        inputEl.setSelectionRange(0, 0);
        expect(inputEl.selectionStart).to.equal(0);

        function update() {
            var newInput = document.createElement('input');
            newInput.type = 'text';
            newInput.id = 'focusInput';
            newInput.value = inputEl.value;
            morphdom(inputEl, newInput);
        }

        inputEl.addEventListener('input', update);

        update();

        expect(inputEl.selectionStart).to.equal(0);
    });

    it('should determine correct matching elements by id', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<span id="span1"></span><span id="span2"></span>';

        var el2 = document.createElement('div');
        el2.innerHTML = '<span id="span2"></span>';

        var span2 = el1.children[1];

        var morphedEl = morphdom(el1, el2);

        expect(morphedEl.children[0]).to.equal(span2);
        expect(morphedEl.children.length).to.equal(1);
    });

    it('should determine correct matching elements by attribute "data-id"', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<span data-id="1"></span><span data-id="2"></span>';

        var el2 = document.createElement('div');
        el2.innerHTML = '<span data-id="2"></span>';

        var span2 = el1.children[1];

        var morphedEl = morphdom(el1, el2, {
            getNodeKey: function(el) {
                return el.dataset.id;
            }
        });

        expect(morphedEl.children[0]).to.equal(span2);
        expect(morphedEl.children.length).to.equal(1);
    });

    it('should allow ignoring a textarea value', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<textarea>foo</textarea>';
        el1.firstChild.value = 'foo2';

        var el2 = document.createElement('div');
        el2.innerHTML = '<textarea>bar</textarea>';

        morphdom(el1, el2, {
            onBeforeElUpdated: function(fromEl, toEl) {
                if (fromEl.nodeName === 'TEXTAREA' || fromEl.nodeName === 'INPUT') {
                    toEl.checked = fromEl.checked;
                    toEl.value = fromEl.value;
                } else if (fromEl.nodeName === 'OPTION') {
                    toEl.selected = fromEl.selected;
                }
            }
        });

        expect(el1.firstChild.value).to.equal('foo2');
    });

    it('should reuse DOM element with matching ID and class name', function() {
        var fromEl = document.createElement('p');
        var toEl = document.createElement('p');

        fromEl.innerHTML = '<div id="qwerty" class="div1"></div>';
        toEl.innerHTML = '<span><div id="qwerty" class="div1"></div></span>';

        var div1a = fromEl.querySelector('.div1');

        morphdom(fromEl, toEl);

        var div1b = fromEl.querySelector('.div1');

        expect(div1a).to.equal(div1b);
    });

    it('should transform an html document el to a target HTML string', function() {
        var el1 = document.createElement('html');
        el1.innerHTML = '<html><head><title>Test</title></head><body>a</body></html>';

        expect(el1.firstChild.nextSibling.innerHTML).to.equal('a');

        morphdom(el1, '<html><head><title>Test</title></head><body>b</body></html>');

        expect(el1.nodeName).to.equal('HTML');
        expect(el1.firstChild.nodeName).to.equal('HEAD');
        expect(el1.firstChild.nextSibling.nodeName).to.equal('BODY');
        expect(el1.firstChild.nextSibling.innerHTML).to.equal('b');
    });

    it('should not alter the DOM unnecessarily in the presence of comments', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<!-- comment --><div class="div1">a</div>';

        var el2 = el1.cloneNode(true);

        var addedNodes = [];
        var discardedNodes = [];
        morphdom(el1, el2, {
            onNodeAdded: function(el) { addedNodes.push(el); },
            onNodeDiscarded: function(el) { discardedNodes.push(el); }
        });

        // This was a no-op update, and should have made no changes
        expect(addedNodes.length).to.equal(0);
        expect(discardedNodes.length).to.equal(0);
    });

    it('patch tags by id', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<span id="boo" class="foo"></span>';

        var el2 = document.createElement('div');
        el2.innerHTML = '<div id="boo"></div>';

        var finalEl = morphdom(el1, el2);

        expect(finalEl.innerHTML).to.equal('<div id="boo"></div>');
    });

    it('should not remove keyed elements that are part of a DOM subtree that is skipped using onBeforeElUpdated', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<span id="skipMe"><span id="skipMeChild"></span></span>';

        var el2 = document.createElement('div');
        el2.innerHTML = '<span id="skipMe"></div>';

        morphdom(el1, el2, {
            onBeforeElUpdated: function(el) {
                if (el.id === 'skipMe') {
                    return false;
                }
            }
        });

        expect(el1.querySelector('#skipMeChild') != null).to.equal(true);
    });

    it('should not remove keyed elements that are part of a DOM subtree that is skipped using onBeforeElChildrenUpdated', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = '<span id="skipMe"><span id="skipMeChild"></span></span>';

        var el2 = document.createElement('div');
        el2.innerHTML = '<span id="skipMe"></div>';

        morphdom(el1, el2, {
            onBeforeElChildrenUpdated: function(el) {
                if (el.id === 'skipMe') {
                    return false;
                }
            }
        });

        expect(el1.querySelector('#skipMeChild') != null).to.equal(true);
    });

    it('should transform a virtual text input el', function() {
        var el1 = document.createElement('input');
        el1.type = 'text';
        el1.value = 'Hello World';

        var el2 = markoVDOM.createElement('input', { type: 'text', value: 'Hello World 2'}, 0);

        morphdom(el1, el2);

        expect(el1.value).to.equal('Hello World 2');
    });

    it('should transform a virtual div', function() {
        var el1 = document.createElement('div');
        el1.className = 'foo';
        el1.appendChild(document.createTextNode('FOO'));

        var el2 = markoVDOM.createElement('div', { class: 'bar' }, 1 /* child count */)
            .t('BAR');

        morphdom(el1, el2);

        expect(el1.className).to.equal('bar');
        expect(el1.childNodes[0].nodeValue).to.equal('BAR');
    });

    it('should actualize a virtual HTML element when it is added to the final DOM', function() {
        var el1 = document.createElement('div');
        el1.className = 'foo';

        var el2 = markoVDOM.createElement('div', { class: 'bar' }, 1)
            .e('span', { class: 'baz' }, 1)
                .t('foo');

        morphdom(el1, el2);

        expect(el1.className).to.equal('bar');
        expect(el1.childNodes[0].nodeName).to.equal('SPAN');
        expect(el1.childNodes[0].getAttribute('class')).to.equal('baz');
        expect(el1.childNodes[0].childNodes[0].nodeValue).to.equal('foo');
    });

    it('should use isSameNode to allow reference proxies', function() {
        var el1 = document.createElement('div');
        el1.innerHTML = 'stay gold';
        var el2 = document.createElement('div');
        el2.innerHTML = 'ponyboy';
        el2.isSameNode = function (el) {
            return el.isSameNode(el1);
        };
        morphdom(el1, el2);
        expect(el1.innerHTML).to.equal('stay gold');

        var containEl1 = document.createElement('div');
        containEl1.appendChild(el1);
        var containEl2 = document.createElement('div');
        containEl2.appendChild(el2);
        morphdom(containEl1, containEl2);
        expect(el1.innerHTML).to.equal('stay gold');
    });

    it('should morph siblings of reference proxies', function() {
        var parentFrom = document.createElement('div');
        var html = '';
        html += '<div class="one">one</div>';
        html += '<div class="two">two</div>';
        html += '<div class="three">three</div>';
        parentFrom.innerHTML = html;
        var parentTo = parentFrom.cloneNode(true);
        var hasProxy = parentFrom.querySelector('.two');
        hasProxy.innerHTML = 'hasProxy';
        var proxy = parentTo.querySelector('.two');
        proxy.isSameNode = function (el) {
            return el.isSameNode(hasProxy);
        };
        parentTo.querySelector('.three').innerHTML = 'four';

        morphdom(parentFrom, parentTo);

        var child = parentFrom.querySelectorAll('*');
        expect(child[0].outerHTML).to.equal('<div class="one">one</div>');
        expect(child[1].outerHTML).to.equal('<div class="two">hasProxy</div>');
        expect(child[2].outerHTML).to.equal('<div class="three">four</div>');
    });

    it('Should remove child nodes - nodes to be removed first ', function() {
        var el1 = node('div', 'el');
        el1.appendChild(node('span'));
        el1.appendChild(node('span'));
        el1.appendChild(node('span'));
        el1.appendChild(node('span', 'child4'));

        var el2 = node('div', 'el');
        el2.appendChild(node('span', 'child4'));

        morphdom(el1, el2);

        expect(el1.children.length).to.equal(1);
    });

    it('Should remove child nodes - nodes to be removed last ', function() {
        var el1 = node('div', 'el');
        el1.appendChild(node('span', 'child1'));
        el1.appendChild(node('span'));
        el1.appendChild(node('span'));
        el1.appendChild(node('span'));

        var el2 = node('div', 'el');
        el2.appendChild(node('span', 'child1'));

        morphdom(el1, el2);

        expect(el1.children.length).to.equal(1);
    });

    it('should update selection state on select elements', function () {
        var el1 = node('select');
        el1.appendChild(node('option', {'selected': ''}, 'Option 1'));
        el1.appendChild(node('option', {}, 'Option 2'));

        document.body.appendChild(el1);

        var el2 = node('select');
        el2.appendChild(node('option', {}, 'Option 1'));
        el2.appendChild(node('option', {'selected': ''}, 'Option 2'));

        morphdom(el1, el2);

        expect(el1.selectedIndex).to.equal(1);
    });

    // xit('should reuse DOM element with matching ID and class name (2)', function() {
    //     // NOTE: This test is currently failing. We need to improve the special case code
    //     //       for handling incompatible root nodes.
    //     var fromEl = document.createElement('div');
    //     var toEl = document.createElement('div');
    //
    //     fromEl.innerHTML = '<div id="qwerty" class="div1"></div>';
    //     toEl.innerHTML = '<span><div id="qwerty" class="div1"></div></span>';
    //
    //     fromEl = fromEl.firstChild;
    //     toEl = toEl.firstChild;
    //
    //     var div1 = fromEl;
    //
    //     var morphedEl = morphdom(fromEl, toEl);
    //
    //     var div1_2 = morphedEl.querySelector('.div1');
    //
    //     expect(div1).to.equal(div1_2);
    // });

});
