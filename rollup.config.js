const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const babel = require('@rollup/plugin-babel');
const terser = require('@rollup/plugin-terser');
const replace = require('@rollup/plugin-replace');
const { readFileSync } = require('fs');

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const banner = `/*!
 * LoopKit JavaScript SDK v${pkg.version}
 * (c) ${new Date().getFullYear()} LoopKit
 * Released under the MIT License
 */`;

const baseConfig = {
  input: 'src/index.js',
  plugins: [
    replace({
      __VERSION__: JSON.stringify(pkg.version),
      preventAssignment: true,
    }),
    resolve(),
    commonjs(),
    babel.default({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['> 1%', 'last 2 versions', 'IE >= 11'],
            },
          },
        ],
      ],
    }),
  ],
};

module.exports = [
  // ES Module build
  {
    ...baseConfig,
    output: {
      file: 'dist/loopkit.esm.js',
      format: 'es',
      banner,
    },
  },

  // CommonJS build
  {
    ...baseConfig,
    output: {
      file: 'dist/loopkit.cjs.js',
      format: 'cjs',
      banner,
      exports: 'default',
    },
  },

  // UMD build for browsers
  {
    ...baseConfig,
    output: {
      file: 'dist/loopkit.js',
      format: 'umd',
      name: 'LoopKit',
      banner,
      exports: 'default',
    },
  },

  // Minified UMD build for CDN
  {
    ...baseConfig,
    plugins: [
      ...baseConfig.plugins,
      terser.default({
        output: {
          comments(node, comment) {
            return comment.value.includes('LoopKit JavaScript SDK');
          },
        },
      }),
    ],
    output: {
      file: 'dist/loopkit.min.js',
      format: 'umd',
      name: 'LoopKit',
      banner,
      exports: 'default',
    },
  },
];
