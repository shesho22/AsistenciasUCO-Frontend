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
    expect(host().querySelectorAll('[data-testid^="resend-verification-"]').length).toBe(2);
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
