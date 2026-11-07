import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ApiDataResponse } from '../../../core/api/models/api-data-response.model';
import { ApiPageResponse } from '../../../core/api/models/api-page-response.model';
import {
  FestivosAnio,
  RecargaFestivos,
  SesionFestivoConAsistencia,
} from '../../../core/models/festivo.model';
import { AdminFestivosService } from '../../../core/services/admin-festivos.service';
import { AdminFestivosComponent } from './admin-festivos.component';

function apiError(status: number, code: string, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: { timestamp: 't', status, error: 'x', code, message, path: '/p', correlationId: null },
  });
}

function festivosAnio(anio: number, total = 19): FestivosAnio {
  return {
    anio,
    fuenteUltimaCarga: 'CALENDARIOS_NACIONALES',
    fechaUltimaCargaUtc: '2026-11-07T05:00:00Z',
    diferenciasCalculoLocal: 2,
    atribucion: { texto: 'Fuente: Calendarios Nacionales', url: 'https://calendariosnacionales.com' },
    festivos: Array.from({ length: total }, (_, i) => ({
      fecha: `${anio}-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      nombre: `Festivo ${i + 1}`,
      fuente: 'CALENDARIOS_NACIONALES',
      estaActivo: true,
    })),
    totalFestivos: total,
  };
}

const recarga: RecargaFestivos = {
  anio: 2026,
  fuente: 'CALENDARIOS_NACIONALES',
  usoRespaldo: false,
  totalFestivos: 19,
  festivosInsertados: 1,
  festivosActualizados: 18,
  festivosDesactivados: 0,
  diferenciasCalculoLocal: 0,
  aplicacion: { gruposProcesados: 12, sesionesCanceladas: 3, sesionesConAsistencia: 1 },
};

function sesionFestivo(n: number): SesionFestivoConAsistencia {
  return {
    idSesion: `ses-${n}`,
    idGrupo: 'grp-1',
    nombreGrupo: 'Grupo 01',
    nombreAsignatura: 'Cálculo',
    nombreDocente: 'Ana Docente',
    fechaHoraInicioUtc: '2026-03-23T13:00:00Z',
    fecha: '2026-03-23',
    nombreFestivo: 'San José',
    totalTomas: 1,
    totalRegistros: 30,
  };
}

function pagina(elementos: SesionFestivoConAsistencia[], numeroPagina = 1, total = elementos.length): ApiPageResponse<SesionFestivoConAsistencia> {
  return { exitoso: true, elementos, numeroPagina, tamanoPagina: 20, totalElementos: total, totalPaginas: Math.ceil(total / 20) };
}

describe('AdminFestivosComponent (CULM-001 B.1, pantalla 3.7)', () => {
  let fixture: ComponentFixture<AdminFestivosComponent>;
  let component: AdminFestivosComponent;
  let service: jasmine.SpyObj<AdminFestivosService>;
  const anioActual = new Date().getFullYear();
  const el = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => el().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const qa = (selector: string) => Array.from(el().querySelectorAll(selector)) as HTMLElement[];

  function ok<T>(datos: T): ApiDataResponse<T> {
    return { exitoso: true, datos };
  }

  function crear(): void {
    fixture = TestBed.createComponent(AdminFestivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<AdminFestivosService>('AdminFestivosService', ['consultar', 'recargar', 'sesionesConAsistencia']);
    service.consultar.and.callFake((anio: number) => of(ok(festivosAnio(anio))));
    service.recargar.and.returnValue(of(ok(recarga)));
    service.sesionesConAsistencia.and.returnValue(of(pagina([sesionFestivo(1), sesionFestivo(2)])));
    TestBed.configureTestingModule({
      imports: [AdminFestivosComponent],
      providers: [{ provide: AdminFestivosService, useValue: service }],
    });
  });

  it('B1-F-30 es OnPush y consulta el año actual al abrir', () => {
    const def = (AdminFestivosComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(def.onPush).toBeTrue();
    crear();
    expect(service.consultar).toHaveBeenCalledOnceWith(anioActual);
  });

  it('B1-F-30 muestra la fuente, la fecha de la última carga y las diferencias con el cálculo local', () => {
    crear();
    const cabecera = q('festivos-cabecera')!.textContent!;
    expect(cabecera).toContain('CALENDARIOS_NACIONALES');
    expect(cabecera).toContain('Diferencias con el cálculo local: 2');
    expect(cabecera).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('B1-F-30 lista los festivos con fecha legible, día de la semana, nombre y fuente (tabla)', () => {
    crear();
    const fila = q(`festivo-fila-${anioActual}-01-01`)!;
    expect(fila.textContent).toContain('Festivo 1');
    expect(fila.textContent).toContain('CALENDARIOS_NACIONALES');
    expect(fila.textContent).toMatch(/lunes|martes|miércoles|jueves|viernes|sábado|domingo/i);
  });

  it('B1-F-31 el selector de año ofrece actual y siguiente, y consulta el año elegido', () => {
    crear();
    service.consultar.calls.reset();

    (q('anio-siguiente') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.consultar).toHaveBeenCalledOnceWith(anioActual + 1);
    (q('anio-actual') as HTMLButtonElement).click();
    expect(service.consultar).toHaveBeenCalledWith(anioActual);
  });

  it('B1-F-31 acepta un año escrito (Enter) y no consulta valores que no son un entero de 4 dígitos', () => {
    crear();
    service.consultar.calls.reset();
    const input = q('anio-input') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');

    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    input.value = '99';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(service.consultar).not.toHaveBeenCalled();

    input.value = '2028';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(service.consultar).toHaveBeenCalledOnceWith(2028);
  });

  it('B1-F-32 pagina los festivos con PaginationComponent', () => {
    crear();
    expect(el().querySelector('app-pagination')).not.toBeNull();
    expect(qa('[data-testid^="festivo-fila-"]').length).toBe(10);

    component.onPaginaFestivos(2);
    fixture.detectChanges();

    expect(qa('[data-testid^="festivo-fila-"]').length).toBe(9);
    component.onTamanoFestivos(20);
    fixture.detectChanges();
    expect(qa('[data-testid^="festivo-fila-"]').length).toBe(19);
  });

  it('B1-F-33 estado de carga accesible mientras llega la respuesta', () => {
    const pendiente = new Subject<ApiDataResponse<FestivosAnio>>();
    service.consultar.and.returnValue(pendiente.asObservable());
    crear();

    expect(q('estado-carga')?.getAttribute('role')).toBe('status');
    pendiente.next(ok(festivosAnio(anioActual)));
    pendiente.complete();
    fixture.detectChanges();
    expect(q('estado-carga')).toBeNull();
  });

  it('B1-F-33 estado vacío cuando el año no tiene festivos', () => {
    service.consultar.and.returnValue(of(ok({ ...festivosAnio(anioActual, 0), festivos: [], totalFestivos: 0 })));
    crear();

    expect(q('estado-vacio')!.textContent).toContain('Recargar año');
    expect(el().querySelector('app-pagination')).toBeNull();
  });

  it('B1-F-33 estado de error con el mensaje del backend y reintento', () => {
    service.consultar.and.returnValue(throwError(() => apiError(500, 'FES_009', 'No fue posible obtener los festivos.')));
    crear();

    const error = q('estado-error')!;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('No fue posible obtener los festivos.');

    service.consultar.and.returnValue(of(ok(festivosAnio(anioActual))));
    (q('reintentar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(q('estado-error')).toBeNull();
    expect(qa('[data-testid^="festivo-fila-"]').length).toBeGreaterThan(0);
  });

  it('B1-F-34 la atribución enlaza a Calendarios Nacionales con los valores del backend', () => {
    crear();
    const enlace = q('atribucion-enlace') as HTMLAnchorElement;

    expect(enlace.textContent!.trim()).toBe('Fuente: Calendarios Nacionales');
    expect(enlace.getAttribute('href')).toBe('https://calendariosnacionales.com');
    expect(enlace.getAttribute('target')).toBe('_blank');
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('B1-F-34 la atribución sigue visible aunque la consulta falle', () => {
    service.consultar.and.returnValue(throwError(() => apiError(500, 'FES_009', 'Error')));
    crear();

    expect((q('atribucion-enlace') as HTMLAnchorElement).getAttribute('href')).toBe('https://calendariosnacionales.com');
  });

  describe('recarga del año', () => {
    it('B1-F-35 pide confirmación en un modal propio y no usa window.confirm', () => {
      const confirmNativo = spyOn(window, 'confirm');
      crear();

      (q('recargar-anio') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(q('confirmar-recarga')).not.toBeNull();
      expect(el().querySelector('[role="dialog"]')).not.toBeNull();
      expect(service.recargar).not.toHaveBeenCalled();
      expect(confirmNativo).not.toHaveBeenCalled();
    });

    it('B1-F-35 cancelar no recarga', () => {
      crear();
      (q('recargar-anio') as HTMLButtonElement).click();
      fixture.detectChanges();

      (q('cancelar-recarga') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(service.recargar).not.toHaveBeenCalled();
      expect(q('confirmar-recarga')).toBeNull();
    });

    it('B1-F-35 confirmar recarga el año una vez, muestra el resumen y vuelve a consultar', () => {
      crear();
      (q('recargar-anio') as HTMLButtonElement).click();
      fixture.detectChanges();
      service.consultar.calls.reset();

      (q('confirmar-recarga') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(service.recargar).toHaveBeenCalledOnceWith(anioActual);
      expect(service.consultar).toHaveBeenCalledOnceWith(anioActual);
      const resumen = q('resumen-recarga')!.textContent!;
      expect(resumen).toContain('Insertados: 1');
      expect(resumen).toContain('Actualizados: 18');
      expect(resumen).toContain('Sesiones canceladas: 3');
      expect(resumen).toContain('Sesiones con asistencia: 1');
      expect(q('confirmar-recarga')).toBeNull();
    });

    it('B1-F-35 avisa cuando se usó el respaldo de cálculo local', () => {
      service.recargar.and.returnValue(of(ok({ ...recarga, usoRespaldo: true })));
      crear();
      (q('recargar-anio') as HTMLButtonElement).click();
      fixture.detectChanges();

      (q('confirmar-recarga') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(q('resumen-recarga')!.textContent).toContain('respaldo');
    });

    it('B1-F-35 un error se muestra con el mensaje del backend dentro del modal, sin cerrarlo', () => {
      service.recargar.and.returnValue(throwError(() => apiError(500, 'FES_009', 'No fue posible recargar los festivos.')));
      crear();
      (q('recargar-anio') as HTMLButtonElement).click();
      fixture.detectChanges();

      (q('confirmar-recarga') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(q('error-recarga')!.getAttribute('role')).toBe('alert');
      expect(q('error-recarga')!.textContent).toContain('No fue posible recargar los festivos.');
      expect(q('confirmar-recarga')).not.toBeNull();
    });

    it('B1-F-35 mientras recarga, el botón de confirmar se deshabilita (sin doble envío)', () => {
      const pendiente = new Subject<ApiDataResponse<RecargaFestivos>>();
      service.recargar.and.returnValue(pendiente.asObservable());
      crear();
      (q('recargar-anio') as HTMLButtonElement).click();
      fixture.detectChanges();

      (q('confirmar-recarga') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect((q('confirmar-recarga') as HTMLButtonElement).disabled).toBeTrue();
      (q('confirmar-recarga') as HTMLButtonElement).click();

      expect(service.recargar).toHaveBeenCalledTimes(1);
    });
  });

  describe('sesiones en festivo con asistencia', () => {
    function abrirPestana(): void {
      (q('tab-sesiones') as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    it('B1-F-36 no consulta hasta abrir la pestaña y entonces pide la página 1 de 20', () => {
      crear();
      expect(service.sesionesConAsistencia).not.toHaveBeenCalled();

      abrirPestana();

      expect(service.sesionesConAsistencia).toHaveBeenCalledOnceWith(anioActual, 1, 20);
      const fila = q('sesion-festivo-fila-ses-1')!;
      expect(fila.textContent).toContain('Cálculo');
      expect(fila.textContent).toContain('Ana Docente');
      expect(fila.textContent).toContain('San José');
      expect(fila.textContent).toContain('30');
    });

    it('B1-F-36 pagina por servidor con PaginationComponent', () => {
      service.sesionesConAsistencia.and.returnValue(of(pagina([sesionFestivo(1)], 1, 45)));
      crear();
      abrirPestana();
      expect(el().querySelector('app-pagination')).not.toBeNull();

      component.onPaginaSesiones(2);

      expect(service.sesionesConAsistencia).toHaveBeenCalledWith(anioActual, 2, 20);
    });

    it('B1-F-36 cambiar de año refresca la pestaña abierta', () => {
      crear();
      abrirPestana();
      service.sesionesConAsistencia.calls.reset();

      (q('anio-siguiente') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(service.sesionesConAsistencia).toHaveBeenCalledOnceWith(anioActual + 1, 1, 20);
    });

    it('B1-F-36 estado vacío cuando ninguna sesión en festivo tiene asistencia', () => {
      service.sesionesConAsistencia.and.returnValue(of(pagina([])));
      crear();
      abrirPestana();

      expect(q('sesiones-vacio')).not.toBeNull();
    });

    it('B1-F-36 estado de error con el mensaje del backend', () => {
      service.sesionesConAsistencia.and.returnValue(throwError(() => apiError(403, 'SEC_002', 'No tiene permisos.')));
      crear();
      abrirPestana();

      expect(q('sesiones-error')!.textContent).toContain('No tiene permisos.');
    });
  });

  it('B1-F-37 móvil primero: tabla solo desde md, tarjetas en pantallas estrechas y objetivos de 44 px', () => {
    crear();

    expect(q('festivos-tabla')!.className).toContain('hidden');
    expect(q('festivos-tabla')!.className).toContain('md:block');
    expect(q('festivos-tarjetas')!.className).toContain('md:hidden');
    expect(qa(`[data-testid^="festivo-card-"]`).length).toBe(10);
    for (const id of ['recargar-anio', 'anio-actual', 'anio-siguiente', 'tab-festivos', 'tab-sesiones']) {
      expect(q(id)!.className).toContain('min-h-[44px]');
    }
  });

  it('B1-F-38 no usa polling: setInterval no se invoca', () => {
    const spy = spyOn(window, 'setInterval').and.callThrough();
    crear();
    (q('tab-sesiones') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });
});
