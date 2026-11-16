import { TestBed } from '@angular/core/testing';
import { SinEntidadAsignadaComponent } from './sin-entidad-asignada.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { RolSinAmbito } from '../../../core/api/errors/sin-ambito.util';

/** HU178: aviso informativo (no un error) para el decano sin facultad, el coordinador sin programa y el administrador sin institución. */
describe('HU178: SinEntidadAsignadaComponent', () => {
  function crear(rol: RolSinAmbito): HTMLElement {
    const fixture = TestBed.createComponent(SinEntidadAsignadaComponent);
    fixture.componentRef.setInput('rol', rol);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('al decano le muestra el aviso de facultad con el texto del catálogo de la interfaz', () => {
    const el = crear('DECANO');
    const texto = el.textContent ?? '';

    expect(texto).toContain(mensajeUi('UI_DEAN_SIN_FACULTAD_001'));
    expect(texto).toContain(mensajeUi('UI_DEAN_SIN_FACULTAD_002'));
    expect(mensajeUi('UI_DEAN_SIN_FACULTAD_001')).toContain('Aún no tiene una facultad asignada');
    expect(mensajeUi('UI_DEAN_SIN_FACULTAD_002')).toContain('administrador');
    expect(el.querySelector('[data-testid="decano-sin-facultad"]')).not.toBeNull();
  });

  it('al coordinador le muestra el aviso de programa, que remite al decano', () => {
    const el = crear('COORDINADOR');
    const texto = el.textContent ?? '';

    expect(texto).toContain(mensajeUi('UI_COORDINATOR_SIN_PROGRAMA_001'));
    expect(texto).toContain(mensajeUi('UI_COORDINATOR_SIN_PROGRAMA_002'));
    expect(mensajeUi('UI_COORDINATOR_SIN_PROGRAMA_001')).toContain('Aún no tiene un programa asignado');
    expect(mensajeUi('UI_COORDINATOR_SIN_PROGRAMA_002')).toContain('decano de su facultad');
    expect(texto).not.toContain(mensajeUi('UI_DEAN_SIN_FACULTAD_001'));
    expect(el.querySelector('[data-testid="coordinador-sin-programa"]')).not.toBeNull();
  });

  it('al administrador le muestra el aviso de institución', () => {
    const el = crear('ADMINISTRADOR');
    const texto = el.textContent ?? '';

    expect(texto).toContain(mensajeUi('UI_ADMIN_SIN_INSTITUCION_001'));
    expect(texto).toContain(mensajeUi('UI_ADMIN_SIN_INSTITUCION_002'));
    expect(mensajeUi('UI_ADMIN_SIN_INSTITUCION_001')).toContain('Aún no tiene una institución asignada');
    expect(el.querySelector('[data-testid="administrador-sin-institucion"]')).not.toBeNull();
  });

  for (const rol of ['DECANO', 'COORDINADOR', 'ADMINISTRADOR'] as const) {
    it(`para ${rol} es un aviso de estado, no una alerta de error`, () => {
      const el = crear(rol);

      expect(el.querySelector('[role="status"]')).not.toBeNull();
      expect(el.querySelector('[role="alert"]')).toBeNull();
    });
  }

  it('usa detección de cambios OnPush', () => {
    const def = (SinEntidadAsignadaComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(def.onPush).toBeTrue();
  });
});
