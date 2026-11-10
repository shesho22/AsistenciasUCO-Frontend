import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DeanEstructuraComponent } from './dean-estructura.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { FacultadNodo } from '../../../core/models/facultad-decano.model';

const URL = `${environment.apiUrl}/decano/estructura`;

const estructura: FacultadNodo[] = [
  {
    id: 'f-1',
    nombre: 'Facultad de Ingeniería',
    nombreDecano: 'Decana Uno',
    activa: true,
    programas: [
      {
        id: 'p-1',
        nombre: 'Ingeniería de Sistemas',
        nombreCoordinador: 'Coord Uno',
        activo: true,
        nombreTipoPrograma: 'Pregrado',
        nombreModalidad: 'Presencial',
        nombreJornada: 'Diurna',
        planes: [
          { id: 'pl-1', inp: 20241, activo: true, totalSemestres: 10 },
          { id: 'pl-2', inp: 20191, activo: false, totalSemestres: 9 },
        ],
      },
      {
        id: 'p-2',
        nombre: 'Ingeniería Industrial',
        nombreCoordinador: null,
        activo: false,
        nombreTipoPrograma: null,
        nombreModalidad: null,
        nombreJornada: null,
        planes: [],
      },
    ],
  },
];

describe('DeanEstructuraComponent (HU109/HU119)', () => {
  let fixture: ComponentFixture<DeanEstructuraComponent>;
  let component: DeanEstructuraComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  function crear(): void {
    fixture = TestBed.createComponent(DeanEstructuraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [DeanEstructuraComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('HU119: muestra el árbol Facultad → Programa → Plan con totales', () => {
    crear();
    http.expectOne(URL).flush({ exitoso: true, datos: estructura, total: 1 });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(component.totalProgramas()).toBe(2);
    expect(component.totalPlanes()).toBe(2);
    expect(texto).toContain('Facultad de Ingeniería');
    expect(texto).toContain('Decana Uno');
    expect(texto).toContain('Plan 20241 · 10 semestres');
    expect(texto).toContain('Sin planes de estudio.');
    expect(texto).toContain('Coordinador(a): Sin asignar');
  });

  it('HU109: pliega y despliega los planes de un programa', () => {
    crear();
    http.expectOne(URL).flush({ exitoso: true, datos: estructura, total: 1 });
    fixture.detectChanges();

    component.alternar('p-1');
    fixture.detectChanges();
    expect(component.abiertos().has('p-1')).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Plan 20241');

    component.alternar('p-1');
    expect(component.abiertos().has('p-1')).toBeTrue();
  });


  it('CULM-001: cada plan ofrece «Ver malla» hacia la malla del plan', () => {
    crear();
    http.expectOne(URL).flush({ exitoso: true, datos: estructura, total: 1 });
    fixture.detectChanges();
    const enlaces = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual(['/app/decano/programas/pl-1', '/app/decano/programas/pl-2']);
  });

  it('CULM-001: embebido oculta el encabezado de la facultad y conserva el árbol de programas', () => {
    crear();
    http.expectOne(URL).flush({ exitoso: true, datos: estructura, total: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Decana Uno');
    expect(fixture.nativeElement.querySelector('h1')).not.toBeNull();

    fixture.componentRef.setInput('embebido', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Decana Uno');
    expect(fixture.nativeElement.textContent).toContain('Ingeniería de Sistemas');
  });

  it('facultad sin programas y respuesta vacía muestran avisos', () => {
    crear();
    http.expectOne(URL).flush({ exitoso: true, datos: [{ ...estructura[0], programas: [] }], total: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La facultad aún no tiene programas académicos.');
  });

  it('sin datos indica que no hay facultad asociada', () => {
    crear();
    http.expectOne(URL).flush({ exitoso: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay una facultad asociada a tu usuario.');
  });

  it('un error del backend muestra el mensaje', () => {
    crear();
    http.expectOne(URL).flush({ exitoso: false }, { status: 403, statusText: 'Forbidden' });
    expect(component.facultades()).toEqual([]);
    expect(toastSpy.error).toHaveBeenCalled();
  });
});
