import fs from 'fs';
import yaml from 'js-yaml';

import alias from '@rollup/plugin-alias';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
// import url from '@rollup/plugin-url';
import ttypescript from 'ttypescript';
// import tsPathsResolve from 'rollup-plugin-ts-paths-resolve';
import path from 'path';
import * as G_PACKAGE from './package.json';
import { Transform } from 'stream';

const B_DEV = 'development' === process.env.NODE_ENV;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

const replace_values = (h_replace) => Object.entries(h_replace).reduce((h_out, [si_var, w_value]) => ({
	...h_out,
	[`export const ${si_var}`]: `export const ${si_var} = ${JSON.stringify(w_value)}; //`,
	[`export let ${si_var}`]: `export let ${si_var} = ${JSON.stringify(w_value)}; //`,
}), {});

const H_REPLACE_IN = {
	process: {
		env: {
			SPARQL_ENDPOINT: process.env.SPARQL_ENDPOINT,
			DOORS_NG_PREFIX: process.env.DOORS_NG_PREFIX,
			EDITOR_SUPPLEMENT_SRC: process.env.EDITOR_SUPPLEMENT_SRC,
			VERSION: G_PACKAGE.version,
			PRODUCTION: !B_DEV,
		},
	},
	lang: yaml.load(fs.readFileSync(`./resource/${process.env.LANG_FILE || 'lang.yaml'}`))[process.env.LANG],
	static_css: [
		'./submodule/animate.less/dist/css/animate.css',
		// './node_modules/@fortawesome/fontawesome-free/css/all.min.css',
	].map(pr => fs.readFileSync(pr, 'utf8')).join('\n'),
	static_js: [
		'./node_modules/@fortawesome/fontawesome-free/js/all.min.js',
	].map(pr => fs.readFileSync(pr, 'utf8')).join('\n'),
	confluence_editor_injections: process.env.CONFLUENCE_EDITOR_INJECTIONS
		? require(process.env.CONFLUENCE_EDITOR_INJECTIONS) || []
		: [],
};

console.dir(H_REPLACE_IN.confluence_editor_injections);

const H_VALUES_OUT = replace_values(H_REPLACE_IN);

console.dir(replace_values([
	'process',
	'lang',
	'confluence_editor_injections',
].reduce((h, s) => ({...h, [s]: H_REPLACE_IN[s]}), {})));

const k_resolver = resolve({
	browser: true,
	dedupe: ['svelte'],
	extensions: [
		'.ts',
		'.mjs',
		'.js',
		'.svelte',
	],
})

const svelte_plugins = ({terser:z_terser='auto'}={}) => [
	replace({
		preventAssignment: false,
		delimiters: ['', ''],
		values: H_VALUES_OUT,
	}),

	// url({
	// 	include: ['**/*.css'],
	// }),

	svelte({
		preprocess: sveltePreprocess({
			sourceMap: B_DEV,
		}),
		compilerOptions: {
			// enable run-time checks when not in production
			dev: B_DEV,
		},
		emitCss: false,
	}),

	alias({
		resolve: ['.svelte', '.ts'],
		entries: {
			'#': path.resolve(__dirname, 'src'),
		},
		k_resolver,
	}),

	k_resolver,

	// If you have external dependencies installed from
	// npm, you'll most likely need these plugins. In
	// some cases you'll need additional configuration -
	// consult the documentation for details:
	// https://github.com/rollup/plugins/tree/master/packages/commonjs
	// resolve({
	// 	browser: true,
	// 	dedupe: ['svelte']
	// }),
	// tsPathsResolve(),
	commonjs(),
	typescript({
		typescript: ttypescript,
		sourceMap: B_DEV,
		inlineSources: B_DEV
	}),

	// In dev mode, call `npm run start` once
	// the bundle has been generated
	B_DEV && serve(),

	// // Watch the `public` directory and refresh the
	// // browser on changes when not in B_PROD
	// !B_PROD && livereload('public'),

	// If we're building for B_PROD (npm run build
	// instead of npm run dev), minify
	...('auto' === z_terser
		? [!B_DEV && terser()]
		: (z_terser
			? [terser()]
			: [false])),
];


export default [
	// confluence entrypoint
	{
		input: 'src/vendor/confluence/main/entrypoint.ts',
		output: {
			sourcemap: true,
			format: 'iife',
			name: 'app',
			file: `public/build/viewer.${B_DEV? 'dev': 'min'}.js`,
		},
		plugins: svelte_plugins(),
		watch: {
			clearScreen: false,
		},
	},

	// confluence editor
	{
		input: 'src/vendor/confluence/patch/editor.ts',
		output: {
			sourcemap: true,
			format: 'iife',
			name: 'editor',
			file: `public/build/editor.${B_DEV? 'dev': 'min'}.js`,
		},
		plugins: [
			...svelte_plugins(),
		],
		watch: {
			clearScreen: false,
		},
	},
];
