const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  //...
  entry: './examples/browser/index.html',
  devServer: {
    static: {
      directory: path.join(__dirname, './examples/browser'),
      publicPath: '/'
    },    
    compress: true,
    port: 9000  
  },
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
    ],
  }
};