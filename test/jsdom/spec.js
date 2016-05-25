const assert = require('assert');
const jsdom = require('jsdom');
const morphdom = require('morphdom');

const SVG = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';

var root;
before(function(done) {
  jsdom.env('<!DOCTYPE html>\n<div id="root"></div>', function(errors, window) {
    if (errors) {
      return done(errors[0]);
    }
    global.window = window;
    global.document = window.document;
    global.Node = window.Node;
    root = window.document.getElementById('root');
    done();
  });
});

afterEach(function() {
  root.innerHTML = '';
});

describe('morphdom()', function() {
  it('preserves element namespaces', function() {
    var before = root.innerHTML = '<svg></svg>';

    var dest = root.querySelector('svg');
    var src = document.createElementNS(SVG, 'svg');

    morphdom(dest, src);

    assert.equal(before, root.innerHTML);
    assert.equal(dest.namespaceURI, SVG);
  });

  it('preserves attribute namespaces', function() {
    var before = root.innerHTML = '<svg><a xlink:href="#foo"></a></svg>';

    var dest = root.querySelector('svg');
    assert.equal(dest.querySelector('a').getAttributeNS(XLINK, 'href'), '#foo');

    var src = document.createElementNS(SVG, 'svg');
    var a = src.appendChild(document.createElementNS(SVG, 'a'));
    a.setAttributeNS(XLINK, 'xlink:href', '#foo');

    morphdom(dest, src);

    assert.equal(dest.querySelector('a').getAttributeNS(XLINK, 'href'), '#foo');
  });

  it('adds namespaced attributes', function() {
    root.innerHTML = '<div><a href="#foo">bar</a></div>';

    var dest = document.createElement('div');
    var a = dest.appendChild(document.createElement('a'));
    a.setAttributeNS(XLINK, 'xlink:href', '#foo');
    a.textContent = 'bar';

    morphdom(root.querySelector('div'), dest);

    assert.equal(root.innerHTML, '<div><a xlink:href="#foo">bar</a></div>');
  });

  it('removes namespaced attributes', function() {
    var src = document.createElement('div');
    var a = src.appendChild(document.createElement('a'));
    a.setAttributeNS(XLINK, 'xlink:href', '#foo');
    a.textContent = 'bar';

    var dest = document.createElement('div');
    a = dest.appendChild(document.createElement('a'));
    a.setAttribute('href', '#foo');
    a.textContent = 'bar';

    morphdom(src, dest);

    assert.equal(src.innerHTML, dest.innerHTML);
  });

  it('replaces namespaced elements', function() {
    var src = root.appendChild(document.createElement('svg'));
    var dest = document.createElementNS(SVG, 'svg');

    morphdom(src, dest);
    assert.equal(root.firstChild.namespaceURI, SVG);

    morphdom(root.firstChild, src);
    assert.ok(root.firstChild.namespaceURI !== SVG);
  });
});
