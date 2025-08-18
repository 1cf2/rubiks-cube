const path = require('path');

// Import configurations from tools directory
const devConfig = require('../../tools/webpack/webpack.dev.js');
const prodConfig = require('../../tools/webpack/webpack.prod.js');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return isDevelopment ? devConfig : prodConfig;
};