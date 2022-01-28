const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const { VueLoaderPlugin } = require('vue-loader');
const webpack = require("webpack")

module.exports = env => ({
  mode: env.mode,
  devtool: 'cheap-module-source-map',
  resolve: {
    extensions: ['.js', '.ts', '.json'],
  },
  entry: {
    service: path.resolve(__dirname, 'extension', 'service.ts'),
    app: path.resolve(__dirname, 'extension', 'main.ts')
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'extension', 'build'),
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: 'css-loader'
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/]
          }
        }
      },
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
    new VueLoaderPlugin(),
    new webpack.DefinePlugin({
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true
    })
  ],
});