var morphdom = require('../../lib/index');
var resultsTemplate = require('./benchmark-results.marko');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var vdomVirtualize = require('vdom-virtualize');

var now;

if (window && window.performance && window.performance.now) {
    now = function() {
        return window.performance.now();
    };
} else {
    now = function() {
        return Date.now();
    };
}

var interval = {
    start: function() {
        var startTime = now();

        return {
            stop: function() {
                return (now() - startTime);
            }
        };
    }
};


var autoTests = require('../mocha-phantomjs/generated/auto-tests');
var ITERATIONS = 100;

function parseHtml(html) {
    var tmp = document.createElement('body');
    tmp.innerHTML = html;
    return tmp.firstChild;
}

function addBenchmarks() {

    var results = {};

    function recordResult(moduleName, testName, totalTime) {
        var testEntry = results[testName] || (results[testName] = {});
        var result = testEntry[moduleName] = {
            totalTime: totalTime.toFixed(2),
            avgTime: (totalTime/ITERATIONS).toFixed(2)
        };

        console.log(moduleName + ' - ' + testName + ':', result);

    }


    var handlers = {
        morphdom: {
            setup: function(autoTest) {
                var workingDataArray = this.workingDataArray = [];
                var i;
                var fromNode;
                var toNode;

                for (i=0; i<ITERATIONS; i++) {
                    var fromHtml = autoTest.from;
                    var toHtml = autoTest.to;
                    fromNode = parseHtml(fromHtml);
                    toNode = parseHtml(toHtml);

                    workingDataArray.push({
                        fromNode: fromNode,
                        toNode: toNode
                    });
                }
            },
            runIteration: function(i) {
                var workingData = this.workingDataArray[i];
                var fromNode = workingData.fromNode;
                var toNode = workingData.toNode;
                var options = workingData.options;
                morphdom(fromNode, toNode, options);
            }
        },
        'virtual-dom': {
            setup: function(autoTest) {
                var workingDataArray = this.workingDataArray = [];
                var i;
                var fromNode;
                var fromNodeVDOM;
                var toNode;
                var toNodeVDOM;

                for (i=0; i<ITERATIONS; i++) {
                    var fromHtml = autoTest.from;
                    var toHtml = autoTest.to;
                    fromNode = parseHtml(fromHtml);
                    fromNodeVDOM = vdomVirtualize(fromNode);
                    toNode = parseHtml(toHtml);
                    toNodeVDOM = vdomVirtualize(toNode);

                    workingDataArray.push({
                        fromNode: fromNode,
                        fromNodeVDOM: fromNodeVDOM,
                        toNodeVDOM: toNodeVDOM
                    });
                }
            },

            runIteration: function(i) {
                var workingData = this.workingDataArray[i];
                var fromNode = workingData.fromNode;
                var fromNodeVDOM = workingData.fromNodeVDOM;
                var toNodeVDOM = workingData.toNodeVDOM;

                var patches = diff(fromNodeVDOM, toNodeVDOM);
                patch(fromNode, patches);
            }
        }
    };

    var moduleNames = ['virtual-dom', 'morphdom']; //Object.keys(handlers);

    function warmup() {
        Object.keys(autoTests).forEach(function(name) {
            var autoTest = autoTests[name];

            moduleNames.forEach(function(moduleName) {
                if (window.console) {
                    console.log('Running warmup (' + moduleName + ' - ' + name + ')...');
                }

                handlers[moduleName].setup(autoTest);

                for (var i=0; i<ITERATIONS; i++) {
                    handlers[moduleName].runIteration(i);

                }
            });
        });
    }

    warmup();

    describe('benchmarks', function() {
        this.timeout(0);

        Object.keys(autoTests).forEach(function(name) {
            var autoTest = autoTests[name];

            var itFunc = autoTest.only ? it.only : it;

            itFunc(name, function() {
                moduleNames.forEach(function(moduleName) {
                    handlers[moduleName].setup(autoTest);

                    var myInterval = interval.start();
                    for (var i=0; i<ITERATIONS; i++) {
                        handlers[moduleName].runIteration(i);

                    }
                    var totalTime = myInterval.stop();
                    recordResult(moduleName, name, totalTime);
                });
            });
        });
        after(function() {
            console.log(JSON.stringify(results, null, 4));

            var resultHtml = resultsTemplate.renderSync({
                moduleNames: moduleNames,
                testNames: Object.keys(results),
                getTotalTime: function(moduleName, testName) {
                    var testResults = results[testName][moduleName];
                    var totalTime  = testResults.totalTime;
                    return totalTime + 'ms';
                },
                getAverageTime: function(moduleName, testName) {
                    var testResults = results[testName][moduleName];
                    var avgTime  = testResults.avgTime;
                    return avgTime + 'ms';
                }
            });

            var containerEl = document.createElement('div');
            containerEl.innerHTML = resultHtml;
            document.getElementById('benchmark-results').appendChild(containerEl);
        });

    });
}

if (require('../mocha-phantomjs/generated/config').runBenchmarks === true) {
    addBenchmarks();
}