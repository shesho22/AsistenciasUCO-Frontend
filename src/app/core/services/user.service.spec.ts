import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';
import { CrearUsuarioRequest } from '../api/models/crear-usuario-request.model';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('createUser realiza petición POST a /usuarios', () => {
    const request: CrearUsuarioRequest = {
      tipoIdIdentificacion: 'tipo-1',
      numeroIdentificacion: 1017001,
      primerNombre: 'Carlos',
      segundoNombre: 'Andrés',
      primerApellido: 'Ramírez',
      segundoApellido: 'Restrepo',
      correo: 'cramirez@uco.edu.co',
      password: 'Password2026*',
    };

    service.createUser(request).subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiUrl}/usuarios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ exitoso: true, mensajeUsuario: 'Usuario creado exitosamente' });
  });
});
