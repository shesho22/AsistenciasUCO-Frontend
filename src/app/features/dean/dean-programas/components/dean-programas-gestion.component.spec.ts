import { ComponentFixture, TestBed } from '@angular/core/testing';
import { paginaApi, porUrl } from '../../../../core/testing/pagina-api';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanProgramasGestionComponent } from './dean-programas-gestion.component';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { ProgramaAcademico, ProgramaPayload } from '../../../../core/models/programa-academico.model';

describe('DeanProgramasGestionComponent', () => {
  let fixture: ComponentFixture<DeanProgramasGestionComponent>;
  let component: DeanProgramasGestionComponent;
  let http: HttpTestingController;
  let toast: ToastService;
  const api = environment.apiUrl;

  const programa: ProgramaAcademico = {
    id: 'p-1', nombre: 'Sistemas', idTipoPrograma: 't-1', nombreTipoPrograma: 'pregrado',
    idModalidad: null, nombreModalidad: null, idJornada: null, nombreJornada: null,
    idCoordinador: 'c-1', nombreCoordinador: 'Ana Pérez', idFacultad: 'f-1', nombreFacultad: 'Ingeniería', estaActivo: true,
  };
  const payload: ProgramaPayload = { nombre: 'Nuevo', idTipoPrograma: 't-1', idCoordinador: 'c-2', idModalidad: null, idJornada: null };

  const listados = () => http.match((r) => r.url === `${api}/decano/programas` && r.method === 'GET');

  function iniciar(): void {
    fixture = TestBed.createComponent(DeanProgramasGestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    listados().forEach((r) => r.flush({ exitoso: true, datos: [programa], total: 12 }));
    http.expectOne(porUrl(`${api}/decano/coordinadores`)).flush(paginaApi([
        { id: 'c-1', idPrograma: 'p-1', nombreCompleto: 'Ana Pérez' },
        { id: 'c-2', idPrograma: null, nombreCompleto: 'Luis Gómez', estaActivoCoordinador: true, estaActivoRolCoordinador: true },
        { id: 'c-3', idPrograma: null, nombreCompleto: 'Rol Inactivo', estaActivoCoordinador: false, estaActivoRolCoordinador: false },
        { id: 'c-4', idPrograma: null, nombreCompleto: 'Usuario Inactivo', estaActivoCoordinador: false, estaActivoRolCoordinador: true },
      ]));
    http.expectOne(`${api}/tipos-programa`).flush([{ id: 't-1', codigo: 'PRE', nombre: 'pregrado' }]);
    http.expectOne(`${api}/modalidades-programa`).flush([]);
    http.expectOne(`${api}/jornadas-programa`).flush([]);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DeanProgramasGestionComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    iniciar();
  });

  afterEach(() => {
    // Tras una mutacion exitosa el componente recarga tambien los coordinadores disponibles.
    http.match(porUrl(`${api}/decano/coordinadores`)).forEach((r) => r.flush(paginaApi([])));
    http.verify();
  });

  it('carga la primera página al iniciar y expone el total', () => {
    expect(component.service.programas()).toEqual([programa]);
    expect(component.service.total()).toBe(12);
  });

  it('solo ofrece como disponibles los coordinadores sin programa y con usuario y rol activos (HU121/HU122)', () => {
    expect(component.coordinadoresDisponibles()).toEqual([{ id: 'c-2', nombre: 'Luis Gómez' }]);
  });

  it('F3-DEC-05: la tabla va en un contenedor relative con overflow-x-auto para que no desborde la pagina en movil', () => {
    const contenedor = (fixture.nativeElement as HTMLElement).querySelector('table')!.parentElement!;
    expect(contenedor.classList).toContain('overflow-x-auto');
    expect(contenedor.classList).toContain('relative');
    expect(contenedor.contains(contenedor.querySelector('.sr-only'))).toBeTrue();
  });

  it('cambiar de página vuelve a consultar el backend con esa página', () => {
    component.onPageChange(2);
    const req = http.expectOne((r) => r.url === `${api}/decano/programas`);
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush({ exitoso: true, datos: [], total: 12 });
  });

  it('los filtros reinician la página y se envían al backend', () => {
    component.filtroNombre.set('Sis');
    component.filtroEstado.set('false');
    component.aplicarFiltros();
    const req = http.expectOne((r) => r.url === `${api}/decano/programas`);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('nombre')).toBe('Sis');
    expect(req.request.params.get('estaActivo')).toBe('false');
    req.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('crear no actualiza la lista de forma optimista: recarga solo tras la respuesta del backend', () => {
    component.abrirCrear();
    expect(component.formularioAbierto()).toBeTrue();
    component.guardar(payload);

    const post = http.expectOne((r) => r.method === 'POST');
    expect(component.service.programas()).toEqual([programa]);
    post.flush({ exitoso: true, datos: { ...programa, id: 'p-2' } }, { status: 201, statusText: 'Created' });

    expect(component.formularioAbierto()).toBeFalse();
    listados().forEach((r) => r.flush({ exitoso: true, datos: [programa, { ...programa, id: 'p-2' }], total: 13 }));
    expect(component.service.total()).toBe(13);
  });

  it('un error al crear muestra el mensaje del backend y mantiene el formulario abierto', () => {
    spyOn(toast, 'error');
    component.abrirCrear();
    component.guardar(payload);
    http.expectOne((r) => r.method === 'POST').flush({ message: 'Ya existe un programa con ese nombre en la facultad.' }, { status: 409, statusText: 'Conflict' });

    expect(toast.error).toHaveBeenCalledWith('Ya existe un programa con ese nombre en la facultad.');
    expect(component.formularioAbierto()).toBeTrue();
    expect(component.errorFormulario()).toBe('Ya existe un programa con ese nombre en la facultad.');
  });

  it('editar usa PUT sobre el programa seleccionado y recarga', () => {
    component.abrirEditar(programa);
    expect(component.programaEnEdicion()).toEqual(programa);
    component.guardar(payload);
    const put: TestRequest = http.expectOne((r) => r.method === 'PUT');
    expect(put.request.url).toBe(`${api}/decano/programas/p-1`);
    put.flush({ exitoso: true, datos: programa });
    listados().forEach((r) => r.flush({ exitoso: true, datos: [programa], total: 12 }));
    expect(component.formularioAbierto()).toBeFalse();
  });

  it('cambiar el estado pide confirmación, envía el destino y recarga', () => {
    component.abrirEstado(programa);
    expect(component.programaEstado()).toEqual(programa);
    component.confirmarEstado(false);
    const patch = http.expectOne((r) => r.method === 'PATCH');
    expect(patch.request.url).toBe(`${api}/decano/programas/p-1/estado`);
    expect(patch.request.body).toEqual({ estaActivo: false });
    patch.flush({ exitoso: true, datos: { ...programa, estaActivo: false } });
    expect(component.programaEstado()).toBeNull();
    listados().forEach((r) => r.flush({ exitoso: true, datos: [], total: 0 }));
  });

  it('un 409 al desactivar muestra el mensaje del backend y deja el modal abierto', () => {
    spyOn(toast, 'error');
    component.abrirEstado(programa);
    component.confirmarEstado(false);
    http.expectOne((r) => r.method === 'PATCH').flush({ message: 'No se puede desactivar el programa porque tiene grupos activos.' }, { status: 409, statusText: 'Conflict' });

    expect(toast.error).toHaveBeenCalledWith('No se puede desactivar el programa porque tiene grupos activos.');
    expect(component.programaEstado()).toEqual(programa);
    expect(component.errorEstado()).toBe('No se puede desactivar el programa porque tiene grupos activos.');
  });

  it('cerrar los modales limpia el estado y los errores', () => {
    component.abrirEditar(programa);
    component.cerrarFormulario();
    expect(component.formularioAbierto()).toBeFalse();
    expect(component.programaEnEdicion()).toBeNull();
    component.abrirEstado(programa);
    component.cerrarEstado();
    expect(component.programaEstado()).toBeNull();
  });

  it('un error al cargar la lista muestra el mensaje del backend', () => {
    spyOn(toast, 'error');
    component.cargar();
    http.expectOne((r) => r.url === `${api}/decano/programas`).flush({ message: 'Sin ámbito de decano.' }, { status: 403, statusText: 'Forbidden' });
    expect(toast.error).toHaveBeenCalled();
  });
});
