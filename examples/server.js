require('marko/express'); //enable res.marko
require('marko/node-require').install();

var fs = require('fs');
var path = require('path');
var express = require('express');
var template = require('./index.marko');

require('lasso').configure({
    bundlingEnabled: false,
    minify: false,
    fingerprintsEnabled: false,
    outputDir: path.join(__dirname, 'static'),
    plugins: [
        'lasso-marko'
    ]
});

var app = express();

app.use(require('lasso/middleware').serveStatic());

var examples = [];

fs.readdirSync(__dirname).forEach(function(name) {
    var dir = path.join(__dirname, name);

    var stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
        return;
    }

    var templatePath = path.join(dir, 'template.marko');

    if (fs.existsSync(templatePath)) {
        var exampleTemplate = require(templatePath);

        examples.push({
            name: name,
            route: '/' + name,
            controller: function(req, res) {
                res.marko(exampleTemplate, {
                    examples: examples
                });
            }
        });
    }
});

examples.forEach(function(example) {
    app.use(example.route, example.controller);
});

app.get('/', function(req, res) {
    res.marko(template, {
        examples: examples
    });
});

app.listen(8080, function(err) {
    if (err) {
        throw err;
    }

    if (process.send) {
        process.send('online');
    }
    console.log('Listening on port 8080');
});