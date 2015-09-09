var chai = require('chai');
var expect = chai.expect;
var morphdom = require('../../lib/index');
var resultTemplate = require('./test-result.marko');

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

function runTest(name, autoTest) {
    var fromHtml = autoTest.from;
    var toHtml = autoTest.to;
    var moduleStr = autoTest.module;

    var fromNode = parseHtml(fromHtml);
    var toNode = parseHtml(toHtml);

    var allFromNodes = collectNodes(fromNode);

    var expectedSerialized = serializeNode(toNode);

    var elLookupBefore = buildElLookup(fromNode);

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
        onBeforeNodeDiscarded: onBeforeNodeDiscarded,
        onNodeDiscarded: onNodeDiscarded,
        onBeforeMorphEl: onBeforeMorphEl,
        onBeforeMorphElChildren: onBeforeMorphElChildren
    });

    var elLookupAfter = buildElLookup(morphedNode);

    var resultHtml = resultTemplate.renderSync({
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

function addTests() {
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

        it('should allow ignoring a text input value', function() {
            var el1 = document.createElement('input');
            el1.type = 'text';
            el1.value = 'Hello World';

            var el2 = document.createElement('input');
            el2.setAttribute('type', 'text');
            el2.setAttribute('value', 'Hello World 2');

            morphdom(el1, el2, {
                ignoreFormValues: true
            });

            expect(el1.value).to.equal('Hello World');
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

        it('should allow ingoring a checkbox value', function() {
            var el1 = document.createElement('input');
            el1.type = 'checkbox';
            el1.setAttribute('checked', '');
            el1.checked = false;

            var el2 = document.createElement('input');
            el2.setAttribute('type', 'text');
            el2.setAttribute('checked', '');

            morphdom(el1, el2, {
                ignoreFormValues: true
            });

            expect(el1.checked).to.equal(false);
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
                    if (el.tagName === 'B') {
                        return false;
                    }
                }
            });

            expect(el1a.childNodes[0].tagName).to.equal('B');
            expect(el1a.childNodes[1].tagName).to.equal('A');
        });

        it('should transform a simple el to a target HTML string', function() {
            var el1 = document.createElement('div');
            el1.innerHTML  = '<button>Click Me</button>';

            morphdom(el1, '<div class="bar"><button>Click Me</button>');

            expect(el1.className).to.equal('bar');
            expect(el1.firstChild.tagName).to.equal('BUTTON');
        });

        it('should allow only morphing child nodes', function() {
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

        it('should transform an textarea el', function() {
            var el1 = document.createElement('div');
            el1.innerHTML = '<textarea>foo</textarea>';
            el1.firstChild.value = 'foo2';

            var el2 = document.createElement('div');
            el2.innerHTML = '<textarea>bar</textarea>';

            morphdom(el1, el2);

            expect(el1.firstChild.value).to.equal('bar');
        });

        it('should allow ignoring a textarea value', function() {
            var el1 = document.createElement('div');
            el1.innerHTML = '<textarea>foo</textarea>';
            el1.firstChild.value = 'foo2';

            var el2 = document.createElement('div');
            el2.innerHTML = '<textarea>bar</textarea>';

            morphdom(el1, el2, {
                ignoreFormValues: true
            });

            expect(el1.firstChild.value).to.equal('foo2');
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
    });
}

if (require('../mocha-phantomjs/generated/config').runTests === true) {
    addTests();
}


