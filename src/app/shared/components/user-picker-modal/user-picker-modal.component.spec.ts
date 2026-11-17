import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { UserPickerModalComponent, UserPickerItem } from './user-picker-modal.component';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { DocenteFacultadItem } from '../../../core/models/consultas-transversales.model';
import { ApiPageResponse } from '../../../core/api/models/api-page-response.model';
import { ToastService } from '../toast/toast.component';

function pagina(filas: DocenteFacultadItem[], total = filas.length, numeroPagina = 1, tamano = 10): ApiPageResponse<DocenteFacultadItem> {
  return {
    exitoso: true,
    elementos: filas,
    numeroPagina,
    tamanoPagina: tamano,
    totalElementos: total,
    totalPaginas: Math.max(1, Math.ceil(total / tamano)),
  };
}

const ROBERTO: DocenteFacultadItem = {
  idDocente: 'doc-1',
  numeroIdentificacion: '1017001',
  nombreCompleto: 'Roberto Carlos Gómez Pérez',
  correo: 'rgomez@uco.edu.co',
  activo: true,
  programas: 'Ingeniería de Sistemas',
  totalProgramas: 1,
  totalGrupos: 2,
  primerNombre: 'Roberto',
  segundoNombre: 'Carlos',
  primerApellido: 'Gómez',
  segundoApellido: 'Pérez',
  nombres: 'Roberto Carlos',
  apellidos: 'Gómez Pérez',
  idTipoIdentificacion: 'tid-cc',
  codigoTipoIdentificacion: 'CC',
};

