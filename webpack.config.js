const path = require('path');
const pakg = require(path.resolve(__dirname, 'package.json'));

module.exports = {
  entry: './index.ts',
  devtool: 'source-map',
  target: 'node',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  externals: (context, request, callback) => {
    callback(
      null,
      Object.keys(pakg.dependencies).includes(request) ? `require("${request}")` : false,
    );
  },
};