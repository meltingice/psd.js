'use strict';

const path = require('path');
const webpack = require('webpack');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

module.exports = {
    cache: true,
    entry: {
        psd: './index.js'
    },
    output: {
        libraryTarget: 'umd',
        path: path.resolve('./dist'),
        filename: '[name].js'
    },
    node: {
        fs: 'empty'
    },
    plugins: [],
    module: {
        loaders: [
            { test: /\.coffee$/, loader: 'coffee-loader' },
            { test: /\.json$/, loader: 'json-loader' }
        ]
    },
    devtool: '#source-map'
};

if(IS_PROD) {
    let entry = module.exports.entry;
    for(let k in entry) {
        entry[k + '.min'] = entry[k];

        delete entry[k];
    }

    module.exports.devtool = '#source-map';

    // http://vue-loader.vuejs.org/en/workflow/production.html
    module.exports.plugins = module.exports.plugins.concat([
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
                drop_console: true,
                dead_code: true
            },
            output: {
                comments: false
            }
        }),
        new webpack.optimize.OccurenceOrderPlugin()
    ]);
}