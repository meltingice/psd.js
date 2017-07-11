#!/usr/bin/env node
/**
 * build script
 */
'use strict';

const path = require('path');
const lodash = require('lodash');
const child_process = require('child_process');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const glob = Promise.promisify(require('glob'));

const IS_PROD = process.env.NODE_ENV === 'production';

const BUILD_CWD = path.resolve(__dirname, '..');
const BUILD_DIST = path.join(BUILD_CWD, 'dist');
const BUILD_LIB = path.join(BUILD_CWD, 'lib');
const BUILD_SRC = path.join(BUILD_CWD, 'src');

const pkgs = require('../package.json');

const exec = function(cmd, options) {
    return new Promise((resolve, reject) => {
        // Execute command
        var child = child_process.exec(cmd, lodash.assign({
            cwd: process.cwd(),
            env: process.env
        }, options));

        // Pass stdout and stderr
        child.stdout.on('data', data => {
            process.stdout.write(data.toString());
        });
        child.stderr.on('data', data => {
            process.stderr.write(data.toString());
        });

        // Handle result
        child.on('exit', code => {
            if(code) {
                reject(code);

                return;
            }

            resolve();
        });

        child.on('error', reject);
    });
};

// mixin process.env
Promise.try(() => {
    console.log('○ Init env variables');

    process.env.__VERSION__ = pkgs.version;
})
// clean
.then(() => {
    console.log('○ Clean...');

    return Promise.all([
        exec(`rimraf ${BUILD_DIST}`),
        exec(`rimraf ${BUILD_LIB}`)
    ]);
})
.then(() => {
    return Promise.all([
        fs.mkdirAsync(BUILD_DIST),
        fs.mkdirAsync(BUILD_LIB)
    ]);
})
// Build lib
.then(() => {
    console.log('○ Build lib by coffee...');

    let CWD = process.cwd();
    let cmd = [
        'coffee -c',
        `-o ${path.relative(CWD, BUILD_LIB)}`,
        path.relative(CWD, BUILD_SRC)
    ]
    .join(' ');

    return exec(cmd);
})
// Replace lib require src
.then(() => {
    console.log('○ Replace lib require src...');

    const rRequire = /require\((['"])(.+?)\1\)/g;
    const rCoffeeModule = /\.coffee$/i;

    return glob(BUILD_LIB + '/**/*.js')
    .map(file => {
        return fs.readFileAsync(file)
        .then(buf => {
            let content = buf.toString();

            return content.replace(rRequire, (a, q, module) => {
                // strip ".coffee"
                module = module.replace(rCoffeeModule, '');

                return `require(${q}${module}${q})`;
            });
        })
        .then(content => {
            return fs.writeFileAsync(file, content);
        });
    }, {
        concurrency: 5
    });
})
// Build dist development
.then(() => {
    console.log('○ Build dist [development]...');

    return exec('webpack --progress --hide-modules', {
        env: lodash.defaults({
            NODE_ENV: 'development'
        }, process.env)
    });
})
// Build dist production
.then(() => {
    if(!IS_PROD) {
        return;
    }

    console.log('○ Build dist [production]...');

    return exec('webpack --progress --hide-modules', {
        env: lodash.defaults({
            NODE_ENV: 'production'
        }, process.env)
    });
})
// done
.then(() => {
    console.log('✓ Build done ^_^');
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
