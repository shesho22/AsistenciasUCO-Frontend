import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentClaimFormComponent } from './student-claim-form.component';
import { SOPORTE_ACCEPT } from '../../../../core/files/soporte-file.validator';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  SoporteAdjuntoItem,
} from '../../../../core/models/role-management.model';
import { crearMateria, crearSesion } from '../../../../core/testing/student-portal.fixtures';
import { CategoriaJustificacionItem } from '../../../../core/models/consultas-transversales.model';

const CATEGORIAS: CategoriaJustificacionItem[] = [
  { id: 'c-1', codigo: 'MED', nombre: 'Médico / Salud', descripcion: 'Enfermedad o cita médica.' },
  { id: 'c-2', codigo: 'LAB', nombre: 'Laboral', descripcion: 'Obligación laboral comprobable.' },
];

describe('StudentClaimFormComponent — soporte (LB-004D FE-01..FE-03)', () => {
  let fixture: ComponentFixture<StudentClaimFormComponent>;
  let component: StudentClaimFormComponent;

  const setInputs = (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StudentClaimFormComponent] });
    fixture = TestBed.createComponent(StudentClaimFormComponent);
    component = fixture.componentInstance;
    setInputs({
      materia: { id: 'm-1', nombre: 'Matemáticas', docente: 'Prof. X' },
      sesion: { id: 's-1', numeroSesion: 3, fecha: '2026-10-19', horario: '08:00', estadoAsistencia: 'AUSENTE', tema: 'Álgebra' },
      categorias: CATEGORIAS,
    });
  });

  it('anuncia el límite real de 5 MB y restringe el selector a PDF/PNG/JPEG', () => {
    expect(host().textContent).toContain('Máx. 5 MB');
    expect(host().textContent).not.toContain('10MB');
    const input = host().querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe(SOPORTE_ACCEPT);
  });

  it('el soporte es opcional: se puede radicar solo con la justificación', () => {
    const emitted: unknown[] = [];
    component.submitted.subscribe((value) => emitted.push(value));
    component.justificacion.set('  Cita médica  ');
    component.onSubmit();
    expect(emitted).toEqual([{ categoria: 'Médico / Salud', justificacion: 'Cita médica' }]);
  });

  it('HU005: lista los motivos del catálogo, preselecciona el primero y muestra su descripción', () => {
    fixture.detectChanges(); // el efecto que preselecciona corre tras el primer render
    const opciones = Array.from(host().querySelectorAll('[data-testid="categoria-justificacion"] option')).map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['Médico / Salud', 'Laboral']);
    expect(host().querySelector('[data-testid="descripcion-categoria"]')?.textContent).toContain('Enfermedad o cita médica.');
    component.categoria.set('Laboral');
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="descripcion-categoria"]')?.textContent).toContain('Obligación laboral');
  });

  it('HU005: sin catálogo no permite radicar y lo informa', () => {
    setInputs({ categorias: [] });
    component.categoria.set('');
    const emitted: unknown[] = [];
    component.submitted.subscribe((value) => emitted.push(value));
    component.justificacion.set('Cita médica');
    component.onSubmit();
    fixture.detectChanges();
    expect(emitted).toEqual([]);
    expect(host().textContent).toContain('No fue posible cargar los motivos');
  });

  it('no emite una justificación vacía', () => {
    const emitted: unknown[] = [];
    component.submitted.subscribe((value) => emitted.push(value));
    component.justificacion.set('   ');
    component.onSubmit();
    expect(emitted).toEqual([]);
  });

  it('muestra el estado de subida con opción de cancelar y oculta el selector mientras sube', () => {
    let removed = 0;
    component.removeFile.subscribe(() => removed++);
    setInputs({ subiendo: true });

    expect(host().textContent).toContain('Subiendo y analizando');
    expect(host().querySelector('input[type="file"]')).toBeNull();
    (Array.from(host().querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar') && b.className.includes('danger')) as HTMLButtonElement).click();
    expect(removed).toBe(1);
  });

  it('muestra el error del soporte de forma accesible', () => {
    setInputs({ errorSoporte: 'El archivo supera el tamaño máximo permitido de 5 MB.' });
    const alert = host().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('5 MB');
  });

  it('muestra el adjunto ya cargado y permite removerlo', () => {
    let removed = 0;
    component.removeFile.subscribe(() => removed++);
    setInputs({ archivo: { fileId: 'f-1', nombre: 'evidencia.pdf', tipo: 'application/pdf', tamanioKb: 4, fechaSubida: '2026-10-19' } });

    expect(host().textContent).toContain('evidencia.pdf');
    (host().querySelector('button[title="Remover adjunto"]') as HTMLButtonElement).click();
    expect(removed).toBe(1);
  });

  it('propaga la selección de archivo al contenedor', () => {
    const events: Event[] = [];
    component.fileSelected.subscribe((event) => events.push(event));
    const input = host().querySelector('input[type="file"]') as HTMLInputElement;
    input.dispatchEvent(new Event('change'));
    expect(events.length).toBe(1);
  });

  describe('CULM-001 D.1 plazo y rechazo por plazo vencido', () => {
    it('anuncia "Puedes justificar hasta" cuando hay fecha limite local', () => {
      fixture.componentRef.setInput('sesion', crearSesion({ fechaLimiteJustificacionLocal: '2026-11-09 23:59', plazoJustificacionVigente: true }));
      fixture.detectChanges();
      expect(host().querySelector('[data-testid="claim-plazo"]')!.textContent).toContain('Puedes justificar hasta 2026-11-09 23:59');
    });

    it('sin fecha limite no muestra el aviso', () => {
      expect(host().querySelector('[data-testid="claim-plazo"]')).toBeNull();
    });

    it('muestra el mensaje del backend junto al boton y el boton sigue habilitado', () => {
      component.justificacion.set('Cita');
      fixture.componentRef.setInput('errorEnvio', 'El plazo para justificar esta inasistencia venció el 9 de noviembre.');
      fixture.detectChanges();
      const alerta = host().querySelector('[data-testid="error-envio"]') as HTMLElement;
      expect(alerta.getAttribute('role')).toBe('alert');
      expect(alerta.textContent).toContain('El plazo para justificar esta inasistencia venció el 9 de noviembre.');
      const enviar = Array.from(host().querySelectorAll('button')).find((b) => b.textContent?.includes('Radicar Reclamo'))!;
      expect(enviar.disabled).toBeFalse();
    });

    it('sin error de envio no hay alerta', () => {
      expect(host().querySelector('[data-testid="error-envio"]')).toBeNull();
    });
  });
});

