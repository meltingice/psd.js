module.exports = {
  entry: './lib/psd.coffee',
  mode: 'production',
  output: {
    filename: 'psd.webpack.js',
  },
  module: {
    rules: [
      {
        test: /\.coffee$/,
        loader: "coffee-loader",
      },
    ],
  },
  resolve: {
    fallback: {
      zlib: require.resolve("browserify-zlib"),
      stream: require.resolve("stream-browserify"),
      fs: false
    }
  }
};
