const H_PRIMITIVES = {
	boolean: [
		'b',
	],
	number: [
		'c', 'i', 'n[l]?', 'x[a-z]?',
	],
	string: [
		's[ipqrx]?', 'p[r]?',
	],
	array: [
		'a[bts]?',
	],
	function: [
		'f[gke]?',
	],
};

const A_SNAKE_TYPES = [
	...Object.values(H_PRIMITIVES).flat(),
	'd[a-z]{0,2}', 'e', 'g[ca-z]?',
	'h[m]?', 'k[a-z]{0,2}', 'm', 'r[t]?',
	't', 'v', 'w', 'y[a-z]{0,2}', 'z',
];

function *snake_types(a_configs) {
	for(const gc_types of a_configs) {
		const a_snake_types = gc_types.patterns;

		let s_inner = a_snake_types.join('|');
		if(gc_types.caps) {
			s_inner += `|${a_snake_types.map(s => s.toUpperCase()).join('|')}`;
		}

		const s_post = gc_types.short? '(_|$)': '_';

		yield {
			selector: gc_types.selector || 'variable',
			types: gc_types.types,
			format: ['snake_case'],
			custom: {
				regex: `^(${s_inner})${s_post}`,
				match: true,
			},
		};
	}
};

const rules = (si_plugin, h_rules) => Object.entries(h_rules)
	.reduce((h_out, [si_rule, w_options]) => ({
		...h_out,
		[`${si_plugin}/${si_rule}`]: w_options,
	}), {});

