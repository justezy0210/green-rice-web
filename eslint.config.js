import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/dataconnect-generated', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // -- Harness: Import 제약 --
      // Parent-dir imports are banned — use the `@/` alias instead.
      // The `src/config/*` and `src/lib/irgsp-constants.ts` SSOT loaders
      // import from `../../data/*.json` by design: data/ lives outside src/
      // and `@/` only covers src/. Those are exempted via an override below.
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../../*'],
            message: 'Use @/ path alias instead of relative parent imports.',
          },
        ],
      }],

      // -- Harness: 시크릿 하드코딩 금지 --
      'no-restricted-syntax': ['error',
        {
          selector: 'Property[key.name="apiKey"] > Literal',
          message: 'API key를 하드코딩하지 마세요. 환경변수(import.meta.env.VITE_*)를 사용하세요.',
        },
        {
          selector: 'VariableDeclarator[id.name=/(?:api[_]?key|secret|password|token|credential)/i] > Literal',
          message: '시크릿을 하드코딩하지 마세요. 환경변수를 사용하세요.',
        },
        {
          selector: 'Property[key.name=/(?:api[_]?key|secret|password|token|credential)/i] > Literal',
          message: '시크릿을 하드코딩하지 마세요. 환경변수를 사용하세요.',
        },
      ],

      // -- Harness: 코드 품질 --
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      // -- Harness: 네이밍 --
      '@typescript-eslint/naming-convention': ['warn',
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
      ],
    },
  },
  // Cross-language SSOT loaders: these intentionally import from repo-root
  // data/*.json (outside src/), which the `@/` alias does not cover.
  {
    files: [
      'src/config/panel.ts',
      'src/config/traits.ts',
      'src/lib/irgsp-constants.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // shadcn/ui primitives co-export the `cva` variants with their component.
  // That is the library's standard pattern; loosening fast-refresh here keeps
  // us from moving every `*Variants` definition into a separate file.
  // AuthContext exports both the provider and the context value by design.
  {
    files: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/context/AuthContext.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
