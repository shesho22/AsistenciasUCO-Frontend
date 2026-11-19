import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DeanProgramasTabComponent } from './dean-programas-tab.component';
import { environment } from '../../../../environments/environment';

const api = environment.apiUrl;

describe('DeanProgramasTabComponent (CULM-001: Mi facultad / Programas)', () => {
  it('compone la cabecera de la facultad, el árbol de programas con planes y la gestión de programas, sin títulos repetidos', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasTabComponent],
      providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasTabComponent);
    fixture.detectChanges();

    const estructura = [
      {
        id: 'f-1', nombre: 'Facultad de Ingeniería', nombreDecano: 'Decana Uno', activa: true,
        programas: [{ id: 'p-1', nombre: 'Ingeniería de Sistemas', nombreCoordinador: null, activo: true, planes: [{ id: 'pl-1', inp: 20241, activo: true, totalSemestres: 10 }] }],
      },
    ];
    for (const r of http.match((x) => x.url === `${api}/decano/estructura`)) r.flush({ exitoso: true, datos: estructura, total: 1 });
    for (const r of http.match((x) => x.url === `${api}/decano/grupos`)) r.flush({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 100, totalElementos: 0, totalPaginas: 0 });
    for (const r of http.match((x) => x.url === `${api}/admin/areas`)) r.flush({ exitoso: true, datos: [] });
    for (const r of http.match((x) => x.url === `${api}/coordinador/periodos-academicos`)) r.flush({ exitoso: true, datos: [] });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="cabecera-facultad"]')?.textContent).toContain('Facultad de Ingeniería');
    expect(el.querySelectorAll('[aria-label="Cifras de la facultad"] li')).toHaveSize(3);
    expect(el.textContent).toContain('Plan 20241 · 10 semestres');
    expect(el.querySelector('a[href="/app/decano/programas/pl-1"]')).not.toBeNull();
    expect(el.querySelector('h1')).toBeNull();
    expect(el.textContent).not.toContain('Resumen de Facultad');
  });

  it('MEJORAS-SERGIO 3: separa estructura, gestión y créditos en subpestañas (una sección visible a la vez)', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasTabComponent],
      providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasTabComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const pestanas = Array.from(el.querySelectorAll('[role="tab"]')).map((b) => b.textContent?.trim());
    expect(pestanas).toEqual(['Estructura y planes', 'Gestión de programas', 'Créditos por programa']);
    expect(el.querySelector('app-dean-estructura')).not.toBeNull();
    expect(el.querySelector('app-dean-programas-gestion')).toBeNull();
    expect(el.querySelector('app-dean-programas-creditos')).toBeNull();

    const oculta = (id: string) => (el.querySelector(`[data-testid="seccion-${id}"]`) as HTMLElement | null)?.hidden;

    (el.querySelector('[data-testid="subpestana-gestion"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    // La estructura ya visitada sigue montada pero oculta: no se destruye su estado.
    expect(oculta('estructura')).toBeTrue();
    expect(oculta('gestion')).toBeFalse();
    expect(el.querySelector('app-dean-programas-gestion')).not.toBeNull();
    expect(el.querySelector('app-dean-programas-creditos')).toBeNull();
    expect(el.querySelector('[data-testid="subpestana-gestion"]')?.getAttribute('aria-selected')).toBe('true');

    (el.querySelector('[data-testid="subpestana-creditos"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('app-dean-programas-creditos')).not.toBeNull();
    expect(oculta('creditos')).toBeFalse();
    expect(oculta('gestion')).toBeTrue();
    expect(oculta('estructura')).toBeTrue();
    // Las peticiones de cada sección no se verifican aquí: se descartan.
    http.match(() => true).forEach((r) => r.flush({ exitoso: true, datos: [], elementos: [], total: 0 }));
  });

  it('MEJORAS-SERGIO 3: volver a «Gestión de programas» conserva la MISMA instancia (filtros y formulario abiertos)', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasTabComponent],
      providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasTabComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const ir = (id: string) => {
      (el.querySelector(`[data-testid="subpestana-${id}"]`) as HTMLButtonElement).click();
      fixture.detectChanges();
    };

    ir('gestion');
    const gestion = el.querySelector('app-dean-programas-gestion');
    expect(gestion).not.toBeNull();
    const peticionesAlEntrar = http.match(() => true);
    peticionesAlEntrar.forEach((r) => r.flush({ exitoso: true, datos: [], elementos: [], total: 0 }));

    ir('estructura');
    ir('gestion');
    expect(el.querySelector('app-dean-programas-gestion')).toBe(gestion);
    // Volver a la sección no la recarga desde cero.
    expect(http.match((r) => !r.url.includes('/decano/estructura')).length).toBe(0);
    http.match(() => true).forEach((r) => r.flush({ exitoso: true, datos: [], elementos: [], total: 0 }));
  });
});
