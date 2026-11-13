import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentCourseDetailComponent } from './student-course-detail.component';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  TomaSesionEstudiante,
} from '../../../../core/models/role-management.model';
import { crearMateria, crearSesion } from '../../../../core/testing/student-portal.fixtures';

describe('StudentCourseDetailComponent', () => {
  let fixture: ComponentFixture<StudentCourseDetailComponent>;
  let component: StudentCourseDetailComponent;

  const mockMateria: MateriaEstudianteItem = crearMateria({
    nombre: 'Ingeniería de Software',
    codigo: 'IS-101',
    grupo: '01',
    docente: 'Carlos Docente',
    horario: 'Lunes 08:00 - 10:00',
    aula: 'Lab 2',
    creditos: 3,
    indicadores: { sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 18, horasFalta: 2, horasExcusa: 0, horasSinRegistro: 0, porcentajeInasistencia: 10, porcentajeAsistencia: 90, codigoPermanencia: 'REGULAR', umbralAdvertencia: 15, umbralPerdida: 20 },
    estado: 'Al día',
  });

  const mockSesiones: SesionMateriaDetalle[] = [
    crearSesion({ id: 'ses-1', numeroSesion: 1, fecha: '2026-09-01', horario: '08:00 - 10:00', estadoAsistencia: 'PRESENTE' }),
    crearSesion({
      id: 'ses-2',
      numeroSesion: 2,
      fecha: '2026-09-08',
      horario: '08:00 - 10:00',
      tema: 'Patrones GoF',
      estadoAsistencia: 'AUSENTE',
      reclamoId: 'rev-1',
      estadoReclamo: 'PENDIENTE',
      categoriaReclamo: 'Médico / Salud',
      justificacionEstudiante: 'Cita médica',
    }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentCourseDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentCourseDetailComponent);
    component = fixture.componentInstance;
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe emitir back cuando se hace clic en volver', () => {
    spyOn(component.back, 'emit');
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.detectChanges();

    const backButton = fixture.nativeElement.querySelector('button');
    backButton.click();

    expect(component.back.emit).toHaveBeenCalled();
  });

  it('debe retornar variantes correctas en getBadgeVariant', () => {
    expect(component.getBadgeVariant('Al día')).toBe('success');
    expect(component.getBadgeVariant('Riesgo')).toBe('warning');
    expect(component.getBadgeVariant('Crítico')).toBe('danger');
    expect(component.getBadgeVariant('Desconocido' as any)).toBe('neutral');
  });

  it('debe retornar variantes correctas en getAsistenciaBadgeVariant', () => {
    expect(component.getAsistenciaBadgeVariant('PRESENTE')).toBe('success');
    expect(component.getAsistenciaBadgeVariant('RETARDO')).toBe('warning');
    expect(component.getAsistenciaBadgeVariant('AUSENTE')).toBe('danger');
    expect(component.getAsistenciaBadgeVariant('JUSTIFICADA')).toBe('info');
    expect(component.getAsistenciaBadgeVariant('OTRO' as any)).toBe('neutral');
  });

  it('debe retornar clases correctas en getReclamoStatusClasses', () => {
    expect(component.getReclamoStatusClasses('APROBADA')).toContain('text-success-800');
    expect(component.getReclamoStatusClasses('RECHAZADA')).toContain('text-danger-800');
    expect(component.getReclamoStatusClasses('PENDIENTE')).toContain('text-warning-800');
  });

  it('debe renderizar sesiones e interactuar con startClaim y withdrawClaim', () => {
    spyOn(component.startClaim, 'emit');
    spyOn(component.withdrawClaim, 'emit');

    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesiones', mockSesiones);
    fixture.detectChanges();

    component.startClaim.emit(mockSesiones[1]);
    expect(component.startClaim.emit).toHaveBeenCalledWith(mockSesiones[1]);

    component.withdrawClaim.emit(mockSesiones[1]);
    expect(component.withdrawClaim.emit).toHaveBeenCalledWith(mockSesiones[1]);
  });

  describe('CULM-001 D.1 plazo de justificacion por sesion', () => {
    const render = (overrides: Partial<SesionMateriaDetalle>) => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [
        crearSesion({ id: 'ses-p', estadoAsistencia: 'AUSENTE', reclamable: true, ...overrides }),
      ]);
      fixture.detectChanges();
    };
    const el = (id: string) => fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

    it('vigente: muestra "Justificable hasta" y el boton esta habilitado', () => {
      spyOn(component.startClaim, 'emit');
      render({ plazoJustificacionVigente: true, fechaLimiteJustificacionLocal: '2026-11-09 23:59' });
      expect(el('sesion-plazo')!.textContent).toContain('Justificable hasta 2026-11-09 23:59');
      const boton = fixture.nativeElement.querySelector('[data-testid="sesion-ses-p"] app-button button') as HTMLButtonElement;
      expect(boton.disabled).toBeFalse();
      boton.click();
      expect(component.startClaim.emit).toHaveBeenCalled();
    });

    it('vencido: muestra "Plazo vencido" y bloquea con aria-disabled y tooltip sin emitir', () => {
      spyOn(component.startClaim, 'emit');
      render({ plazoJustificacionVigente: false, fechaLimiteJustificacionLocal: '2026-11-09 23:59' });
      expect(el('sesion-plazo')!.textContent).toContain('Plazo vencido');
      expect(el('sesion-plazo')!.textContent).toContain('2026-11-09 23:59');
      const boton = el('radicar-bloqueado') as HTMLButtonElement;
      expect(boton.getAttribute('aria-disabled')).toBe('true');
      expect(boton.getAttribute('title')).toContain('plazo');
      expect(boton.getAttribute('aria-describedby')).toBe(el('sesion-plazo')!.id);
      boton.click();
      expect(component.startClaim.emit).not.toHaveBeenCalled();
    });

    it('fecha null y no vigente: muestra "Sin plazo" y bloquea', () => {
      render({ plazoJustificacionVigente: false });
      expect(el('sesion-plazo')!.textContent).toContain('Sin plazo');
      expect(el('radicar-bloqueado')).not.toBeNull();
    });

    it('sesion cancelada: no muestra plazo ni boton', () => {
      render({ estado: 'CANCELADA', plazoJustificacionVigente: false, fechaLimiteJustificacionLocal: '2026-11-09 23:59' });
      expect(el('sesion-plazo')).toBeNull();
      expect(el('radicar-bloqueado')).toBeNull();
    });

    it('despliegue anterior sin el indicador: no muestra plazo y conserva el boton habilitado', () => {
      render({});
      expect(el('sesion-plazo')).toBeNull();
      expect(el('radicar-bloqueado')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="sesion-ses-p"] app-button button')).not.toBeNull();
    });
  });

  describe('estados de la tabla de sesiones', () => {
    const texto = () => fixture.nativeElement.textContent as string;

    it('un error HTTP muestra el panel de error con reintento y NO "0 sesiones"', () => {
      spyOn(component.retry, 'emit');
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', []);
      fixture.componentRef.setInput('error', { kind: 'VALIDACION', titulo: 'Solicitud no válida', mensaje: 'rechazó' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-error"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-vacio"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="conteo-sesiones"]')).toBeNull();
      expect(texto()).not.toContain('0 sesiones');
      expect(texto()).not.toContain('No hay sesiones registradas');

      const reintentar = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
        .find((b) => b.textContent?.includes('Reintentar'));
      reintentar!.click();
      expect(component.retry.emit).toHaveBeenCalled();
    });

    it('un identificador invalido no ofrece reintento', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('error', { kind: 'IDENTIFICADOR', titulo: 'Identificador inválido', mensaje: 'x' });
      fixture.detectChanges();
      expect(texto()).not.toContain('Reintentar');
    });

    it('una respuesta 200 con cero sesiones muestra el estado vacio, sin error', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', []);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-vacio"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-error"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="conteo-sesiones"]').textContent).toContain('0 sesiones');
    });

    it('una respuesta 200 con sesiones las lista', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', mockSesiones);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="conteo-sesiones"]').textContent).toContain('2 sesiones');
      expect(texto()).toContain('Patrones GoF');
    });

    it('NO_DISPONIBLE muestra "Sin registro" (F3-EST-03) y NO ofrece Radicar Reclamo', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ estadoAsistencia: 'NO_DISPONIBLE' })]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="estado-no-disponible"]')!.textContent.trim()).toBe('Sin registro');
      expect(texto()).not.toContain('Estado no disponible');
      expect(texto()).not.toContain('Radicar Reclamo');
      expect(texto()).not.toContain('AUSENTE');
    });

    it('una ausencia reclamable ofrece Radicar Reclamo; PRESENTE y JUSTIFICADA no', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'a', estadoAsistencia: 'AUSENTE', reclamable: true })]);
      fixture.detectChanges();
      expect(texto()).toContain('Radicar Reclamo');
      expect(fixture.nativeElement.querySelector('[data-testid="estado-no-disponible"]')).toBeNull();

      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'r', estadoAsistencia: 'RETARDO', reclamable: true })]);
      fixture.detectChanges();
      expect(texto()).toContain('Radicar Reclamo');

      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'b', estadoAsistencia: 'PRESENTE' })]);
      fixture.detectChanges();
      expect(texto()).not.toContain('Radicar Reclamo');

      // SUPUESTO-B-15 (CERT-CULM001): varias tomas con alguna ausente también se reclama.
      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'pa', estadoAsistencia: 'PARCIAL', reclamable: true })]);
      fixture.detectChanges();
      expect(texto()).toContain('Radicar Reclamo');
      expect(texto()).toContain('Parcial');

      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'j', estadoAsistencia: 'JUSTIFICADA' })]);
      fixture.detectChanges();
      expect(texto()).not.toContain('Radicar Reclamo');
    });

    it('una ausencia no reclamable (sin pista del backend) no ofrece Radicar Reclamo', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ estadoAsistencia: 'AUSENTE', reclamable: false })]);
      fixture.detectChanges();
      expect(texto()).not.toContain('Radicar Reclamo');
    });

    it('una ausencia con solicitud existente muestra su estado y NO ofrece un reclamo duplicado', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [
        crearSesion({ estadoAsistencia: 'AUSENTE', reclamable: false, solicitudRevision: 'PENDIENTE' }),
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="solicitud-existente"]').textContent)
        .toContain('pendiente');
      expect(texto()).not.toContain('Radicar Reclamo');
    });

    it('A2-F-01 "Retirar" solo aparece en reclamos PENDIENTE y emite withdrawClaim', () => {
      const pendiente = crearSesion({ id: 'p', estadoAsistencia: 'AUSENTE', reclamoId: 'rec-p', estadoReclamo: 'PENDIENTE' });
      const aprobada = crearSesion({ id: 'a', numeroSesion: 2, estadoAsistencia: 'AUSENTE', reclamoId: 'rec-a', estadoReclamo: 'APROBADA' });
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [pendiente, aprobada]);
      fixture.detectChanges();

      const botones = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
        .filter((b) => b.textContent?.trim() === 'Retirar');
      expect(botones.length).toBe(1);
      const emitido: SesionMateriaDetalle[] = [];
      component.withdrawClaim.subscribe((s) => emitido.push(s));
      botones[0].click();
      expect(emitido).toEqual([pendiente]);
    });

    it('A2-F-07 un reclamo RETIRADA muestra la insignia "Retirada" y no ofrece Retirar', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [
        crearSesion({ estadoAsistencia: 'AUSENTE', reclamoId: 'rec-r', estadoReclamo: 'RETIRADA' }),
      ]);
      fixture.detectChanges();

      expect(texto()).toContain('Retirada');
      const botones = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
        .filter((b) => b.textContent?.trim() === 'Retirar');
      expect(botones.length).toBe(0);
    });

    it('A2-F-07 una solicitud existente RETIRADA se informa como retirada', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [
        crearSesion({ estadoAsistencia: 'AUSENTE', reclamable: false, solicitudRevision: 'RETIRADA' }),
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="solicitud-existente"]').textContent).toContain('retirada');
    });

    it('sin indicadores no renderiza NaN ni porcentajes inventados', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="detalle-asistencia-no-disponible"]')).not.toBeNull();
      expect(texto()).not.toContain('NaN');
      expect(texto()).not.toContain('undefined');
      expect(texto()).toContain('No informado');
    });

    it('marca la hora sin zona entregada por el backend', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ temporalidad: 'SIN_ZONA' })]);
      fixture.detectChanges();
      expect(texto()).toContain('(sin zona)');
    });
  });

  describe('sesión cancelada (HU047, CULM-001 B.1)', () => {
    const cancelada: SesionMateriaDetalle = crearSesion({
      id: 'ses-c',
      numeroSesion: 3,
      estadoAsistencia: 'NO_DISPONIBLE',
      estado: 'CANCELADA',
      cancelacion: { tipo: 'FESTIVO', motivo: null, nombreFestivo: 'San José', fechaCancelacionUtc: null },
    });

    beforeEach(() => {
      fixture.componentRef.setInput('materia', mockMateria);
      fixture.componentRef.setInput('sesiones', [...mockSesiones, cancelada]);
      fixture.detectChanges();
    });

    it('B1-F-25 muestra la etiqueta Cancelada con el festivo y sin "Estado no disponible"', () => {
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain('Cancelada');
      expect(texto).toContain('Día festivo: San José');
      expect(fixture.nativeElement.querySelector('[data-testid="estado-no-disponible"]')).toBeNull();
    });

    it('B1-F-25 la sesión cancelada no ofrece acciones de reclamo aunque llegue marcada reclamable', () => {
      fixture.componentRef.setInput('sesiones', [{ ...cancelada, reclamable: true }]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Radicar Reclamo');
    });

    it('B1-F-25 móvil: la fila apila el contenido en pantallas estrechas (flex-col) y envuelve las etiquetas', () => {
      const fila = fixture.nativeElement.querySelector('[data-testid="sesion-ses-c"]') as HTMLElement;
      expect(fila.className).toContain('flex-col');
      expect(fila.className).toContain('sm:flex-row');
    });
  });

  describe('orden y paginacion de sesiones (F-EST-S17, F-EST-013)', () => {
    const numeros = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid^="sesion-ses"]')).map((n) =>
        n.getAttribute('data-testid')
      );

    it('muestra las sesiones en orden cronologico aunque el backend las entregue desordenadas', () => {
      fixture.componentRef.setInput('materia', mockMateria);
      fixture.componentRef.setInput('sesiones', [
        crearSesion({ id: 'ses-3', numeroSesion: 3, fecha: '2026-11-06', horario: '22:30 - 23:30' }),
        crearSesion({ id: 'ses-4', numeroSesion: 4, fecha: '2026-11-07', horario: '23:35 - 00:35' }),
        crearSesion({ id: 'ses-5', numeroSesion: 5, fecha: '2026-11-06', horario: '22:45 - 23:35' }),
      ]);
      fixture.detectChanges();

      expect(numeros()).toEqual(['sesion-ses-3', 'sesion-ses-5', 'sesion-ses-4']);
    });

    it('pagina de a 10 y conserva el conteo total', () => {
      const muchas = Array.from({ length: 25 }, (_, i) =>
        crearSesion({ id: `ses-${i + 1}`, numeroSesion: i + 1, fecha: '2026-09-01', horario: `${String(8 + (i % 12)).padStart(2, '0')}:00 - 09:00` })
      );
      fixture.componentRef.setInput('materia', mockMateria);
      fixture.componentRef.setInput('sesiones', muchas);
      fixture.detectChanges();

      expect(numeros().length).toBe(10);
      expect(fixture.nativeElement.querySelector('[data-testid="conteo-sesiones"]').textContent).toContain('25 sesiones');
      expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();

      component.pagina.set(3);
      fixture.detectChanges();
      expect(numeros().length).toBe(5);
    });
  });
});

