var path = require('path');
var merge = require('webpack-merge');

const sharedConfig = {
  devtool: 'cheap-eval-source-map',
  stats: {
    errorDetails: true
  },

  output: {
    pathinfo: true
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
    ]
  },
};

const coreConfig = merge(sharedConfig, {
  entry: './src/psd.js',
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, 'dist'),
    library: 'PSD',
    libraryTarget: 'umd'
  }
});

const browserConfig = merge(sharedConfig, {
  entry: './src/browser/index.js',
  output: {
    filename: 'psd-browser.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'PSDTools',
    libraryTarget: 'umd'
  }
});

const nodeConfig = merge(sharedConfig, {
  target: 'node',
  entry: './src/node/index.js',
  output: {
    filename: "psd-node.js",
    path: path.resolve(__dirname, 'dist'),
    library: 'PSDTools',
    libraryTarget: 'umd'
  }
});

module.exports = [coreConfig, browserConfig, nodeConfig]
