#!/bin/bash
set -o errexit # Exit on error
mkdir -p dist
node_modules/umd/bin/cli.js morphdom src/index.js -c > dist/morphdom-umd.js
node_modules/.bin/uglifyjs ./dist/morphdom-umd.js -o ./dist/morphdom-umd.min.js