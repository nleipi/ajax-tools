import path from 'node:path'
import { globSync } from 'glob';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: Object.fromEntries(globSync([
    'assets/**/*.js',
    '*/assets/**/*.js',
  ]).map(file => {
    const fileName = file.split('assets/')[1]
    console.log(fileName, file)
    return [fileName, file]
  })),
  output: {
    dir: 'static/dist/',
    format: 'esm',
    entryFileNames: '[name]',
    manualChunks: {}
  },
  plugins: [nodeResolve({
    browser: true
  })]
}