describe('StudentClaimFormComponent', () => {
  let fixture: ComponentFixture<StudentClaimFormComponent>;
  let component: StudentClaimFormComponent;

  const mockMateria: MateriaEstudianteItem = crearMateria({
    codigo: 'IS-101',
    nombre: 'Ingeniería de Software',
    grupo: '01',
    docente: 'Carlos Docente',
    horario: 'Lunes 08:00 - 10:00',
    aula: 'Lab 2',
    creditos: 3,
    indicadores: { sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 18, horasFalta: 2, horasExcusa: 0, horasSinRegistro: 0, porcentajeInasistencia: 10, porcentajeAsistencia: 90, codigoPermanencia: 'REGULAR', umbralAdvertencia: 15, umbralPerdida: 20 },
    estado: 'Al día',
  });

  const mockSesion: SesionMateriaDetalle = crearSesion({
    id: 'ses-1',
    numeroSesion: 2,
    fecha: '2026-09-08',
    horario: '08:00 - 10:00',
    tema: 'Arquitectura Limpia',
    estadoAsistencia: 'AUSENTE',
  });

  const mockArchivo: SoporteAdjuntoItem = {
    fileId: 'file-123',
    nombre: 'constancia_medica.pdf',
    tipo: 'application/pdf',
    tamanioKb: 245,
    fechaSubida: '2026-09-09',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StudentClaimFormComponent] }).compileComponents();
    fixture = TestBed.createComponent(StudentClaimFormComponent);
    component = fixture.componentInstance;
  });

  function prepare() {
    fixture.componentRef.setInput('categorias', CATEGORIAS);
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesion', mockSesion);
    fixture.detectChanges();
  }

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe enviar el formulario si la justificación está vacía', () => {
    spyOn(component.submitted, 'emit');
    prepare();
    component.justificacion.set('   ');
    component.onSubmit();
    expect(component.submitted.emit).not.toHaveBeenCalled();
  });

  it('debe emitir submitted con categoría y justificación válidas', () => {
    spyOn(component.submitted, 'emit');
    prepare();
    component.categoria.set('Médico / Salud');
    component.justificacion.set('Cita de especialista en EPS');
    component.onSubmit();
    expect(component.submitted.emit).toHaveBeenCalledWith({
      categoria: 'Médico / Salud',
      justificacion: 'Cita de especialista en EPS',
    });
  });

  it('debe emitir back cuando se hace clic en volver', () => {
    spyOn(component.back, 'emit');
    prepare();
    fixture.nativeElement.querySelectorAll('button')[0].click();
    expect(component.back.emit).toHaveBeenCalled();
  });

  it('debe emitir removeFile cuando hay archivo y se hace clic en remover', () => {
    spyOn(component.removeFile, 'emit');
    prepare();
    fixture.componentRef.setInput('archivo', mockArchivo);
    fixture.detectChanges();
    const removeBtn = fixture.nativeElement.querySelector('button[title="Remover adjunto"]');
    expect(removeBtn).toBeTruthy();
    removeBtn.click();
    expect(component.removeFile.emit).toHaveBeenCalled();
  });

  it('debe emitir fileSelected cuando se selecciona un archivo', () => {
    spyOn(component.fileSelected, 'emit');
    prepare();
    fixture.componentRef.setInput('archivo', null);
    fixture.detectChanges();
    const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    fileInput.dispatchEvent(new Event('change'));
    expect(component.fileSelected.emit).toHaveBeenCalled();
  });

  describe('CULM-001 D.2 — soporte múltiple y categoría obligatoria (HU015, HU014)', () => {
    it('muestra múltiples adjuntos en la lista con su estado (SUBIENDO, LISTO, RECHAZADO) y mensaje de error', () => {
      prepare();
      fixture.componentRef.setInput('archivos', [
        { nombre: 'formula.pdf', tamanioKb: 120, estado: 'LISTO', fileId: 'f-1' },
        { nombre: 'analisis.pdf', tamanioKb: 250, estado: 'SUBIENDO' },
        { nombre: 'malware.exe', tamanioKb: 50, estado: 'RECHAZADO', error: 'Archivo infectado por malware' },
      ]);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('formula.pdf');
      expect(text).toContain('analisis.pdf');
      expect(text).toContain('malware.exe');
      expect(text).toContain('Archivo infectado por malware');
    });

    it('muestra los límites de la configuración (máximo soportes, tipos permitidos y límite por minuto)', () => {
      prepare();
      fixture.componentRef.setInput('configuracion', {
        maximoSoportes: 4,
        tamanioMaximoBytes: 2097152,
        tiposPermitidos: ['application/pdf', 'image/png'],
        limiteSubidasPorMinuto: 7,
        diasLimiteJustificacion: 5,
      });
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('4');
      expect(text).toContain('7');
    });

    it('muestra el indicador "Soporte obligatorio" cuando la categoría seleccionada tiene requiereSoporte === true', () => {
      prepare();
      fixture.componentRef.setInput('categorias', [
        { id: 'c-med', codigo: 'MED', nombre: 'Médico / Salud', descripcion: 'Enfermedad comprobada', requiereSoporte: true },
        { id: 'c-otr', codigo: 'OTR', nombre: 'Otro', descripcion: 'Motivo general', requiereSoporte: false },
      ]);
      component.categoria.set('Médico / Salud');
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('[data-testid="soporte-obligatorio-badge"]');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Soporte obligatorio');

      component.categoria.set('Otro');
      fixture.detectChanges();
      const badgeOtro = fixture.nativeElement.querySelector('[data-testid="soporte-obligatorio-badge"]');
      expect(badgeOtro).toBeNull();
    });

    it('desactiva el botón de radicación cuando requiereSoporte === true y no hay ningún soporte LISTO', () => {
      prepare();
      fixture.componentRef.setInput('categorias', [
        { id: 'c-med', codigo: 'MED', nombre: 'Médico / Salud', descripcion: 'Enfermedad comprobada', requiereSoporte: true },
      ]);
      component.categoria.set('Médico / Salud');
      component.justificacion.set('Cita médica programada');
      fixture.componentRef.setInput('archivos', [
        { nombre: 'subiendo.pdf', estado: 'SUBIENDO', tamanioKb: 10 },
      ]);
      fixture.detectChanges();

      const submitBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent?.includes('Radicar Reclamo')) as HTMLButtonElement;
      expect(submitBtn.disabled).toBeTrue();
    });

    it('habilita el botón de radicación cuando requiereSoporte === true y al menos un soporte está LISTO', () => {
      prepare();
      fixture.componentRef.setInput('categorias', [
        { id: 'c-med', codigo: 'MED', nombre: 'Médico / Salud', descripcion: 'Enfermedad comprobada', requiereSoporte: true },
      ]);
      component.categoria.set('Médico / Salud');
      component.justificacion.set('Cita médica programada');
      fixture.componentRef.setInput('archivos', [
        { nombre: 'constancia.pdf', estado: 'LISTO', fileId: 'f-1', tamanioKb: 20 },
      ]);
      fixture.detectChanges();

      const submitBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent?.includes('Radicar Reclamo')) as HTMLButtonElement;
      expect(submitBtn.disabled).toBeFalse();
    });

    it('desactiva el botón de radicación mientras haya subidas en curso (estado === SUBIENDO)', () => {
      prepare();
      component.categoria.set('Laboral');
      component.justificacion.set('Turno laboral imprevisto');
      fixture.componentRef.setInput('archivos', [
        { nombre: 'listo.pdf', estado: 'LISTO', fileId: 'f-1', tamanioKb: 10 },
        { nombre: 'en-curso.pdf', estado: 'SUBIENDO', tamanioKb: 15 },
      ]);
      fixture.detectChanges();

      const submitBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent?.includes('Radicar Reclamo')) as HTMLButtonElement;
      expect(submitBtn.disabled).toBeTrue();
    });

    it('desactiva el botón de radicación si la cantidad de adjuntos supera maximoSoportes', () => {
      prepare();
      fixture.componentRef.setInput('configuracion', { maximoSoportes: 2, tamanioMaximoBytes: 5000000, tiposPermitidos: [], limiteSubidasPorMinuto: 10, diasLimiteJustificacion: 5 });
      component.categoria.set('Laboral');
      component.justificacion.set('Motivo justificado');
      fixture.componentRef.setInput('archivos', [
        { nombre: 's1.pdf', estado: 'LISTO', fileId: 'f-1', tamanioKb: 10 },
        { nombre: 's2.pdf', estado: 'LISTO', fileId: 'f-2', tamanioKb: 10 },
        { nombre: 's3.pdf', estado: 'LISTO', fileId: 'f-3', tamanioKb: 10 },
      ]);
      fixture.detectChanges();

      const submitBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent?.includes('Radicar Reclamo')) as HTMLButtonElement;
      expect(submitBtn.disabled).toBeTrue();
    });

    it('emite quitar con el índice del archivo al hacer clic en remover', () => {
      spyOn(component.quitar, 'emit');
      prepare();
      fixture.componentRef.setInput('archivos', [
        { nombre: 'doc1.pdf', estado: 'LISTO', fileId: 'f-1', tamanioKb: 10 },
        { nombre: 'doc2.pdf', estado: 'LISTO', fileId: 'f-2', tamanioKb: 20 },
      ]);
      fixture.detectChanges();

      const removeBtns = fixture.nativeElement.querySelectorAll('button[title="Remover adjunto"]');
      expect(removeBtns.length).toBeGreaterThanOrEqual(2);
      removeBtns[1].click();
      expect(component.quitar.emit).toHaveBeenCalledWith(1);
    });
  });
});
