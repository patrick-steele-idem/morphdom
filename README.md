morphdom
========

_NOTE: This module is experimental, but seems to work in the latest browsers. Use at own risk!_

Simple module for morphing an existing DOM node tree to match a target DOM node tree. It's fast and works with the real DOM—no virtual DOM here!

The transformation is done in a single pass and is designed to minimize changes to the DOM while still ensuring that the morphed DOM exactly matches the target DOM. In addition, the algorithm used by this module will automatically match up elements that have corresponding IDs and that are found in both the original and target DOM tree.

NOTE: This module will modify both the original and target DOM node tree during the transformation. It is assumed that the target DOM node tree will be discarded after the original DOM node tree is morphed.

# Usage

```javascript
var morphdom = require('morphdom');

var el1 = document.createElement('div');
el1.className = 'foo';

var el2 = document.createElement('div');
el2.className = 'bar';

morphdom(el1, el2);

expect(el1.className).to.equal('bar');
```

# API

## morphdom(fromNode, toNode, options) : Node

The `morphdom(fromNode, toNode, options)` function supports the following arguments:

- *fromNode* (`Node`)- The node to morph
- *toNode* (`Node`) - The node that the `fromNode` should be morphed to
- *options* (`Object`) - See below for supported options

The returned value will typically be the `fromNode`. However, in situations where the `fromNode` is not compatible with the `toNode` (either different node type or different tag name) then a different DOM node will be returned.

Supported options (all optional):

- *onNodeDiscarded* (`Function(node)`) - A function that will called when a `Node` in the `from` tree has been discarded and will no longer exist in the final DOM tree.
- *onBeforeMorphEl* (`Function(fromEl, toEl)`) - A function that will called when a `HTMLElement` in the `from` tree is about to be morphed. If the listener function returns `false` then the element will be skipped.
- *onBeforeMorphElChildren* (`Function(fromEl, toEl)`) - A function that will called when the children of an `HTMLElement` in the `from` tree are about to be morphed. If the listener function returns `false` then the child nodes will be skipped.

```javascript
var morphdom = require('morphdom');
var morphedNode = morphdom(fromNode, toNode, options);
```

# Maintainers

* [Patrick Steele-Idem](https://github.com/patrick-steele-idem) (Twitter: [@psteeleidem](http://twitter.com/psteeleidem))

# Contribute

Pull Requests welcome. Please submit Github issues for any feature enhancements, bugs or documentation problems.

# License

ISC

