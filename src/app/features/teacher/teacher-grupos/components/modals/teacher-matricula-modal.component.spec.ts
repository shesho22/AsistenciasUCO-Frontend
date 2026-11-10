import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { TeacherMatriculaModalComponent } from './teacher-matricula-modal.component';
import { ToastService } from '../../../../../shared/components/toast/toast.component';
import { Course } from '../../../../../core/models/course.model';
import { MatriculaQrService } from '../../../../../core/services/matricula-qr.service';
import { GroupService } from '../../../../../core/services/group.service';
import { ProgramaResumen } from '../../../../../core/models/role-management.model';
import { RealtimeService } from '../../../../../core/realtime/realtime.service';
import { RealtimeEvent } from '../../../../../core/realtime/model/realtime-event.model';
import { RealtimeConnectionState } from '../../../../../core/realtime/model/realtime-connection-state.model';
import { VentanaMatricula } from '../../../../../core/models/matricula-qr.model';
import { apiHttpError } from '../../../../../core/testing/api-error.fixture';

/**
 * HU176B: el modal del docente muestra el QR y el PIN que genera el BACKEND (CA-09: ya no existe `api.qrserver.com` ni el
 * "PIN = id del grupo"), se renueva por SSE sin timers y refresca el roster al matricularse un estudiante.
 */
