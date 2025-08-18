const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

module.exports = merge(common, {
  mode: 'development',
  
  output: {
    path: path.resolve(rootDir, 'dist'),
    filename: '[name].bundle.js',
    clean: true,
    publicPath: '/',
  },

  devtool: 'eval-source-map',

  devServer: {
    static: [
      {
        directory: path.resolve(rootDir, 'packages/web-app/public'),
      },
    ],
    port: 3000,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
    client: {
      logging: 'info',
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    // Proxy for API development
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    ],
  },

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  // Performance hints for development
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },

  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
  },
});