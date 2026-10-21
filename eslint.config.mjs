import { createRequire } from 'node:module'

import js from '@eslint/js'
import eslintReact from '@eslint-react/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import love from 'eslint-config-love'
import prettierConfig from 'eslint-config-prettier/flat'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { importX } from 'eslint-plugin-import-x'
import preferArrowFunctions from 'eslint-plugin-prefer-arrow-functions'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import globals from 'globals'
import { configs as typescriptEslintConfigs } from 'typescript-eslint'

import {
  arrowFunctionRules,
  importRules,
  noDefaultImport,
  noRelativeImports,
  objectParams,
  restrictedSyntax,
  typescriptRules,
} from './eslint.house-rules.mjs'

// @next/eslint-plugin-next is CommonJS: Node exposes `configs` only on its default
// export, while its type declarations also declare it as a named export, so import-x
// flags `plugin.configs` on the default import. require() reads module.exports as is.
const nextPlugin = createRequire(import.meta.url)('@next/eslint-plugin-next')

const TS_FILES = ['**/*.{ts,tsx}']
// Shipped code. The app lives at the project root (no src/ folder).
const SRC_FILES = ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'proxy.ts']
const SRC_TSX_FILES = ['app/**/*.tsx', 'components/**/*.tsx']

// Packages whose only usable export is `default`. Add one only after checking the
// package has no named equivalent (Supabase and Prisma have named exports).
const DEFAULT_ONLY_PACKAGES = ['next/link', 'next/image', 'next/dynamic', 'next/script']

// Files Next.js loads through `export default`.
const NEXT_DEFAULT_EXPORT_FILES = [
  'app/**/{page,layout,template,loading,error,global-error,not-found,default,forbidden,unauthorized}.tsx',
  'app/**/{opengraph-image,twitter-image,icon,apple-icon}.tsx',
  'app/**/{sitemap,robots,manifest}.ts',
]

// Files whose function signatures Next.js imposes: route handlers (request, context),
// middleware/proxy (request, event), Server Actions used with useActionState
// (prevState, formData).
const NEXT_SIGNATURE_FILES = ['app/**/route.ts', 'middleware.ts', 'proxy.ts', '**/actions.ts']

export default defineConfig([
  globalIgnores([
    '.next/',
    'out/',
    'coverage/',
    'next-env.d.ts',
    // Generated code: `supabase gen types` output (adjust the paths).
    'generated/',
    'types/database.types.ts',
    // Supabase Edge Functions are Deno code (deno lint), not part of this config.
    'supabase/functions/',
  ]),

  { name: 'js/recommended', ...js.configs.recommended },

  // TypeScript: eslint-config-love (strict, type-aware, no formatting rules).
  {
    ...love,
    name: 'love',
    files: TS_FILES,
    languageOptions: {
      ...love.languageOptions,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },

  // typescript-eslint's own switch-off of core rules the TS compiler already checks.
  {
    ...typescriptEslintConfigs.eslintRecommended,
    name: 'typescript/eslint-recommended',
    files: TS_FILES,
  },

  // Next.js: its own plugin only (eslint-config-next does not support ESLint 10).
  {
    name: 'next',
    files: SRC_FILES,
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // React: @eslint-react (eslint-plugin-react does not support ESLint 10) and
  // react-hooks v7, whose recommended set carries the React Compiler rules.
  {
    ...eslintReact.configs['strict-type-checked'],
    name: 'react/eslint-react',
    files: SRC_FILES,
  },
  { ...reactHooks.configs.flat.recommended, name: 'react/hooks', files: SRC_FILES },
  { ...reactRefresh.configs.next, name: 'react/refresh', files: SRC_TSX_FILES },

  // Imports: order, hygiene and named exports.
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    name: 'imports',
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: 'tsconfig.json' })],
      'import-x/internal-regex': '^@/',
    },
    rules: importRules({
      pathGroups: [{ pattern: 'react', group: 'external', position: 'before' }],
    }),
  },

  // Tailwind 3: settings.tailwindConfig (Tailwind 4 uses entryPoint).
  {
    ...betterTailwindcss.configs.correctness,
    name: 'tailwind',
    files: SRC_TSX_FILES,
    settings: {
      'better-tailwindcss': { tailwindConfig: 'tailwind.config.ts' },
    },
  },

  {
    name: 'house-rules',
    files: ['**/*.{js,mjs,ts,tsx}'],
    plugins: { 'prefer-arrow-functions': preferArrowFunctions },
    rules: {
      ...arrowFunctionRules,
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      // Server code logs with console.info/warn/error; console.log stays out.
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    },
  },

  { name: 'house-rules/typescript', files: TS_FILES, rules: typescriptRules },

  {
    // Shipped code only: config files run in Node at build time.
    name: 'house-rules/src',
    files: SRC_FILES,
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Absolute imports: "@/..." resolves from the project root.
      'no-restricted-imports': noRelativeImports({ hint: '"@/..." (project root)' }),
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        noDefaultImport({ defaultOnlyPackages: DEFAULT_ONLY_PACKAGES }),
        objectParams,
      ],
    },
  },

  {
    // Same as house-rules/src minus objectParams: Next.js imposes these signatures.
    name: 'next/framework-signatures',
    files: NEXT_SIGNATURE_FILES,
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        noDefaultImport({ defaultOnlyPackages: DEFAULT_ONLY_PACKAGES }),
      ],
    },
  },

  {
    name: 'next/default-export',
    files: NEXT_DEFAULT_EXPORT_FILES,
    rules: { 'import-x/no-default-export': 'off' },
  },

  {
    // next.config.ts, postcss/eslint/tailwind configs load a default export.
    name: 'tooling-config-files',
    files: ['*.config.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
    rules: { 'import-x/no-default-export': 'off' },
  },

  {
    // Atomic design: each level imports only from the levels below it.
    name: 'atomic-design',
    files: ['components/**/*.{ts,tsx}'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './components/atoms',
              from: ['./components/molecules', './components/organisms', './components/templates'],
              message: 'Atoms import no other component level.',
            },
            {
              target: './components/molecules',
              from: ['./components/organisms', './components/templates'],
              message: 'Molecules import atoms only.',
            },
            {
              target: './components/organisms',
              from: './components/templates',
              message: 'Organisms import atoms, molecules and other organisms only.',
            },
          ],
        },
      ],
    },
  },

  // Last: turn off every rule Prettier owns (semicolons, commas, quotes, wrapping).
  prettierConfig,
])