describe('TeacherMatriculaModalComponent (HU176B)', () => {
  let fixture: ComponentFixture<TeacherMatriculaModalComponent>;
  let component: TeacherMatriculaModalComponent;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let qrSpy: jasmine.SpyObj<MatriculaQrService>;
  let grupoSpy: jasmine.SpyObj<GroupService>;
  let rotado$: Subject<RealtimeEvent>;
  let matriculado$: Subject<RealtimeEvent>;
  let estado$: Subject<RealtimeConnectionState>;
  let realtimeSpy: jasmine.SpyObj<RealtimeService>;

  const curso: Course = {
    id: 'grp-12345',
    name: 'Ingeniería de Software I',
    code: 'IS-301',
    section: 'Grupo 01',
    enrolledStudentsCount: 25,
    cupoMaximo: 35,
    colorCategory: 'emerald',
    schedule: 'Lunes y Miércoles 08:00 - 10:00',
  };

  const ventana: VentanaMatricula = {
    idVentana: 'v-1',
    pin: '482913',
    urlMatricula: 'https://x.test/matricula/qr?t=ABC',
    qrPngBase64: 'iVBORw0KGgo',
    fechaRotacionUtc: '2026-11-04T15:00:00Z',
    fechaExpiracionUtc: '2026-11-04T16:00:00Z',
  };

  function evento(type: string, payload: unknown): RealtimeEvent {
    return { eventId: 'e-1', type, occurredAt: '2026-11-04T15:00:00Z', correlationId: null, payload };
  }

  const prog = (id: string, nombre: string): ProgramaResumen => ({ idPrograma: id, nombrePrograma: nombre });

  async function crear(abierto = true, programas: ProgramaResumen[] = [prog('prg-a', 'Sistemas')]): Promise<void> {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);
    qrSpy = jasmine.createSpyObj('MatriculaQrService', ['abrirVentana', 'rotarVentana', 'cerrarVentana']);
    qrSpy.abrirVentana.and.returnValue(of(ventana));
    grupoSpy = jasmine.createSpyObj('GroupService', ['getProgramasGrupo']);
    grupoSpy.getProgramasGrupo.and.returnValue(of({ exitoso: true, datos: programas, total: programas.length }));
    qrSpy.rotarVentana.and.returnValue(of({ ...ventana, pin: '111111' }));
    qrSpy.cerrarVentana.and.returnValue(of({ exitoso: true, datos: null }));
    rotado$ = new Subject<RealtimeEvent>();
    matriculado$ = new Subject<RealtimeEvent>();
    estado$ = new Subject<RealtimeConnectionState>();
    realtimeSpy = jasmine.createSpyObj('RealtimeService', ['startForGroup', 'listenType'], { connectionState$: estado$.asObservable() });
    realtimeSpy.listenType.and.callFake(((type: string) =>
      type === 'MATRICULA_QR_ROTADO' ? rotado$.asObservable() : matriculado$.asObservable()) as RealtimeService['listenType']);

    await TestBed.configureTestingModule({
      imports: [TeacherMatriculaModalComponent],
      providers: [
        { provide: ToastService, useValue: toastSpy },
        { provide: MatriculaQrService, useValue: qrSpy },
        { provide: GroupService, useValue: grupoSpy },
        { provide: RealtimeService, useValue: realtimeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherMatriculaModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', abierto);
    fixture.componentRef.setInput('curso', curso);
    fixture.detectChanges(); // el effect abre la ventana durante esta pasada
    fixture.detectChanges(); // y la plantilla (OnPush) se repinta con el resultado
  }

  const html = () => fixture.nativeElement as HTMLElement;

  it('al abrir pide la ventana al backend y muestra el PIN y el QR generados por el servidor', async () => {
    await crear();

    expect(qrSpy.abrirVentana).toHaveBeenCalledOnceWith('grp-12345');
    expect(html().querySelector('[data-testid="matricula-pin"]')?.textContent?.trim()).toBe('482913');
    const img = html().querySelector('[data-testid="matricula-qr"]') as HTMLImageElement;
    expect(img.src).toBe('data:image/png;base64,iVBORw0KGgo');
  });

  it('CA-09: no queda ninguna referencia a servicios externos de QR ni el PIN es el id del grupo', async () => {
    await crear();

    expect(html().innerHTML).not.toContain('qrserver');
    expect(html().querySelector('[data-testid="matricula-pin"]')?.textContent).not.toContain('grp-12345');
  });

  it('muestra la hora de fin como texto absoluto, sin contador', async () => {
    await crear();

    expect(html().querySelector('[data-testid="matricula-fin"]')?.textContent).toContain('termina a las');
  });

  it('no abre nada si el modal esta cerrado', async () => {
    await crear(false);

    expect(qrSpy.abrirVentana).not.toHaveBeenCalled();
    expect(html().querySelector('[data-testid="matricula-pin"]')).toBeNull();
  });

  it('muestra el error del backend si no se puede abrir la ventana y permite reintentar', async () => {
    await crear(false);
    qrSpy.abrirVentana.and.returnValue(throwError(() => apiHttpError(403, 'No es titular del grupo.')));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(html().querySelector('[data-testid="matricula-error"]')?.textContent).toContain('No es titular del grupo.');

    qrSpy.abrirVentana.and.returnValue(of(ventana));
    component.reintentar();
    fixture.detectChanges();
    expect(component.ventana()?.pin).toBe('482913');
    expect(component.error()).toBeNull();
  });

  it('un MATRICULA_QR_ROTADO del grupo reemplaza el QR y el PIN sin pedir nada al backend', async () => {
    await crear();

    rotado$.next(evento('MATRICULA_QR_ROTADO', { ...ventana, grupo: 'grp-12345', pin: '777777', qrPngBase64: 'NUEVO' }));
    fixture.detectChanges();

    expect(component.ventana()?.pin).toBe('777777');
    expect(component.ventana()?.idVentana).toBe('v-1');
    expect((html().querySelector('[data-testid="matricula-qr"]') as HTMLImageElement).src).toContain('NUEVO');
    expect(qrSpy.rotarVentana).not.toHaveBeenCalled();
  });

  it('ignora la rotacion de otro grupo', async () => {
    await crear();

    rotado$.next(evento('MATRICULA_QR_ROTADO', { ...ventana, grupo: 'otro-grupo', pin: '999999' }));

    expect(component.ventana()?.pin).toBe('482913');
  });

  it('conecta al stream del grupo (idempotente) al abrir', async () => {
    await crear();

    expect(realtimeSpy.startForGroup).toHaveBeenCalledWith('grp-12345');
  });

  it('un estudiante matriculado en este grupo emite matriculado para refrescar el roster; en otro grupo no', async () => {
    await crear();
    const emitidos: string[] = [];
    component.matriculado.subscribe((g) => emitidos.push(g));

    matriculado$.next(evento('ESTUDIANTE_MATRICULADO', { grupo: 'grp-12345', origen: 'QR' }));
    matriculado$.next(evento('ESTUDIANTE_MATRICULADO', { grupo: 'otro', origen: 'QR' }));

    expect(emitidos).toEqual(['grp-12345']);
  });

  it('al reconectarse el SSE pide un codigo nuevo una sola vez', async () => {
    await crear();

    estado$.next('CONNECTED');
    expect(qrSpy.rotarVentana).not.toHaveBeenCalled();
    estado$.next('RECONNECTING');
    estado$.next('CONNECTED');
    estado$.next('CONNECTED');

    expect(qrSpy.rotarVentana).toHaveBeenCalledOnceWith('grp-12345');
    expect(component.ventana()?.pin).toBe('111111');
  });

  it('Generar nuevo codigo llama a la rotacion y actualiza la pantalla; un error se notifica', async () => {
    await crear();

    component.regenerar();
    expect(component.ventana()?.pin).toBe('111111');

    qrSpy.rotarVentana.and.returnValue(throwError(() => apiHttpError(404, 'Sin ventana.')));
    component.regenerar();
    expect(toastSpy.error).toHaveBeenCalledWith('Sin ventana.');
  });

  it('Cerrar matricula llama al DELETE, notifica y oculta el modal', async () => {
    await crear();
    let cerrado = false;
    component.closed.subscribe(() => (cerrado = true));

    component.cerrarMatricula();

    expect(qrSpy.cerrarVentana).toHaveBeenCalledOnceWith('grp-12345');
    expect(toastSpy.success).toHaveBeenCalled();
    expect(cerrado).toBeTrue();
  });

  it('si cerrar la matricula falla, el modal sigue abierto y muestra el error', async () => {
    await crear();
    let cerrado = false;
    component.closed.subscribe(() => (cerrado = true));
    qrSpy.cerrarVentana.and.returnValue(throwError(() => apiHttpError(403, 'Sin permiso.')));

    component.cerrarMatricula();

    expect(cerrado).toBeFalse();
    expect(toastSpy.error).toHaveBeenCalledWith('Sin permiso.');
  });

  it('Ocultar solo emite closed y no cierra la ventana en el backend', async () => {
    await crear();
    let cerrado = false;
    component.closed.subscribe(() => (cerrado = true));

    (html().querySelector('[data-testid="matricula-ocultar"]') as HTMLButtonElement).click();

    expect(cerrado).toBeTrue();
    expect(qrSpy.cerrarVentana).not.toHaveBeenCalled();
  });

  it('copiarPin y copiarEnlace usan el PIN y la URL reales de la ventana', async () => {
    await crear();
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

    component.copiarPin();
    component.copiarEnlace();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('482913');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://x.test/matricula/qr?t=ABC');
    expect(toastSpy.success).toHaveBeenCalledTimes(2);
  });

  // CULM-001 B2NM (S3 mínimo): el programa solo se pide, y es obligatorio, cuando el grupo tiene más de uno.
  it('B2NM con un solo programa abre la ventana de inmediato y no muestra el selector', async () => {
    await crear(true, [prog('prg-a', 'Sistemas')]);
    expect(grupoSpy.getProgramasGrupo).toHaveBeenCalledOnceWith('grp-12345');
    expect(qrSpy.abrirVentana).toHaveBeenCalledOnceWith('grp-12345');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="matricula-programa"]')).toBeNull();
  });

  it('B2NM con varios programas muestra el selector y no abre la ventana hasta elegir uno', async () => {
    await crear(true, [prog('prg-a', 'Sistemas'), prog('prg-b', 'Software')]);
    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('[data-testid="matricula-programa"]') as HTMLSelectElement;

    expect(qrSpy.abrirVentana).not.toHaveBeenCalled();
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['Selecciona el programa', 'Sistemas', 'Software']);
    const boton = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Abrir matrícula')) as HTMLButtonElement;
    expect(boton.disabled).toBeTrue();
    component.abrirConPrograma();
    expect(qrSpy.abrirVentana).not.toHaveBeenCalled();
  });

  it('B2NM al elegir el programa abre la ventana con programaId y muestra el PIN', async () => {
    await crear(true, [prog('prg-a', 'Sistemas'), prog('prg-b', 'Software')]);
    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('[data-testid="matricula-programa"]') as HTMLSelectElement;
    select.value = 'prg-b';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Abrir matrícula')) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(qrSpy.abrirVentana).toHaveBeenCalledOnceWith('grp-12345', 'prg-b');
    expect(el.querySelector('[data-testid="matricula-pin"]')?.textContent).toContain('482913');
    expect(el.querySelector('[data-testid="matricula-programa"]')).toBeNull();
  });

  it('B2NM si la lista de programas falla se intenta abrir la ventana igual (el backend responde con su mensaje)', async () => {
    await crear(false);
    grupoSpy.getProgramasGrupo.and.returnValue(throwError(() => apiHttpError(500, 'Error')));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    expect(qrSpy.abrirVentana).toHaveBeenCalledOnceWith('grp-12345');
  });

  it('al cerrar el modal se limpia el estado y se cancelan las suscripciones', async () => {
    await crear();

    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    rotado$.next(evento('MATRICULA_QR_ROTADO', { ...ventana, grupo: 'grp-12345', pin: '555555' }));

    expect(component.ventana()).toBeNull();
    expect(rotado$.observed).toBeFalse();
  });
  it('CULM-001 usa la proyeccion compartida con el QR a tamano normal, el estado de la ventana y el curso', async () => {
    await crear();
    const n = html();
    expect(n.querySelector('app-qr-proyeccion')).not.toBeNull();
    expect((n.querySelector('[data-testid="qr-tarjeta"]') as HTMLElement).style.width).toBe('');
    expect(n.querySelector('[data-testid="qr-estado"]')?.textContent).toContain('ABIERTA');
    expect(n.querySelector('[data-testid="qr-titulo"]')?.textContent).toContain('Ingeniería de Software I');
    expect(n.querySelector('[data-testid="qr-pantalla-completa"]')).not.toBeNull();
  });

  it('CULM-001 con varios programas muestra el programa elegido en la proyeccion', async () => {
    await crear(true, [prog('prg-a', 'Sistemas'), prog('prg-b', 'Software')]);
    component.programaElegido.set('prg-b');
    component.abrirConPrograma();
    fixture.detectChanges();
    expect(html().querySelector('[data-testid="qr-programa"]')?.textContent).toContain('Software');
  });

  it('CULM-001 tras la primera rotacion calcula el intervalo y muestra la barra de rotacion', async () => {
    await crear();
    expect(html().querySelector('[data-testid="qr-barra-rotacion"]')).toBeNull();
    rotado$.next(evento('MATRICULA_QR_ROTADO', { ...ventana, grupo: 'grp-12345', fechaRotacionUtc: '2026-11-04T15:01:00Z' }));
    fixture.detectChanges();
    expect(component.rotacionSegundos()).toBe(60);
    expect((html().querySelector('[data-testid="qr-barra-rotacion"]') as HTMLElement).style.animationDuration).toBe('60s');
  });

  it('UX densidad: la cabecera solo tiene Ampliar, Ocultar y el menu; copiar, regenerar y cerrar van al menu', async () => {
    await crear();
    const raiz = fixture.nativeElement as HTMLElement;
    const visibles = Array.from(raiz.querySelectorAll('header button')).filter((b) => !b.hasAttribute('role'));
    expect(visibles.length).toBe(3);
    expect(raiz.querySelector('[data-testid="matricula-cerrar"]')).toBeNull();
    (raiz.querySelector('[data-testid="action-menu-trigger"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    for (const id of ['matricula-copiar-pin', 'matricula-copiar-enlace', 'matricula-regenerar', 'matricula-cerrar']) {
      expect(raiz.querySelector(`[role="menuitem"][data-testid="${id}"]`)).not.toBeNull();
    }
  });

  it('UX densidad: elegir "Cerrar matricula" del menu cierra la ventana en el backend y "Copiar PIN" copia el PIN', async () => {
    await crear();
    const raiz = fixture.nativeElement as HTMLElement;
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    (raiz.querySelector('[data-testid="action-menu-trigger"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('[data-testid="matricula-copiar-pin"]') as HTMLButtonElement).click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('482913');
    (raiz.querySelector('[data-testid="action-menu-trigger"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('[data-testid="matricula-cerrar"]') as HTMLButtonElement).click();
    expect(qrSpy.cerrarVentana).toHaveBeenCalledOnceWith('grp-12345');
  });
});
