import { SessionTimeZoneService } from './session-timezone.service';

function simulateBrowserZone(zone: string | undefined): jasmine.Spy {
  const original = Intl.DateTimeFormat.prototype.resolvedOptions;
  return spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').and.callFake(function (
    this: Intl.DateTimeFormat
  ) {
    return { ...original.call(this), timeZone: zone } as Intl.ResolvedDateTimeFormatOptions;
  });
}

describe('SessionTimeZoneService', () => {
  let service: SessionTimeZoneService;

  beforeEach(() => {
    localStorage.removeItem('asistenciasuco.session-timezone');
    service = new SessionTimeZoneService();
  });

  afterEach(() => {
    localStorage.removeItem('asistenciasuco.session-timezone');
  });

  it('recalcula la presentación del mismo instante al cambiar de zona', () => {
    service.setManualTimeZone('America/Bogota');
    expect(service.displayInstant('2026-07-16T01:00:00Z')).toEqual({ date: '2026-07-15', time: '20:00' });

    service.setManualTimeZone('Europe/Berlin');
    expect(service.displayInstant('2026-07-16T01:00:00Z')).toEqual({ date: '2026-07-16', time: '03:00' });
  });

  it('persiste una zona manual y permite regresar a detección automática', () => {
    service.setManualTimeZone('Europe/Berlin');
    expect(service.mode()).toBe('manual');
    expect(service.zone()).toBe('Europe/Berlin');
    expect(localStorage.getItem('asistenciasuco.session-timezone')).toBe('Europe/Berlin');

    service.setAutomatic();
    expect(service.mode()).toBe('auto');
    expect(localStorage.getItem('asistenciasuco.session-timezone')).toBe('auto');
  });

  it('restaura la preferencia manual al reconstruir el servicio', () => {
    service.setManualTimeZone('Europe/Berlin');

    const reloaded = new SessionTimeZoneService();

    expect(reloaded.mode()).toBe('manual');
    expect(reloaded.zone()).toBe('Europe/Berlin');
  });

  it('APP-04: sin preferencia usa la zona del navegador en modo automático', () => {
    simulateBrowserZone('Europe/London');
    const fresh = new SessionTimeZoneService();

    expect(fresh.mode()).toBe('auto');
    expect(fresh.zone()).toBe('Europe/London');
    expect(fresh.zoneSource()).toBe('browser');
    expect(localStorage.getItem('asistenciasuco.session-timezone')).toBeNull();
  });

  it('APP-04 CASO 5: al volver a la pestaña recalcula la zona automática sin cambiar el instante', () => {
    const spy = simulateBrowserZone('America/Bogota');
    const fresh = new SessionTimeZoneService();
    const instant = '2026-11-03T15:00:00Z';
    expect(fresh.presentTemporal(instant)?.time).toBe('10:00');

    spy.and.callFake(function (this: Intl.DateTimeFormat) {
      return { locale: 'es-CO', timeZone: 'Europe/Berlin' } as Intl.ResolvedDateTimeFormatOptions;
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(fresh.zone()).toBe('Europe/Berlin');
    expect(fresh.presentTemporal(instant)).toEqual(
      jasmine.objectContaining({ time: '16:00', utc: '2026-11-03T15:00:00Z' })
    );
    fresh.ngOnDestroy();
  });

  it('APP-04: una preferencia manual no se pisa al recalcular la zona del navegador', () => {
    service.setManualTimeZone('Europe/Berlin');
    simulateBrowserZone('America/Bogota');

    window.dispatchEvent(new Event('focus'));

    expect(service.zone()).toBe('Europe/Berlin');
    expect(service.zoneSource()).toBe('manual');
  });

  it('APP-04: si el navegador no informa zona usa UTC y lo declara como respaldo', () => {
    simulateBrowserZone(undefined);
    const fresh = new SessionTimeZoneService();

    expect(fresh.zone()).toBe('UTC');
    expect(fresh.zoneSource()).toBe('fallback');
    expect(fresh.zoneLabel()).toContain('UTC');
    expect(fresh.zoneLabel()).toContain('respaldo');
  });

  it('APP-04: la etiqueta identifica la zona automática y la manual', () => {
    simulateBrowserZone('America/Bogota');
    const fresh = new SessionTimeZoneService();
    expect(fresh.zoneLabel()).toContain('America/Bogota');
    expect(fresh.zoneLabel()).toContain('automática');

    fresh.setManualTimeZone('Europe/Berlin');
    expect(fresh.zoneLabel()).toContain('Europe/Berlin');
    expect(fresh.zoneLabel()).toContain('manual');
  });

  it('APP-04 CASO 2: el rango muestra la fecha del fin cuando cruza medianoche en la zona efectiva', () => {
    service.setManualTimeZone('America/Bogota');
    expect(service.formatTemporalRange('2026-07-16T01:00:00Z', '2026-07-16T03:00:00Z'))
      .toBe('15/07/2026 20:00 – 22:00');

    service.setManualTimeZone('Europe/Berlin');
    expect(service.formatTemporalRange('2026-07-15T20:00:00Z', '2026-07-15T23:00:00Z'))
      .toBe('15/07/2026 22:00 – 16/07/2026 01:00');
    expect(service.formatTemporal('no-es-fecha')).toBe('—');
    expect(service.formatTemporal('2026-07-16T01:00:00Z', 'date')).toBe('16/07/2026');
  });
});
