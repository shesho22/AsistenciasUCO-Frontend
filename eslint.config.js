// @ts-check
// EST-11 (VAL oleada 2): configuracion minima de ESLint con angular-eslint (misma version mayor que Angular, EST-10).
// Las reglas empezaron en "warn" para entrar a CI sin romper el build y se subieron a "error" a medida que se
// limpiaron; desde VAL oleada 6 (2026-11-15) no queda ninguna en "warn".
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.angular/**', 'public/**', 'scripts/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      // Deuda existente al 2026-11-12 (conteo en docs/work-items/VAL-oleada2-cumplimiento/VALIDATION.md).
      // EST-11: cero any en la aplicacion (2026-11-14, DTO tipados) y en las pruebas (2026-11-15); en error en todo src.
      '@typescript-eslint/no-explicit-any': 'error',
      // EST-11 (2026-11-14): sin hallazgos; un parametro o variable intencionalmente sin uso se marca con prefijo `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // EST-11 (2026-11-14): lote limpiado y subido a error. inject() con la migracion oficial
      // (ng generate @angular/core:inject) y los anfitriones de prueba ya en OnPush.
      '@typescript-eslint/no-this-alias': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/no-input-rename': 'error',
      'prefer-const': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // EST-11 (2026-11-14): accesibilidad y comparaciones en plantillas sin hallazgos; en error.
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
    },
  },
);
