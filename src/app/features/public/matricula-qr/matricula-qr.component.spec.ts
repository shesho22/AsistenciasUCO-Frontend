import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { MatriculaQrComponent } from './matricula-qr.component';
import { MatriculaQrService } from '../../../core/services/matricula-qr.service';
import { CursoMatriculaQr, MatriculaGrupoResultado } from '../../../core/models/matricula-qr.model';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

describe('MatriculaQrComponent (HU176B, página pública)', () => {
  let fixture: ComponentFixture<MatriculaQrComponent>;
  let component: MatriculaQrComponent;
  let servicio: jasmine.SpyObj<MatriculaQrService>;
  let router: Router;
  let sesion: ReturnType<typeof signal<boolean>>;

  const TOKEN = 'T'.repeat(43);
  const curso: CursoMatriculaQr = {
    idGrupo: 'g-1',
    nombreAsignatura: 'Cálculo',
    nombreGrupo: 'G1',
    nombreDocente: 'María Pérez',
    fechaExpiracionUtc: '2026-11-04T16:00:00Z',
    cupoDisponible: 7,
    tiposIdentificacion: [
      { id: 'cc-id', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía' },
      { id: 'ti-id', tipoIdentificacion: 'TI', nombre: 'Tarjeta de Identidad' },
    ],
  };

  async function crear(query: Record<string, string> = {}, conSesion = false): Promise<void> {
    sesion = signal(conSesion);
    servicio = jasmine.createSpyObj('MatriculaQrService', ['validar', 'registrar', 'matricularAutenticado']);
    servicio.matricularAutenticado.and.returnValue(of({ idGrupo: 'g-1' }));
    servicio.validar.and.returnValue(of(curso));
    servicio.registrar.and.returnValue(of({ idGrupo: 'g-1', usuario: '1017555444' }));
    await TestBed.configureTestingModule({
      imports: [MatriculaQrComponent],
      providers: [
        provideRouter([]),
        { provide: MatriculaQrService, useValue: servicio },
        { provide: AuthService, useValue: { isAuthenticated: sesion } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(MatriculaQrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const html = () => fixture.nativeElement as HTMLElement;
  const q = (testid: string) => html().querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;

  function llenarFormulario(): void {
    component.numero.set('1017555444');
    component.primerNombre.set('Ana');
    component.primerApellido.set('Gómez');
    component.correo.set('ana@uco.edu.co');
    component.password.set('Clave-segura-1');
    component.confirmarPassword.set('Clave-segura-1');
  }

  it('T-FE-01: sin sesión valida el token del QR y lo borra de la URL', async () => {
    await crear({ t: TOKEN });

    expect(servicio.validar).toHaveBeenCalledOnceWith({ token: TOKEN });
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { t: null }, queryParamsHandling: 'merge', replaceUrl: true,
    }));
    expect(component.estado()).toBe('CURSO');
    expect(q('matricula-curso')?.textContent).toContain('Cálculo');
    expect(q('matricula-curso')?.textContent).toContain('María Pérez');
  });

  it('sin token muestra el formulario del PIN y solo permite 6 dígitos', async () => {
    await crear();

    expect(component.estado()).toBe('PIN');
    expect(q('matricula-pin-form')).not.toBeNull();
    component.pin.set('12ab56');
    expect(component.pinValido()).toBeFalse();
    component.validarPin();
    expect(servicio.validar).not.toHaveBeenCalled();

    component.pin.set('482913');
    component.validarPin();
    expect(servicio.validar).toHaveBeenCalledOnceWith({ pin: '482913' });
    expect(component.estado()).toBe('CURSO');
  });

  it('T-FE-02: un token inválido muestra el mensaje del backend tal cual', async () => {
    await crear({ t: TOKEN });
    servicio.validar.and.returnValue(throwError(() => apiHttpError(404, 'El código ya no está disponible.')));
    component.reiniciar();
    (component as unknown as { validar(c: object): void }).validar({ token: TOKEN });
    fixture.detectChanges();

    expect(component.estado()).toBe('ERROR');
    expect(q('matricula-error')?.textContent).toContain('El código ya no está disponible.');
  });

  it('un PIN inválido vuelve al formulario con el mensaje del backend (red fuera del campus incluida)', async () => {
    await crear();
    servicio.validar.and.returnValue(throwError(() => apiHttpError(403, 'Solo desde la red Wi-Fi del campus.')));
    component.pin.set('482913');

    component.validarPin();
    fixture.detectChanges();

    expect(component.estado()).toBe('PIN');
    expect(q('matricula-mensaje')?.textContent).toContain('Solo desde la red Wi-Fi del campus.');
  });

  it('T-FE-03: crear cuenta registra con el token y muestra el usuario, sin token de sesión', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    fixture.detectChanges();
    expect(component.tipoId()).toBe('cc-id');
    llenarFormulario();

    component.registrar();
    fixture.detectChanges();

    const payload = servicio.registrar.calls.mostRecent().args[0];
    expect(payload.token).toBe(TOKEN);
    expect(payload.pin).toBeUndefined();
    expect(payload.idTipoIdentificacion).toBe('cc-id');
    expect(payload.numeroIdentificacion).toBe(1017555444);
    expect(payload.segundoNombre).toBeUndefined();
    expect(component.estado()).toBe('EXITO');
    expect(q('matricula-exito')?.textContent).toContain('1017555444');
    expect(component.password()).toBe('');
  });

  it('al terminar el registro avisa de forma destacada que debe verificar el correo antes de iniciar sesión', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    llenarFormulario();

    component.registrar();
    fixture.detectChanges();

    const aviso = q('matricula-verificar-correo');
    expect(aviso).not.toBeNull();
    expect(aviso?.getAttribute('role')).toBe('status');
    const texto = aviso?.textContent ?? '';
    expect(texto).toContain('Verifica tu correo');
    expect(texto).toContain('ana@uco.edu.co');
    expect(texto).toContain('antes de iniciar sesión');
    expect(q('matricula-exito')?.textContent).toContain('Ir a iniciar sesión');
  });

  // DEC-073: nombres sin números ni signos y documento entero sin cero inicial.
  it('DEC-073: no envía con nombres con números o signos ni con un documento que empieza en cero', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    llenarFormulario();
    expect(component.formularioCompleto()).toBeTrue();

    component.segundoApellido.set('G0mez');
    expect(component.errorNombres()).toBe('El campo Segundo Apellido solo admite letras, espacios, apóstrofo y guion (sin números ni otros signos).');
    expect(component.formularioCompleto()).toBeFalse();

    component.segundoApellido.set('');
    component.numero.set('0123456');
    expect(component.errorDocumento()).toBe('El campo Número de Identificación debe ser positivo y no comenzar con cero.');
    expect(component.formularioCompleto()).toBeFalse();

    component.registrar();
    expect(servicio.registrar).not.toHaveBeenCalled();
  });

  it('no envía el formulario si faltan datos obligatorios o la contraseña es corta', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    llenarFormulario();
    component.password.set('corta');
    component.confirmarPassword.set('corta');

    expect(component.formularioCompleto()).toBeFalse();
    component.registrar();
    expect(servicio.registrar).not.toHaveBeenCalled();
  });

  it('avisa si la contraseña es corta y no deja enviar', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    llenarFormulario();
    component.password.set('corta');
    component.confirmarPassword.set('corta');
    fixture.detectChanges();

    expect(component.passwordLongitudValida()).toBeFalse();
    expect(q('matricula-password-corta')?.textContent).toContain('al menos 8 caracteres');
    expect(q('matricula-enviar')?.hasAttribute('disabled')).toBeTrue();
  });

  it('exige confirmar la contraseña: si no coincide avisa y bloquea el envío', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    llenarFormulario();
    component.confirmarPassword.set('Clave-segura-2');
    fixture.detectChanges();

    expect(component.passwordsCoinciden()).toBeFalse();
    expect(component.formularioCompleto()).toBeFalse();
    expect(q('matricula-password-no-coincide')?.textContent).toContain('no coinciden');
    expect(q('matricula-enviar')?.hasAttribute('disabled')).toBeTrue();
    component.registrar();
    expect(servicio.registrar).not.toHaveBeenCalled();
  });

  it('con contraseñas iguales no muestra avisos y permite enviar; al terminar limpia ambos campos', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    llenarFormulario();
    fixture.detectChanges();

    expect(q('matricula-password-no-coincide')).toBeNull();
    expect(q('matricula-password-corta')).toBeNull();
    expect(q('matricula-enviar')?.hasAttribute('disabled')).toBeFalse();

    component.registrar();
    expect(component.password()).toBe('');
    expect(component.confirmarPassword()).toBe('');
  });

  it('un error del registro (p. ej. cuenta existente) vuelve al formulario con el mensaje del backend', async () => {
    await crear({ t: TOKEN });
    component.mostrarRegistro();
    llenarFormulario();
    servicio.registrar.and.returnValue(throwError(() => apiHttpError(409, 'Ya tienes una cuenta registrada.')));

    component.registrar();
    fixture.detectChanges();

    expect(component.estado()).toBe('REGISTRO');
    expect(q('matricula-mensaje')?.textContent).toContain('Ya tienes una cuenta registrada.');
  });

  it('F-EST-012: «Ya tengo cuenta» lleva al login preservando el token t en returnUrl', async () => {
    await crear({ t: TOKEN });

    component.yaTengoCuenta();

    const args = (router.navigate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toEqual(['/login']);
    expect(args[1].queryParams.returnUrl).toBe(`/app/estudiante/materias?t=${encodeURIComponent(TOKEN)}`);
  });

  it('con PIN, «Ya tengo cuenta» pasa el PIN para precargarlo en el portal', async () => {
    await crear();
    component.pin.set('482913');
    component.validarPin();

    component.yaTengoCuenta();

    const args = (router.navigate as jasmine.Spy).calls.mostRecent().args;
    expect(args[1].queryParams.returnUrl).toBe('/app/estudiante/materias?matricula=482913');
  });

  // CULM-001 HU176B: con la sesion abierta el estudiante se matricula con un toque, sin crear cuenta ni volver a iniciar sesion.
  it('sin sesión no ofrece matricularse con la sesión', async () => {
    await crear({ t: TOKEN });
    expect(q('matricula-con-sesion')).toBeNull();
    expect(q('matricula-crear')).not.toBeNull();
  });

  it('con sesión abierta ofrece «Matricularme» y oculta crear cuenta y «Ya tengo cuenta»', async () => {
    await crear({ t: TOKEN }, true);
    expect(q('matricula-con-sesion')).not.toBeNull();
    expect(q('matricula-crear')).toBeNull();
    expect(q('matricula-ya-tengo-cuenta')).toBeNull();
    expect(q('matricula-curso')?.textContent).toContain('Cálculo');
  });

  it('con sesión confirma la matrícula con el token y muestra el mensaje del backend', async () => {
    await crear({ t: TOKEN }, true);
    servicio.matricularAutenticado.and.returnValue(of({ idGrupo: 'g-1', mensajeUsuario: 'Quedaste matriculado en Cálculo.' } as unknown as MatriculaGrupoResultado));

    q('matricula-con-sesion')?.click();
    fixture.detectChanges();

    expect(servicio.matricularAutenticado).toHaveBeenCalledOnceWith({ token: TOKEN });
    expect(component.estado()).toBe('EXITO_SESION');
    expect(q('matricula-exito-sesion')?.textContent).toContain('Quedaste matriculado en Cálculo.');
  });

  it('con sesión y PIN confirma la matrícula con el PIN', async () => {
    await crear({}, true);
    component.pin.set('482913');
    component.validarPin();
    fixture.detectChanges();

    q('matricula-con-sesion')?.click();

    expect(servicio.matricularAutenticado).toHaveBeenCalledOnceWith({ pin: '482913' });
    expect(component.estado()).toBe('EXITO_SESION');
  });

  it('con sesión, un rechazo del backend se muestra tal cual y permite reintentar', async () => {
    await crear({ t: TOKEN }, true);
    servicio.matricularAutenticado.and.returnValue(throwError(() => apiHttpError(409, 'Ya estás matriculado en este grupo.')));

    q('matricula-con-sesion')?.click();
    fixture.detectChanges();

    expect(component.estado()).toBe('CURSO');
    expect(q('matricula-mensaje')?.textContent).toContain('Ya estás matriculado en este grupo.');
    expect(q('matricula-con-sesion')).not.toBeNull();
  });

  it('matricularConSesion sin credencial en memoria no llama al backend', async () => {
    await crear({}, true);
    component.matricularConSesion();
    expect(servicio.matricularAutenticado).not.toHaveBeenCalled();
  });

  it('la confirmación del curso usa la misma estética de proyección (tarjeta de éxito con borde marcado)', async () => {
    await crear({ t: TOKEN });
    expect(q('matricula-curso-tarjeta')?.className).toContain('border-success-300');
    expect(q('matricula-curso-tarjeta')?.className).toContain('border-2');
  });

  it('reiniciar descarta la credencial y vuelve a pedir el PIN', async () => {
    await crear({ t: TOKEN });

    component.reiniciar();

    expect(component.estado()).toBe('PIN');
    component.registrar();
    expect(servicio.registrar).not.toHaveBeenCalled();
  });
});
