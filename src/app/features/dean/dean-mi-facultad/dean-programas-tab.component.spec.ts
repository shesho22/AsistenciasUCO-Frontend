import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DeanProgramasTabComponent } from './dean-programas-tab.component';
import { environment } from '../../../../environments/environment';

const api = environment.apiUrl;

describe('DeanProgramasTabComponent (CULM-001: Mi facultad / Programas)', () => {
  it('compone la cabecera de la facultad, el árbol de programas con planes y la gestión de programas, sin títulos repetidos', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasTabComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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
    expect(el.querySelectorAll('[aria-label="Cifras de la facultad"] li').length).toBe(3);
    expect(el.textContent).toContain('Plan 20241 · 10 semestres');
    expect(el.querySelector('a[href="/app/decano/programas/pl-1"]')).not.toBeNull();
    expect(el.querySelector('h1')).toBeNull();
    expect(el.textContent).not.toContain('Resumen de Facultad');
  });
});
