import { environment } from './environment';

describe('environment.features (CULM-001 B.1)', () => {
  it('B1-F-04 la cancelación de sesión (HU047) está habilitada', () => {
    expect(environment.features.sessionCancelEnabled).toBeTrue();
  });

  it('B2-F-04 la proyección QR (HU175) está habilitada con el contrato de B.2', () => {
    expect(environment.features.sessionQrEnabled).toBeTrue();
  });
});
