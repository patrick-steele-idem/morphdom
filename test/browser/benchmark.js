var morphdom = require('../../lib/index');
var resultTemplate = require('./benchmark-result.marko');

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
var ITERATIONS = 200;

function parseHtml(html) {
    var tmp = document.createElement('body');
    tmp.innerHTML = html;
    return tmp.firstChild;
}

function addBenchmarks() {
    describe('benchmarks', function() {
        this.timeout(0);

        Object.keys(autoTests).forEach(function(name) {
            var autoTest = autoTests[name];

            it(name, function() {
                if (window.console) {
                    console.log('Running benchmark on "' + name + '"...');
                }

                var workingDataArray = [];
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

                var myInterval = interval.start();
                for (i=0; i<ITERATIONS; i++) {
                    var workingData = workingDataArray[i];
                    fromNode = workingData.fromNode;
                    toNode = workingData.toNode;
                    var options = workingData.options;
                    morphdom(fromNode, toNode, options);
                }
                var totalTime = myInterval.stop();

                var totalTimeFormatted = totalTime.toFixed(2) + 'ms';
                var avgTimeFormatted = (totalTime/ITERATIONS).toFixed(2) + 'ms';

                if (window.console) {
                    console.log('Total time: ' + totalTimeFormatted);
                    console.log('Average time per iteration: ' + avgTimeFormatted);
                }

                var resultHtml = resultTemplate.renderSync({
                    name: name,
                    totalTime: totalTimeFormatted,
                    averageTime: avgTimeFormatted
                });

                var containerEl = document.createElement('div');
                containerEl.innerHTML = resultHtml;
                document.getElementById('benchmark-results').appendChild(containerEl);
            });
        });
    });
}

if (require('../mocha-phantomjs/generated/config').runBenchmarks === true) {
    addBenchmarks();
}