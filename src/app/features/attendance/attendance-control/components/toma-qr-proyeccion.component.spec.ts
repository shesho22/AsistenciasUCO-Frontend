import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { Subject, filter, of, throwError } from 'rxjs';
import { TomaQrProyeccionComponent } from './toma-qr-proyeccion.component';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../../core/realtime/model/realtime-connection-state.model';
import { RealtimeEvent, REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';
import { AsistenciaQrService } from '../../../../core/services/asistencia-qr.service';
import { QrToma } from '../../../../core/models/asistencia-qr.model';
import { TomaAsistencia } from '../../../../core/models/toma-asistencia.model';
import { ATTENDANCE_NOW } from '../../../../core/utils/attendance-now.token';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

const AHORA = Date.parse('2026-11-10T13:00:10Z');

const toma: TomaAsistencia = {
  idToma: 'toma-1',
  idSesion: 'ses-1',
  idGrupo: 'grp-1',
  numero: 2,
  modo: 'QR',
  estado: 'ABIERTA',
  esImplicita: false,
  fechaAperturaUtc: '2026-11-10T13:00:00Z',
  fechaCierreUtc: null,
  horasToma: 1,
  totalRegistros: 4,
  totalPresentes: 4,
  totalAusentes: 0,
  totalExcusas: 0,
  tieneQrActivo: true,
};

const qr: QrToma = {
  idToma: 'toma-1',
  idSesion: 'ses-1',
  idGrupo: 'grp-1',
  pin: '482913',
  urlAsistencia: 'https://uco.test/app/asistencia/qr?t=TOKEN',
  qrPngBase64: 'AAAA',
  fechaRotacionUtc: '2026-11-10T13:00:00Z',
  fechaExpiracionUtc: '2026-11-10T15:00:00Z',
  rotacionSegundos: 60,
};

function evento<T>(type: string, payload: T): RealtimeEvent<T> {
  return { eventId: 'e', type, occurredAt: '2026-11-10T13:00:00Z', correlationId: null, payload };
}

describe('TomaQrProyeccionComponent (CULM-001 B.2, HU175)', () => {
  let fixture: ComponentFixture<TomaQrProyeccionComponent>;
  let events$: Subject<RealtimeEvent>;
  let estado$: Subject<RealtimeConnectionState>;
  let realtime: jasmine.SpyObj<RealtimeService>;
  let qrService: jasmine.SpyObj<AsistenciaQrService>;

  const el = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  const texto = (id: string) => el(id)?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    events$ = new Subject<RealtimeEvent>();
    estado$ = new Subject<RealtimeConnectionState>();
    realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'listenType']);
    (realtime as { connectionState$: unknown }).connectionState$ = estado$.asObservable();
    realtime.listenType.and.callFake(
      ((type: string) => events$.pipe(filter((e) => e.type === type))) as never
    );
    qrService = jasmine.createSpyObj<AsistenciaQrService>('AsistenciaQrService', ['rotarQr', 'cerrarQr']);

    TestBed.configureTestingModule({
      imports: [TomaQrProyeccionComponent],
      providers: [
        { provide: RealtimeService, useValue: realtime },
        { provide: AsistenciaQrService, useValue: qrService },
        { provide: ATTENDANCE_NOW, useValue: () => AHORA },
      ],
    });
    fixture = TestBed.createComponent(TomaQrProyeccionComponent);
    fixture.componentRef.setInput('toma', toma);
    fixture.componentRef.setInput('qr', qr);
    fixture.componentRef.setInput('grupoId', 'grp-1');
    fixture.componentRef.setInput('titulo', 'Calculo - Grupo 1');
    fixture.detectChanges();
  });

  it('B2-F-05 declara OnPush', () => {
    const meta = (TomaQrProyeccionComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(meta.onPush).toBeTrue();
    expect(ChangeDetectionStrategy.OnPush).toBeDefined();
  });

  it('B2-F-05 muestra el QR como imagen data:image/png, el PIN con separador y el titulo', () => {
    const img = el('qr-img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(texto('qr-pin')).toBe('482 913');
    expect(texto('qr-titulo')).toContain('Calculo - Grupo 1');
    expect(texto('qr-titulo')).toContain('Toma 2');
    expect(texto('qr-presentes')).toBe('Presentes: 4');
  });

  it('B2-F-05 conecta el canal del grupo una vez', () => {
    expect(realtime.startForGroup).toHaveBeenCalledWith('grp-1');
  });

  it('B2-F-05 ASISTENCIA_QR_ROTADO de la toma reemplaza QR, PIN y proxima rotacion', () => {
    const antes = texto('qr-proxima-rotacion');
    events$.next(
      evento(REALTIME_EVENT_TYPE.ASISTENCIA_QR_ROTADO, {
        grupo: 'grp-1', sesion: 'ses-1', toma: 'toma-1', pin: '111222',
        urlAsistencia: 'https://uco.test/app/asistencia/qr?t=NUEVO', qrPngBase64: 'BBBB',
        fechaRotacionUtc: '2026-11-10T13:05:00Z', fechaExpiracionUtc: '2026-11-10T15:00:00Z', rotacionSegundos: 60,
      })
    );
    fixture.detectChanges();

    expect((el('qr-img') as HTMLImageElement).getAttribute('src')).toBe('data:image/png;base64,BBBB');
    expect(texto('qr-pin')).toBe('111 222');
    expect(texto('qr-proxima-rotacion')).not.toBe(antes);
    expect(texto('qr-proxima-rotacion')).toContain('Próxima rotación:');
  });

  it('B2-F-05 ignora ASISTENCIA_QR_ROTADO de otra toma', () => {
    events$.next(
      evento(REALTIME_EVENT_TYPE.ASISTENCIA_QR_ROTADO, {
        grupo: 'grp-1', sesion: 'ses-1', toma: 'otra', pin: '999999', urlAsistencia: 'u', qrPngBase64: 'ZZZZ',
        fechaRotacionUtc: '2026-11-10T13:05:00Z', fechaExpiracionUtc: '2026-11-10T15:00:00Z', rotacionSegundos: 60,
      })
    );
    fixture.detectChanges();
    expect(texto('qr-pin')).toBe('482 913');
  });

  it('B2-F-05 ASISTENCIA_QR_REGISTRADA actualiza el contador con totalPresentes', () => {
    events$.next(
      evento(REALTIME_EVENT_TYPE.ASISTENCIA_QR_REGISTRADA, {
        grupo: 'grp-1', sesion: 'ses-1', toma: 'toma-1', estudiante: 'e-9', totalPresentes: 7,
      })
    );
    fixture.detectChanges();
    expect(texto('qr-presentes')).toBe('Presentes: 7');
  });

  it('B2-F-05 no usa setInterval ni setTimeout propios en ningun momento del ciclo de vida', () => {
    // El planificador interno de Angular usa setTimeout para la deteccion de cambios; se verifica que ninguna
    // llamada se origine en el codigo del componente (setInterval no debe llamarse por nadie).
    const original = window.setTimeout.bind(window);
    const origenes: string[] = [];
    const intervalSpy = spyOn(window, 'setInterval').and.callThrough();
    spyOn(window, 'setTimeout').and.callFake(((...args: Parameters<typeof setTimeout>) => {
      origenes.push(new Error().stack ?? '');
      return original(...args);
    }) as never);
    const otro = TestBed.createComponent(TomaQrProyeccionComponent);
    otro.componentRef.setInput('toma', toma);
    otro.componentRef.setInput('qr', qr);
    otro.componentRef.setInput('grupoId', 'grp-1');
    otro.detectChanges();
    events$.next(
      evento(REALTIME_EVENT_TYPE.ASISTENCIA_QR_REGISTRADA, {
        grupo: 'grp-1', sesion: 'ses-1', toma: 'toma-1', estudiante: 'e-9', totalPresentes: 5,
      })
    );
    otro.detectChanges();
    otro.destroy();
    expect(intervalSpy).not.toHaveBeenCalled();
    expect(origenes.filter((stack) => stack.includes('toma-qr-proyeccion.component.ts'))).toEqual([]);
  });

  it('B2-F-05 la barra de rotacion es CSS: su duracion sale de las fechas del backend', () => {
    const barra = el('qr-barra-rotacion') as HTMLElement;
    // proxima rotacion = 13:00:00 + 60 s = 13:01:00; ahora = 13:00:10 -> quedan 50 s
    expect(barra.style.animationDuration).toBe('50s');
  });

  it('B2-F-05 se desuscribe de los eventos al destruirse', () => {
    const antes = events$.observed;
    expect(antes).toBeTrue();
    fixture.destroy();
    expect(events$.observed).toBeFalse();
  });

  it('B2-F-05 Regenerar llama rotarQr una vez y aplica la respuesta', () => {
    qrService.rotarQr.and.returnValue(
      of({ exitoso: true, datos: { ...qr, pin: '333444', qrPngBase64: 'CCCC' } })
    );
    (el('qr-regenerar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(qrService.rotarQr).toHaveBeenCalledOnceWith('toma-1');
    expect(texto('qr-pin')).toBe('333 444');
  });

  it('B2-F-05 si Regenerar falla muestra el mensaje del backend', () => {
    qrService.rotarQr.and.returnValue(
      throwError(() => apiHttpError(409, 'La toma ya esta cerrada.', 'AQR_005'))
    );
    (el('qr-regenerar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(texto('qr-error')).toBe('La toma ya esta cerrada.');
  });

  it('B2-F-05 indica la perdida de conexion y mantiene Regenerar como accion manual', () => {
    estado$.next('RECONNECTING');
    fixture.detectChanges();
    expect(el('qr-conexion-perdida')).not.toBeNull();
    expect(qrService.rotarQr).not.toHaveBeenCalled();
    estado$.next('CONNECTED');
    fixture.detectChanges();
    expect(el('qr-conexion-perdida')).toBeNull();
  });

  it('B2-F-05 Dejar de proyectar llama cerrarQr y emite; Cerrar toma emite sin llamar al backend', () => {
    qrService.cerrarQr.and.returnValue(of({ exitoso: true, mensaje: 'ok' }));
    const dejar = jasmine.createSpy('dejar');
    const cerrar = jasmine.createSpy('cerrar');
    fixture.componentInstance.dejarDeProyectar.subscribe(dejar);
    fixture.componentInstance.cerrarToma.subscribe(cerrar);

    (el('qr-dejar') as HTMLButtonElement).click();
    expect(qrService.cerrarQr).toHaveBeenCalledOnceWith('toma-1');
    expect(dejar).toHaveBeenCalledTimes(1);

    (el('qr-cerrar-toma') as HTMLButtonElement).click();
    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(qrService.cerrarQr).toHaveBeenCalledTimes(1);
  });

  it('B2-F-05 los controles tactiles miden al menos 44 px', () => {
    for (const id of ['qr-regenerar', 'qr-dejar', 'qr-cerrar-toma']) {
      expect((el(id) as HTMLElement).className).toContain('min-h-[44px]');
    }
  });
  it('CULM-001 usa la proyeccion compartida: QR a tamano normal, estado de la ventana y programa opcional', () => {
    const n = fixture.nativeElement as HTMLElement;
    expect(n.querySelector('app-qr-proyeccion')).not.toBeNull();
    expect((el('qr-tarjeta') as HTMLElement).style.width).toBe('');
    expect(texto('qr-estado')).toContain('ABIERTA');
    expect(el('qr-programa')).toBeNull();
    fixture.componentRef.setInput('programa', 'Ingenieria de Sistemas');
    fixture.detectChanges();
    expect(texto('qr-programa')).toContain('Ingenieria de Sistemas');
    expect(el('qr-pantalla-completa')).not.toBeNull();
  });
});
