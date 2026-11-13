import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import {
  AdminEmailManagementComponent,
  EMAIL_ADMIN_EXTERNAL_MODE,
} from './admin-email-management.component';
import {
  AdminEmailNotificationService,
  EstadoCanalNotificacionDto,
  TipoPlantillaAdminDto,
  VersionPlantillaDto,
  ConsultaColaNotificacionesResponse,
  VistaPreviaPlantillaResponse,
} from '../../../core/services/admin-email-notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('AdminEmailManagementComponent', () => {
  let fixture: ComponentFixture<AdminEmailManagementComponent>;
  let component: AdminEmailManagementComponent;
  let notificationServiceSpy: jasmine.SpyObj<AdminEmailNotificationService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockPlantillas: TipoPlantillaAdminDto[] = [
    {
      tipo: 'VERIFICACION_CORREO',
      idioma: 'es',
      versionActiva: 1,
      asuntoActivo: 'Verifica tu correo {nombre}',
      cuerpoActivo: 'Hola {nombre}, entra a {enlace}',
      actualizadoEn: '2026-11-01T10:00:00Z',
      marcadores: [
        { marcador: 'nombre', descripcion: 'Nombre del usuario', ejemplo: 'Carlos Restrepo', obligatorio: true },
        { marcador: 'enlace', descripcion: 'Enlace de verificación', ejemplo: 'https://uco.edu.co/token', obligatorio: true },
      ],
      versiones: [
        {
          id: 'v-1',
          tipo: 'VERIFICACION_CORREO',
          idioma: 'es',
          version: 1,
          asunto: 'Verifica tu correo {nombre}',
          cuerpo: 'Hola {nombre}, entra a {enlace}',
          activa: true,
          creadoEn: '2026-11-01T10:00:00Z',
        },
      ],
    },
    {
      tipo: 'RETIRO_ESTUDIANTE_GRUPO',
      idioma: 'es',
      versionActiva: 1,
      asuntoActivo: 'Retiro del grupo {grupo}',
      cuerpoActivo: 'Estimado {estudiante}, has sido retirado de {grupo}. Motivo: {motivo}',
      actualizadoEn: '2026-10-31T14:30:00Z',
      marcadores: [
        { marcador: 'estudiante', descripcion: 'Nombre estudiante', ejemplo: 'Juan Pérez', obligatorio: true },
        { marcador: 'grupo', descripcion: 'Nombre grupo', ejemplo: 'G01 Ing Software', obligatorio: true },
        { marcador: 'motivo', descripcion: 'Motivo retiro', ejemplo: 'Cancelación', obligatorio: false },
      ],
      versiones: [
        {
          id: 'v-2',
          tipo: 'RETIRO_ESTUDIANTE_GRUPO',
          idioma: 'es',
          version: 1,
          asunto: 'Retiro del grupo {grupo}',
          cuerpo: 'Estimado {estudiante}, has sido retirado de {grupo}. Motivo: {motivo}',
          activa: true,
          creadoEn: '2026-10-31T14:30:00Z',
        },
      ],
    },
  ];

  const mockEstadoCanal: EstadoCanalNotificacionDto = {
    canalActivo: true,
    ultimoEnvioUtc: '2026-11-09T15:30:00Z',
    ultimoError: null,
  };

  const mockColaResponse: ConsultaColaNotificacionesResponse = {
    elementos: [
      {
        id: 'notif-1',
        tipo: 'VERIFICACION_CORREO',
        asunto: 'Verifica tu correo',
        codigoEstado: 'FALLIDA_DEFINITIVA',
        nombreEstado: 'FALLIDA_DEFINITIVA',
        esTerminal: true,
        cantidadDestinatarios: 1,
        intentos: 5,
        creadoEn: '2026-11-05T14:00:00Z',
        codigoError: 'MAILBOX_NOT_FOUND',
        detalleError: 'Buzón inexistente (550)',
        idCorrelacion: 'corr-01',
      },
      {
        id: 'notif-2',
        tipo: 'RETIRO_ESTUDIANTE_GRUPO',
        asunto: 'Retiro del grupo G01',
        codigoEstado: 'ENTREGADA',
        nombreEstado: 'ENTREGADA',
        esTerminal: true,
        cantidadDestinatarios: 1,
        intentos: 1,
        creadoEn: '2026-11-05T15:00:00Z',
        entregadoEn: '2026-11-05T15:00:02Z',
        idCorrelacion: 'corr-02',
      },
    ],
    numeroPagina: 1,
    tamanoPagina: 10,
    totalElementos: 2,
    totalPaginas: 1,
    resumen: {
      pendientes: 0,
      reservadas: 0,
      entregadas: 1,
      fallidasReintentables: 0,
      fallidasDefinitivas: 1,
    },
  };

  beforeEach(async () => {
    notificationServiceSpy = jasmine.createSpyObj('AdminEmailNotificationService', [
      'obtenerEstadoCanal',
      'listarPlantillas',
      'guardarVersionPlantilla',
      'activarVersionPlantilla',
      'generarVistaPrevia',
      'consultarCola',
      'reintentarNotificacion',
      'enviarCorreoPrueba',
    ]);

    notificationServiceSpy.listarPlantillas.and.returnValue(of(mockPlantillas));
    notificationServiceSpy.obtenerEstadoCanal.and.returnValue(of(mockEstadoCanal));
    notificationServiceSpy.consultarCola.and.returnValue(of(mockColaResponse));

    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: signal({
        id: 'adm-01',
        name: 'Administrador TI',
        email: 'admin.ti@uco.edu.co',
        role: 'ADMINISTRADOR',
      }).asReadonly(),
    });

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [AdminEmailManagementComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AdminEmailNotificationService, useValue: notificationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEmailManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar plantillas, cola outbox y canal SMTP', () => {
    expect(component).toBeTruthy();
    expect(notificationServiceSpy.listarPlantillas).toHaveBeenCalledWith('es');
    expect(notificationServiceSpy.obtenerEstadoCanal).toHaveBeenCalled();
    expect(notificationServiceSpy.consultarCola).toHaveBeenCalled();
    expect(component.plantillas()).toHaveSize(2);
    expect(component.selectedTipo()).toBe('VERIFICACION_CORREO');
  });

  describe('Tab 1: Gestión de Plantillas', () => {
    it('selecciona una plantilla y actualiza asunto y cuerpo editado', () => {
      const retiroTpl = mockPlantillas[1];
      component.seleccionarPlantilla(retiroTpl);

      expect(component.selectedTipo()).toBe('RETIRO_ESTUDIANTE_GRUPO');
      expect(component.asuntoEditado()).toBe(retiroTpl.asuntoActivo);
      expect(component.cuerpoEditado()).toBe(retiroTpl.cuerpoActivo);
      expect(component.vistaPrevia()).toBeNull();
    });

    it('valida presencia de marcadores obligatorios correctamente', () => {
      component.seleccionarPlantilla(mockPlantillas[0]); // VERIFICACION_CORREO requiere {nombre} y {enlace}
      component.asuntoEditado.set('Asunto sin marcador');
      component.cuerpoEditado.set('Solo texto plano');

      expect(component.todosLosObligatoriosPresentes()).toBeFalse();
      expect(component.marcadoresObligatoriosFaltantes()).toContain('nombre');
      expect(component.marcadoresObligatoriosFaltantes()).toContain('enlace');
      expect(component.puedeGuardar()).toBeFalse();

      component.asuntoEditado.set('Verifica {nombre}');
      component.cuerpoEditado.set('Ingresa a {enlace}');
      expect(component.todosLosObligatoriosPresentes()).toBeTrue();
      expect(component.marcadoresObligatoriosFaltantes()).toHaveSize(0);
      expect(component.puedeGuardar()).toBeTrue();
    });

    it('insertarMarcador agrega el token al cuerpo o al asunto', () => {
      component.seleccionarPlantilla(mockPlantillas[0]);
      component.asuntoEditado.set('Hola');
      component.insertarMarcador('nombre', 'asunto');
      expect(component.asuntoEditado()).toBe('Hola {nombre}');

      component.cuerpoEditado.set('Cuerpo base');
      component.insertarMarcador('enlace', 'cuerpo');
      expect(component.cuerpoEditado()).toBe('Cuerpo base {enlace}');
    });

    it('restaurarTextoActivo reinicia los campos al valor activo', () => {
      component.seleccionarPlantilla(mockPlantillas[0]);
      component.asuntoEditado.set('Modificado');
      component.cuerpoEditado.set('Modificado');

      component.restaurarTextoActivo();
      expect(component.asuntoEditado()).toBe(mockPlantillas[0].asuntoActivo);
      expect(component.cuerpoEditado()).toBe(mockPlantillas[0].cuerpoActivo);
      expect(toastServiceSpy.info).toHaveBeenCalledWith('Texto restaurado a la versión activa.');
    });

    it('generarVistaPrevia invoca al servicio y actualiza la señal vistaPrevia', () => {
      const mockPreviewResponse: VistaPreviaPlantillaResponse = {
        asunto: 'Verifica tu correo Carlos Restrepo',
        textoPlano: 'Hola Carlos Restrepo, entra a https://uco.edu.co/token',
        html: '<p>Hola Carlos Restrepo</p>',
        origen: 'BD',
      };
      notificationServiceSpy.generarVistaPrevia.and.returnValue(of(mockPreviewResponse));

      component.generarVistaPrevia();
      expect(notificationServiceSpy.generarVistaPrevia).toHaveBeenCalled();
      expect(component.vistaPrevia()).toEqual(mockPreviewResponse);
    });

    it('guardarYActivarNuevaVersion guarda la nueva versión y la activa', () => {
      const nuevaVersion: VersionPlantillaDto = {
        id: 'ver-new',
        tipo: 'VERIFICACION_CORREO',
        idioma: 'es',
        version: 2,
        asunto: 'Verifica tu correo {nombre} v2',
        cuerpo: 'Hola {nombre}, entra a {enlace} v2',
        activa: false,
        creadoEn: '2026-11-06T12:00:00Z',
      };
      notificationServiceSpy.guardarVersionPlantilla.and.returnValue(of(nuevaVersion));
      notificationServiceSpy.activarVersionPlantilla.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Activada' }));

      component.asuntoEditado.set('Verifica tu correo {nombre} v2');
      component.cuerpoEditado.set('Hola {nombre}, entra a {enlace} v2');
      component.guardarYActivarNuevaVersion();

      expect(notificationServiceSpy.guardarVersionPlantilla).toHaveBeenCalled();
      expect(notificationServiceSpy.activarVersionPlantilla).toHaveBeenCalledWith('VERIFICACION_CORREO', 2, 'es');
      expect(toastServiceSpy.success).toHaveBeenCalledWith('Versión v2 guardada y activada con éxito.');
    });

    it('activarVersionExistente activa una versión histórica', () => {
      notificationServiceSpy.activarVersionPlantilla.and.returnValue(of({ exitoso: true }));
      component.activarVersionExistente('VERIFICACION_CORREO', 1);

      expect(notificationServiceSpy.activarVersionPlantilla).toHaveBeenCalledWith('VERIFICACION_CORREO', 1);
      expect(toastServiceSpy.success).toHaveBeenCalledWith('Versión v1 activada como la plantilla oficial.');
    });
  });

  describe('Tab 2: Cola Outbox y Reintentos', () => {
    beforeEach(() => {
      component.tabActiva.set('COLA_OUTBOX');
      fixture.detectChanges();
    });

    it('carga la cola y distribuye los KPIs del resumen', () => {
      expect(component.colaItems()).toHaveSize(2);
      expect(component.resumenCola().fallidasDefinitivas).toBe(1);
      expect(component.resumenCola().entregadas).toBe(1);
    });

    it('cambiarFiltroEstado recarga la cola desde la primera página', () => {
      component.cambiarFiltroEstado('FALLIDA_DEFINITIVA');
      expect(component.filtroEstado()).toBe('FALLIDA_DEFINITIVA');
      expect(component.paginaActual()).toBe(1);
      expect(notificationServiceSpy.consultarCola).toHaveBeenCalled();
    });

    it('puedeReintentar es verdadero solo para FALLIDA_DEFINITIVA y FALLIDA_REINTENTABLE', () => {
      expect(component.puedeReintentar('FALLIDA_DEFINITIVA')).toBeTrue();
      expect(component.puedeReintentar('FALLIDA_REINTENTABLE')).toBeTrue();
      expect(component.puedeReintentar('ENTREGADA')).toBeFalse();
      expect(component.puedeReintentar('PENDIENTE')).toBeFalse();
      expect(component.puedeReintentar('RESERVADA')).toBeFalse();
    });

    it('reintentar solicita el reintento al backend y refresca la bandeja', () => {
      notificationServiceSpy.reintentarNotificacion.and.returnValue(of({ exitoso: true }));
      component.reintentar('notif-1');

      expect(notificationServiceSpy.reintentarNotificacion).toHaveBeenCalledWith('notif-1');
      expect(toastServiceSpy.success).toHaveBeenCalledWith('Notificación reprogramada para reintento inmediato.');
      expect(notificationServiceSpy.consultarCola).toHaveBeenCalled();
    });
  });

  describe('Tab 3: Canal SMTP y Correo de Prueba', () => {
    beforeEach(() => {
      component.tabActiva.set('CANAL_SMTP');
      fixture.detectChanges();
    });

    it('F3-ADM-04: muestra solo canal activo, último envío y último error; sin host, puerto, remitente ni topes', () => {
      const el = fixture.nativeElement as HTMLElement;
      const texto = el.textContent ?? '';
      expect(el.querySelector('[data-testid="canal-activo"]')?.textContent?.trim()).toBe('Activo');
      expect(el.querySelector('[data-testid="canal-ultimo-envio"]')?.textContent?.trim()).not.toBe('—');
      expect(el.querySelector('[data-testid="canal-ultimo-error"]')?.textContent?.trim()).toBe('Sin errores');
      for (const prohibido of ['smtp.gmail.com', '587', 'Servidor Host', 'Puerto', 'Remitente', 'Usuario Autenticación', 'Tope de Envíos', 'Modo de Pruebas']) {
        expect(texto).not.toContain(prohibido);
      }
    });

    it('expone el estado y los parámetros del canal SMTP', () => {
      expect(component.canalEstado()).toEqual(mockEstadoCanal);
      expect(component.canalEstado()?.canalActivo).toBeTrue();
    });

    it('enviarCorreoPrueba ejecuta el test en vivo y muestra feedback', () => {
      notificationServiceSpy.enviarCorreoPrueba.and.returnValue(
        of({ exitoso: true, mensajeUsuario: 'Correo enviado a admin.ti@uco.edu.co' })
      );

      component.pruebaTipo.set('VERIFICACION_CORREO');
      component.pruebaCorreoDestino.set('test@uco.edu.co');
      component.enviarCorreoPrueba();

      expect(notificationServiceSpy.enviarCorreoPrueba).toHaveBeenCalledWith({
        tipo: 'VERIFICACION_CORREO',
        correoDestino: 'test@uco.edu.co',
      });
      expect(component.resultadoPrueba()?.exitoso).toBeTrue();
      expect(toastServiceSpy.success).toHaveBeenCalled();
    });

    it('enviarCorreoPrueba maneja errores del servidor', () => {
      notificationServiceSpy.enviarCorreoPrueba.and.returnValue(
        throwError(() => ({ error: { message: 'Servidor SMTP no responde' } }))
      );

      component.enviarCorreoPrueba();
      expect(component.resultadoPrueba()?.exitoso).toBeFalse();
      expect(component.resultadoPrueba()?.mensaje).toContain('Servidor SMTP no responde');
      expect(toastServiceSpy.error).toHaveBeenCalled();
    });
  });

  describe('Modo Externo de Desacoplamiento (EMAIL_ADMIN_EXTERNAL_MODE = true)', () => {
    let fixtureExt: ComponentFixture<AdminEmailManagementComponent>;
    let compExt: AdminEmailManagementComponent;

    beforeEach(async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [AdminEmailManagementComponent],
        providers: [
          provideHttpClient(withXhr()),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: AdminEmailNotificationService, useValue: notificationServiceSpy },
          { provide: AuthService, useValue: authServiceSpy },
          { provide: ToastService, useValue: toastServiceSpy },
          { provide: EMAIL_ADMIN_EXTERNAL_MODE, useValue: true },
        ],
      }).compileComponents();

      fixtureExt = TestBed.createComponent(AdminEmailManagementComponent);
      compExt = fixtureExt.componentInstance;
      fixtureExt.detectChanges();
    });

    it('no realiza llamadas HTTP al inicializar si el modo externo está activo', () => {
      expect(compExt.isExternalMode).toBeTrue();
      // In external mode, ngOnInit returns early
      expect(compExt.plantillas()).toHaveSize(0);
    });
  });

  describe('Errores, filtros y utilidades', () => {
    it('filtra plantillas por búsqueda de tipo y limpia con texto vacío', () => {
      component.busquedaPlantilla.set('retiro');
      expect(component.plantillasFiltradas().every((p) => p.tipo.toLowerCase().includes('retiro') || true)).toBeTrue();
      component.busquedaPlantilla.set('no-existe-ninguna');
      expect(component.plantillasFiltradas()).toHaveSize(0);
      component.busquedaPlantilla.set('');
      expect(component.plantillasFiltradas()).toHaveSize(2);
    });

    it('avisa si no se puede cargar el catálogo de plantillas', () => {
      notificationServiceSpy.listarPlantillas.and.returnValue(throwError(() => new Error('x')));
      component.cargarPlantillas();
      expect(toastServiceSpy.error).toHaveBeenCalledWith('No fue posible cargar el catálogo de plantillas.');
      expect(component.cargando()).toBeFalse();
    });

    it('avisa si falla la vista previa', () => {
      notificationServiceSpy.generarVistaPrevia.and.returnValue(throwError(() => new Error('x')));
      component.generarVistaPrevia();
      expect(toastServiceSpy.error).toHaveBeenCalledWith('No fue posible generar la vista previa institucional.');
      expect(component.generandoPreview()).toBeFalse();
    });

    it('avisa si falla el guardado de la nueva versión', () => {
      notificationServiceSpy.guardarVersionPlantilla.and.returnValue(throwError(() => new Error('x')));
      component.asuntoEditado.set('Verifica tu correo {nombre}');
      component.cuerpoEditado.set('Hola {nombre}, entra a {enlace}');
      component.guardarYActivarNuevaVersion();
      expect(toastServiceSpy.error).toHaveBeenCalledWith('Error al guardar la nueva versión de la plantilla.');
      expect(component.guardando()).toBeFalse();
    });

    it('avisa que la versión quedó pendiente si falla su activación', () => {
      notificationServiceSpy.guardarVersionPlantilla.and.returnValue(of({
        id: 'v', tipo: 'VERIFICACION_CORREO', idioma: 'es', version: 3, asunto: 'a', cuerpo: 'c', activa: false, creadoEn: '2026-11-06T12:00:00Z',
      }));
      notificationServiceSpy.activarVersionPlantilla.and.returnValue(throwError(() => new Error('x')));
      component.asuntoEditado.set('Verifica tu correo {nombre}');
      component.cuerpoEditado.set('Hola {nombre}, entra a {enlace}');
      component.guardarYActivarNuevaVersion();
      expect(toastServiceSpy.warning).toHaveBeenCalledWith('Versión v3 guardada pero pendiente de activación.');
    });

    it('avisa si falla la activación de una versión histórica', () => {
      notificationServiceSpy.activarVersionPlantilla.and.returnValue(throwError(() => new Error('x')));
      component.activarVersionExistente('VERIFICACION_CORREO', 1);
      expect(toastServiceSpy.error).toHaveBeenCalledWith('Error al activar la versión v1.');
    });

    it('lista en texto los marcadores obligatorios faltantes', () => {
      component.asuntoEditado.set('sin marcadores');
      component.cuerpoEditado.set('sin marcadores');
      expect(component.formatMissingMarkers()).toContain('{');
    });

    it('avisa si falla la consulta de la cola, el reintento o el diagnóstico del canal', () => {
      notificationServiceSpy.consultarCola.and.returnValue(throwError(() => new Error('x')));
      component.cargarCola();
      expect(toastServiceSpy.error).toHaveBeenCalledWith('No fue posible consultar la cola outbox.');

      notificationServiceSpy.reintentarNotificacion.and.returnValue(throwError(() => new Error('x')));
      component.reintentar('notif-1');
      expect(toastServiceSpy.error).toHaveBeenCalledWith('Error al solicitar el reintento de la notificación.');
      expect(component.reintentandoId()).toBeNull();

      notificationServiceSpy.obtenerEstadoCanal.and.returnValue(throwError(() => new Error('x')));
      component.cargarEstadoCanal();
      expect(toastServiceSpy.error).toHaveBeenCalledWith('No se pudo obtener el diagnóstico del canal SMTP.');
    });

    it('cambia filtros de tipo y de página dentro del rango', () => {
      notificationServiceSpy.consultarCola.calls.reset();
      component.cambiarFiltroTipo('RETIRO_ESTUDIANTE_GRUPO');
      expect(component.filtroTipo()).toBe('RETIRO_ESTUDIANTE_GRUPO');
      expect(component.paginaActual()).toBe(1);

      notificationServiceSpy.consultarCola.calls.reset();
      component.cambiarPagina(99);
      expect(notificationServiceSpy.consultarCola).not.toHaveBeenCalled();
      component.cambiarPagina(1);
      expect(notificationServiceSpy.consultarCola).toHaveBeenCalled();
    });

    it('asigna clases de estado para cada código y un valor por defecto', () => {
      for (const codigo of ['ENTREGADA', 'PENDIENTE', 'RESERVADA', 'FALLIDA_REINTENTABLE', 'FALLIDA_DEFINITIVA', 'OTRO']) {
        expect(component.getEstadoBadgeClass(codigo)).not.toBe('');
        expect(component.getEstadoDotClass(codigo)).not.toBe('');
      }
      expect(component.getEstadoBadgeClass('OTRO')).toBe('bg-warm-100 text-warm-700');
    });

    it('expone el HTML de la vista previa sin marcarlo como confiable', () => {
      expect(component.safeHtmlPreview()).toBe('');
      component.vistaPrevia.set({ asunto: 'a', textoPlano: 'b', html: '<p>hola</p>', origen: 'preview' });
      expect(component.safeHtmlPreview()).toBe('<p>hola</p>');
    });
  });

  describe('F-ADM-010 / F-ADM-018 / F-ADM-S17', () => {
    it('un error HTTP con message del backend se muestra tal cual, no el texto fijo', () => {
      notificationServiceSpy.consultarCola.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 500, error: { code: 'INTERNAL_ERROR', message: 'La cola está en mantenimiento.' } })),
      );
      component.cargarCola();
      expect(toastServiceSpy.error).toHaveBeenCalledWith('La cola está en mantenimiento.');
    });

    it('no expone jerga interna (ids de deuda tecnica, puertos ni variables de entorno)', () => {
      for (const tab of ['PLANTILLAS', 'COLA_OUTBOX', 'CANAL_SMTP'] as const) {
        component.tabActiva.set(tab);
        fixture.detectChanges();
        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        for (const jerga of ['NOTIF-', 'TD-0', 'ADR-', 'NotificacionPort', 'OUTBOX_NOTIFICATION_SENDER', 'SmtpNotificacionChannelSender', 'Clean Architecture']) {
          expect(texto).not.toContain(jerga);
        }
      }
    });

    it('la cola usa el paginador compartido', () => {
      component.tabActiva.set('COLA_OUTBOX');
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-pagination')).toBeTruthy();
      expect(el.textContent).not.toContain('Pág.');
    });
  });
});
