import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TeacherGrupoEstudiantesComponent } from './teacher-grupo-estudiantes.component';
import { Course } from '../../../../core/models/course.model';

describe('TeacherGrupoEstudiantesComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoEstudiantesComponent>;
  let component: TeacherGrupoEstudiantesComponent;

  const mockCourse: Course = {
    id: 'crs-1',
    name: 'Algoritmos I',
    code: 'SIS-101',
    section: 'Grupo 01',
    cupoMaximo: 30,
    enrolledStudentsCount: 2,
    colorCategory: 'emerald',
    schedule: 'Lunes 08:00 - 10:00',
  };

  const mockEstudiantes = [
    {
      studentId: 'est-1',
      studentName: 'Ana Gómez',
      studentCode: '1017001',
    },
    {
      studentId: 'est-2',
      studentName: 'Carlos López',
      studentCode: '1017002',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherGrupoEstudiantesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherGrupoEstudiantesComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente en estado vacío', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No hay estudiantes matriculados');
  });

  it('muestra la lista de estudiantes cuando se suministran', () => {
    fixture.componentRef.setInput('curso', mockCourse);
    fixture.componentRef.setInput('estudiantes', mockEstudiantes);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ana Gómez');
    expect(text).toContain('Carlos López');
    expect(text).toContain('2 de 30 Cupos');
  });

  it('HU051 RT-07 muestra la forma del backend y solo los activos tienen "Retirar"', () => {
    const retirar = jasmine.createSpy('retirar');
    component.retirar.subscribe(retirar);
    fixture.componentRef.setInput('estudiantes', [
      { id: 'm-1', idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez', documento: '1017001', codigoEstado: 'A', nombreEstado: 'activo' },
      { id: 'm-2', idEstudiante: 'est-2', nombreCompleto: 'Luis Ruiz', documento: '1017003', codigoEstado: 'I', nombreEstado: 'inactivo' },
    ]);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ana Gómez');
    expect(texto).toContain('1017001');
    expect(texto).toContain('inactivo');
    const botones = fixture.nativeElement.querySelectorAll('button[data-accion="retirar"]');
    expect(botones).toHaveSize(1);
    botones[0].click();
    expect(retirar).toHaveBeenCalledWith(jasmine.objectContaining({ idEstudiante: 'est-1' }));
  });

  it('muestra estado cargando cuando cargando es true', () => {
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('No hay estudiantes');
  });

  // CIERRE-W1A: la página, el total y la búsqueda las entrega el servidor; el componente no recorta ni filtra el padrón.
  it('CIERRE-W1A pinta exactamente las filas que recibe (la página del servidor) y el paginador usa el total del servidor', () => {
    const pagina = Array.from({ length: 12 }, (_, i) => ({ idEstudiante: `e-${i}`, nombreCompleto: `Estudiante ${i}`, documento: `${i}` }));
    fixture.componentRef.setInput('estudiantes', pagina);
    fixture.componentRef.setInput('totalEstudiantes', 30);
    fixture.componentRef.setInput('pagina', 2);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="padron-fila"]').length).toBe(12);
    const paginador = fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    expect(paginador.totalItems()).toBe(30);
    expect(paginador.currentPage()).toBe(2);
    expect(paginador.pageSize()).toBe(12);
    expect(fixture.nativeElement.textContent).toContain('30 de');
  });

  it('sin total del servidor el paginador usa la cantidad de filas recibidas', () => {
    fixture.componentRef.setInput('estudiantes', mockEstudiantes);
    fixture.detectChanges();

    const paginador = fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    expect(paginador.totalItems()).toBe(2);
  });

  it('pedir otra página o tamaño se delega al padre', () => {
    const pagina = jasmine.createSpy('pagina');
    const tamano = jasmine.createSpy('tamano');
    component.paginaChange.subscribe(pagina);
    component.tamanoChange.subscribe(tamano);
    fixture.componentRef.setInput('estudiantes', mockEstudiantes);
    fixture.componentRef.setInput('totalEstudiantes', 60);
    fixture.detectChanges();

    const paginador = fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    paginador.pageChange.emit(3);
    paginador.pageSizeChange.emit(24);

    expect(pagina).toHaveBeenCalledOnceWith(3);
    expect(tamano).toHaveBeenCalledOnceWith(24);
  });

  it('la búsqueda se emite al padre tras una espera corta y sin repetir el mismo texto', fakeAsync(() => {
    const busqueda = jasmine.createSpy('busqueda');
    component.busquedaChange.subscribe(busqueda);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[data-testid="padron-busqueda"]') as HTMLInputElement;

    for (const texto of ['a', 'an', ' ana ']) {
      input.value = texto;
      input.dispatchEvent(new Event('input'));
      tick(100);
    }
    expect(busqueda).not.toHaveBeenCalled();
    tick(300);
    expect(busqueda).toHaveBeenCalledOnceWith('ana');

    input.value = 'ana';
    input.dispatchEvent(new Event('input'));
    tick(300);
    expect(busqueda).toHaveBeenCalledTimes(1);
  }));

  it('sin resultados de la búsqueda se informa que ningún estudiante coincide', () => {
    fixture.componentRef.setInput('busqueda', 'zzz');
    fixture.componentRef.setInput('estudiantes', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ningún estudiante del grupo coincide con la búsqueda');
  });
});
