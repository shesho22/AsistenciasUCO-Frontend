import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificacionSalienteAdminDto } from '../../../core/services/admin-email-notification.service';
import { AdminEmailColaTablaComponent } from './admin-email-cola-tabla.component';

describe('AdminEmailColaTablaComponent', () => {
  let fixture: ComponentFixture<AdminEmailColaTablaComponent>;

  const base: NotificacionSalienteAdminDto = {
    id: 'abcdef12-0000-0000-0000-000000000001',
    tipo: 'VERIFICACION_CORREO',
    asunto: 'Verifica',
    codigoEstado: 'FALLIDA_DEFINITIVA',
    nombreEstado: 'Fallida',
    esTerminal: true,
    cantidadDestinatarios: 2,
    intentos: 5,
    creadoEn: '2026-11-05T14:10:00Z',
    codigoError: 'E1',
    detalleError: 'Buzón inexistente',
    idCorrelacion: 'corr-1',
    aplicacion: 'AsistenciasUCO',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminEmailColaTablaComponent] }).compileComponents();
    fixture = TestBed.createComponent(AdminEmailColaTablaComponent);
  });

  const el = () => fixture.nativeElement as HTMLElement;

  it('usa tabla-scroll con encabezado fijo y tabla-tarjetas con rótulos por celda', () => {
    fixture.componentRef.setInput('items', [base]);
    fixture.detectChanges();
    const tabla = el().querySelector('table') as HTMLElement;
    expect(tabla.classList).toContain('tabla-tarjetas');
    expect(tabla.closest('.tabla-scroll')).toBeTruthy();
    expect(el().querySelector('thead th')?.getAttribute('scope')).toBe('col');
    const rotulos = Array.from(el().querySelectorAll('tbody td')).map((td) => td.getAttribute('data-label'));
    expect(rotulos).toEqual([
      'Tipo / Evento', 'Aplicación de origen', 'Asunto', 'Destinatarios', 'Estado', 'Intentos', 'Fecha Creación', 'Error / Detalle', 'Acción',
    ]);
  });

  it('muestra la aplicación de origen o un guion si el servicio no la informa', () => {
    fixture.componentRef.setInput('items', [base, { ...base, id: 'otro-0000-0000', aplicacion: null }]);
    fixture.detectChanges();
    const celdas = Array.from(el().querySelectorAll('[data-testid="cola-aplicacion"]')).map((c) => c.textContent?.trim());
    expect(celdas).toEqual(['AsistenciasUCO', '—']);
  });

  it('emite el id al reintentar solo en los correos fallidos y deshabilita el que se está reintentando', () => {
    const entregada = { ...base, id: 'entregada-0000', codigoEstado: 'ENTREGADA', detalleError: null, codigoError: null, entregadoEn: '2026-11-05T14:10:02Z' };
    fixture.componentRef.setInput('items', [base, entregada]);
    fixture.detectChanges();
    const ids: string[] = [];
    fixture.componentInstance.reintentar.subscribe((id) => ids.push(id));
    const botones = el().querySelectorAll('tbody button');
    expect(botones.length).toBe(1);
    (botones[0] as HTMLButtonElement).click();
    expect(ids).toEqual([base.id]);
    expect(el().textContent).toContain('Entregado:');

    fixture.componentRef.setInput('reintentandoId', base.id);
    fixture.detectChanges();
    expect((el().querySelector('tbody button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('muestra el mensaje vacío sin correos', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();
    expect(el().textContent).toContain('No se encontraron notificaciones');
  });
});
