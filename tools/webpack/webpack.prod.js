const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const rootDir = path.resolve(__dirname, '../..');

module.exports = merge(common, {
  mode: 'production',

  output: {
    path: path.resolve(rootDir, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
    publicPath: '/',
  },

  devtool: 'hidden-source-map', // Reduces bundle size while keeping source maps for debugging

  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[name].[contenthash].chunk.css',
    }),
    // Uncomment for bundle analysis
    // new BundleAnalyzerPlugin({
    //   analyzerMode: 'static',
    //   openAnalyzer: false,
    // }),
  ],

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],

    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          chunks: 'all',
        },
        // Three.js specific optimization
        threejs: {
          test: /[\\/]node_modules[\\/](three|@types\/three)[\\/]/,
          name: 'threejs',
          priority: 30,
          chunks: 'all',
        },
        // Cube engine optimization
        cubeEngine: {
          test: /[\\/]packages[\\/](cube-engine|three-renderer)[\\/]/,
          name: 'cube-engine',
          priority: 25,
          chunks: 'all',
        },
      },
    },

    runtimeChunk: {
      name: 'runtime',
    },
  },

  // Performance budget for production - adjusted for Three.js applications
  performance: {
    hints: 'warning',
    maxEntrypointSize: 1500000, // 1.5MB - reasonable for 3D applications with Three.js
    maxAssetSize: 800000, // 800KB - allows for larger Three.js chunks
    assetFilter: function (assetFilename) {
      // Only warn about large JS/CSS files, not assets like images, fonts, or source maps
      return !/\.(png|jpe?g|gif|svg|woff|woff2|eot|ttf|otf|map)$/i.test(
        assetFilename
      );
    },
  },
});
