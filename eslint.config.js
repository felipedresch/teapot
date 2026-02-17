import js from '@eslint/js'

export default [
  {
    ignores: ['dist', 'node_modules', '.output'],
  },
  js.configs.recommended,
]
