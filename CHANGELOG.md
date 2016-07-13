Changelog
=========

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