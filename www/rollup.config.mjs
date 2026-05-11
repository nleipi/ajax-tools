import path from 'node:path'
import { globSync } from 'glob';
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default {
  input: Object.fromEntries(globSync([
    'assets/**/*.js',
    'apps/*/assets/**/*.js',
  ]).map(file => {
    const fileName = file.split('assets/')[1]
    console.log(fileName, file)
    return [fileName, file]
  })),
  output: {
    dir: 'static/',
    format: 'es',
    entryFileNames: '[name]',
    manualChunks: {}
  },
  plugins: [
    nodeResolve({ browser: true }),
    commonjs(),
    json(),
  ]
}
