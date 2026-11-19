import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { StudentAsistenciaPinModalComponent } from './student-asistencia-pin-modal.component';
import { AsistenciaQrService } from '../../../../../core/services/asistencia-qr.service';
import { RegistroAsistenciaQr } from '../../../../../core/models/asistencia-qr.model';
import { ApiDataResponse } from '../../../../../core/api/models/api-data-response.model';

describe('StudentAsistenciaPinModalComponent (HU176)', () => {
  let fixture: ComponentFixture<StudentAsistenciaPinModalComponent>;
  let component: StudentAsistenciaPinModalComponent;
  let qr: jasmine.SpyObj<AsistenciaQrService>;

  const registro = (over: Partial<RegistroAsistenciaQr> = {}): RegistroAsistenciaQr =>
    ({
      nombreAsignatura: 'Arquitectura de Software',
      nombreGrupo: 'Grupo 01',
      numeroSesion: 32,
      numeroToma: 2,
      fechaRegistroUtc: '2026-11-18T20:00:00Z',
      yaRegistrado: false,
      mensaje: 'Asistencia registrada.',
      ...over,
    }) as RegistroAsistenciaQr;
  const respuesta = (datos: RegistroAsistenciaQr) => of({ exitoso: true, datos } as ApiDataResponse<RegistroAsistenciaQr>);

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const enviar = () => el().querySelector('[data-testid="asistencia-pin-enviar"]') as HTMLButtonElement | null;
  const escribir = (valor: string) => {
    component.onCodigoChange(valor);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    qr = jasmine.createSpyObj<AsistenciaQrService>('AsistenciaQrService', ['registrarPorPin']);
    await TestBed.configureTestingModule({
      imports: [StudentAsistenciaPinModalComponent],
      providers: [{ provide: AsistenciaQrService, useValue: qr }],
    }).compileComponents();
    fixture = TestBed.createComponent(StudentAsistenciaPinModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
  });

  it('se ve como la matrícula por código: título, campo de PIN y botón deshabilitado sin 6 dígitos', () => {
    expect(el().textContent).toContain('Registrar asistencia');
    expect(el().querySelector('#asistencia-pin-input')).not.toBeNull();
    for (const valor of ['', '12345']) {
      escribir(valor);
      expect(enviar()!.disabled).withContext(valor).toBeTrue();
    }
  });

  it('descarta letras y símbolos y limita a 6 dígitos', () => {
    escribir('12a-34 5678');
    expect(component.codigo()).toBe('123456');
  });

  it('con 6 dígitos registra, muestra el resultado del backend y emite registrado', () => {
    const datos = registro();
    qr.registrarPorPin.and.returnValue(respuesta(datos));
    const emitidos: RegistroAsistenciaQr[] = [];
    component.registrado.subscribe((r) => emitidos.push(r));

    escribir('123456');
    enviar()!.click();
    fixture.detectChanges();

    expect(qr.registrarPorPin).toHaveBeenCalledOnceWith('123456');
    const tarjeta = el().querySelector('[data-testid="asistencia-pin-resultado"]')!;
    expect(tarjeta.textContent).toContain('Arquitectura de Software');
    expect(tarjeta.textContent).toContain('Sesión 32 · Toma 2');
    expect(tarjeta.textContent).toContain('Asistencia registrada.');
    expect(emitidos).toEqual([datos]);
    expect(enviar()).toBeNull();
  });

  it('si ya estaba registrada lo dice', () => {
    qr.registrarPorPin.and.returnValue(respuesta(registro({ yaRegistrado: true })));
    escribir('123456');
    component.onSubmit();
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="asistencia-pin-ya-registrado"]')).not.toBeNull();
  });

  it('un rechazo muestra el mensaje del backend dentro del modal y se limpia al volver a escribir', () => {
    qr.registrarPorPin.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'El PIN no es válido o ya expiró.' } }))
    );
    escribir('123456');
    component.onSubmit();
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="asistencia-pin-error"]')?.textContent).toContain('El PIN no es válido o ya expiró.');
    expect(component.enviando()).toBeFalse();

    escribir('65432');
    expect(el().querySelector('[data-testid="asistencia-pin-error"]')).toBeNull();
  });

  it('no envía dos veces mientras espera ni con un PIN inválido', () => {
    const pendiente = new Subject<ApiDataResponse<RegistroAsistenciaQr>>();
    qr.registrarPorPin.and.returnValue(pendiente.asObservable());
    component.onSubmit();
    expect(qr.registrarPorPin).not.toHaveBeenCalled();

    escribir('123456');
    component.onSubmit();
    component.onSubmit();
    fixture.detectChanges();
    expect(qr.registrarPorPin).toHaveBeenCalledTimes(1);
    expect(enviar()!.disabled).toBeTrue();
    expect(enviar()!.textContent).toContain('Registrando...');
  });

  it('cada apertura empieza limpia y cerrar emite closed', () => {
    qr.registrarPorPin.and.returnValue(respuesta(registro()));
    escribir('123456');
    component.onSubmit();
    const cerrados: unknown[] = [];
    component.closed.subscribe(() => cerrados.push(true));
    component.cerrar();
    expect(cerrados.length).toBe(1);

    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    expect(component.codigo()).toBe('');
    expect(component.resultado()).toBeNull();
    expect(component.error()).toBeNull();
  });

  it('una hora de registro inválida no se muestra', () => {
    qr.registrarPorPin.and.returnValue(respuesta(registro({ fechaRegistroUtc: 'no-es-fecha' })));
    escribir('123456');
    component.onSubmit();
    fixture.detectChanges();
    expect(el().textContent).not.toContain('Registrada a las');
    expect(component.hora()).toBe('');
  });
});
