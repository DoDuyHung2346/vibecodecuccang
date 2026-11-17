import js from '@eslint/js'
import ts from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
export default ts.config(
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...ts.configs.recommended],
    plugins: { 'react-hooks': hooks },
    rules: hooks.configs.recommended.rules,
  },
)
