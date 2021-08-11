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

const B_PROD = !process.env.ROLLUP_WATCH;

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
			VERSION: G_PACKAGE.version,
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
};

const H_VALUES_OUT = replace_values(H_REPLACE_IN);

console.dir(replace_values({
	process: H_REPLACE_IN.process,
	lang: H_REPLACE_IN.lang,
}));

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
			sourceMap: !B_PROD,
		}),
		compilerOptions: {
			// enable run-time checks when not in production
			dev: !B_PROD
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
		sourceMap: !B_PROD,
		inlineSources: !B_PROD
	}),

	// In dev mode, call `npm run start` once
	// the bundle has been generated
	!B_PROD && serve(),

	// Watch the `public` directory and refresh the
	// browser on changes when not in B_PROD
	!B_PROD && livereload('public'),

	// If we're building for B_PROD (npm run build
	// instead of npm run dev), minify
	...('auto' === z_terser
		? [B_PROD && terser()]
		: (z_terser
			? [terser()]
			: [false])),
];

function patch(pr_src, gc_patch) {
	const {
		prepend: s_prepend='',
		rules: a_rules=[],
		append: s_append='',
	} = gc_patch;

	const s_last = '';

	const ds_transform = new Transform({
		transform(s_chunk, s_encoding, fk_transform) {
			const a_lines = (s_last+s_chunk).split(/\n/g);
			const a_safe = a_lines.slice(0, -1);
			s_last = a_safe[a_safe.length-1];

			const a_out = [];

			// each line
			LINES:
			for(let s_line of a_safe) {
				let i_rule = -1;

				// each rule
				RULES:
				for(const g_rule of a_rules) {
					i_rule += 1;
					if(g_rule.match) {
						switch(typeof g_rule.replace) {
							case 'string':
							case 'function': {
								s_line = s_line.replace(g_rule.match, g_rule.replace);
								if(g_rule.once) {
									a_rules.splice(i_rule--, 1);
								}
								continue RULES;
							}
						}
					}
				}

				// push line
				a_out.push(s_line);
			}

			// push transformed chunk
			this.push(a_out.join('\n'));
			fk_transform();
		},

		flush(fk_flush) {
			if(s_last || s_append) this.push(s_last+s_append);
			fk_flush();
		},
	});

	// prepend
	if(s_prepend) {
		ds_transform.push(s_prepend);
	}

	// pipeline
	fs.createReadStream(pr_src, 'utf8')
		.pipe(ds_transform);

	return {
		name: 'patch',
		// buildStart() {},
		renderChunk(s_code, s_chunk) {

		},
	};
}

export default [
	// confluence entrypoint
	{
		input: 'src/vendor/confluence/main/entrypoint.ts',
		output: {
			sourcemap: true,
			format: 'iife',
			name: 'app',
			file: `public/build/bundle.${B_PROD? 'min': 'dev'}.js`,
		},
		plugins: svelte_plugins(),
		watch: {
			clearScreen: false,
		},
	},

	// // confluence editor
	// {
	// 	input: 'src/vendor/confluence/main/editor.ts',
	// 	output: {
	// 		sourcemap: true,
	// 		format: 'iife',
	// 		name: 'editor',
	// 		file: 'public/build/editor.js'
	// 	},
	// 	plugins: [
	// 		patch('.js', {
	// 			prepend: /* syntax: js */ `
	// 				if(window.parent.ve4_iframe_target) {
	// 					history.replaceState(null, '', window.parent.ve4_iframe_target);
	// 				}
	// 				else {
	// 					throw new Error('IGNORE THIS ERROR. This error is being thrown in order to prevent the editor script from executing. VE4 is doing this in order to preload the editor script for a better UI experience :)');
	// 				}
					
	// 				if('$_DEFINE_VE4_WYSIWYG_EDITOR' in window) throw new Error('The editor is already loaded')
					
	// 				window.$_DEFINE_VE4_WYSIWYG_EDITOR = 've4';
					
	// 				var F_NOOP = (...a_args) => {
	// 					// return window.history.pushState(...a_args);
	// 				};
	// 			`,
	// 			rules: [
	// 				// prevent any method from changing state
	// 				{
	// 					match: /([a-zA-Z0-9$_]\.)*history\.(push|replace)State/g,
	// 					replace: 'F_NOOP',
	// 				},
	// 				// apply META locale
	// 				{
	// 					once: true,
	// 					match: /\s*(module\.exports\s*=\s*__(WEBPACK_EXTERNAL_MODULE_2__);?)\s*/,
	// 					replace: `
	// 						$2.set('user-locale', 'en-US');

	// 						$1
	// 					`,
	// 				},
	// 			],
	// 		}),
	// 		...svelte_plugins({terser:true}),
	// 	],
	// 	watch: {
	// 		clearScreen: false,
	// 	},
	// },
];
