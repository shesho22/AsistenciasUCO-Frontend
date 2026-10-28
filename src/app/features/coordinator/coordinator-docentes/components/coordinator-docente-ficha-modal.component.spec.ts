import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CoordinatorDocenteFichaModalComponent } from './coordinator-docente-ficha-modal.component';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { DocentePrograma, FichaDocente, GrupoHistorialDocente } from '../../../../core/models/docente-programa.model';

/** HU094: ficha del docente (resumen de carga e historial paginado de grupos). FM-01..FM-06. */
describe('CoordinatorDocenteFichaModalComponent', () => {
  let fixture: ComponentFixture<CoordinatorDocenteFichaModalComponent>;
  let component: CoordinatorDocenteFichaModalComponent;
  let coordService: { getFichaDocente: jasmine.Spy };

  const docente: DocentePrograma = {
    idDocentePrograma: 'dp-1',
    idDocente: 'doc-1',
    idUsuario: 'u-1',
    codigoTipoIdentificacion: 'CC',
    numeroIdentificacion: 1017000001,
    primerNombre: 'Roberto',
    segundoNombre: null,
    primerApellido: 'Prueba',
    segundoApellido: null,
    nombreCompleto: 'Roberto Prueba',
    correo: 'roberto@uco.edu.co',
    idTipoVinculacion: 'tv-1',
    codigoTipoVinculacion: 'CAT',
    nombreTipoVinculacion: 'Cátedra',
    fechaVinculacionUtc: '2026-10-22T10:00:00Z',
    totalGruposPrograma: 2,
    estaActivo: false,
  };

  const grupo = (id: string, estadoPeriodo: GrupoHistorialDocente['estadoPeriodo']): GrupoHistorialDocente => ({
    idGrupo: id,
    codigoGrupo: 7,
    nombreGrupo: `Grupo ${id}`,
    idAsignatura: 'asg-1',
    nombreAsignatura: 'Álgebra Lineal',
    idPeriodoAcademico: 'per-1',
    codigoPeriodoAcademico: 20261,
    nombrePeriodoAcademico: '2026-1',
    fechaInicioPeriodo: '2026-01-20',
    fechaFinPeriodo: '2026-06-10',
    estadoPeriodo,
    capacidadMaxima: 30,
    estudiantesActivos: 25,
    estudiantesFinalizados: 0,
    estudiantesCanceladosVoluntad: 2,
    estudiantesCanceladosInasistencia: 1,
  });

  const ficha = (historial: GrupoHistorialDocente[], total: number): FichaDocente => ({
    docente,
    resumen: { totalGrupos: total, totalPeriodos: 3, gruposVigentes: 1, estudiantesActivosVigentes: 25 },
    historial,
    totalHistorial: total,
  });

  function crear(): void {
    fixture = TestBed.createComponent(CoordinatorDocenteFichaModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('docente', docente);
    fixture.detectChanges();
  }

  beforeEach(() => {
    coordService = {
      getFichaDocente: jasmine.createSpy('getFichaDocente').and.returnValue(
        of({ exitoso: true, datos: ficha([grupo('g1', 'VIGENTE'), grupo('g2', 'FINALIZADO'), grupo('g3', 'PROXIMO')], 12) })
      ),
    };
    TestBed.configureTestingModule({
      imports: [CoordinatorDocenteFichaModalComponent],
      providers: [{ provide: CoordinatorManagementService, useValue: coordService }],
    });
  });

  it('FM-01 consulta la ficha del docente con la primera pagina al abrir', () => {
    crear();

    expect(coordService.getFichaDocente).toHaveBeenCalledWith('doc-1', { pagina: 1, tamano: 5 });
    expect(component.cargando()).toBeFalse();
    expect(component.totalHistorial()).toBe(12);
  });

  it('FM-02 muestra la cabecera, el resumen de carga y el historial con el estado del periodo', () => {
    crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Roberto Prueba');
    expect(el.textContent).toContain('VINCULACIÓN INACTIVA');
    const resumen = el.querySelector('[data-testid="resumen-carga"]')?.textContent ?? '';
    expect(resumen).toContain('12');
    expect(resumen).toContain('25');
    expect(el.querySelectorAll('[data-testid="grupo-historial"]').length).toBe(3);
    expect(el.textContent).toContain('Vigente');
    expect(el.textContent).toContain('Finalizado');
    expect(el.textContent).toContain('Próximo');
    expect(el.textContent).toContain('3 cancelaron');
  });

  it('FM-03 cambiar de pagina reconsulta al servidor', () => {
    crear();

    component.cambiarPagina(2);

    expect(component.pagina()).toBe(2);
    expect(coordService.getFichaDocente).toHaveBeenCalledWith('doc-1', { pagina: 2, tamano: 5 });
  });

  it('FM-04 sin grupos muestra el estado vacio', () => {
    coordService.getFichaDocente.and.returnValue(of({ exitoso: true, datos: ficha([], 0) }));
    crear();

    expect(fixture.nativeElement.textContent).toContain('no tiene grupos registrados');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="grupo-historial"]').length).toBe(0);
  });

  it('FM-05 un error del servidor se muestra en la ficha y deja el historial vacio', () => {
    coordService.getFichaDocente.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'El docente no existe o no esta vinculado a su programa.' } }))
    );
    crear();

    expect(component.error()).toBeTruthy();
    expect(component.historial()).toEqual([]);
    expect(component.cargando()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('FM-06 cerrar emite el evento y las etiquetas desconocidas caen al valor neutro', () => {
    crear();
    let cerrado = false;
    component.cerrar.subscribe(() => (cerrado = true));

    (fixture.nativeElement.querySelector('button[aria-label="Cerrar ficha"]') as HTMLButtonElement).click();

    expect(cerrado).toBeTrue();
    expect(component.varianteEstado('VIGENTE')).toBe('success');
    expect(component.etiquetaEstado('OTRO' as never)).toBe('OTRO');
    expect(component.varianteEstado('OTRO' as never)).toBe('neutral');
  });
});
