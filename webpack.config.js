const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    popup: './src/popup.js',
    content: './src/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        // Copy all HTML, CSS, and the manifest from 'src' to 'dist'
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'src/popup.css', to: 'popup.css' },
        { from: 'src/content.css', to: 'content.css' },
        { from: 'src/manifest.json', to: 'manifest.json' },
        // Copy the icons folder
        { from: 'icons', to: 'icons' }
      ],
    }),
  ],
  // This helps with debugging in the browser, even though it's "production"
  optimization: {
    minimize: false
  }
};