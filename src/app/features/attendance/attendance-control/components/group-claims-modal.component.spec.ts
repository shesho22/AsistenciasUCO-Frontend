import { ComponentFixture, TestBed } from '@angular/core/testing';
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