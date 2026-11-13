// @ts-check
// EST-11 (VAL oleada 2): configuracion minima de ESLint con angular-eslint (misma version mayor que Angular, EST-10).
// Las reglas recomendadas que hoy tienen hallazgos en el codigo existente quedan en "warn" para que
// el linter entre a CI sin romper el build; se suben a "error" a medida que se limpien.
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
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@angular-eslint/no-output-native': 'warn',
      '@angular-eslint/no-input-rename': 'warn',
      'prefer-const': 'warn',
      // Regla nueva en angular-eslint 20 (recomendada): 24 servicios usan inyeccion por constructor.
      // Queda en warn para no mezclar el salto de Angular con un refactor; se migra con ng generate @angular/core:inject.
      '@angular-eslint/prefer-inject': 'warn',
      // Regla nueva en angular-eslint 22: Angular 22 cambia el valor por defecto a OnPush y la migracion oficial
      // marco ChangeDetectionStrategy.Eager en 10 componentes anfitriones de pruebas (*.spec.ts) para conservar
      // el comportamiento previo. Queda en warn; se revisan uno a uno al pasarlos a OnPush.
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // Deuda existente al 2026-11-12: accesibilidad y comparaciones en plantillas.
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/eqeqeq': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },
);
