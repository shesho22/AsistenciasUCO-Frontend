import { ComponentFixture, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CoordinatorStudyPlanMeshPageComponent } from './study-plan-mesh-page.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../environments/environment';
import { paginaApi, porUrl } from '../../../../core/testing/pagina-api';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';

describe('CoordinatorStudyPlanMeshPageComponent', () => {
  let fixture: ComponentFixture<CoordinatorStudyPlanMeshPageComponent>;
  let component: CoordinatorStudyPlanMeshPageComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockPlan: PlanEstudioItem = {
    id: 'PLAN-SIS-2024',
    codigo: 'PLAN-SIS-2024',
    nombre: 'Ingeniería de Sistemas',
    anioVigencia: 2024,
    programa: 'Ingeniería de Sistemas',
    facultad: 'Facultad de Ingeniería',
    totalSemestres: 10,
    totalCreditos: 160,
    totalAsignaturas: 1,
    estado: 'VIGENTE',
    descripcion: 'Malla curricular',
  };

  /** Fila de la malla tal como la entrega el backend (vínculo asignatura-plan). */
  const vinculo = {
    idAsignatura: 'asig-1',
    codigo: 'SIS-101',
    nombre: 'Algoritmos I',
    credito: 4,
    nombreArea: 'Software',
    nombreComponente: 'Obligatoria',
    idPlanEstudio: 'PLAN-SIS-2024',
    idSemestrePlanEstudio: 'sem-1',
    codigoSemestre: 'S1',
    codigoCaracter: 'OBL',
    nombreCaracter: 'Obligatoria',
    compartida: true,
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [CoordinatorStudyPlanMeshPageComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ planId: 'PLAN-SIS-2024' }) } },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorStudyPlanMeshPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.match(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`)).forEach((req) =>
      req.flush(paginaApi([mockPlan]))
    );
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
    http
      .match(porUrl(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/asignaturas`))
      .forEach((req) => req.flush(paginaApi([vinculo])));
    // CIERRE-W2A: las opciones del filtro de carácter salen del catálogo y no de las filas de la malla
    http.match(`${environment.apiUrl}/coordinador/caracteres-asignatura`).forEach((req) =>
      req.flush({ exitoso: true, datos: [{ codigo: 'OBL', nombre: 'Obligatoria', orden: 1 }, { codigo: 'OPT', nombre: 'Optativa', orden: 2 }] })
    );
    fixture.detectChanges();
  });

  const urlMalla = `${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/asignaturas`;
  const urlPlanes = `${environment.apiUrl}/coordinador/planes-estudio`;

  afterEach(() => {
    http.verify();
  });

  it('resuelve el plan por planId y carga sus asignaturas', () => {
    expect(component.selectedPlan()?.codigo).toBe('PLAN-SIS-2024');
    expect(component.asignaturas()).toHaveSize(1);
  });

  // CULM-001 B2NM (F-COO-005): reemplaza a A2-F-04, que ocultaba el control "hasta B2". Con B2 el control existe y llama al DELETE.
  it('F-COO-005 la malla muestra la insignia de carácter y el control Desvincular del plan', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Algoritmos I');
    expect(el.textContent).toContain('Obligatoria');
    expect(el.textContent).toContain('Compartida');
    expect(el.querySelector('[title="Desvincular del plan"]')).not.toBeNull();
    expect(el.textContent).toContain('Asociar asignatura existente');
    expect(el.textContent).toContain('Nueva asignatura');
  });

  it('F-COO-005 quitar del plan pide confirmación, llama al DELETE y recarga la malla y los planes', async () => {
    const confirmNativo = spyOn(window, 'confirm');
    (fixture.nativeElement.querySelector('[title="Desvincular del plan"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
    fixture.detectChanges();
    const dialogo = (fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]');
    expect(dialogo?.textContent).toContain('Algoritmos I');
    http.expectNone(`${urlMalla}/asig-1`);
    const confirmar = Array.from(dialogo!.querySelectorAll('button')).find((b) => b.textContent?.includes('Quitar del plan')) as HTMLButtonElement;
    confirmar.click();
    expect(confirmNativo).not.toHaveBeenCalled();

    const del = http.expectOne(`${urlMalla}/asig-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ exitoso: true, datos: null, mensajeUsuario: 'Asignatura quitada del plan.' });

    expect(toastSpy.success).toHaveBeenCalledWith('Asignatura quitada del plan.');
    http.expectOne(porUrl(urlMalla)).flush(paginaApi([]));
    http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
    expect(component.asignaturas()).toEqual([]);
  });

  it('F-COO-005 si se cancela la confirmación no se llama al backend', async () => {
    component.quitarDelPlan(component.asignaturas()[0]);
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
    fixture.detectChanges();
    const cancelar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="alertdialog"] button')).find((b) => b.textContent?.includes('Cancelar')) as HTMLButtonElement;
    cancelar.click();
    expect(component.asignaturaAQuitar()).toBeNull();
    http.expectNone(`${urlMalla}/asig-1`);
    expect(component.asignaturas()).toHaveSize(1);
  });

  it('F-COO-005 ASI_005 explica el bloqueo con el mensaje del backend y conserva la malla', () => {
    component.quitarDelPlan(component.asignaturas()[0]);
    component.confirmarQuitar();
    http
      .expectOne(`${urlMalla}/asig-1`)
      .flush({ code: 'ASI_005', message: 'La asignatura tiene grupos con asistencia en este plan.' }, { status: 409, statusText: 'Conflict' });

    expect(component.aviso()).toContain('tiene grupos con asistencia');
    expect(toastSpy.error).toHaveBeenCalled();
    expect(component.asignaturas()).toHaveSize(1);
  });

  describe('HU074 activar o inactivar la asignatura', () => {
    const urlEstado = `${environment.apiUrl}/coordinador/asignaturas/asig-1/estado`;
    const dialogo = () => (fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]');
    const botonDialogo = (texto: string) =>
      Array.from(dialogo()!.querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;
    /** Los diálogos están en bloques @defer (PR #158): se resuelven antes de consultar el DOM del diálogo. */
    const resolverDiferidos = async () => {
      fixture.detectChanges();
      const deferBlocks = await fixture.getDeferBlocks();
      await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
      fixture.detectChanges();
    };

    it('inactivar pide confirmación con el alcance, llama al PATCH y muestra el mensaje del backend y recarga la malla', async () => {
      const confirmNativo = spyOn(window, 'confirm');
      (fixture.nativeElement.querySelector('[data-accion="estado-asignatura"]') as HTMLButtonElement).click();
      await resolverDiferidos();

      const texto = dialogo()?.textContent ?? '';
      expect(texto).toContain('Inactivar asignatura');
      expect(texto).toContain('Algoritmos I');
      expect(texto).toContain('no podrá usarse para crear grupos ni asociarse a planes de estudio');
      expect(texto).toContain('Los grupos que ya existen no cambian');
      http.expectNone(urlEstado);

      botonDialogo('Inactivar asignatura').click();
      expect(confirmNativo).not.toHaveBeenCalled();
      const req = http.expectOne(urlEstado);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ estaActiva: false });
      req.flush({ exitoso: true, datos: { idAsignatura: 'asig-1', estaActivaAsignatura: false }, mensajeUsuario: 'La asignatura quedó inactiva.' });

      expect(toastSpy.success).toHaveBeenCalledWith('La asignatura quedó inactiva.');
      http.expectOne(porUrl(urlMalla)).flush(paginaApi([{ ...vinculo, estaActivaAsignatura: false }]));
      http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
      fixture.detectChanges();
      expect(component.asignaturas()[0].estaActivaAsignatura).toBeFalse();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Inactiva');
      expect((fixture.nativeElement.querySelector('[data-accion="estado-asignatura"]') as HTMLButtonElement).title).toBe('Activar asignatura');
    });

    it('activar una asignatura inactiva confirma sin estilo destructivo y envía estaActiva=true', async () => {
      component.pedirCambioEstado({ ...component.asignaturas()[0], estaActivaAsignatura: false });
      await resolverDiferidos();
      expect(component.confirmacionEstado().inactivar).toBeFalse();
      expect(dialogo()?.textContent).toContain('Activar asignatura');
      expect(dialogo()?.textContent).toContain('Volverá a estar disponible');

      botonDialogo('Activar asignatura').click();
      const req = http.expectOne(urlEstado);
      expect(req.request.body).toEqual({ estaActiva: true });
      req.flush({ exitoso: true, datos: { idAsignatura: 'asig-1', estaActivaAsignatura: true }, mensajeUsuario: 'La asignatura quedó activa.' });
      expect(toastSpy.success).toHaveBeenCalledWith('La asignatura quedó activa.');
      http.expectOne(porUrl(urlMalla)).flush(paginaApi([vinculo]));
      http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
    });

    it('la acción queda deshabilitada (aria-busy) desde que se confirma hasta que termina la recarga de la malla', () => {
      const accion = () => fixture.nativeElement.querySelector('[data-accion="estado-asignatura"]') as HTMLButtonElement;
      expect(accion().disabled).toBeFalse();

      component.pedirCambioEstado(component.asignaturas()[0]);
      component.confirmarCambioEstado();
      fixture.detectChanges();
      expect(accion().disabled).toBeTrue();
      expect(accion().getAttribute('aria-busy')).toBe('true');

      http.expectOne(urlEstado).flush({ exitoso: true, datos: { idAsignatura: 'asig-1', estaActivaAsignatura: false }, mensajeUsuario: 'La asignatura quedó inactiva.' });
      fixture.detectChanges();
      // El PATCH terminó, pero la malla aún se está releyendo: la tabla (bloque E) muestra filas de esqueleto y no ofrece
      // ninguna acción de estado hasta que llegan las filas con el estado real.
      expect(component.cambiandoEstado()).toBeTrue();
      expect(accion()).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="tabla-datos-esqueleto"]')).not.toBeNull();

      http.expectOne(porUrl(urlMalla)).flush(paginaApi([{ ...vinculo, estaActivaAsignatura: false }]));
      http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
      fixture.detectChanges();
      expect(accion().disabled).toBeFalse();
    });

    it('mientras el cambio sigue en curso no se abre otro diálogo ni se envía un segundo PATCH', async () => {
      component.pedirCambioEstado(component.asignaturas()[0]);
      component.confirmarCambioEstado();
      const req = http.expectOne(urlEstado);

      component.pedirCambioEstado(component.asignaturas()[0]);
      await resolverDiferidos();
      expect(component.asignaturaACambiarEstado()).toBeNull();
      expect(dialogo()).toBeNull();
      component.confirmarCambioEstado();
      http.expectNone(urlEstado);

      req.flush({ exitoso: true, datos: { idAsignatura: 'asig-1', estaActivaAsignatura: false }, mensajeUsuario: 'La asignatura quedó inactiva.' });
      // También durante la recarga posterior.
      component.pedirCambioEstado(component.asignaturas()[0]);
      expect(component.asignaturaACambiarEstado()).toBeNull();
      http.expectOne(porUrl(urlMalla)).flush(paginaApi([{ ...vinculo, estaActivaAsignatura: false }]));
      http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
      expect(toastSpy.success).toHaveBeenCalledTimes(1);
    });

    for (const [estaActivaAsignatura, respaldo] of [
      [false, 'La asignatura quedó inactiva.'],
      [true, 'La asignatura quedó activa.'],
    ] as const) {
      it(`sin mensajeUsuario muestra el respaldo del catálogo de UI (${respaldo})`, () => {
        component.pedirCambioEstado({ ...component.asignaturas()[0], estaActivaAsignatura: !estaActivaAsignatura });
        component.confirmarCambioEstado();
        http.expectOne(urlEstado).flush({ exitoso: true, datos: { idAsignatura: 'asig-1', estaActivaAsignatura } });
        expect(toastSpy.success).toHaveBeenCalledWith(respaldo);
        http.expectOne(porUrl(urlMalla)).flush(paginaApi([{ ...vinculo, estaActivaAsignatura }]));
        http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
      });
    }

    it('cancelar la confirmación no llama al backend', async () => {
      component.pedirCambioEstado(component.asignaturas()[0]);
      await resolverDiferidos();
      botonDialogo('Cancelar').click();
      expect(component.asignaturaACambiarEstado()).toBeNull();
      http.expectNone(urlEstado);
    });

    for (const [codigo, mensaje] of [
      ['ASI_009', 'No puedes inactivar la asignatura: tiene grupos en el período vigente o en períodos futuros.'],
      ['ASI_006', 'La asignatura es compartida con programas que no coordinas; solo puedes cambiar su semestre y su carácter en tu plan.'],
    ]) {
      it(`el rechazo 409 ${codigo} se muestra con el mensaje del backend y se relee la malla`, () => {
        component.pedirCambioEstado(component.asignaturas()[0]);
        component.confirmarCambioEstado();
        // Envelope ApiErrorResponse real del backend (CONTRACT HU074): `code` propio y `message` del catálogo.
        const envelope = {
          timestamp: '2026-11-19T10:00:00-05:00', status: 409, error: 'Conflict', code: codigo, message: mensaje,
          path: '/api/v1/coordinador/asignaturas/asig-1/estado', correlationId: null,
        };
        http.expectOne(urlEstado).flush(envelope, { status: 409, statusText: 'Conflict' });

        expect(component.aviso()).toBe(mensaje);
        expect(toastSpy.error).toHaveBeenCalledWith(mensaje);
        expect(toastSpy.success).not.toHaveBeenCalled();
        // Tras el error la acción sigue bloqueada hasta que termina la recarga.
        expect(component.cambiandoEstado()).toBeTrue();
        http.expectOne(porUrl(urlMalla)).flush(paginaApi([vinculo]));
        http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
        expect(component.cambiandoEstado()).toBeFalse();
        expect(component.asignaturas()[0].estaActivaAsignatura).toBeUndefined();
      });
    }
  });

  it('F-COO-005 asociar una asignatura existente abre el diálogo y, al asociar, recarga la malla', async () => {
    component.abrirAsociar();
    fixture.detectChanges();
    const deferBlocks = await fixture.getDeferBlocks();
    await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
    fixture.detectChanges();
    expect(component.dialogoAsociarAbierto()).toBeTrue();
    http.expectOne(`${environment.apiUrl}/coordinador/caracteres-asignatura`).flush({ exitoso: true, datos: [] });
    http.expectOne(porUrl(`${urlPlanes}/PLAN-SIS-2024/asignaturas-asociables`)).flush(paginaApi([]));

    component.alAsociar();
    expect(component.dialogoAsociarAbierto()).toBeFalse();
    expect(toastSpy.success).toHaveBeenCalledWith('Asignatura asociada al plan.');
    http.expectOne(porUrl(urlMalla)).flush(paginaApi([vinculo]));
    http.expectOne(porUrl(urlPlanes)).flush(paginaApi([mockPlan]));
  });

  it('navega a crear y editar asignatura usando rutas con planId', () => {
    component.abrirCrearAsignatura();
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'asignaturas',
      'nueva',
    ]);

    component.abrirEditarAsignatura(component.asignaturas()[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'asignaturas',
      'asig-1',
      'editar',
    ]);
  });

  it('volver navega a la lista de planes de estudio', () => {
    component.volver();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });

  it('agregarSemestre agrega el siguiente semestre con el endpoint HU082', () => {
    component.planes.set([{ ...mockPlan, totalSemestres: 9 }]);
    component.agregarSemestre();

    const postReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ exitoso: true, datos: null });

    expect(toastSpy.success).toHaveBeenCalledWith('Semestre 10 agregado al plan.');
    expect(component.selectedPlan()?.totalSemestres).toBe(10);
    expect(component.aviso()).toBeNull();
    // MEJORAS-SERGIO 13: relee los planes (refresca la cache del servicio que usan los formularios de asignatura)
    http.expectOne(porUrl(urlPlanes)).flush(paginaApi([{ ...mockPlan, totalSemestres: 10 }]));
    expect(component.selectedPlan()?.totalSemestres).toBe(10);
  });

  it('MEJORAS-SERGIO 13: el semestre agregado aparece en el filtro de la malla y en la cache del servicio sin recargar la página', () => {
    component.planes.set([{ ...mockPlan, totalSemestres: 3 }]);
    fixture.detectChanges();
    component.agregarSemestre();
    http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres`).flush({ exitoso: true, datos: null });
    http.expectOne(porUrl(urlPlanes)).flush(paginaApi([{ ...mockPlan, totalSemestres: 4 }]));
    fixture.detectChanges();

    const opciones = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('select[aria-label="Filtrar el plan de estudio por semestre"] option')
    ).map((o) => o.textContent?.trim());
    expect(opciones).toContain('Semestre 4');
    const servicio = TestBed.inject(CoordinatorManagementService);
    expect(servicio.planes().find((p) => p.id === 'PLAN-SIS-2024')?.totalSemestres).toBe(4);
  });

  it('agregarSemestre en el máximo de 10 avisa sin llamar al backend', () => {
    component.agregarSemestre();

    http.expectNone(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres`);
    expect(component.aviso()).toContain('máximo de 10 semestres');
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('agregarSemestre rechazado por el backend muestra el aviso y recarga los planes', () => {
    component.planes.set([{ ...mockPlan, totalSemestres: 9 }]);
    component.agregarSemestre();

    http
      .expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres`)
      .flush({ exitoso: false }, { status: 409, statusText: 'Conflict' });
    http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`)).flush(paginaApi([mockPlan]));

    expect(component.aviso()).toBeTruthy();
    expect(component.selectedPlan()?.totalSemestres).toBe(10);
  });

  it('eliminarSemestreVacio no decide en el cliente si el semestre tiene asignaturas: lo resuelve el backend', () => {
    component.eliminarSemestreVacio();

    const delReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres/10`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ exitoso: true, datos: null });
    http.expectOne(porUrl(urlPlanes)).flush(paginaApi([{ ...mockPlan, totalSemestres: 9 }]));
  });

  describe('malla filtrada y paginada en el servidor', () => {
    it('envía semestre, código de carácter, búsqueda y página, y muestra el total real', () => {
      component.alCambiarFiltros({ busqueda: 'algoritmos', semestre: 3, caracter: 'OBL' });
      const req = http.expectOne(porUrl(urlMalla));
      expect(req.request.params.get('semestre')).toBe('3');
      expect(req.request.params.get('caracter')).toBe('OBL');
      expect(req.request.params.get('busqueda')).toBe('algoritmos');
      expect(req.request.params.get('pagina')).toBe('1');
      expect(req.request.params.get('tamano')).toBe('15');
      req.flush(paginaApi([vinculo], 1, 15, 25));
      fixture.detectChanges();

      expect(component.listado.total()).toBe(25);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Asignaturas: 25');
      expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();
    });

    it('sin filtros no envía semestre, carácter ni búsqueda', () => {
      component.alCambiarFiltros({ busqueda: '', semestre: 0, caracter: '' });
      const req = http.expectOne(porUrl(urlMalla));
      expect(req.request.params.has('semestre')).toBeFalse();
      expect(req.request.params.has('caracter')).toBeFalse();
      expect(req.request.params.has('busqueda')).toBeFalse();
      req.flush(paginaApi([]));
    });

    it('cambiar de página vuelve a consultar al servidor con esa página', () => {
      component.listado.irAPagina(2);
      const req = http.expectOne(porUrl(urlMalla));
      expect(req.request.params.get('pagina')).toBe('2');
      req.flush(paginaApi([vinculo], 2, 9, 12));
      expect(component.listado.pagina()).toBe(2);
    });

    it('un error de carga se muestra como error con reintento, no como malla vacía', () => {
      component.alCambiarFiltros({ busqueda: '', semestre: 0, caracter: '' });
      http.expectOne(porUrl(urlMalla)).flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
      expect(el.textContent).not.toContain('No hay asignaturas registradas');
      expect(toastSpy.error).toHaveBeenCalled();

      component.listado.reintentar();
      http.expectOne(porUrl(urlMalla)).flush(paginaApi([vinculo]));
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
    });

    it('una malla sin resultados muestra el mensaje de vacío', () => {
      component.alCambiarFiltros({ busqueda: 'zzz', semestre: 0, caracter: '' });
      http.expectOne(porUrl(urlMalla)).flush(paginaApi([]));
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay asignaturas registradas');
    });
  });

  it('eliminarSemestreVacio con un solo semestre avisa que debe conservarlo', () => {
    component.planes.set([{ ...mockPlan, totalSemestres: 1 }]);
    component.eliminarSemestreVacio();
    expect(component.aviso()).toContain('al menos un semestre');
  });

  it('eliminarSemestreVacio quita el último semestre con el endpoint HU083', () => {
    component.eliminarSemestreVacio();

    const delReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres/10`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ exitoso: true, datos: null });

    expect(toastSpy.success).toHaveBeenCalledWith('Semestre 10 vacío eliminado.');
    expect(component.selectedPlan()?.totalSemestres).toBe(9);
    http.expectOne(porUrl(urlPlanes)).flush(paginaApi([{ ...mockPlan, totalSemestres: 9 }]));
    expect(component.selectedPlan()?.totalSemestres).toBe(9);
  });

  it('eliminarSemestreVacio muestra el rechazo del backend sin cambiar el plan', () => {
    component.eliminarSemestreVacio();

    const delReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres/10`);
    delReq.flush(
      { exitoso: false, mensajeUsuario: 'El semestre tiene asignaturas asociadas. Reubíquelas o elimínelas primero.' },
      { status: 409, statusText: 'Conflict' }
    );
    http.expectOne(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`)).flush(paginaApi([mockPlan]));

    expect(toastSpy.error).toHaveBeenCalled();
    expect(component.aviso()).toBeTruthy();
    expect(component.selectedPlan()?.totalSemestres).toBe(10);
  });

  it('CIERRE-W2A: el filtro de carácter ofrece el catálogo completo aunque la página solo tenga filas obligatorias', () => {
    expect(component.caracteres().map((c) => c.codigo)).toEqual(['OBL', 'OPT']);
    const opciones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select option')).map((o) => o.textContent?.trim());
    expect(opciones).toContain('Obligatoria');
    expect(opciones).toContain('Optativa');
  });
});
