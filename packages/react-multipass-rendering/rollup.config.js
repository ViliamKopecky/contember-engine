import replace from '@rollup/plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

export default {
	input: 'dist/src/index.js',
	output: {
		file: 'dist/bundle.js',
		format: 'esm',
		sourcemap: true,
	},
	external: ['react'],
	plugins: [
		replace({
			//__DEV__: 'false',
			'process.env.NODE_ENV': 'production',
		}),
		resolve(),
		commonjs(),
		terser(),
	],
}
