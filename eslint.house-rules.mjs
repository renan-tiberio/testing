// House rules for eslint.config.mjs. Plain data only (rule settings and AST selectors):
// the config registers its own plugins.

// for..in, labels and `with` are banned everywhere. for..of stays allowed: stream
// readers need for-await.
export const restrictedSyntax = [
  {
    selector: 'ForInStatement',
    message:
      'for..in iterates the prototype chain. Use Object.{keys,values,entries} and iterate the array.',
  },
  {
    selector: 'LabeledStatement',
    message: 'Labels are a form of GOTO and make code hard to follow.',
  },
  {
    selector: 'WithStatement',
    message: '`with` is disallowed in strict mode.',
  },
]

// Named imports only in shipped code: they tree-shake, and a default import of an
// object or namespace drags in everything it holds. `defaultOnlyPackages` lists the
// packages whose only usable export is `default`, checked against their exports.
// A bare `/` ends an esquery regex, so it is escaped (next/link -> next\/link).
export const noDefaultImport = ({ defaultOnlyPackages }) => ({
  selector: `ImportDeclaration[source.value!=/^(${defaultOnlyPackages
    .map((name) => name.replaceAll('/', '\\/'))
    .join('|')})$/] > ImportDefaultSpecifier`,
  message:
    "Use a named import (`import { x } from '...'`). Default-only packages are listed in DEFAULT_ONLY_PACKAGES in eslint.config.mjs.",
})

// Two or more parameters become one destructured object: f({ a, b }), not f(a, b).
// Only functions we declare (and their types) are checked; callbacks handed to an
// API (.map((item, i)), .sort((a, b))) keep the signature the API imposes.
export const objectParams = {
  selector: [
    'FunctionDeclaration',
    'VariableDeclarator > ArrowFunctionExpression',
    'VariableDeclarator > FunctionExpression',
    'CallExpression[callee.name=/^use(Callback|Memo)$/] > ArrowFunctionExpression',
    'TSFunctionType',
    'TSMethodSignature',
  ]
    .map((node) => `${node}[params.length>1]`)
    .join(', '),
  message: 'Take one destructured object parameter: f({ a, b }) instead of f(a, b).',
}

// Absolute imports only; `hint` names the alias in the message.
export const noRelativeImports = ({ hint }) => [
  'error',
  {
    patterns: [
      {
        group: ['./*', '../*'],
        message: `Use ${hint} instead of a relative path.`,
      },
    ],
  },
]

// import-x: order, hygiene and named exports. `pathGroups` pins a package first.
export const importRules = ({ pathGroups = [] } = {}) => ({
  'import-x/order': [
    'error',
    {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling', 'index'],
        'object',
        ['unknown', 'type'],
      ],
      pathGroups,
      pathGroupsExcludedImportTypes: ['type'],
      distinctGroup: true,
      'newlines-between': 'always',
      alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
    },
  ],
  'import-x/first': 'error',
  'import-x/newline-after-import': 'error',
  'import-x/no-duplicates': 'error',
  'import-x/no-namespace': 'error',
  'import-x/no-mutable-exports': 'error',
  'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
  // Named exports only.
  'import-x/no-default-export': 'error',
})

// Arrow functions instead of function declarations/expressions
// (needs eslint-plugin-prefer-arrow-functions registered as "prefer-arrow-functions").
export const arrowFunctionRules = {
  'prefer-arrow-functions/prefer-arrow-functions': ['error', { returnStyle: 'unchanged' }],
}

export const typescriptRules = {
  // love enables @typescript-eslint/no-unused-vars; the core rule would report the
  // same names twice and does not understand TypeScript.
  'no-unused-vars': 'off',
  // Object shapes are `type`, never `interface` (love defaults to interface).
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  // `import type { X }` on its own line, never inline `import { type X }`.
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', disallowTypeAnnotations: true, fixStyle: 'separate-type-imports' },
  ],
}
