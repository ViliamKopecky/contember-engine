import replace from '@rollup/plugin-replace'
//import analyzer from 'rollup-plugin-analyzer'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
//import { terser } from 'rollup-plugin-terser'
import visualizer from 'rollup-plugin-visualizer'
import { reactExportedMembers } from '../../build/exportedMembers/react'
import { reactClientMembers } from '../react-client/exportedMembers'

const commonJsConfig = {
	namedExports: {
		['@contember/react-client']: reactClientMembers,
		react: reactExportedMembers,
	},
}
const resolveConfig = {
	preferBuiltins: true,
	dedupe: ['react', 'react-dom'],
	customResolveOptions: {
		packageFilter: packageJson => {
			if (packageJson.name === '@contember/react-multipass-rendering') {
				return {
					...packageJson,
					main: 'dist/bundle.js',
				}
			}
			return packageJson
		},
	},
	// modulesOnly: true
}

const getReplaceConfig = isProd => ({
	//__DEV__: JSON.stringify(isProd ? 'true' : 'false'),
	'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
})

export default [
	{
		input: 'dist/src/index.js',
		output: {
			file: 'dist/bundle.js',
			format: 'esm',
			sourcemap: true,
		},
		external: ['react', 'react-dom'],
		plugins: [
			replace(getReplaceConfig(true)),
			resolve(resolveConfig),
			commonjs(commonJsConfig),
			//terser({
			//	sourcemap: true,
			//}),
			visualizer({
				filename: 'dist/bundleStats.html',
				sourcemap: true,
			}),
		],
	},
	{
		input: 'dist/tests/index.js',
		output: {
			file: 'dist/tests/bundle.cjs',
			format: 'cjs',
			sourcemap: false,
		},
		external: ['jasmine'],
		plugins: [replace(getReplaceConfig(false)), resolve(resolveConfig), commonjs(commonJsConfig)],
	},
]
