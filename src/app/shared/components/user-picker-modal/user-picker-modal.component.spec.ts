import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UserPickerModalComponent, UserPickerItem } from './user-picker-modal.component';
import { TeacherService } from '../../../core/services/teacher.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';

describe('UserPickerModalComponent', () => {
  let fixture: ComponentFixture<UserPickerModalComponent>;
  let component: UserPickerModalComponent;
  let teacherServiceSpy: jasmine.SpyObj<TeacherService>;
  let coordServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;

  const mockTeachers = [
    {
      id: 'doc-1',
      idUsuario: 'usr-1',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: 1017001,
      nombreCompleto: 'Roberto Gómez',
      correo: 'rgomez@uco.edu.co',
      estaActivo: true,
    },
  ];

  beforeEach(async () => {
    teacherServiceSpy = jasmine.createSpyObj('TeacherService', ['getAllTeachers']);
    coordServiceSpy = jasmine.createSpyObj('CoordinatorManagementService', ['getDocentes']);

    teacherServiceSpy.getAllTeachers.and.returnValue(of<never>(mockTeachers as never));
    coordServiceSpy.getDocentes.and.returnValue(of<never>({ exitoso: true, datos: [] } as never));

    await TestBed.configureTestingModule({
      imports: [UserPickerModalComponent],
      providers: [
        { provide: TeacherService, useValue: teacherServiceSpy },
        { provide: CoordinatorManagementService, useValue: coordServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPickerModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('debe inicializarse y cargar el directorio de profesores', () => {
    expect(component).toBeTruthy();
    expect(teacherServiceSpy.getAllTeachers).toHaveBeenCalled();
    expect(component.usersList().length).toBe(1);
    expect(component.usersList()[0].nombres).toBe('Roberto Gómez');
  });

  describe('solo se muestra lo que entrega el backend', () => {
    it('no inventa correo, tipo de documento, dependencia ni parte los nombres', () => {
      const item = component.usersList()[0];
      expect(item.correo).toBeUndefined();
      expect(item.tipoIdentificacion).toBeUndefined();
      expect(item.dependenciaOPrograma).toBeUndefined();
      expect(item.primerNombre).toBeUndefined();
      expect(item.primerApellido).toBeUndefined();
      expect(item.apellidos).toBe('');
      expect(item.numeroIdentificacion).toBe('1017001');

      fixture.detectChanges();
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).toContain('Roberto Gómez');
      expect(texto).toContain('Doc: 1017001');
      expect(texto).not.toContain('@uco.edu.co');
      expect(texto).not.toContain('Docencia Universitaria');
    });

    it('un docente sin documento no muestra «Sin ID» ni el campo documento', () => {
      teacherServiceSpy.getAllTeachers.and.returnValue(
        of<never>([{ id: 'doc-2', idUsuario: 'u-2', nombreCompleto: 'Ana Ruiz', estaActivoUsuario: true }] as never)
      );
      component.cargarDirectorio();
      fixture.detectChanges();
      expect(component.usersList()[0].numeroIdentificacion).toBe('');
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).not.toContain('Sin ID');
      expect(texto).not.toContain('Doc:');
    });

    it('un directorio vacío se muestra vacío, sin lista de respaldo', () => {
      teacherServiceSpy.getAllTeachers.and.returnValue(of<never>([] as never));
      component.cargarDirectorio();
      fixture.detectChanges();
      expect(component.usersList()).toEqual([]);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No se encontraron resultados');
    });

    it('un fallo del directorio se muestra como error con reintento y no como lista vacía ni datos de respaldo', () => {
      teacherServiceSpy.getAllTeachers.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Error' }))
      );
      component.cargarDirectorio();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(component.usersList()).toEqual([]);
      expect(component.error()).not.toBeNull();
      expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
      expect(el.textContent).not.toContain('No se encontraron resultados');

      teacherServiceSpy.getAllTeachers.and.returnValue(of<never>(mockTeachers as never));
      (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.error()).toBeNull();
      expect(component.usersList().length).toBe(1);
    });

    it('las iniciales salen del nombre completo (primera y última palabra) o de nombres y apellidos', () => {
      expect(component.getInitials('Roberto Gómez', '')).toBe('RG');
      expect(component.getInitials('Elena', 'Torres')).toBe('ET');
      expect(component.getInitials('Ana', '')).toBe('A');
      expect(component.getInitials('', '')).toBe('U');
    });
  });

  it('filteredUsers filtra por texto de búsqueda', () => {
    component.searchQuery.set('roberto');
    expect(component.filteredUsers().length).toBe(1);

    component.searchQuery.set('inexistente');
    expect(component.filteredUsers().length).toBe(0);
  });

  it('seleccionar emite userSelected con el usuario elegido', () => {
    let selected = null as UserPickerItem | null;
    component.userSelected.subscribe((u) => (selected = u));

    const item = component.usersList()[0];
    component.seleccionar(item);

    expect(selected).toBe(item);
  });

  it('crearNuevo emite requestNew', () => {
    let requested = false;
    component.requestNew.subscribe(() => (requested = true));

    component.crearNuevo();
    expect(requested).toBeTrue();
  });

  it('cancelar emite cancelled', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.cancelar();
    expect(cancelled).toBeTrue();
  });

  it('usa customUsers cuando se suministran externamente', () => {
    const customList: UserPickerItem[] = [
      {
        id: 'cust-1',
        numeroIdentificacion: '1017999',
        nombres: 'Elena',
        apellidos: 'Torres',
        correo: 'elena@uco.edu.co',
      },
    ];

    fixture.componentRef.setInput('customUsers', customList);
    fixture.detectChanges();

    expect(component.filteredUsers()).toEqual(customList);
  });
});
