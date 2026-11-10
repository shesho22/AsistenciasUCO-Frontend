import { TestBed } from '@angular/core/testing';
import { StudentCoursesListComponent } from './student-courses-list.component';
import { crearMateria } from '../../../../core/testing/student-portal.fixtures';
import { IndicadoresAsistenciaResponse } from '../../../../core/models/indicadores-asistencia.model';

const indicadores = (parcial: Partial<IndicadoresAsistenciaResponse> = {}): IndicadoresAsistenciaResponse => ({
  sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 16, horasFalta: 3, horasExcusa: 1, horasSinRegistro: 0,
  porcentajeInasistencia: 15, porcentajeAsistencia: 80, codigoPermanencia: 'RIESGO', umbralAdvertencia: 15, umbralPerdida: 20,
  ...parcial,
});

describe('StudentCoursesListComponent — indicadores por horas (CULM-001 B.2)', () => {
  function render(materias = [crearMateria({ indicadores: indicadores() })]) {
    const fixture = TestBed.configureTestingModule({ imports: [StudentCoursesListComponent] }).createComponent(
      StudentCoursesListComponent
    );
    fixture.componentRef.setInput('materias', materias);
    fixture.detectChanges();
    return fixture;
  }
  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent!.replace(/\s+/g, ' ');

  it('B2-F-16 muestra el % de inasistencia por horas y las horas de falta sobre las dictadas', () => {
    const t = texto(render());
    expect(t).toContain('15% de inasistencia');
    expect(t).toContain('3 h de falta de 20 h dictadas');
  });

  it('B2-F-16 el semaforo sale de codigoPermanencia y de los umbrales del backend', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('[data-testid="semaforo-asistencia"]')!.textContent).toContain('En riesgo');
    expect(texto(fixture)).toContain('Advertencia desde 15%');
    expect(texto(fixture)).toContain('pérdida desde 20%');
  });

  it('B2-F-16 un % por encima de 15 sin codigoPermanencia no inventa semaforo (sin umbrales 85/75 en el cliente)', () => {
    const fixture = render([crearMateria({ indicadores: indicadores({ codigoPermanencia: null, porcentajeInasistencia: 40 }) })]);
    expect(fixture.nativeElement.querySelector('[data-testid="semaforo-asistencia"]')).toBeNull();
    expect((fixture.componentInstance as unknown as Record<string, unknown>)['getProgressColor']).toBeUndefined();
  });

  it('B2-F-16 sin indicadores muestra "No disponible" sin NaN', () => {
    const fixture = render([crearMateria()]);
    expect(fixture.nativeElement.querySelector('[data-testid="asistencia-no-disponible"]')).not.toBeNull();
    expect(texto(fixture)).not.toContain('NaN');
  });

  it('F3-EST-02 muestra creditos y caracter de la asignatura cuando el backend los informa', () => {
    const fixture = render([crearMateria({ creditos: 3, caracter: 'Obligatoria' })]);
    expect(fixture.nativeElement.querySelector('[data-testid="materia-creditos-caracter"]')!.textContent.replace(/\s+/g, ' ')).toContain('3 créditos · Obligatoria');
  });

  it('F3-EST-02 sin creditos ni caracter no pinta la linea', () => {
    const fixture = render([crearMateria({ creditos: null, caracter: null })]);
    expect(fixture.nativeElement.querySelector('[data-testid="materia-creditos-caracter"]')).toBeNull();
  });

  it('B2-F-17 el boton "Registrar asistencia con PIN" emite registrarConPin y mide 44 px', () => {
    const fixture = render();
    const emitido = jasmine.createSpy('pin');
    fixture.componentInstance.registrarConPin.subscribe(emitido);
    const boton = fixture.nativeElement.querySelector('[data-testid="registrar-con-pin"]') as HTMLButtonElement;
    expect(boton.textContent).toContain('Registrar asistencia con PIN');
    expect(boton.className).toContain('min-h-[44px]');
    boton.click();
    expect(emitido).toHaveBeenCalledTimes(1);
  });
});

describe('StudentCoursesListComponent: paginacion y vacio (F-EST-013, F-EST-015)', () => {
  it('pagina las materias de a 12 y el estado vacio ocupa dos columnas solo desde md', () => {
    const fixture = TestBed.createComponent(StudentCoursesListComponent);
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('materias', []);
    fixture.detectChanges();
    const vacio = fixture.nativeElement.querySelector('[data-testid="materias-vacio"]') as HTMLElement;
    expect(vacio.className).toContain('md:col-span-2');
    expect(vacio.className).not.toMatch(/(^|\s)col-span-2/);

    fixture.componentRef.setInput(
      'materias',
      Array.from({ length: 15 }, (_, i) => crearMateria({ claveGrupo: `g-${i}`, nombre: `Materia ${i}` }))
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-card').length).toBe(12);
    expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();
  });
});

describe('StudentCoursesListComponent: busqueda de materias (HU007, CERT-CULM001)', () => {
  function render() {
    const fixture = TestBed.createComponent(StudentCoursesListComponent);
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('materias', [
      crearMateria({ claveGrupo: 'g-1', nombre: 'Cálculo Diferencial', codigo: 'MAT-101', grupo: 'G01', docente: 'Ana Pérez' }),
      crearMateria({ claveGrupo: 'g-2', nombre: 'Arquitectura de Software', codigo: 'ARQ-402', grupo: 'G02', docente: 'María Rostagno' }),
      crearMateria({ claveGrupo: 'g-3', nombre: 'Bases de Datos', codigo: 'BD-201', grupo: 'G03', docente: null }),
    ]);
    fixture.detectChanges();
    return fixture;
  }
  const buscar = (fixture: ReturnType<typeof render>, texto: string) => {
    const input = fixture.nativeElement.querySelector('[data-testid="buscar-materia"]') as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const tarjetas = (fixture: ReturnType<typeof render>) => fixture.nativeElement.querySelectorAll('app-card').length;

  it('muestra el campo de busqueda con su etiqueta accesible', () => {
    const fixture = render();
    const input = fixture.nativeElement.querySelector('[data-testid="buscar-materia"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-label')).toContain('Buscar materia');
    expect(tarjetas(fixture)).toBe(3);
  });

  it('filtra por nombre sin distinguir tildes ni mayusculas, por codigo, grupo y docente', () => {
    const fixture = render();
    buscar(fixture, 'calculo');
    expect(tarjetas(fixture)).toBe(1);
    buscar(fixture, 'arq-402');
    expect(tarjetas(fixture)).toBe(1);
    buscar(fixture, 'g03');
    expect(tarjetas(fixture)).toBe(1);
    buscar(fixture, 'rostagno');
    expect(tarjetas(fixture)).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="resultado-busqueda"]').textContent).toContain('1 de 3');
  });

  it('sin coincidencias muestra un aviso y al borrar vuelve a la lista completa en la pagina 1', () => {
    const fixture = render();
    fixture.componentInstance.pagina.set(2);
    buscar(fixture, 'quimica');
    expect(tarjetas(fixture)).toBe(0);
    expect(fixture.nativeElement.querySelector('[data-testid="sin-coincidencias"]').textContent).toContain('quimica');
    expect(fixture.nativeElement.querySelector('[data-testid="materias-vacio"]')).toBeNull();
    expect(fixture.componentInstance.pagina()).toBe(1);
    buscar(fixture, '');
    expect(tarjetas(fixture)).toBe(3);
    expect(fixture.nativeElement.querySelector('[data-testid="sin-coincidencias"]')).toBeNull();
  });
});
