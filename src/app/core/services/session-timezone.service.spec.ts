import { SessionTimeZoneService } from './session-timezone.service';

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
});