describe('StudentCourseDetailComponent: puntos de control', () => {
  let fixture: ComponentFixture<StudentCourseDetailComponent>;
  const texto = () => (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
  const el = (id: string) => fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const toma = (numero: number, parcial: Partial<TomaSesionEstudiante> = {}): TomaSesionEstudiante => ({
    idToma: `toma-${numero}`, numero, horaPuntoControl: numero === 1 ? '08:00' : '09:00', estado: 'AUSENTE', reclamable: true,
    idSolicitudRevision: null, estadoSolicitudRevision: null, resultadoAprobacion: null, ...parcial,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StudentCourseDetailComponent] }).compileComponents();
    fixture = TestBed.createComponent(StudentCourseDetailComponent);
    fixture.componentRef.setInput('materia', crearMateria());
  });

  it('muestra "Parcial: X de Y minutos" y los minutos justificados', () => {
    fixture.componentRef.setInput('sesiones', [crearSesion({
      id: 'p', estadoAsistencia: 'PARCIAL', minutosSesion: 120, minutosAsistidos: 20, minutosExcusa: 100,
      tomas: [toma(1, { estado: 'PRESENTE', reclamable: false }), toma(2, { estado: 'JUSTIFICADA', reclamable: false })],
    })]);
    fixture.detectChanges();
    expect(el('estado-p')!.textContent!.trim()).toBe('Parcial: 20 de 120 minutos');
    expect(el('sesion-excusa')!.textContent).toContain('100 min justificados');
  });

  it('muestra Presente, Ausente y Justificada en español', () => {
    fixture.componentRef.setInput('sesiones', [
      crearSesion({ id: 'a', estadoAsistencia: 'PRESENTE' }),
      crearSesion({ id: 'b', estadoAsistencia: 'AUSENTE' }),
      crearSesion({ id: 'c', estadoAsistencia: 'JUSTIFICADA' }),
    ]);
    fixture.detectChanges();
    expect(el('estado-a')!.textContent!.trim()).toBe('Presente');
    expect(el('estado-b')!.textContent!.trim()).toBe('Ausente');
    expect(el('estado-c')!.textContent!.trim()).toBe('Justificada');
  });

  it('lista las tomas con su hora y estado, y ofrece reclamar solo las reclamables', () => {
    fixture.componentRef.setInput('sesiones', [crearSesion({
      id: 'p', numeroSesion: 4, estadoAsistencia: 'PARCIAL', reclamable: true, minutosSesion: 120, minutosAsistidos: 60,
      tomas: [toma(1, { estado: 'PRESENTE', reclamable: false }), toma(2)],
    })]);
    fixture.detectChanges();
    expect(el('toma-toma-1')!.textContent).toMatch(/Toma 1 · 08:00\s*Presente/);
    expect(el('toma-toma-2')!.textContent).toMatch(/Toma 2 · 09:00\s*Ausente/);
    expect(el('toma-toma-1')!.querySelector('[data-testid="btn-reclamar-toma"]')).toBeNull();
    const boton = el('toma-toma-2')!.querySelector('[data-testid="btn-reclamar-toma"]') as HTMLButtonElement;
    expect(boton.textContent).toContain('Reclamar esta toma');
    expect(boton.getAttribute('aria-label')).toBe('Reclamar la toma 2 de la sesión 4');
    // El reclamo es por toma: no aparece el botón de reclamar la sesión completa.
    expect(texto()).not.toContain('Radicar Reclamo');
  });

  it('el botón de una toma emite la sesión y la toma elegidas', () => {
    const sesion = crearSesion({ id: 'p', estadoAsistencia: 'PARCIAL', reclamable: true, tomas: [toma(2)] });
    fixture.componentRef.setInput('sesiones', [sesion]);
    fixture.detectChanges();
    const emitidos: unknown[] = [];
    fixture.componentInstance.startClaimToma.subscribe((e) => emitidos.push(e));
    (el('btn-reclamar-toma') as HTMLButtonElement).click();
    expect(emitidos).toEqual([{ sesion, toma: sesion.tomas[0] }]);
  });

  it('una toma con reclamo muestra su estado y el resultado, sin botón', () => {
    fixture.componentRef.setInput('sesiones', [crearSesion({
      id: 'p', estadoAsistencia: 'PARCIAL', reclamable: false,
      tomas: [
        toma(1, { reclamable: false, idSolicitudRevision: 's-1', estadoSolicitudRevision: 'PENDIENTE' }),
        toma(2, { reclamable: false, idSolicitudRevision: 's-2', estadoSolicitudRevision: 'APROBADA', resultadoAprobacion: 'PRESENTE' }),
        toma(3, { reclamable: false, idSolicitudRevision: 's-3', estadoSolicitudRevision: 'APROBADA', resultadoAprobacion: 'JUSTIFICADA' }),
        toma(4, { reclamable: false, idSolicitudRevision: 's-4', estadoSolicitudRevision: 'RECHAZADA' }),
      ],
    })]);
    fixture.detectChanges();
    const reclamo = (n: number) => el(`toma-toma-${n}`)!.querySelector('[data-testid="toma-reclamo"]')!.textContent!.trim();
    expect(reclamo(1)).toBe('Reclamo pendiente');
    expect(reclamo(2)).toBe('Reclamo aprobado: estuvo presente');
    expect(reclamo(3)).toBe('Reclamo aprobado: ausencia justificada');
    expect(reclamo(4)).toBe('Reclamo rechazado');
    expect(el('btn-reclamar-toma')).toBeNull();
  });

  it('con el plazo vencido no se ofrece reclamar la toma', () => {
    fixture.componentRef.setInput('sesiones', [crearSesion({
      id: 'p', estadoAsistencia: 'PARCIAL', reclamable: true, plazoJustificacionVigente: false, tomas: [toma(2)],
    })]);
    fixture.detectChanges();
    expect(el('btn-reclamar-toma')).toBeNull();
  });

  it('una sesión cancelada no muestra tomas', () => {
    fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'x', estado: 'CANCELADA', tomas: [toma(1)] })]);
    fixture.detectChanges();
    expect(el('tomas-x')).toBeNull();
  });
});
