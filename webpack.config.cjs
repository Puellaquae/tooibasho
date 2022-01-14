const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  resolve: {
    extensions: ['.js', '.ts', '.json'],
  },
  entry: {
    service: path.resolve(__dirname, 'extension', 'service.ts'),
    app: path.resolve(__dirname, 'extension', 'app.ts')
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'extension', 'build'),
  },
  module: {
    rules: [
      { test: /\.ts$/, exclude: /node_modules/, use: 'ts-loader' }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'extension', 'public')
        },
      ]
    }),
  ],
};