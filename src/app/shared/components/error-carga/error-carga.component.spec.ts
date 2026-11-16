import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorCargaComponent } from './error-carga.component';
import { LoadErrorKind, loadErrorState } from '../../../core/api/errors/load-error.util';

describe('ErrorCargaComponent', () => {
  let fixture: ComponentFixture<ErrorCargaComponent>;
  let component: ErrorCargaComponent;

  function crear(kind: LoadErrorKind): HTMLElement {
    fixture = TestBed.createComponent(ErrorCargaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('error', loadErrorState(kind));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const boton = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? ''));

  beforeEach(() => TestBed.configureTestingModule({ imports: [ErrorCargaComponent] }));

  it('se anuncia como alerta con el titulo y el mensaje del error', () => {
    const el = crear('RED');
    const alerta = el.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('Sin conexión con el servidor');
    expect(alerta?.textContent).toContain('No fue posible conectar con el servidor');
  });

  it('ofrece Reintentar ante fallos de red, de servidor y de validacion, y lo emite', () => {
    for (const kind of ['RED', 'SERVIDOR', 'VALIDACION'] as LoadErrorKind[]) {
      const el = crear(kind);
      let emitido = false;
      component.reintentar.subscribe(() => (emitido = true));
      boton(el)?.click();
      expect(emitido).withContext(kind).toBeTrue();
    }
  });

  it('no ofrece Reintentar ante autorizacion denegada, identificador invalido ni funcionalidad no implementada', () => {
    expect(boton(crear('AUTORIZACION'))).toBeUndefined();
    expect(boton(crear('IDENTIFICADOR'))).toBeUndefined();
    expect(boton(crear('NO_IMPLEMENTADO'))).toBeUndefined();
  });

  describe('HU178: rol sin ámbito', () => {
    function crearSinAmbito(estado: ReturnType<typeof loadErrorState>): HTMLElement {
      fixture = TestBed.createComponent(ErrorCargaComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('error', estado);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('muestra el aviso informativo del rol, sin alerta roja ni Reintentar', () => {
      const el = crearSinAmbito({ ...loadErrorState('SIN_AMBITO'), rolSinAmbito: 'COORDINADOR' });

      expect(el.querySelector('[data-testid="coordinador-sin-programa"]')).not.toBeNull();
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
      expect(boton(el)).toBeUndefined();
    });

    it('sin rol conocido muestra un estado neutro informativo, no una alerta', () => {
      const el = crearSinAmbito(loadErrorState('SIN_AMBITO'));

      expect(el.querySelector('[role="status"]')).not.toBeNull();
      expect(el.querySelector('[role="alert"]')).toBeNull();
      expect(boton(el)).toBeUndefined();
    });
  });
});
