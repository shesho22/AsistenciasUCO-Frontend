import { environment } from './environment';

describe('environment.features (CULM-001 B.1)', () => {
  it('B1-F-04 la cancelación de sesión (HU047) está habilitada', () => {
    expect(environment.features.sessionCancelEnabled).toBeTrue();
  });

  it('B2-F-04 la proyección QR (HU175) está habilitada con el contrato de B.2', () => {
    expect(environment.features.sessionQrEnabled).toBeTrue();
  });

  it('F-ADM-016: useFrontendMocks ignora localStorage y no usa localStorage como fuente de verdad', () => {
    localStorage.setItem('USE_MOCKS', 'true');
    (window as any)['env'] = { USE_MOCKS: 'false' };
    expect(environment.useFrontendMocks).toBeFalse();
    localStorage.removeItem('USE_MOCKS');
  });

  it('F-ADM-016: las banderas muertas (sessionsEnabled, attendanceEnabled) fueron retiradas', () => {
    const features = environment.features as any;
    expect(features.sessionsEnabled).toBeUndefined();
    expect(features.attendanceEnabled).toBeUndefined();
    expect(features.teacherClaimsEnabled).toBeUndefined();
  });
});
