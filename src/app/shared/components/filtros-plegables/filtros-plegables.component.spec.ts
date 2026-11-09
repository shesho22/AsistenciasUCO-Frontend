import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiltrosPlegablesComponent } from './filtros-plegables.component';

@Component({
  standalone: true,
  imports: [FiltrosPlegablesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-filtros-plegables [activos]="activos()" [(abierto)]="abierto" etiqueta="Filtros">
      <input buscar data-testid="buscar" />
      <button data-testid="filtro-uno">Uno</button>
    </app-filtros-plegables>
  `,
})
class HostComponent {
  readonly activos = signal(0);
  readonly abierto = signal(false);
}

describe('FiltrosPlegablesComponent (CULM-001, filtros plegables)', () => {
  let fixture: ComponentFixture<HostComponent>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = (id: string): HTMLElement | null => root().querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('declara OnPush', () => {
    const meta = (FiltrosPlegablesComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(meta.onPush).toBeTrue();
  });

  it('la busqueda siempre esta visible y el resto de filtros plegado', () => {
    expect(q('buscar')).not.toBeNull();
    expect(q('filtros-panel')).toBeNull();
    expect(q('filtro-uno')).toBeNull();
    expect(q('filtros-toggle')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('el boton Filtros despliega y pliega el panel y sincroniza el modelo', () => {
    q('filtros-toggle')!.click();
    fixture.detectChanges();
    expect(q('filtro-uno')).not.toBeNull();
    expect(fixture.componentInstance.abierto()).toBeTrue();
    expect(q('filtros-toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect(q('filtros-toggle')?.getAttribute('aria-controls')).toBe(q('filtros-panel')?.id ?? '');
    q('filtros-toggle')!.click();
    fixture.detectChanges();
    expect(q('filtro-uno')).toBeNull();
    expect(fixture.componentInstance.abierto()).toBeFalse();
  });

  it('muestra cuantos filtros estan activos solo si hay alguno', () => {
    expect(q('filtros-activos')).toBeNull();
    fixture.componentInstance.activos.set(2);
    fixture.detectChanges();
    expect(q('filtros-activos')?.textContent?.trim()).toBe('2');
    expect(q('filtros-toggle')?.getAttribute('aria-label')).toBe('Filtros, 2 activos');
  });

  it('sin filtros activos el nombre accesible es solo la etiqueta', () => {
    expect(q('filtros-toggle')?.getAttribute('aria-label')).toBe('Filtros');
  });
});
