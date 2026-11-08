import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CargaMasivaService } from './carga-masiva.service';
import { environment } from '../../../environments/environment';
import {
  DestinoCargaMasiva,
  ResultadoCargaDTO,
  ResultadoValidacionCargaDTO,
} from '../models/carga-masiva.model';
import { ApiDataResponse } from '../api/models/api-data-response.model';

describe('CargaMasivaService', () => {
  let service: CargaMasivaService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CargaMasivaService],
    });
    service = TestBed.inject(CargaMasivaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('descargarPlantilla', () => {
    it('debe solicitar la plantilla CSV de docentes con rol coordinador', () => {
      const mockBlob = new Blob(['tipo_documento,numero_documento'], {
        type: 'text/csv',
      });

      service.descargarPlantilla('DOCENTE').subscribe((blob) => {
        expect(blob).toEqual(mockBlob);
      });

      const req = httpMock.expectOne(`${baseUrl}/coordinador/cargas/plantilla`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });

    it('debe solicitar la plantilla CSV de coordinadores con rol decano', () => {
      const mockBlob = new Blob(['tipo_documento,numero_documento'], {
        type: 'text/csv',
      });

      service.descargarPlantilla('COORDINADOR').subscribe((blob) => {
        expect(blob).toEqual(mockBlob);
      });

      const req = httpMock.expectOne(`${baseUrl}/decano/cargas/plantilla`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });

    it('debe solicitar la plantilla CSV de decanos con rol admin', () => {
      const mockBlob = new Blob(['tipo_documento,numero_documento'], {
        type: 'text/csv',
      });

      service.descargarPlantilla('DECANO').subscribe((blob) => {
        expect(blob).toEqual(mockBlob);
      });

      const req = httpMock.expectOne(`${baseUrl}/admin/cargas/plantilla`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });
  });

  describe('validarArchivo', () => {
    const mockFile = new File(['csv content'], 'docentes.csv', {
      type: 'text/csv',
    });

    it('debe enviar archivo vía FormData al endpoint de validación según el rol', () => {
      const mockResponse: ApiDataResponse<ResultadoValidacionCargaDTO> = {
        exitoso: true,
        datos: {
          huella: 'sha256-abc123',
          perfilDestino: 'DOCENTE',
          totalFilas: 2,
          filasValidas: 1,
          filasYaExistentes: 1,
          filasConError: 0,
          filas: [
            {
              numeroFila: 2,
              documento: '123456',
              correo: 'docente1@uco.net.co',
              estado: 'VALIDA',
            },
            {
              numeroFila: 3,
              documento: '654321',
              correo: 'docente2@uco.net.co',
              estado: 'YA_EXISTE',
            },
          ],
        },
      };

      service.validarArchivo('DOCENTE', mockFile).subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.datos.totalFilas).toBe(2);
        expect(res.datos.huella).toBe('sha256-abc123');
      });

      const req = httpMock.expectOne(
        `${baseUrl}/coordinador/cargas/validacion`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect(req.request.body.get('archivo')).toBeTruthy();
      req.flush(mockResponse);
    });

    it('debe apuntar a /decano/cargas/validacion cuando el destino es COORDINADOR', () => {
      const mockResponse: ApiDataResponse<ResultadoValidacionCargaDTO> = {
        exitoso: true,
        datos: {
          huella: 'huella-coord',
          perfilDestino: 'COORDINADOR',
          totalFilas: 1,
          filasValidas: 1,
          filasYaExistentes: 0,
          filasConError: 0,
          filas: [
            {
              numeroFila: 2,
              documento: '987654',
              correo: 'coord@uco.net.co',
              estado: 'VALIDA',
            },
          ],
        },
      };

      service.validarArchivo('COORDINADOR', mockFile).subscribe((res) => {
        expect(res.datos.perfilDestino).toBe('COORDINADOR');
      });

      const req = httpMock.expectOne(`${baseUrl}/decano/cargas/validacion`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('debe apuntar a /admin/cargas/validacion cuando el destino es DECANO', () => {
      const mockResponse: ApiDataResponse<ResultadoValidacionCargaDTO> = {
        exitoso: true,
        datos: {
          huella: 'huella-decano',
          perfilDestino: 'DECANO',
          totalFilas: 1,
          filasValidas: 0,
          filasYaExistentes: 0,
          filasConError: 1,
          filas: [
            {
              numeroFila: 2,
              documento: '111222',
              correo: 'decano@uco.net.co',
              estado: 'ERROR',
              errores: [
                {
                  campo: 'codigo_facultad',
                  codigo: 'CMA_007',
                  mensaje: 'Facultad no existe',
                },
              ],
            },
          ],
        },
      };

      service.validarArchivo('DECANO', mockFile).subscribe((res) => {
        expect(res.datos.filasConError).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/admin/cargas/validacion`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('ejecutarCarga', () => {
    const mockFile = new File(['csv content'], 'docentes.csv', {
      type: 'text/csv',
    });
    const mockHuella = 'sha256-abc123';

    it('debe enviar archivo y huella vía FormData a /coordinador/cargas para DOCENTE', () => {
      const mockResponse: ApiDataResponse<ResultadoCargaDTO> = {
        exitoso: true,
        datos: {
          totalFilas: 2,
          creadas: 1,
          yaExistentes: 1,
          conError: 0,
          cuentasPendientes: 0,
          mensaje: 'Carga procesada: 1 creadas, 1 ya existentes, 0 con error.',
          filas: [
            {
              numeroFila: 2,
              documento: '123456',
              correo: 'docente1@uco.net.co',
              estado: 'CREADA',
              idUsuario: 'usr-1',
            },
            {
              numeroFila: 3,
              documento: '654321',
              correo: 'docente2@uco.net.co',
              estado: 'YA_EXISTE',
            },
          ],
        },
      };

      service
        .ejecutarCarga('DOCENTE', mockFile, mockHuella)
        .subscribe((res) => {
          expect(res.exitoso).toBeTrue();
          expect(res.datos.creadas).toBe(1);
        });

      const req = httpMock.expectOne(`${baseUrl}/coordinador/cargas`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect(req.request.body.get('archivo')).toBeTruthy();
      expect(req.request.body.get('huella')).toBe(mockHuella);
      req.flush(mockResponse);
    });

    it('debe enviar a /decano/cargas cuando el destino es COORDINADOR', () => {
      const mockResponse: ApiDataResponse<ResultadoCargaDTO> = {
        exitoso: true,
        datos: {
          totalFilas: 1,
          creadas: 1,
          yaExistentes: 0,
          conError: 0,
          cuentasPendientes: 0,
          filas: [
            {
              numeroFila: 2,
              documento: '987654',
              correo: 'coord@uco.net.co',
              estado: 'CREADA',
            },
          ],
        },
      };

      service
        .ejecutarCarga('COORDINADOR', mockFile, mockHuella)
        .subscribe((res) => {
          expect(res.datos.creadas).toBe(1);
        });

      const req = httpMock.expectOne(`${baseUrl}/decano/cargas`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.get('huella')).toBe(mockHuella);
      req.flush(mockResponse);
    });

    it('debe enviar a /admin/cargas cuando el destino es DECANO', () => {
      const mockResponse: ApiDataResponse<ResultadoCargaDTO> = {
        exitoso: true,
        datos: {
          totalFilas: 1,
          creadas: 0,
          yaExistentes: 0,
          conError: 1,
          cuentasPendientes: 0,
          filas: [
            {
              numeroFila: 2,
              documento: '111222',
              correo: 'decano@uco.net.co',
              estado: 'ERROR',
            },
          ],
        },
      };

      service
        .ejecutarCarga('DECANO', mockFile, mockHuella)
        .subscribe((res) => {
          expect(res.datos.conError).toBe(1);
        });

      const req = httpMock.expectOne(`${baseUrl}/admin/cargas`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.get('huella')).toBe(mockHuella);
      req.flush(mockResponse);
    });
  });
});
