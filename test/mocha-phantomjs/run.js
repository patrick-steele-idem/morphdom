require('marko/node-require').install();

var fs = require('fs');
var path = require('path');

process.chdir(path.join(__dirname, '../'));

var spawn = require('child_process').spawn;

require('marko/hot-reload').enable();
require('marko/compiler').defaultOptions.preserveWhitespace = true;
var lasso = require('lasso');

var watch = process.env.hasOwnProperty('WATCH');

var outputDir = path.join(__dirname, 'generated');
var cacheDir = path.join(__dirname, '../.cache');
var rootDir = path.join(__dirname, '../../');
var fixturesDir = path.join(__dirname, '../fixtures');
var autotestDir = path.join(fixturesDir, 'autotest');

try {
    fs.mkdirSync(outputDir);
} catch(e) {
    // Ignore the error if the directory already exists
}

require('lasso').configure({
    outputDir: path.join(outputDir, 'static'),
    plugins: [
        'lasso-marko'
    ],
    urlPrefix: './static',
    fingerprintsEnabled: false,
    bundlingEnabled: false
});

var running = false;
var fileModified = false;

var testConfig = {
    runBenchmarks: false,
    runTests: false,
};

for (var i=2; i<process.argv.length; i++) {
    if (process.argv[i] === 'test') {
        testConfig.runTests = true;
    } else if (process.argv[i] === 'benchmark') {
        testConfig.runBenchmarks = true;
    }
}

function generateHtmlStringsFile() {

    var dirs = fs.readdirSync(autotestDir);

    var htmlStrings = {};

    dirs.forEach(function(dir) {
        var only = process.env.TEST && process.env.TEST === dir;

        var moduleStr = null;
        var modulePath = path.join(autotestDir, dir, 'index.js');

        if (fs.existsSync(modulePath)) {
            moduleStr = fs.readFileSync(modulePath, {encoding: 'utf8'});
        }

        htmlStrings[dir] = {
            from: fs.readFileSync(path.join(autotestDir, dir, 'from.html'), {encoding: 'utf8'}),
            to: fs.readFileSync(path.join(autotestDir, dir, 'to.html'), {encoding: 'utf8'}),
            module: moduleStr,
            only: only
        };
    });

    fs.writeFileSync(
        path.join(outputDir, 'auto-tests.js'),
        'module.exports=' + JSON.stringify(htmlStrings, null, 4) + ';\n',
        {encoding: 'utf8' });
}

function run() {
    var isBenchmark = process.argv[2] === 'benchmark';

    console.log('Preparing client-side tests...');

    console.log('Config:', testConfig);


    generateHtmlStringsFile();

    fs.writeFileSync(
        path.join(outputDir, 'config.js'),
        'module.exports=' + JSON.stringify(testConfig, null, 4) + ';\n',
        {encoding: 'utf8' });

    running = true;
    fileModified = false;

    var pageTemplate = require('./test-page.marko');

    var pageHtmlFile = path.join(outputDir, 'test-page.html');

    var out = fs.createWriteStream(pageHtmlFile, 'utf8');
    pageTemplate.render({
        }, out)
        .on('finish', function() {
            console.log('Running client tests using mocha-phantomjs...');
            spawn(
                'npm',
                [
                    'run',
                    'mocha-phantomjs-run',
                    '--loglevel=silent'],
                {
                    cwd: rootDir,
                    stdio: 'inherit'
                })
                .on('close', function (code) {
                    running = false;

                    if (watch === true) {
                        if (fileModified) {
                            run();
                        }
                    } else {
                        process.exit(code);
                    }
                });
        });
}

run();

if (watch === true) {
    require('ignoring-watcher').createWatcher({
            // Directory to watch. Defaults to process.cwd()
            dir: rootDir,

            // One or more ignore patterns
            ignorePatterns: [
                'node_modules',
                '.cache',
                '.*',
                '*.marko.js',
                'npm-debug.log',
                'generated'
            ]
        })
        .on('ready', function(eventArgs) {
            // console.log('Watching: ' + eventArgs.dirs.join(', '));
            // console.log('Ignore patterns:\n  ' + eventArgs.ignorePatterns.join('  \n'));
        })
        .on('modified', function(eventArgs) {
            var path = eventArgs.path;

            if (path.startsWith(outputDir)) {
                return;
            } else if (path.startsWith(cacheDir)) {
                return;
            } else if (path.endsWith('.log')) {
                return;
            }

            require('marko/hot-reload').handleFileModified(eventArgs.path);
            lasso.handleWatchedFileChanged(eventArgs.path);
            console.log('[morphdom] File modified: ' + eventArgs.path);

            if (running) {
                fileModified = true;
            } else {
                run();
            }
        })
        .startWatching();
}