import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = pkg.version;
const name = 'LoopKit';

const banner = `/**
 * LoopKit JavaScript SDK v${version}
 * (c) ${new Date().getFullYear()} LoopKit Team
 * Released under the MIT License.
 */`;

const baseConfig = {
  input: 'src/index.ts',
  external: [],
  plugins: [
    replace({
      __VERSION__: JSON.stringify(version),
      preventAssignment: true,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false, // We generate declarations separately with tsc
      declarationMap: false,
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      extensions: ['.js', '.ts'],
    }),
  ],
};

export default [
  // ES Module build
  {
    ...baseConfig,
    output: {
      file: pkg.module,
      format: 'es',
      banner,
    },
  },

  // CommonJS build
  {
    ...baseConfig,
    output: {
      file: pkg.main,
      format: 'cjs',
      banner,
      exports: 'named',
    },
  },

  // UMD build (for browsers)
  {
    ...baseConfig,
    output: {
      file: pkg.browser,
      format: 'umd',
      name,
      banner,
    },
  },

  // Minified UMD build
  {
    ...baseConfig,
    plugins: [
      ...baseConfig.plugins,
      terser({
        output: {
          comments: false,
        },
      }),
    ],
    output: {
      file: pkg.unpkg,
      format: 'umd',
      name,
    },
  },
];
