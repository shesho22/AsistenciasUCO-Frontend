import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TipoPlantillaAdminDto } from '../../../core/services/admin-email-notification.service';
import { AdminEmailCanalComponent } from './admin-email-canal.component';

describe('AdminEmailCanalComponent', () => {
  let fixture: ComponentFixture<AdminEmailCanalComponent>;

  const plantillas: TipoPlantillaAdminDto[] = [
    { tipo: 'A', descripcion: 'Descripción A', idioma: 'es', versionActiva: 1, asuntoActivo: '', cuerpoActivo: '', actualizadoEn: '', marcadores: [], versiones: [] },
    { tipo: 'B', idioma: 'es', versionActiva: 1, asuntoActivo: '', cuerpoActivo: '', actualizadoEn: '', marcadores: [], versiones: [] },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminEmailCanalComponent] }).compileComponents();
    fixture = TestBed.createComponent(AdminEmailCanalComponent);
    fixture.componentRef.setInput('plantillas', plantillas);
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const estado = () => el().querySelector('[data-testid="servicio-estado"]')?.textContent?.trim();

  it('titula la tarjeta como servicio de notificaciones y no menciona SMTP ni Gmail', () => {
    expect(el().querySelector('h3')?.textContent?.trim()).toBe('Servicio de notificaciones');
    expect(el().textContent).not.toMatch(/SMTP|Gmail/i);
  });

  it('muestra Operativo cuando el canal está activo e Inactivo si no lo está', () => {
    fixture.componentRef.setInput('estado', { canalActivo: true, ultimoEnvioUtc: '2026-11-09T15:30:00Z', ultimoError: null });
    fixture.detectChanges();
    expect(estado()).toBe('Operativo');
    fixture.componentRef.setInput('estado', { canalActivo: false, ultimoEnvioUtc: null, ultimoError: 'E1' });
    fixture.detectChanges();
    expect(estado()).toBe('Inactivo');
    expect(el().querySelector('[data-testid="canal-ultimo-error"]')?.textContent?.trim()).toBe('E1');
  });

  it('muestra el aviso del backend cuando el servicio no está disponible', () => {
    fixture.componentRef.setInput('servicioNoDisponible', 'Mensaje del backend');
    fixture.detectChanges();
    expect(estado()).toBe('Servicio no disponible');
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Mensaje del backend');
  });

  it('lista los tipos con su descripción o solo el código', () => {
    const opciones = Array.from((el().querySelector('#correo-prueba-tipo') as HTMLSelectElement).options).map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['A — Descripción A', 'B']);
  });

  it('emite el envío y muestra el resultado de la prueba', () => {
    let emitidos = 0;
    fixture.componentInstance.enviar.subscribe(() => emitidos++);
    const boton = Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Enviar Correo')) as HTMLButtonElement;
    boton.click();
    expect(emitidos).toBe(1);
    fixture.componentRef.setInput('resultado', { exitoso: false, mensaje: 'Falló' });
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Falló');
    expect(boton.disabled).toBeTrue();
  });
});
