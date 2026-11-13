import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherGrupoSesionesComponent } from './teacher-grupo-sesiones.component';
import { ClassSession } from '../../../../core/models/attendance.model';

// LB-001B.1B: la Sesion no tiene estado (`status`) en el frontend; nada gobierna "Ajustar Horario".
// LB-001B.5A: HorarioDocente/Sesion no entregan aula, y QR/PIN + Cancelar no tienen contrato en
// BACKEND_GOLDEN_PATH_CONTRACT → OUT_OF_GOLDEN_PATH, ocultas salvo feature explícita.

describe('TeacherGrupoSesionesComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoSesionesComponent>;

  const sesion: ClassSession = {
    id: 'ses-1',
    courseId: 'crs-1',
    sessionNumber: 1,
    title: 'Sesión 1',
    date: '2026-09-14',
    startTime: '08:00',
    endTime: '10:00',
    records: [],
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent || '';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeacherGrupoSesionesComponent],
    });
    fixture = TestBed.createComponent(TeacherGrupoSesionesComponent);
    fixture.componentRef.setInput('sessions', [sesion]);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
  });

  it('mantiene "Ajustar Horario" y "Detalles" sin depender de ningún estado sintético de sesión', () => {
    expect(text()).toContain('Ajustar Horario');
    expect(text()).toContain('Detalles');
  });

  it('no presenta "Aula del grupo": el contrato no entrega aula', () => {
    expect(text()).not.toContain('Aula');
  });

  it('no muestra QR / PIN ni Cancelar por defecto (OUT_OF_GOLDEN_PATH)', () => {
    expect(text()).not.toContain('QR / PIN');
    expect(text()).not.toContain('Cancelar');
  });

  it('QR / PIN y Cancelar solo aparecen con su feature habilitada explícitamente', () => {
    fixture.componentRef.setInput('qrEnabled', true);
    fixture.componentRef.setInput('cancelEnabled', true);
    fixture.detectChanges();

    expect(text()).toContain('QR / PIN');
    expect(text()).toContain('Cancelar');
  });

  describe('sesión cancelada (HU047, CULM-001 B.1)', () => {
    const cancelada: ClassSession = {
      ...sesion,
      id: 'ses-2',
      sessionNumber: 2,
      estado: 'CANCELADA',
      cancelacion: {
        tipo: 'DOCENTE',
        motivo: 'Incapacidad médica del docente',
        nombreFestivo: null,
        fechaCancelacionUtc: '2026-11-10T14:00:00Z',
      },
    };
    const festiva: ClassSession = {
      ...sesion,
      id: 'ses-3',
      sessionNumber: 3,
      estado: 'CANCELADA',
      cancelacion: { tipo: 'FESTIVO', motivo: null, nombreFestivo: 'San José', fechaCancelacionUtc: null },
    };
    const fila = (id: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="sesion-${id}"]`) as HTMLElement;
    const boton = (id: string, etiqueta: string) =>
      Array.from(fila(id).querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        (b.textContent || '').includes(etiqueta)
      );

    beforeEach(() => {
      fixture.componentRef.setInput('cancelEnabled', true);
      fixture.componentRef.setInput('sessions', [sesion, cancelada, festiva]);
      fixture.detectChanges();
    });

    it('B1-F-11 muestra la etiqueta Cancelada con el motivo del docente', () => {
      expect(fila('ses-2').textContent).toContain('Cancelada');
      expect(fila('ses-2').textContent).toContain('Incapacidad médica del docente');
    });

    it('B1-F-11 muestra "Día festivo: <nombre>" en la sesión cancelada por festivo', () => {
      expect(fila('ses-3').textContent).toContain('Día festivo: San José');
    });

    it('B1-F-11 la sesión cancelada no ofrece Cancelar y deshabilita Tomar Asistencia y Ajustar Horario', () => {
      expect(boton('ses-2', 'Cancelar')).toBeUndefined();
      expect(boton('ses-2', 'Tomar Asistencia')?.disabled).toBeTrue();
      expect(boton('ses-2', 'Ajustar Horario')?.disabled).toBeTrue();
      expect(boton('ses-2', 'Detalles')?.disabled).toBeFalse();
    });

    it('B1-F-11 la sesión programada conserva Cancelar y acciones habilitadas, sin etiqueta Cancelada', () => {
      expect(boton('ses-1', 'Cancelar')?.disabled).toBeFalse();
      expect(boton('ses-1', 'Tomar Asistencia')?.disabled).toBeFalse();
      expect(fila('ses-1').querySelector('[data-testid="sesion-cancelada-badge"]')).toBeNull();
    });

    it('B1-F-11 emite cancelar con la sesión al pulsar el botón de una sesión programada', () => {
      const emitidas: ClassSession[] = [];
      fixture.componentInstance.cancelar.subscribe((s) => emitidas.push(s));

      boton('ses-1', 'Cancelar')?.click();

      expect(emitidas).toEqual([sesion]);
    });

    it('B1-F-12 móvil: las acciones envuelven en pantallas estrechas y los botones miden al menos 44 px', () => {
      const acciones = fila('ses-1').querySelector('[data-testid="sesion-acciones"]') as HTMLElement;
      expect(acciones.className).toContain('flex-wrap');
      expect(boton('ses-1', 'Tomar Asistencia')?.className).toContain('min-h-[44px]');
      expect(boton('ses-1', 'Cancelar')?.className).toContain('min-h-[44px]');
    });
  });

  describe('solicitud pendiente de aprobación (DEC-065 (2))', () => {
    const pendiente: ClassSession = { ...sesion, id: 'ses-p', estadoSolicitud: 'PENDIENTE', pendienteAprobacion: true };
    const rechazada: ClassSession = { ...sesion, id: 'ses-r', estado: 'CANCELADA', estadoSolicitud: 'RECHAZADA', pendienteAprobacion: false };
    const fila = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="sesion-${id}"]`) as HTMLElement;
    const boton = (id: string, etiqueta: string) =>
      Array.from(fila(id).querySelectorAll('button')).find((b) => b.textContent?.includes(etiqueta));

    beforeEach(() => {
      fixture.componentRef.setInput('sessions', [pendiente, rechazada]);
      fixture.componentRef.setInput('qrEnabled', true);
      fixture.componentRef.setInput('cancelEnabled', true);
      fixture.detectChanges();
    });

    it('muestra la insignia y el texto explicativo, y deshabilita Tomar Asistencia y QR / PIN', () => {
      expect(fila('ses-p').querySelector('[data-testid="sesion-pendiente-badge"]')?.textContent).toContain('Pendiente de aprobación');
      expect(fila('ses-p').querySelector('[data-testid="sesion-pendiente-texto"]')?.textContent).toContain('coordinación apruebe');
      expect(boton('ses-p', 'Tomar Asistencia')?.disabled).toBeTrue();
      expect(boton('ses-p', 'QR / PIN')?.disabled).toBeTrue();
    });

    it('conserva Ajustar Horario y Cancelar habilitados', () => {
      expect(boton('ses-p', 'Ajustar Horario')?.disabled).toBeFalse();
      expect(boton('ses-p', 'Cancelar')?.disabled).toBeFalse();
    });

    it('la sesión rechazada muestra la insignia roja y no ofrece Cancelar', () => {
      expect(fila('ses-r').querySelector('[data-testid="sesion-rechazada-badge"]')?.textContent).toContain('Rechazada');
      expect(boton('ses-r', 'Cancelar')).toBeUndefined();
    });

    it('el botón superior se titula "Solicitar sesión extraordinaria"', () => {
      expect(text()).toContain('Solicitar sesión extraordinaria');
      expect(text()).not.toContain('Programar Sesión Extraordinaria');
    });
  });
});