describe('UserPickerModalComponent', () => {
  let fixture: ComponentFixture<UserPickerModalComponent>;
  let component: UserPickerModalComponent;
  let consultas: jasmine.SpyObj<ConsultasTransversalesService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    consultas = jasmine.createSpyObj('ConsultasTransversalesService', ['getDocentesFacultad', 'getDocentesInstitucion']);
    consultas.getDocentesInstitucion.and.returnValue(of(pagina([ROBERTO], 23)));
    consultas.getDocentesFacultad.and.returnValue(of(pagina([ROBERTO], 1)));
    toast = jasmine.createSpyObj('ToastService', ['error', 'info', 'success', 'warning']);

    await TestBed.configureTestingModule({
      imports: [UserPickerModalComponent],
      providers: [
        { provide: ConsultasTransversalesService, useValue: consultas },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPickerModalComponent);
    component = fixture.componentInstance;
  });

  function abrir(fuente?: 'FACULTAD' | 'INSTITUCION'): void {
    if (fuente) {
      fixture.componentRef.setInput('fuente', fuente);
    }
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  }

  it('cerrado no consulta al servidor', () => {
    fixture.detectChanges();
    expect(consultas.getDocentesInstitucion).not.toHaveBeenCalled();
    expect(consultas.getDocentesFacultad).not.toHaveBeenCalled();
  });

  it('al abrirse consulta la primera página del directorio de la institución con los datos del servidor', () => {
    abrir();

    expect(consultas.getDocentesInstitucion).toHaveBeenCalledOnceWith({ busqueda: '', pagina: 1, tamano: 10 });
    expect(consultas.getDocentesFacultad).not.toHaveBeenCalled();
    expect(component.listado.total()).toBe(23);
    const item = component.usuarios()[0];
    expect(item.id).toBe('doc-1');
    expect(item.nombreCompleto).toBe('Roberto Carlos Gómez Pérez');
    expect(item.nombres).toBe('Roberto Carlos');
    expect(item.apellidos).toBe('Gómez Pérez');
    expect(item.primerNombre).toBe('Roberto');
    expect(item.segundoApellido).toBe('Pérez');
    expect(item.tipoIdentificacion).toBe('CC');
    expect(item.dependenciaOPrograma).toBe('Ingeniería de Sistemas');
    expect(fixture.nativeElement.textContent).toContain('Roberto Carlos Gómez Pérez');
    expect(fixture.nativeElement.textContent).toContain('Coincidencias encontradas: 23');
  });

  it('con la fuente FACULTAD consulta el directorio de la facultad del decano', () => {
    abrir('FACULTAD');

    expect(consultas.getDocentesFacultad).toHaveBeenCalledOnceWith({ busqueda: '', pagina: 1, tamano: 10 });
    expect(consultas.getDocentesInstitucion).not.toHaveBeenCalled();
    expect(component.usuarios()).toHaveSize(1);
  });

  it('buscar envía el texto al servidor y vuelve a la primera página', () => {
    abrir();
    component.listado.irAPagina(3);
    consultas.getDocentesInstitucion.calls.reset();

    component.searchQuery.set('rob');
    component.buscar();

    expect(consultas.getDocentesInstitucion).toHaveBeenCalledOnceWith({ busqueda: 'rob', pagina: 1, tamano: 10 });
    expect(component.listado.pagina()).toBe(1);
  });

  it('cambiar de página y de tamaño consulta al servidor con la búsqueda vigente', () => {
    abrir();
    component.searchQuery.set('rob');
    consultas.getDocentesInstitucion.calls.reset();

    component.listado.irAPagina(2);
    expect(consultas.getDocentesInstitucion).toHaveBeenCalledWith({ busqueda: 'rob', pagina: 2, tamano: 10 });

    component.listado.cambiarTamano(5);
    expect(consultas.getDocentesInstitucion).toHaveBeenCalledWith({ busqueda: 'rob', pagina: 1, tamano: 5 });
  });

  it('no deduce datos: sin correo, programa ni tipo de documento los deja vacíos', () => {
    consultas.getDocentesInstitucion.and.returnValue(of(pagina([{
      idDocente: 'doc-2', numeroIdentificacion: null, nombreCompleto: 'Luz Mar', correo: null, activo: true,
      programas: null, totalProgramas: 0, totalGrupos: 0,
    }])));
    abrir();

    const item = component.usuarios()[0];
    expect(item.correo).toBe('');
    expect(item.numeroIdentificacion).toBe('');
    expect(item.tipoIdentificacion).toBeUndefined();
    expect(item.dependenciaOPrograma).toBeUndefined();
    expect(item.rolActual).toBeUndefined();
    expect(item.nombres).toBe('');
    expect(component.iniciales(item)).toBe('L');
  });

  it('un fallo HTTP muestra el error y no inventa una lista de respaldo', () => {
    consultas.getDocentesInstitucion.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { message: 'Fallo del directorio' } })));
    abrir();

    expect(component.usuarios()).toEqual([]);
    expect(component.listado.error()).not.toBeNull();
    expect(toast.error).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-error-carga')).not.toBeNull();
  });

  it('un docente sin documento ni correo no muestra «Sin ID», «Doc:» ni correo inventado', () => {
    consultas.getDocentesInstitucion.and.returnValue(of(pagina([{
      idDocente: 'doc-2', numeroIdentificacion: null, nombreCompleto: 'Ana Ruiz', correo: null, activo: true,
      programas: null, totalProgramas: 0, totalGrupos: 0,
    }])));
    abrir();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana Ruiz');
    expect(texto).not.toContain('Sin ID');
    expect(texto).not.toContain('Doc:');
    expect(texto).not.toContain('@uco.edu.co');
  });

  it('un fallo se muestra como error con reintento y el reintento vuelve a consultar', () => {
    consultas.getDocentesInstitucion.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Error' })));
    abrir();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No se encontraron resultados');

    consultas.getDocentesInstitucion.and.returnValue(of(pagina([ROBERTO], 1)));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.listado.error()).toBeNull();
    expect(component.usuarios()).toHaveSize(1);
  });

  it('sin resultados muestra el estado vacío y ofrece registrar a la persona', () => {
    consultas.getDocentesInstitucion.and.returnValue(of(pagina([], 0)));
    abrir();

    expect(component.usuarios()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No se encontraron resultados');
    expect(fixture.nativeElement.textContent).toContain('Registrar como nuevo');
  });

  it('iniciales usa el primer nombre y el primer apellido del backend', () => {
    abrir();
    expect(component.iniciales(component.usuarios()[0])).toBe('RG');
    expect(component.iniciales({ id: 'x', numeroIdentificacion: '', nombres: '', apellidos: '', nombreCompleto: '', correo: '' })).toBe('U');
  });

  it('seleccionar emite userSelected con el usuario elegido', () => {
    abrir();
    let selected = null as UserPickerItem | null;
    component.userSelected.subscribe((u) => (selected = u));

    const item = component.usuarios()[0];
    component.seleccionar(item);

    expect(selected).toBe(item);
  });

  it('crearNuevo emite requestNew', () => {
    let requested = false;
    component.requestNew.subscribe(() => (requested = true));

    component.crearNuevo();
    expect(requested).toBeTrue();
  });

  it('cancelar emite cancelled', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.cancelar();
    expect(cancelled).toBeTrue();
  });
});
