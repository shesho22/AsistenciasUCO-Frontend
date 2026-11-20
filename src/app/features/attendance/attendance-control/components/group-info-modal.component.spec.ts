import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupInfoModalComponent } from './group-info-modal.component';

describe('GroupInfoModalComponent (IDENT-001 reenvio de verificacion)', () => {
  let fixture: ComponentFixture<GroupInfoModalComponent>;
  let component: GroupInfoModalComponent;

  const estudiantes = [
    { id: 'm-1', idEstudiante: 'est-1', nombreCompleto: 'Ada Lovelace', documento: '1001', correo: 'ada@uco.edu.co' },
    { id: 'm-2', idEstudiante: 'est-2', nombreCompleto: 'Grace Hopper', documento: '1002', correo: 'grace@uco.edu.co' },
    { id: 'm-3', nombreCompleto: 'Sin Id', documento: '1003' },
  ];

  const host = () => fixture.nativeElement as HTMLElement;
  const boton = (id: string) => host().querySelector<HTMLButtonElement>(`[data-testid="resend-verification-${id}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [GroupInfoModalComponent] });
    fixture = TestBed.createComponent(GroupInfoModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('students', estudiantes);
    fixture.detectChanges();
  });

  it('ofrece "Reenviar enlace" solo para filas con idEstudiante', () => {
    expect(boton('est-1')?.textContent).toContain('Reenviar enlace');
    expect(boton('est-2')).not.toBeNull();
    expect(host().querySelectorAll('[data-testid^="resend-verification-"]')).toHaveSize(2);
  });

  it('bloque E: el padron es una tabla con una fila por estudiante', () => {
    const filas = host().querySelectorAll('app-tabla-datos tbody tr[data-testid="grupo-info-estudiante"]');
    expect(filas).toHaveSize(3);
    expect(filas[0].textContent).toContain('Ada Lovelace');
    expect(filas[0].textContent).toContain('ada@uco.edu.co');
    expect(filas[0].querySelector('[data-testid="resend-verification-est-1"]')).not.toBeNull();
  });

  it('bloque E: pagina de 15 en 15 y numera las filas de forma continua', () => {
    const muchos = Array.from({ length: 17 }, (_, i) => ({ id: `m-${i}`, nombreCompleto: `Estudiante ${i}`, documento: `${i}` }));
    fixture.componentRef.setInput('students', muchos);
    fixture.detectChanges();
    const filas = () => host().querySelectorAll('tr[data-testid="grupo-info-estudiante"]');
    expect(filas()).toHaveSize(15);

    component.pagina.set(2);
    fixture.detectChanges();
    expect(filas()).toHaveSize(2);
    expect(filas()[0].querySelector('td')?.textContent?.trim()).toBe('16');
  });

  it('bloque E: mientras carga no pinta filas', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect(host().querySelectorAll('tr[data-testid="grupo-info-estudiante"]')).toHaveSize(0);
    expect(host().querySelector('[data-testid="tabla-datos-esqueleto"]')).not.toBeNull();
  });

  it('emite el idEstudiante al pulsar el boton', () => {
    const emitidos: string[] = [];
    component.resendVerification.subscribe((id) => emitidos.push(id));

    boton('est-2')!.click();

    expect(emitidos).toEqual(['est-2']);
  });

  it('mientras reenvia deshabilita los botones y rotula el de la fila en curso', () => {
    fixture.componentRef.setInput('resendingStudentId', 'est-1');
    fixture.detectChanges();

    expect(boton('est-1')?.textContent).toContain('Enviando');
    expect(boton('est-1')?.disabled).toBeTrue();
    expect(boton('est-2')?.textContent).toContain('Reenviar enlace');
    expect(boton('est-2')?.disabled).toBeTrue();
  });
});
