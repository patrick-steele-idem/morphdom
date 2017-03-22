Changelog
=========

# 2.x

## 2.3.x

### 2.3.1

- Bug: Fixed losing cursor position in Edge ([PR #100](https://github.com/patrick-steele-idem/morphdom/pull/100) by [@zastavnitskiy](https://github.com/zastavnitskiy))

### 2.3.0

- Changes to improve code maintainability. Single file is now split out into multiple modules and [rollup](https://github.com/rollup/rollup) is used to build the distribution files.

## 2.2.x

### 2.2.2

- Changes to ensure that `selectedIndex` is updated correctly in all browsers ([PR #94](https://github.com/patrick-steele-idem/morphdom/pull/94) by [@aknuds1](https://github.com/aknuds1))

### 2.2.1

- IE-specific bug: fix `<textarea>` with `placeholder` attribute on IE ([PR #87](https://github.com/patrick-steele-idem/morphdom/pull/87) by [@ahdinosaur](https://github.com/ahdinosaur))
- Fixed [#92](https://github.com/patrick-steele-idem/morphdom/issues/92) - `morphdom` fails to discard all removed child nodes when first child element is keyed
- Docs: fixed docs for `onBeforeNodeAdded` (function should return a node) ([PR #91](https://github.com/patrick-steele-idem/morphdom/pull/91) by [@MelleB](https://github.com/MelleB))

### 2.2.0

- Allow `toNode.assignAttributes` full control

## 2.1.x

### 2.1.3

### 2.1.2

- Fixed [#85](https://github.com/patrick-steele-idem/morphdom/issues/85) - Siblings not diffed/patched after `isSameNode()` returns `true` ([PR #86](https://github.com/patrick-steele-idem/morphdom/pull/86) by [@AutoSponge](https://github.com/AutoSponge))

### 2.1.1

- Fixed [#84](https://github.com/patrick-steele-idem/morphdom/issues/84) - unexpected repaint of `<select>` tag

### 2.1.0

- Added simple mechanism to support using cached nodes ([Pull Request #81](https://github.com/patrick-steele-idem/morphdom/pull/81) by [@AutoSponge](https://github.com/AutoSponge))
    - Fixes: [Issue #77 - Memoized elements are removed & added anyway](https://github.com/patrick-steele-idem/morphdom/issues/77)
- Added support for diffing a real DOM tree with a virtual DOM tree. See: [./docs/virtual-dom.md](./docs/virtual-dom.md)

## 2.0.x

### 2.0.2

- Fixed [#78](https://github.com/patrick-steele-idem/morphdom/issues/78) - Elements under `onBeforeElChildrenUpdated` element removed if they have `id` set

### 2.0.1

- Small optimization and more tests

### 2.0.0

- Fixed [#47](https://github.com/patrick-steele-idem/morphdom/issues/47) - Detect and handle reorder of siblings
- `onNodeAdded` is now called for all on child nodes and not just the root node (closes [PR #57](https://github.com/patrick-steele-idem/morphdom/pull/57))
- Simplified code and reduced overall code size
- NOTE: Performance is about the same or slightly better than the previous version of `morphdom` based on benchmarks
- Added examples:[./examples/](./examples/README.md)

#### Breaking changes

- `onNodeAdded` is now called for all on child nodes (not just the root node)
- Removed options:
    - `onBeforeMorphEl` (use `onBeforeElUpdated` instead)
    - `onBeforeMorphElChildren` (use `onBeforeElChildrenUpdated` instead)

# 1.x

## 1.4.x

### 1.4.6

- Fixes [#71](https://github.com/patrick-steele-idem/morphdom/issues/71) - form elements lose class when removing name attribute in MSIE 8-11 and MS Edge ([PR #73](https://github.com/patrick-steele-idem/morphdom/pull/73) by [@karfcz](https://github.com/karfcz))

### 1.4.5

- `onNodeDiscarded` is now correctly called when tag name mismatch for keyed el

### 1.4.4

- Fixes [#72](https://github.com/patrick-steele-idem/morphdom/issues/72) - Compare tag name when matching els by ID

### 1.4.3

- Fixes [#66](https://github.com/patrick-steele-idem/morphdom/issues/66) by treating comment nodes identically to text nodes ([PR #67](https://github.com/patrick-steele-idem/morphdom/pull/67) by [@cfinucane](https://github.com/cfinucane))

### 1.4.2

- Fixes #63 - Do attr lookup on localName if available

### 1.4.1

- Use hard coded constants for node types for improved browser compatibility

### 1.4.0

- Make attributes and elements namespace-aware ([@shawnbot](https://github.com/shawnbot))

## 1.3.x

### 1.3.1

- Upgraded to `lasso@^2`
- Fixed tests

### 1.3.0

- Support full page html diff ([@DylanPiercey](https://github.com/DylanPiercey))

## 1.2.x

### 1.2.0

- Improve node lifecycle options ([@callum](https://github.com/callum))

## 1.1.x

### 1.1.4

- Checking in `dist/` files into the git repo
- Deleted `.cache/` from npm package

### 1.1.3

- Added a minified UMD distribution file

### 1.1.2

- Minor internal changes

### 1.1.1

- Updated `package.json`

### 1.1.0

- Fixes [#32](https://github.com/patrick-steele-idem/morphdom/issues/32) - Support for IE7+

## 1.0.x

### 1.0.4

- Fixes [#30](https://github.com/patrick-steele-idem/morphdom/issues/30) - Not all keyed elements are matched up correctly in some cases. Walk target DOM els that are moved over to match all keyed els.

### 1.0.3

- Added `getNodeKey` option - [Pull Request](https://github.com/patrick-steele-idem/morphdom/pull/28) by [Riim](https://github.com/Riim)

### 1.0.2

- Fixes [#21](https://github.com/patrick-steele-idem/morphdom/issues/21) - Caret position should not change if value did not change

### 1.0.1

- Fixes [#19](https://github.com/patrick-steele-idem/morphdom/issues/19) - Textarea problems