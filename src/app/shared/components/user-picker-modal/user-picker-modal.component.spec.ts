import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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

    teacherServiceSpy.getAllTeachers.and.returnValue(of(mockTeachers as any));
    coordServiceSpy.getDocentes.and.returnValue(of({ exitoso: true, datos: [] } as any));

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
    expect(component.usersList()[0].nombres).toBe('Roberto');
  });

  it('filteredUsers filtra por texto de búsqueda', () => {
    component.searchQuery.set('roberto');
    expect(component.filteredUsers().length).toBe(1);

    component.searchQuery.set('inexistente');
    expect(component.filteredUsers().length).toBe(0);
  });

  it('seleccionar emite userSelected con el usuario elegido', () => {
    let selected: any = null;
    component.userSelected.subscribe((u: any) => (selected = u));

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
