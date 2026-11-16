import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GroupClaimsModalComponent } from './group-claims-modal.component';

describe('GroupClaimsModalComponent APP-05 states', () => {
  let fixture: ComponentFixture<GroupClaimsModalComponent>;
  let component: GroupClaimsModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupClaimsModalComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(GroupClaimsModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
  });

  it('no muestra vacío ni cero durante la carga', () => {
    fixture.componentRef.setInput('estadoCarga', 'LOADING');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando reclamos');
    expect(fixture.nativeElement.textContent).not.toContain('No hay reclamos ni justificaciones para este grupo');
    expect(fixture.nativeElement.querySelector('[data-testid="group-claims-count"]').textContent.trim()).toBe('Cargando…');
  });

  it('distingue 403, 501, red y error de servidor con un conteo no numérico', () => {
    const casos = [
      { estado: 'FORBIDDEN', texto: 'autorización' },
      { estado: 'UNAVAILABLE', texto: '501' },
      { estado: 'NETWORK_ERROR', texto: 'conectar' },
      { estado: 'SERVER_ERROR', texto: 'cargar' },
    ];
    const reintentar = jasmine.createSpy('reintentar');
    component.reintentar.subscribe(reintentar);

    for (const caso of casos) {
      fixture.componentRef.setInput('estadoCarga', caso.estado);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(caso.texto);
      expect(fixture.nativeElement.querySelector('[data-testid="group-claims-count"]').textContent.trim()).toBe('—');
    }

    fixture.nativeElement.querySelector('[data-accion="reintentar"]').click();
    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it('muestra el vacío solo después de cargar el conjunto completo', () => {
    fixture.componentRef.setInput('estadoCarga', 'LOADED');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay reclamos para este grupo');
    expect(fixture.nativeElement.querySelector('[data-testid="group-claims-count"]').textContent.trim()).toBe('0 Registros');
  });
});

describe('GroupClaimsModalComponent: resolución por toma', () => {
  let fixture: ComponentFixture<GroupClaimsModalComponent>;
  const reclamo = (parcial: object) => ({
    id: 'rec-12345678', estudianteNombre: 'Ana', justificacionSolicitud: 'Cita', fechaSolicitud: '2026-10-19', estadoSolicitud: 'PENDIENTE', ...parcial,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GroupClaimsModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(GroupClaimsModalComponent);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('estadoCarga', 'LOADED');
  });

  it('con toma ofrece "Estuvo presente" y "Ausencia justificada" con su resultado', () => {
    fixture.componentRef.setInput('reclamos', [reclamo({ idToma: 'toma-2', numeroToma: 2 })]);
    fixture.detectChanges();
    const emitidos: unknown[] = [];
    fixture.componentInstance.resolver.subscribe((e) => emitidos.push(e));
    expect(fixture.nativeElement.querySelector('[data-testid="grupo-reclamo-toma"]').textContent).toContain('toma 2');
    fixture.nativeElement.querySelector('[data-testid="aprobar-presente"]').click();
    fixture.nativeElement.querySelector('[data-testid="aprobar-justificada"]').click();
    expect(emitidos).toEqual([
      { id: 'rec-12345678', accion: 'APROBADA', resultado: 'PRESENTE' },
      { id: 'rec-12345678', accion: 'APROBADA', resultado: 'JUSTIFICADA' },
    ]);
  });

  it('sin toma oculta "Estuvo presente"', () => {
    fixture.componentRef.setInput('reclamos', [reclamo({})]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="aprobar-presente"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="aprobar-justificada"]')).not.toBeNull();
  });

  it('CIERRE-W1A muestra el folio del backend, el total del servidor y delega el cambio de página', () => {
    const pagina = jasmine.createSpy('pagina');
    fixture.componentInstance.paginaChange.subscribe(pagina);
    fixture.componentRef.setInput('estadoCarga', 'LOADED');
    fixture.componentRef.setInput('reclamos', [
      { id: '9f8e7d6c-0000-4000-8000-000000000001', folio: 'REC-9F8E7D6C', estudianteNombre: 'Ana', estadoSolicitud: 'APROBADA', justificacionSolicitud: 'x', fechaSolicitud: '2026-11-01' },
    ]);
    fixture.componentRef.setInput('totalReclamos', 37);
    fixture.componentRef.setInput('pagina', 2);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('REC-9F8E7D6C');
    expect(texto).not.toContain('REC-#');
    expect(fixture.nativeElement.querySelector('[data-testid="group-claims-count"]').textContent.trim()).toBe('37 Registros');
    const paginador = fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    expect(paginador.totalItems()).toBe(37);
    expect(paginador.currentPage()).toBe(2);
    paginador.pageChange.emit(4);

    expect(pagina).toHaveBeenCalledOnceWith(4);
  });

  it('sin total del servidor el conteo usa la cantidad de filas', () => {
    fixture.componentRef.setInput('estadoCarga', 'LOADED');
    fixture.componentRef.setInput('reclamos', [
      { id: 'r-1', estudianteNombre: 'Ana', estadoSolicitud: 'PENDIENTE', justificacionSolicitud: 'x', fechaSolicitud: '2026-11-01' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="group-claims-count"]').textContent.trim()).toBe('1 Registros');
  });
});
