const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const rootDir = path.resolve(__dirname, '../..');
const webAppDir = path.resolve(rootDir, 'packages/web-app');

module.exports = {
  entry: path.resolve(webAppDir, 'src/index.tsx'),
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@rubiks-cube/cube-engine': path.resolve(rootDir, 'packages/cube-engine/src'),
      '@rubiks-cube/three-renderer': path.resolve(rootDir, 'packages/three-renderer/src'),
      '@rubiks-cube/shared': path.resolve(rootDir, 'packages/shared/src'),
      '@': path.resolve(webAppDir, 'src'),
    },
    // Optimize Three.js imports for tree shaking
    mainFields: ['module', 'main'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              projectReferences: true,
              configFile: path.resolve(webAppDir, 'tsconfig.json'),
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]',
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]',
        },
      },
      {
        test: /\.(gltf|glb|obj|mtl)$/i,
        type: 'asset/resource',
        generator: {
          filename: '3d-assets/[name].[hash][ext]',
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(webAppDir, 'public/index.html'),
      filename: 'index.html',
      inject: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(webAppDir, 'public'),
          to: path.resolve(rootDir, 'dist'),
          globOptions: {
            ignore: ['**/index.html'],
          },
        },
      ],
    }),
  ],

  // Optimization for Three.js
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Three.js and 3D libraries
        threejs: {
          test: /[\\/]node_modules[\\/](three|@types\/three)[\\/]/,
          name: 'threejs',
          priority: 30,
        },
        // React and related libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react',
          priority: 20,
        },
        // Redux state management
        redux: {
          test: /[\\/]node_modules[\\/](@reduxjs|react-redux)[\\/]/,
          name: 'redux',
          priority: 15,
        },
        // Other vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        // Cube engine modules
        cubeEngine: {
          test: /[\\/]packages[\\/](cube-engine|three-renderer)[\\/]/,
          name: 'cube-engine',
          priority: 25,
        },
      },
    },
  },

  stats: {
    errorDetails: true,
    children: false,
    modules: false,
  },
};