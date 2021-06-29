const A_SNAKE_TYPES = [
    'a[bts]?', 'b', 'c', 'd[a-z]{0,2}', 'e', 'f[gke]?', 'g[c]?',
    'h[m]?', 'i', 'k[a-z]{0,2}', 'm', 'n[l]?', 'p[r]?', 'r[t]?',
    's[rqx]?', 't', 'v', 'w', 'x[a-z]?', 'y[a-z]{0,2}', 'z'
];

const rules = (si_plugin, h_rules) => Object.entries(h_rules)
    .reduce((h_out, [si_rule, w_options]) => ({
        ...h_out,
        [`${si_plugin}/${si_rule}`]: w_options,
    }), {});

module.exports = {
    root: true,
    env: {
        browser: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
    },
    plugins: [
        '@typescript-eslint',
        'modules-newline',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    rules: {
        ...rules('@typescript-eslint', {
            'no-namespace': 'off',

            'class-literal-property-style': ['warn', 'fields'],
            'prefer-readonly': ['warn'],
            'member-delimiter-style': ['warn', {
                singleline: {
                    requireLast: true,
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
                        regex: `^(${A_SNAKE_TYPES.join('|')}|${A_SNAKE_TYPES.map(s => s.toUpperCase()).join('|')})`,
                        match: true,
                    },
                },
                {
                    format: ['snake_case'],
                    custom: {
                        regex: `^_?(${A_SNAKE_TYPES.join('|')})`,
                        match: true,
                    },
                    selector: 'parameter',
                },
            ],
            'no-unnecessary-qualifier': ['warn'],
            'prefer-for-of': ['warn'],
            'prefer-nullish-coalescing': ['warn'],
            'prefer-optional-chain': ['warn'],
            'prefer-ts-expect-error': ['warn'],
            'switch-exhaustiveness-check': ['warn'],
            'type-annotation-spacing': ['warn'],
            'unified-signatures': ['warn'],

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
            'indent': ['warn', 'tab'],
            'keyword-spacing': ['warn'],
            'lines-between-class-members': ['warn', {
                exceptAfterSingleLine: true,
            }],
            'object-curly-spacing': ['warn'],
        }),

        ...rules('modules-newline', {
            'import-declaration-newline': ['warn'],
            'export-declaration-newline': ['warn'],
        }),

        'object-curly-newline': ['warn', {
            ObjectExpression: {
                multiline: true,
                minProperties: 2,
            },
            ObjectPattern: {
                multiline: true,
                minProperties: 2,
            },
            ImportDeclaration: {
                multiline: true,
                minProperties: 2,
            },
            ExportDeclaration: {
                multiline: true,
                minProperties: 2,
            },
        }],

        'padding-line-between-statements': ['warn', {
            blankLine: 'always',
            prev: 'import',
            next: 'import',
        }],
    },
};
