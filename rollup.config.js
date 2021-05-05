import svelte from 'rollup-plugin-svelte';
import bundleSize from 'rollup-plugin-bundle-size'
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import css from 'rollup-plugin-css-only';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

export default [
  {
    input: 'src/index.js',
    output: [
      { file: pkg.module, 'format': 'es' },
      { file: pkg.main, 'format': 'umd', name: 'DatePicker' }
    ],
    plugins: [
      css({ output: 'bundle.css' }),
      svelte(),
      commonjs(),
      resolve(),
      terser(),
      bundleSize()
    ]
  }
];