module.exports = {
	// root: true,
	env: {
		es6: true,
		node: true,
		browser: true,
	},
	globals: {
		globalThis: false,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module',
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json'],
		extraFileExtensions: ['.svelte'],
	},
	plugins: [
		'svelte3',
		'@typescript-eslint',
		'modules-newline',
		'node',
	],
	overrides: [
		{
			files: ['*.svelte'],
			processor: 'svelte3/svelte3',
		},
	],
	ignorePatterns: ['node_modules'],
	settings: {
		'svelte3/typescript': () => require('typescript'),
		'svelte3/ignore-styles': () => true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
	],
	rules: {
		...rules('node', {
			'handle-callback-err': ['warn', '^[eE]'],
			'no-new-require': ['error'],
			'no-path-concat': ['error'],
			...rules('prefer-global', {
				'buffer': ['warn'],
			}),
		}),

		...rules('@typescript-eslint', {
			'no-floating-promises': ['warn', {
				ignoreVoid: true,
				ignoreIIFE: true,
			}],
			'no-namespace': ['off'],
			'no-this-alias': ['warn', {
				allowedNames: [
					'k_self',
					'k_node',
				],
			}],

			'class-literal-property-style': ['warn', 'fields'],
			'prefer-readonly': ['warn'],
			'member-delimiter-style': ['warn', {
				singleline: {
					requireLast: false,
				},
			}],
			'member-ordering': ['warn', {
				classes: [,
					'static-field',
					'static-method',
					'instance-field',
					'constructor',
					'abstract-field',
					'abstract-method',
					'instance-method',
				].flatMap(s => [`private-${s}`, `protected-${s}`, `public-${s}`]),
			}],
			'naming-convention': ['warn',
				{
					selector: 'typeLike',
					format: ['StrictPascalCase'],
					leadingUnderscore: 'forbid',
				},
				{
					selector: 'variable',
					filter: {
						regex: '_Assertion$',
						match: true,
					},
					suffix: ['_Assertion'],
					format: ['StrictPascalCase'],
					leadingUnderscore: 'forbid',
				},
				{
					selector: 'variable',
					format: ['snake_case'],
					custom: {
						regex: `^(${A_SNAKE_TYPES.join('|')}|${A_SNAKE_TYPES.map(s => s.toUpperCase()).join('|')})_`,
						match: true,
					},
				},
				...snake_types(Object.entries(H_PRIMITIVES).reduce((a_out, [si_type, a_patterns]) => ([
					...a_out,
					{
						selector: 'variable',
						types: [si_type],
						patterns: a_patterns,
						caps: true,
					},
				]))),
				...snake_types(Object.entries(H_PRIMITIVES).reduce((a_out, [si_type, a_patterns]) => ([
					...a_out,
					{
						selector: 'parameter',
						types: [si_type],
						patterns: a_patterns,
						short: true,
					},
				]))),
				{
					selector: 'variable',
					modifiers: ['const', 'global'],
					format: ['UPPER_CASE'],
					custom: {
						regex: `^(${A_SNAKE_TYPES.map(s => s.toUpperCase()).join('|')})_`,
						match: true,
					},
				},
				{
					selector: 'enum',
					format: ['UPPER_CASE'],
					custom: {
						regex: `^(${A_SNAKE_TYPES.map(s => s.toUpperCase()).join('|')})_`,
						match: true,
					},
				},
				{
					selector: 'variable',
					types: ['function'],
					format: ['snake_case'],
					leadingUnderscore: 'allow',
				},
				{
					format: ['snake_case'],
					custom: {
						regex: `^_?(${A_SNAKE_TYPES.join('|')})_`,
						match: true,
					},
					selector: 'parameter',
				},
			],
			'no-unnecessary-qualifier': ['warn'],
			'prefer-for-of': ['warn'],
			// 'prefer-nullish-coalescing': ['warn'],
			'prefer-optional-chain': ['warn'],
			'prefer-ts-expect-error': ['warn'],
			'switch-exhaustiveness-check': ['warn'],
			'type-annotation-spacing': ['warn'],
			'unified-signatures': ['warn'],

			// extension rules
			'brace-style': ['warn', 'stroustrup', {
				allowSingleLine: true,
			}],
			'comma-dangle': ['warn', {
				arrays: 'always-multiline',
				objects: 'always-multiline',
				imports: 'always-multiline',
				exports: 'always-multiline',
				functions: 'never',
				enums: 'always-multiline',
				generics: 'always-multiline',
				tuples: 'always-multiline',
			}],
			'comma-spacing': ['warn'],
			'default-param-last': ['error'],
			'dot-notation': ['warn'],
			'func-call-spacing': ['warn'],
			'indent': ['warn', 'tab', {
				SwitchCase: 1,
				VariableDeclarator: 0,
				ignoreComments: true,
				ignoredNodes: [
					'TSTypeParameterInstantiation',
				],
			}],
			'keyword-spacing': ['warn', {
				overrides: {
					if: {after:false},
					for: {after:false},
					while: {after:false},
					switch: {after:false},
					catch: {after:false},
				},
			}],
			'lines-between-class-members': ['warn', {
				exceptAfterSingleLine: true,
			}],
			'no-extra-parens': ['warn', 'all', {
				nestedBinaryExpressions: false,
				returnAssign: false,
				enforceForNewInMemberExpressions: false,
				enforceForFunctionPrototypeMethods: false,
			}],
			'no-invalid-this': ['error'],
			'no-loop-func': ['warn'],
			'no-unused-expressions': ['warn'],
			'no-shadow': ['error'],
			'no-use-before-define': ['error', {
				classes: false,
				variables: false,
				functions: false,
				ignoreTypeReferences: true,
			}],
			'no-useless-constructor': ['warn'],
			'object-curly-spacing': ['warn'],
			'quotes': ['warn', 'single', {
				avoidEscape: true,
				allowTemplateLiterals: true,
			}],
			'semi': ['warn', 'always'],
			'space-before-function-paren': ['warn','never'],
		}),

		...rules('modules-newline', {
			'import-declaration-newline': ['warn'],
			'export-declaration-newline': ['warn'],
		}),


		// ...rules('import', {
		// 	'newline-after-import': ['warn'],
		// }),


		'for-direction': ['error'],
		'getter-return': ['error', {
			allowImplicit: true,
		}],
		'no-await-in-loop': ['off'],
		'no-cond-assign': ['error', 'except-parens'],
		'no-console': ['warn', {
			allow:['time', 'warn', 'error', 'assert'],
		}],
		'no-control-regex': ['off'],
		'no-debugger': ['warn'],
		'no-empty': ['error', {
			allowEmptyCatch: true,
		}],

		// # 
		'no-template-curly-in-string': ['warn'],
		'valid-typeof': ['error', {
			requireStringLiterals: true,
		}],

		  // # "Best Practices"
		'array-callback-return': ['error'],
		'class-methods-use-this': ['warn'],
		'curly': ['error', 'multi-line', 'consistent'],
		'default-case': ['error'],
		'dot-location': ['error', 'property'],
		'eqeqeq': ['error'],
		'no-caller': ['error'],
		'no-extend-native': ['error'],
		'no-extra-bind': ['error'],
		'no-extra-label': ['warn'],
		'no-implied-eval': ['error'],
		'no-iterator': ['error'],
		'no-multi-spaces': ['warn', {
			ignoreEOLComments: true,
		}],
		'no-multi-str': ['error'],
		  // # no-new: error
		'no-new-func': ['error'],
		'no-new-wrappers': ['error'],
		'no-octal-escape': ['error'],
		'no-proto': ['error'],
		'no-script-url': ['error'],
		'no-self-assign': ['warn'],
		'no-self-compare': ['error'],
		'no-sequences': ['error'],
		'no-throw-literal': ['error'],
		'no-unmodified-loop-condition': ['error'],
		'no-unused-labels': ['warn'],
		'no-useless-call': ['error'],
		'no-useless-concat': ['warn'],
		'no-useless-escape': ['warn'],
		// 'no-void': ['error'],
		'no-warning-comments': ['warn'],
		'no-with': ['error'],
		'prefer-promise-reject-errors': ['warn'],
		'wrap-iife': ['error', 'inside'],

		// variables
		'no-label-var': ['error'],
		'no-restricted-globals': ['error'],
		'no-shadow-restricted-names': ['warn'],
		'no-undef-init': ['error'],
		'no-undefined': ['error'],

		// eslint stylistic
		'array-bracket-spacing': ['warn', 'never'],
		'comma-style': ['warn'],
		'computed-property-spacing': ['warn'],
		'eol-last': ['warn'],
		'implicit-arrow-linebreak': ['warn'],
		'key-spacing': ['warn', {
			singleLine: {
				beforeColon: false,
				afterColon: false,
			},
			multiLine: {
				mode: 'strict',
				beforeColon: false,
				afterColon: true,
			},
		}],
		'linebreak-style': ['error', 'unix'],
		'multiline-ternary': ['warn', 'always-multiline'],
		'new-cap': ['warn', {
			newIsCap: false,
			capIsNewExceptionPattern: '^[A-Z$_][A-Z$_0-9]*',
			capIsNew: true,
			properties: false,
		}],
		'new-parens': ['warn'],
		'no-lonely-if': ['warn'],
		'no-mixed-operators': ['warn'],
		'no-multiple-empty-lines': ['warn', {
			max: 3,
		}],
		'no-new-object': ['error'],
		'no-trailing-spaces': ['warn'],
		'no-unneeded-ternary': ['warn', {
			defaultAssignment: false,
		}],
		'no-whitespace-before-property': ['warn'],
		'nonblock-statement-body-position': ['error', 'beside'],
		// 'object-curly-newline': ['warn', {
		// 	ObjectExpression: {
		// 		multiline: true,
		// 		minProperties: 2,
		// 	},
		// 	ObjectPattern: {
		// 		multiline: true,
		// 		minProperties: 2,
		// 	},
		// 	ImportDeclaration: {
		// 		multiline: true,
		// 		minProperties: 2,
		// 	},
		// 	ExportDeclaration: {
		// 		multiline: true,
		// 		minProperties: 2,
		// 	},
		// }],
		'object-property-newline': ['warn', {
			allowAllPropertiesOnSameLine: true,
		}],
		'padding-line-between-statements': ['warn', {
			blankLine: 'always',
			prev: 'import',
			next: 'import',
		}],
		'one-var': ['warn', {
			initialized: 'never',
		}],
		'operator-assignment': ['warn'],
		'operator-linebreak': ['warn', 'before'],
		'padded-blocks': ['warn', 'never'],
		'quote-props': ['warn', 'consistent-as-needed'],
		'semi-spacing': ['warn', {
			before: false,
			after: true,
		}],
		'semi-style': ['error'],
		'space-before-blocks': ['warn','always'],
		'space-in-parens': ['warn','never'],
		'space-unary-ops': ['warn', {
			words: true,
			nonwords: false,
		}],
		'spaced-comment': ['warn','always', {
			exceptions: ['-*'],
		}],
		'switch-colon-spacing': ['warn'],
		'template-tag-spacing': ['warn'],
		'yoda': ['warn', 'always', {
			exceptRange: true,
		}],

		// es6
		'arrow-body-style': ['warn', 'as-needed'],
		'arrow-parens': ['warn', 'as-needed', {
			requireForBlockBody: true,
		}],
		'arrow-spacing': ['warn'],
		'generator-star-spacing': ['warn', {
			named: 'after',
			anonymous: 'before',
			method: 'after',
		}],
		'no-useless-computed-key': ['warn'],
		'no-var': ['error'],
		'prefer-arrow-callback': ['warn', {
			allowNamedFunctions: true,
		}],
		'prefer-spread': ['warn'],
		// # prefer-template: warn
		'rest-spread-spacing': ['warn', 'never'],
		'symbol-description': ['warn'],
		'template-curly-spacing': ['warn'],
		'yield-star-spacing': ['warn'],
		'no-fallthrough': ['warn'],
	},
};
