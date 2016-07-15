var morphdom = require('../../');
var contentBeforeTemplate = require('./content-before.marko');
var contentAfterTemplate = require('./content-after.marko');

var state = 'before';

window.updateDOM = function() {
    var updatedHTML;

    if (state === 'before') {
        state = 'after';
        updatedHTML = contentAfterTemplate.renderSync();
    } else {
        state = 'before';
        updatedHTML = contentBeforeTemplate.renderSync();
    }

    morphdom(document.getElementById('container'), updatedHTML);

};