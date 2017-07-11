var path = require('path');

module.exports = {
  entry: './src/psd.js',
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
  output: {
    filename: 'psd.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'PSD',
    libraryTarget: 'umd'
  }
};
