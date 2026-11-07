import { environment } from './environment';

describe('environment.features (CULM-001 B.1)', () => {
  it('B1-F-04 la cancelación de sesión (HU047) está habilitada', () => {
    expect(environment.features.sessionCancelEnabled).toBeTrue();
  });

  it('B1-F-04 la proyección QR sigue deshabilitada hasta el subpaquete B.2', () => {
    expect(environment.features.sessionQrEnabled).toBeFalse();
  });
});
