morphdom
========

[![Build Status](https://travis-ci.org/patrick-steele-idem/morphdom.svg?branch=master)](https://travis-ci.org/patrick-steele-idem/morphdom)
[![NPM](https://nodei.co/npm/morphdom.png)](https://www.npmjs.com/package/morphdom)

Lightweight module for morphing an existing DOM node tree to match a target DOM node tree. It's fast and works with the real DOM—no virtual DOM needed!

This module was created to solve the problem of updating the DOM in response to a UI component or page being rerendered. One way to update the DOM is to simply toss away the existing DOM tree and replace it with a new DOM tree (e.g., `myContainer.innerHTML = newHTML`). While replacing an existing DOM tree with an entirely new DOM tree will actually be very fast, it comes with a cost. The cost is that all of the internal state associated with the existing DOM nodes (scroll positions, input caret positions, CSS transition states, etc.) will be lost. Instead of replacing the existing DOM tree with a new DOM tree we want to _transform_ the existing DOM tree to match the new DOM tree while minimizing the number of changes to the existing DOM tree. This is exactly what the `morphdom` module does! Give it an existing DOM node tree and a target DOM node tree and it will efficiently transform the existing DOM node tree to exactly match the target DOM node tree with the minimum amount of changes.

`morphdom` does not rely on any virtual DOM abstractions. Because `morphdom` is using the _real_ DOM, the DOM that the web browser is maintaining will always be the source of truth. Even if you have code that manually manipulates the DOM things will still work as expected. In addition, `morphdom` can be used with any templating language that produces an HTML string.

The transformation is done in a single pass of both the original DOM tree and the target DOM tree and is designed to minimize changes to the DOM while still ensuring that the morphed DOM exactly matches the target DOM. In addition, the algorithm used by this module will automatically match up elements that have corresponding IDs and that are found in both the original and target DOM tree.

Support for diffing the real DOM with a virtual DOM was introduced in `v2.1.0`. Virtual DOM nodes are expected to implement the minimal subset of the real DOM API required by `morphdom` and virtual DOM nodes are automatically upgraded real DOM nodes if they need to be moved into the real DOM. For more details, please see: [docs/virtual-dom.md](./docs/virtual-dom.md).

# Usage

First install the module into your project:

```
npm install morphdom --save
```

_NOTE: There is also a UMD version of this module in the published npm package: `dist/morphdom-umd.js`_

The code below shows how to morph one `<div>` element to another `<div>` element.

```javascript
var morphdom = require('morphdom');

var el1 = document.createElement('div');
el1.className = 'foo';

var el2 = document.createElement('div');
el2.className = 'bar';

morphdom(el1, el2);

expect(el1.className).to.equal('bar');
```

You can also pass in an HTML string for the second argument:

```javascript
var morphdom = require('morphdom');

var el1 = document.createElement('div');
el1.className = 'foo';
el1.innerHTML = 'Hello John';

morphdom(el1, '<div class="bar">Hello Frank</div>');

expect(el1.className).to.equal('bar');
expect(el1.innerHTML).to.equal('Hello Frank');
```

NOTE: This module will modify both the original and target DOM node tree during the transformation. It is assumed that the target DOM node tree will be discarded after the original DOM node tree is morphed.

# Examples

See: [./examples/](./examples/)

# Browser Support

- IE7+ and any modern browser
- Proper namespace support added in `v1.4.0`

# API

## morphdom(fromNode, toNode, options) : Node

The `morphdom(fromNode, toNode, options)` function supports the following arguments:

- *fromNode* (`Node`)- The node to morph
- *toNode* (`Node`|`String`) - The node that the `fromNode` should be morphed to (or an HTML string)
- *options* (`Object`) - See below for supported options

The returned value will typically be the `fromNode`. However, in situations where the `fromNode` is not compatible with the `toNode` (either different node type or different tag name) then a different DOM node will be returned.

Supported options (all optional):

- **getNodeKey** (`Function(node)`) - Called to get the `Node`'s unique identifier. This is used by `morphdom` to rearrange elements rather than creating and destroying an element that already exists. This defaults to using the `Node`'s `id` attribute.
- **onBeforeNodeAdded** (`Function(node)`) - Called before a `Node` in the `to` tree is added to the `from` tree. If this function returns `false` then the node will not be added. Should return the node to be added.
- **onNodeAdded** (`Function(node)`) - Called after a `Node` in the `to` tree has been added to the `from` tree.
- **onBeforeElUpdated** (`Function(fromEl, toEl)`) - Called before a `HTMLElement` in the `from` tree is updated. If this function returns `false` then the element will not be updated.
- **onElUpdated** (`Function(el)`) - Called after a `HTMLElement` in the `from` tree has been updated.
- **onBeforeNodeDiscarded** (`Function(node)`) - Called before a `Node` in the `from` tree is discarded. If this function returns `false` then the node will not be discarded.
- **onNodeDiscarded** (`Function(node)`) - Called after a `Node` in the `from` tree has been discarded.
- **onBeforeElChildrenUpdated** (`Function(fromEl, toEl)`) - Called before the children of a `HTMLElement` in the `from` tree are updated. If this function returns `false` then the child nodes will not be updated.
- **childrenOnly** (`Boolean`) - If `true` then only the children of the `fromNode` and `toNode` nodes will be morphed (the containing element will be skipped). Defaults to `false`.

```javascript
var morphdom = require('morphdom');
var morphedNode = morphdom(fromNode, toNode, {
    getNodeKey: function(node) {
        return node.id;
    },
    onBeforeNodeAdded: function(node) {
        return node;
    },
    onNodeAdded: function(node) {

    },
    onBeforeElUpdated: function(fromEl, toEl) {
        return true;
    },
    onElUpdated: function(el) {

    },
    onBeforeNodeDiscarded: function(node) {
        return true;
    },
    onNodeDiscarded: function(node) {

    },
    onBeforeElChildrenUpdated: function(fromEl, toEl) {
        return true;
    },
    childrenOnly: false
});
```

# FAQ

## Isn't the DOM slow?

No, the DOM _data structure_ is not slow. The DOM is a key part of any web browser so it must be fast. Walking a DOM tree and reading the attributes on DOM nodes is _not_ slow. However, if you attempt to read a computed property on a DOM node that requires a relayout of the page then _that_ will be slow. However, `morphdom` only cares about the following properties and methods of a DOM node:

- `node.firstChild`
- `node.nextSibling`
- `node.nodeType`
- `node.nodeName`
- `node.nodeValue`
- `node.attributes`
- `node.value`
- `node.selected`
- `node.disabled`
- `actualize(document)` (non-standard, used to upgrade a virtual DOM node to a real DOM node)
- `hasAttributeNS(namespaceURI, name)`
- `isSameNode(anotherNode)`

## What about the virtual DOM?

Libraries such as a [React](http://facebook.github.io/react/) and [virtual-dom](https://github.com/Matt-Esch/virtual-dom) solve a similar problem using a _Virtual DOM_. That is, at any given time there will be the _real_ DOM (that the browser rendered) and a lightweight and persistent virtual DOM tree that is a mirror of the real DOM tree. Whenever the view needs to update, a new _virtual_ DOM tree is rendered. The new virtual DOM tree is then compared with the old virtual DOM tree using a diffing algorithm. Based on the differences that are found, the _real_ DOM is then "patched" to match the new virtual DOM tree and the new virtual DOM tree is persisted for future diffing.

Both `morphdom` and virtual DOM based solutions update the _real_ DOM with the minimum number of changes. The only difference is in how the differences are determined. `morphdom` compares real DOM nodes while `virtual-dom` and others only compare virtual DOM nodes.

There are some drawbacks to using a virtual DOM-based approach:

- The real DOM is not the source of truth (the persistent virtual DOM tree is the source of truth)
- The real DOM _cannot_ be modified behind the scenes (e.g., no jQuery) because the diff is done against the virtual DOM tree
- A copy of the real DOM must be maintained in memory at all times (albeit a lightweight copy of the real DOM)
- The virtual DOM is an abstraction layer that introduces code overhead
- The virtual DOM representations are not standardized and will vary by implementation
- The virtual DOM can only efficiently be used with code and templating languages that produce a virtual DOM tree

The premise for using a virtual DOM is that the DOM is "slow". While there is slightly more overhead in creating actual DOM nodes instead of lightweight virtual DOM nodes, we are not seeing any noticeable slowness in our benchmarks. In addition, as web browsers get faster the DOM data structure will also likely continue to get faster so there benefits to avoiding the abstraction layer.

See the [Benchmarks](#benchmarks) below for a comparison of `morphdom` with [virtual-dom](https://github.com/Matt-Esch/virtual-dom).

___UPDATE:___ As of `v2.1.0`, `morphdom` supports both diffing a real DOM tree with another real DOM tree and diffing a real DOM tree with a _virtual_ DOM tree. See: [docs/virtual-dom.md](docs/virtual-dom.md) for more details.

## Which is better: rendering to an HTML string or rendering virtual DOM nodes?

There are many high performance templating engines that stream out HTML strings with no intermediate virtual DOM nodes being produced. On the server, rendering directly to an HTML string will _always_ be faster than rendering virtual DOM nodes (that then get serialized to an HTML string). In a benchmark where we compared server-side rendering for [Marko](https://github.com/marko-js/marko) (with [Marko Widgets](https://github.com/marko-js/marko-widgets)) and React we found that Marko was able to render pages ten times faster than React with much lower CPU usage (see: [Marko vs React: Performance Benchmark](https://github.com/patrick-steele-idem/marko-vs-react))

A good strategy to optimize for performance is to render a template to an HTML string on the server, but to compile the template such that it renders to a DOM/virtual DOM in the browser. This approach offers the best performance for both the server and the browser. In the near future, support for rendering to a virtual DOM will be added to the
[Marko](https://github.com/marko-js/marko) templating engine.

## What projects are using `morphdom`?

`morphdom` is being used in the following projects:

- __[Marko Widgets](https://github.com/marko-js/marko-widgets)__ (`v5.0.0-beta+`) - Marko Widgets is a high performance and lightweight UI components framework that uses the [Marko templating engine](https://github.com/marko-js/marko) for rendering UI components. You can see how Marko Widgets compares to React in performance by taking a look at the following benchmark: [Marko vs React: Performance Benchmark](https://github.com/patrick-steele-idem/marko-vs-react)
- __[Catberry.js](https://github.com/catberry/catberry)__ (`v6.0.0+`) - Catberry is a framework with Flux architecture, isomorphic web-components and progressive rendering.
- __[Composer.js](https://lyonbros.github.io/composer.js/)__ (`v1.2.1`) - Composer is a set of stackable libraries for building complex single-page apps. It uses morphdom in its rendering engine for efficient and non-destructive updates to the DOM.
- __[yo-yo.js](https://github.com/maxogden/yo-yo)__ (`v1.2.2`) - A tiny library for building modular UI components using DOM diffing and ES6 tagged template literals. yo-yo powers a tiny, isomorphic framework called [choo](https://github.com/yoshuawuyts/choo) (`v3.3.0`), which is designed to be fun.
- __[vomit.js](https://github.com/bredele/vomit)__ (`v0.9.19`) - A library that uses the power of ES6 template literals to quickly create DOM elements that you can update and compose with Objects, Arrays, other DOM elements, Functions, Promises and even Streams. All with the ease of a function call.


_NOTE: If you are using a `morphdom` in your project please send a PR to add your project here_

# Benchmarks

Below are the results on running benchmarks on various DOM transformations for both `morphdom` and [virtual-dom](https://github.com/Matt-Esch/virtual-dom). This benchmark uses a high performance timer (i.e., `window.performance.now()`) if available. For each test the benchmark runner will run `100` iterations. After all of the iterations are completed for one test the average time per iteration is calculated by dividing the total time by the number of iterations.

To run the benchmarks:

```
npm run benchmark
```

The table below shows some sample benchmark results when running the benchmarks on a MacBook Pro (2.8 GHz Intel Core i7, 16 GB 1600 MHz DDR3). The average time per iteration for each test is shown in the table below:

<div class="results">
    <ul>
        <li> Total time for morphdom: 359.02ms (winner) </li>
        <li> Total time for virtual-dom: 438.30ms </li>
    </ul>
    <table>
        <thead>
            <tr>
                <td></td>
                <td> morphdom </td>
                <td> virtual-dom </td>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="test-name"> change-tagname </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.01ms </td>
            </tr>
            <tr>
                <td class="test-name"> change-tagname-ids </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.02ms </td>
            </tr>
            <tr>
                <td class="test-name"> data-table </td>
                <td> <b>0.22ms</b> </td>
                <td> 0.65ms </td>
            </tr>
            <tr>
                <td class="test-name"> data-table2 </td>
                <td> <b>0.96ms</b> </td>
                <td> 2.00ms </td>
            </tr>
            <tr>
                <td class="test-name"> id-change-tag-name </td>
                <td> <b>0.00ms</b> </td>
                <td> 0.01ms </td>
            </tr>
            <tr>
                <td class="test-name"> ids-nested </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.01ms </td>
            </tr>
            <tr>
                <td class="test-name"> ids-nested-2 </td>
                <td> 0.02ms </td>
                <td> <b>0.02ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> ids-nested-3 </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.01ms </td>
            </tr>
            <tr>
                <td class="test-name"> ids-nested-4 </td>
                <td> <b>0.02ms</b> </td>
                <td> 0.02ms </td>
            </tr>
            <tr>
                <td class="test-name"> ids-nested-5 </td>
                <td> <b>0.02ms</b> </td>
                <td> 0.04ms </td>
            </tr>
            <tr>
                <td class="test-name"> ids-nested-6 </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.02ms </td>
            </tr>
            <tr>
                <td class="test-name"> ids-nested-7 </td>
                <td> 0.02ms </td>
                <td> <b>0.01ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> ids-prepend </td>
                <td> <b>0.02ms</b> </td>
                <td> 0.02ms </td>
            </tr>
            <tr>
                <td class="test-name"> input-element </td>
                <td> 0.01ms </td>
                <td> <b>0.01ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> input-element-disabled </td>
                <td> 0.01ms </td>
                <td> <b>0.01ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> input-element-enabled </td>
                <td> 0.01ms </td>
                <td> <b>0.01ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> large </td>
                <td> 1.56ms </td>
                <td> <b>0.98ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> lengthen </td>
                <td> <b>0.02ms</b> </td>
                <td> 0.02ms </td>
            </tr>
            <tr>
                <td class="test-name"> one </td>
                <td> <b>0.00ms</b> </td>
                <td> 0.01ms </td>
            </tr>
            <tr>
                <td class="test-name"> reverse </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.02ms </td>
            </tr>
            <tr>
                <td class="test-name"> reverse-ids </td>
                <td> 0.03ms </td>
                <td> <b>0.02ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> select-element </td>
                <td> 0.04ms </td>
                <td> <b>0.03ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> shorten </td>
                <td> 0.02ms </td>
                <td> <b>0.01ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> simple </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.01ms </td>
            </tr>
            <tr>
                <td class="test-name"> simple-ids </td>
                <td> 0.04ms </td>
                <td> <b>0.03ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> simple-text-el </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.02ms </td>
            </tr>
            <tr>
                <td class="test-name"> svg </td>
                <td> 0.02ms </td>
                <td> <b>0.01ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> svg-append </td>
                <td> 0.04ms </td>
                <td> <b>0.04ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> svg-append-new </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.04ms </td>
            </tr>
            <tr>
                <td class="test-name"> svg-no-default-namespace </td>
                <td> 0.03ms </td>
                <td> <b>0.02ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> svg-xlink </td>
                <td> 0.03ms </td>
                <td> <b>0.00ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> tag-to-text </td>
                <td> <b>0.00ms</b> </td>
                <td> 0.00ms </td>
            </tr>
            <tr>
                <td class="test-name"> text-to-tag </td>
                <td> <b>0.00ms</b> </td>
                <td> 0.00ms </td>
            </tr>
            <tr>
                <td class="test-name"> text-to-text </td>
                <td> <b>0.00ms</b> </td>
                <td> 0.00ms </td>
            </tr>
            <tr>
                <td class="test-name"> textarea </td>
                <td> 0.01ms </td>
                <td> <b>0.01ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> todomvc </td>
                <td> 0.36ms </td>
                <td> <b>0.25ms</b> </td>
            </tr>
            <tr>
                <td class="test-name"> two </td>
                <td> <b>0.01ms</b> </td>
                <td> 0.01ms </td>
            </tr>
        </tbody>
    </table>
</div>

_NOTE: Safari Version 9.1.1 (11601.6.17)_

# Maintainers

* [Patrick Steele-Idem](https://github.com/patrick-steele-idem) (Twitter: [@psteeleidem](http://twitter.com/psteeleidem))
* [Paul Grenier](https://github.com/AutoSponge) (Twitter: [@autosponge](https://twitter.com/autosponge))

# Contribute

Pull Requests welcome. Please submit Github issues for any feature enhancements, bugs or documentation problems. Please make sure tests pass:

```
npm test
```

# License

MIT

