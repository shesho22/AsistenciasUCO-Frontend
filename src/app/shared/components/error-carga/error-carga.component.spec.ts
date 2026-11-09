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
});
