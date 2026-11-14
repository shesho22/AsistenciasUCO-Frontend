// Config estándar de Angular/Karma. Existe solo para poder añadir el
// reporter `lcovonly` (coverageReporter.reporters) además de html/
// text-summary, de forma que scripts/check-realtime-coverage.mjs pueda leer
// coverage/gestio-asistencia-frontend/lcov.info. Pasar un `karmaConfig`
// personalizado a @angular/build:karma le pide a ESTE archivo
// que declare frameworks/plugins/reporters completos (el builder no rellena
// los suyos por defecto en ese caso), así que replica la config por defecto
// de Angular tal cual (desde Angular 20 el builder es @angular/build:karma, sobre
// esbuild: ya no lleva el framework/plugin de @angular-devkit/build-angular).

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/gestio-asistencia-frontend'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly', file: 'lcov.info' },
      ],
      // VAL PRU-08: umbral global; una caida de cobertura fuera de realtime tambien rompe test:ci y el CI.
      // Base 2026-11-14: sentencias 94,1 %, ramas 81,7 %, funciones 94,4 %, lineas 95,1 %. Realtime mantiene su
      // compuerta propia (90/80) en scripts/check-realtime-coverage.mjs.
      check: {
        global: {
          statements: 90,
          branches: 78,
          functions: 90,
          lines: 90,
        },
      },
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    customLaunchers: {
      // Solo para el runner de CI local/Windows. No modifica Chrome de producción.
      // `--no-sandbox` queda limitado al proceso efímero de pruebas porque este
      // entorno administrado no permite iniciar el sandbox nativo de Chrome.
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          // ChromeHeadless añade 9222 por defecto; el puerto efímero evita
          // colisiones con procesos huérfanos o sesiones de otro runner.
          '--remote-debugging-port=0',
        ],
      },
    },
    singleRun: false,
    restartOnFileChange: true,
  });
};
