import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TeacherGrupoReclamosComponent } from './teacher-grupo-reclamos.component';

describe('TeacherGrupoReclamosComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoReclamosComponent>;
  let component: TeacherGrupoReclamosComponent;

  const mockReclamos = [
    {
      id: 'rec-12345678-abcd',
      estudianteNombre: 'Laura Gómez',
      estadoSolicitud: 'PENDIENTE',
      justificacionSolicitud: 'Incapacidad médica EPS',
      categoria: 'Salud',
      fechaSolicitud: '2026-03-01',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherGrupoReclamosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherGrupoReclamosComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse en estado vacío correctamente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No hay justificaciones ni reclamos pendientes');
  });

  it('renderiza la lista de reclamos cuando se suministran', () => {
    fixture.componentRef.setInput('reclamos', mockReclamos);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Laura Gómez');
    expect(text).toContain('Incapacidad médica EPS');
    expect(text).toContain('Pendiente');
  });

  it('A2-F-07 un reclamo RETIRADA muestra la insignia "Retirada" en estilo neutro, no como rechazado', () => {
    fixture.componentRef.setInput('reclamos', [{ ...mockReclamos[0], estadoSolicitud: 'RETIRADA' }]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Retirada');
    expect(el.querySelector('.bg-danger-50')).toBeNull();
  });

  it('CIERRE-W1A muestra el folio que entrega el backend y no uno armado con el id', () => {
    fixture.componentRef.setInput('reclamos', [{ ...mockReclamos[0], folio: 'REC-RECABCDE' }]);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('REC-RECABCDE');
    expect(texto).not.toContain('REC-#');
    expect(texto).not.toContain('REC-12345678');
  });

  it('CIERRE-W1A pagina con el total del servidor y delega el cambio de página', () => {
    const pagina = jasmine.createSpy('pagina');
    component.paginaChange.subscribe(pagina);
    fixture.componentRef.setInput('reclamos', mockReclamos);
    fixture.componentRef.setInput('totalReclamos', 45);
    fixture.componentRef.setInput('pagina', 2);
    fixture.detectChanges();

    const paginador = fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    expect(paginador.totalItems()).toBe(45);
    expect(paginador.currentPage()).toBe(2);
    expect(paginador.pageSize()).toBe(10);
    paginador.pageChange.emit(3);

    expect(pagina).toHaveBeenCalledOnceWith(3);
  });

  it('sin total del servidor el paginador usa la cantidad de filas', () => {
    fixture.componentRef.setInput('reclamos', mockReclamos);
    fixture.detectChanges();

    const paginador = fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    expect(paginador.totalItems()).toBe(1);
  });

  it('emite irAReclamos al hacer clic en el botón del portal', () => {
    let emitido = false;
    component.irAReclamos.subscribe(() => (emitido = true));

    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();

    expect(emitido).toBeTrue();
  });

  it('no declara una lista vacía antes de una respuesta válida', () => {
    fixture.componentRef.setInput('estadoCarga', 'LOADING');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando reclamos');
    expect(fixture.nativeElement.textContent).not.toContain('No hay reclamos para este grupo');
  });

  it('distingue 501, 403 y fallo de conexión y permite reintentar', () => {
    const reintentar = jasmine.createSpy('reintentar');
    component.reintentar.subscribe(reintentar);
    for (const [estado, mensaje] of [
      ['UNAVAILABLE', '501'],
      ['FORBIDDEN', 'autorización'],
      ['NETWORK_ERROR', 'conectar'],
    ]) {
      fixture.componentRef.setInput('estadoCarga', estado);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(mensaje);
    }
    fixture.nativeElement.querySelector('[data-accion="reintentar"]').click();
    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it('solo muestra vacío cuando la consulta completa se cargó correctamente', () => {
    fixture.componentRef.setInput('estadoCarga', 'LOADED');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay reclamos para este grupo');
  });
});
