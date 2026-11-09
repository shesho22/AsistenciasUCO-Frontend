import { HttpRequest } from '@angular/common/http';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture } from '@angular/core/testing';

/** Una pantalla de listado ya inicializada (primera carga resuelta) y cómo repetir su consulta. */
export interface EscenarioListado {
  fixture: ComponentFixture<unknown>;
  http: HttpTestingController;
  /** Texto del estado «vacío» que NO debe aparecer cuando la consulta falla. */
  textoVacio: string;
  /** Provoca otra consulta del listado (p. ej. pasar a la página 2). */
  recargar: () => void;
  coincide: (req: HttpRequest<unknown>) => boolean;
  /** Responde con éxito la consulta reintentada. */
  responderExito: (req: TestRequest) => void;
}

const ALERTA = '[data-testid="error-carga"]';

function alerta(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector(ALERTA);
}

function botonReintentar(fixture: ComponentFixture<unknown>): HTMLButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector(`${ALERTA} button`);
}

function fallar(e: EscenarioListado, status: number): void {
  e.recargar();
  e.http.expectOne(e.coincide).flush({ exitoso: false }, { status, statusText: 'error' });
  e.fixture.detectChanges();
}

/** Un fallo recuperable se anuncia con role=alert, no se confunde con el vacío y se puede reintentar. */
export function afirmarFalloRecuperableConReintento(e: EscenarioListado): void {
  fallar(e, 500);
  const aviso = alerta(e.fixture);
  expect(aviso).withContext('alerta de error de carga').not.toBeNull();
  expect(aviso?.getAttribute('role')).toBe('alert');
  expect((e.fixture.nativeElement as HTMLElement).textContent).not.toContain(e.textoVacio);

  botonReintentar(e.fixture)?.click();
  e.responderExito(e.http.expectOne(e.coincide));
  e.fixture.detectChanges();
  expect(alerta(e.fixture)).withContext('la alerta desaparece tras un reintento exitoso').toBeNull();
}

/** 403: se anuncia como sin autorización, sin reintento ni confusión con el vacío. */
export function afirmarAutorizacionDenegadaSinReintento(e: EscenarioListado): void {
  fallar(e, 403);
  expect(alerta(e.fixture)?.textContent).toContain('Sin autorización');
  expect(botonReintentar(e.fixture)).toBeNull();
  expect((e.fixture.nativeElement as HTMLElement).textContent).not.toContain(e.textoVacio);
}

/** 501: funcionalidad no disponible, distinta de un fallo transitorio: sin reintento. */
export function afirmarNoImplementadoSinReintento(e: EscenarioListado): void {
  fallar(e, 501);
  expect(alerta(e.fixture)?.textContent).toContain('Funcionalidad no disponible');
  expect(botonReintentar(e.fixture)).toBeNull();
  expect((e.fixture.nativeElement as HTMLElement).textContent).not.toContain(e.textoVacio);
}
