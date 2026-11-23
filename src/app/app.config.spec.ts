import { DatePipe } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { appConfig } from './app.config';

describe('appConfig (H-15 localización es-CO)', () => {
  const proveedorLocale = () =>
    (appConfig.providers as Array<{ provide?: unknown; useValue?: unknown }>).find((p) => p.provide === LOCALE_ID);

  it('fija LOCALE_ID en es-CO', () => {
    expect(proveedorLocale()?.useValue).toBe('es-CO');
  });

  it('el pipe date muestra los meses en español, no en inglés', () => {
    const pipe = new DatePipe(String(proveedorLocale()?.useValue));
    expect(pipe.transform(new Date(2026, 0, 5), 'MMMM')).toBe('enero');
    expect(pipe.transform(new Date(2026, 0, 5), 'mediumDate')).not.toContain('Jan');
  });
});
