var morphdom = require('../../');
var resultsTemplate = require('./benchmark-results.marko');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var vdomVirtualize = require('vdom-virtualize');
var series = require('async').series;
var diffhtml;

try {
    diffhtml = require('diffhtml');
} catch(e) {}

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


var autoTests = require('../mocha-headless/generated/auto-tests');
var ITERATIONS = 100;

function parseHtml(html) {
    var tmp = document.createElement('body');
    tmp.innerHTML = html;
    return tmp.firstChild;
}

function addBenchmarks() {

    var results = {
        tests: {},
        moduleTotalTimes: {}
    };

    function recordResult(moduleName, testName, totalTime) {
        var testEntry = results.tests[testName] || (results.tests[testName] = {
            modules: {},
            fastest: null,
            fastestTotalTime: null
        });

        var result = testEntry.modules[moduleName] = {
            moduleName: moduleName,
            totalTime: totalTime.toFixed(2),
            avgTime: (totalTime/ITERATIONS).toFixed(2)
        };

        var currentFastestTotalTime = testEntry.fastestTotalTime;
        if (currentFastestTotalTime == null || totalTime < currentFastestTotalTime) {
            testEntry.fastest = result;
            testEntry.fastestTotalTime = totalTime;
        }

        var overallEntry = results.moduleTotalTimes[moduleName] || (results.moduleTotalTimes[moduleName] = {
            moduleName: moduleName,
            totalTime: 0
        });

        overallEntry.totalTime += totalTime;

        console.log(moduleName + ' - ' + testName + ':', result);

    }


    var handlers = {
        morphdom: {
            enabled: true,
            setup: function(autoTest, iterations) {
                var workingDataArray = this.workingDataArray = [];
                var i;

                var fromNode = parseHtml(autoTest.from);
                var toNode = parseHtml(autoTest.to);

                for (i=0; i<iterations; i++) {
                    workingDataArray.push({
                        fromNode: fromNode.cloneNode(true),
                        toNode: toNode.cloneNode(true)
                    });
                }
            },
            runIteration: function(i) {
                var workingData = this.workingDataArray[i];
                var fromNode = workingData.fromNode;
                var toNode = workingData.toNode;
                morphdom(fromNode, toNode);
            }
        },
        // 'morphdom - marko-vdom': {
        //     enabled: true,
        //     setup: function(autoTest, iterations) {
        //         var workingDataArray = this.workingDataArray = [];
        //         var i;
        //
        //         var fromNode = parseHtml(autoTest.from);
        //         var toNode = parseHtml(autoTest.to);
        //         var toNodeVDOM = markoVDOMVirtualize(toNode);
        //
        //         for (i=0; i<iterations; i++) {
        //             workingDataArray.push({
        //                 fromNode: fromNode.cloneNode(true),
        //                 toNodeVDOM: toNodeVDOM
        //             });
        //         }
        //     },
        //
        //     runIteration: function(i) {
        //         var workingData = this.workingDataArray[i];
        //         var fromNode = workingData.fromNode;
        //         var toNodeVDOM = workingData.toNodeVDOM;
        //
        //         morphdom(fromNode, toNodeVDOM);
        //     }
        // },
        'diffHTML': {
            enabled: false && diffhtml != null,
            setup: function(autoTest, iterations) {
                var workingDataArray = this.workingDataArray = [];
                var i;

                var fromNode = parseHtml(autoTest.from);
                var toNodeVDOM = diffhtml.html(autoTest.to);

                for (i=0; i<iterations; i++) {
                    workingDataArray.push({
                        fromNode: fromNode.cloneNode(true),
                        toNodeVDOM: toNodeVDOM
                    });
                }
            },

            runIteration: function(i) {
                var workingData = this.workingDataArray[i];
                var fromNode = workingData.fromNode;
                var toNodeVDOM = workingData.toNodeVDOM;

                diffhtml.element(fromNode, toNodeVDOM);
            }
        },
        'virtual-dom': {
            enabled: true,
            setup: function(autoTest, iterations) {
                var workingDataArray = this.workingDataArray = [];
                var i;

                var fromNodeVDOM;
                var toNodeVDOM;

                var fromNode = parseHtml(autoTest.from);
                var toNode = parseHtml(autoTest.to);

                var fromNodeClone = fromNode.cloneNode(true);
                fromNodeVDOM = vdomVirtualize(fromNodeClone);
                var toNodeClone = toNode.cloneNode(true);
                toNodeVDOM = vdomVirtualize(toNodeClone);

                for (i=0; i<iterations; i++) {
                    workingDataArray.push({
                        fromNode: fromNodeClone,
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

    for (var k in handlers) {
        var handler = handlers[k];
        if (!handler.enabled) {
            delete handlers[k];
        }
    }

    var moduleNames = Object.keys(handlers);

    var statusEl = document.getElementById('status');

    function setStatus(message) {
        statusEl.innerHTML = message;
        // var pre = document.createElement('pre');
        // pre.innerHTML = message;
        // statusEl.appendChild(pre);

        if (window.console) {
            console.log(message);
        }
    }

    function warmupTest(moduleName, name, autoTest, callback) {
        setStatus('Running warmup (' + moduleName + ' - ' + name + ')...');

        setTimeout(function() {
            var iterations = 30;

            handlers[moduleName].setup(autoTest, iterations);

            for (var i=0; i<iterations; i++) {
                handlers[moduleName].runIteration(i, iterations);
            }
            callback();
        }, 0);
    }

    describe('benchmarks', function() {
        this.timeout(0);

        before(function(done) {
            if (window.mochaPhantomJS) {
                done();
            }

            window.startBenchmarks = function() {
                done();
            };
        });

        Object.keys(autoTests).forEach(function(name) {
            var autoTest = autoTests[name];

            var itFunc = autoTest.only ? it.only : it;

            itFunc(name, function(done) {
                var tasks = moduleNames.map(function(moduleName) {
                    return function(callback) {
                        if (handlers[moduleName].enabled === false) {
                            return callback();
                        }
                        var warmupInterval = interval.start();
                        warmupTest(moduleName, name, autoTest, function() {
                            var warmupTime = warmupInterval.stop();

                            handlers[moduleName].setup(autoTest, ITERATIONS);

                            setStatus('Warmup completed in ' + warmupTime + 'ms' + '. Running tests (' + moduleName + ' - ' + name + ')...');

                            var myInterval = interval.start();
                            for (var i=0; i<ITERATIONS; i++) {
                                handlers[moduleName].runIteration(i);
                            }
                            var totalTime = myInterval.stop();

                            recordResult(moduleName, name, totalTime);
                            setTimeout(callback, 0);
                        });
                    };
                });

                series(tasks, done);
            });
        });
        after(function() {
            console.log(JSON.stringify(results, null, 4));
            var containerEl = document.createElement('div');

            resultsTemplate.renderSync({
                    moduleNames: moduleNames,
                    testNames: Object.keys(results.tests),
                    getTotalTimeForTest: function(moduleName, testName) {
                        var testResults = results.tests[testName].modules[moduleName];
                        if (!testResults) {
                            return '-';
                        }
                        var totalTime  = testResults.totalTime;
                        return totalTime + 'ms';
                    },
                    getAverageTimeForTest: function(moduleName, testName) {
                        var testResults = results.tests[testName].modules[moduleName];
                        if (!testResults) {
                            return '-';
                        }
                        var avgTime  = testResults.avgTime;
                        return avgTime + 'ms';
                    },
                    isWinnerForTest: function(moduleName, testName) {
                        var fastest = results.tests[testName].fastest;
                        return fastest && fastest.moduleName === moduleName;
                    },
                    isWinner: function(moduleName) {
                        var fastest = null;

                        for (var currentModuleName in results.moduleTotalTimes) {
                            var current = results.moduleTotalTimes[currentModuleName];
                            if (!fastest) {
                                fastest = current;
                            } else if (current.totalTime < fastest.totalTime) {
                                fastest = current;
                            }
                        }
                        return fastest && fastest.moduleName === moduleName;
                    },
                    getTotalTime: function(moduleName) {
                        var entry = results.moduleTotalTimes[moduleName];
                        if (entry == null) {
                            return '-';
                        }

                        return entry.totalTime.toFixed(2) + 'ms';
                    },
                })
                .appendTo(containerEl);

            document.getElementById('benchmark-results').appendChild(containerEl);
        });

    });
}

if (require('../mocha-headless/generated/config').runBenchmarks === true) {
    addBenchmarks();
}
