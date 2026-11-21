import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { AdminCatalogosSistemaComponent, CATALOGOS_SISTEMA, filasDeEstados } from './admin-catalogos-sistema.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { AdminCatalogosService } from '../../../core/services/admin-catalogos.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { TipoProgramaItem } from '../../../core/models/role-management.model';
import { EstadoSistemaItem } from '../../../core/models/consultas-transversales.model';

describe('AdminCatalogosSistemaComponent (vista única, solo consulta)', () => {
  const tiposPrograma: TipoProgramaItem[] = [
    { id: 'tp-1', codigo: 'PRE', nombre: 'pregrado', activo: true },
    { id: 'tp-2', codigo: 'POS', nombre: 'postgrado', activo: false },
  ];
  const estados: EstadoSistemaItem[] = [
    { catalogo: 'SOLICITUD', id: 'e-1', codigo: 'P', nombre: 'pendiente' },
    { catalogo: 'ESTUDIANTE_GRUPO', id: 'g-1', codigo: 'CI', nombre: 'cancelado por inasistencia' },
    { catalogo: 'ESTUDIANTE_GRUPO', id: 'g-2', codigo: 'AC', nombre: 'activo en el grupo' },
  ];

  let toast: jasmine.SpyObj<ToastService>;
  let admin: jasmine.SpyObj<AdminManagementService>;
  let catalogos: jasmine.SpyObj<AdminCatalogosService>;
  let catalog: jasmine.SpyObj<CatalogService>;
  let consultas: jasmine.SpyObj<ConsultasTransversalesService>;

  beforeEach(() => {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    admin = Object.assign(jasmine.createSpyObj('AdminManagementService', ['cargarTiposPrograma']), {
      tiposPrograma: signal<TipoProgramaItem[]>(tiposPrograma).asReadonly(),
    });
    admin.cargarTiposPrograma.and.returnValue(of({ exitoso: true, datos: tiposPrograma }));
    catalogos = jasmine.createSpyObj('AdminCatalogosService', ['listarCategorias', 'listarMotivos']);
    catalogos.listarCategorias.and.returnValue(
      of({
        exitoso: true,
        total: 2,
        datos: [
          { id: 'c-1', codigo: 'MED', nombre: 'Incapacidad médica', descripcion: 'Expedida por salud', requiereSoporte: true, estaActivo: true },
          { id: 'c-2', codigo: 'CAL', nombre: 'Calamidad', descripcion: null, requiereSoporte: false, estaActivo: false },
        ],
      })
    );
    catalogos.listarMotivos.and.returnValue(
      of({ exitoso: true, total: 1, datos: [{ id: 'm-1', codigo: 'FUERZA_MAYOR', nombre: 'Fuerza mayor', orden: 7, estaActivo: true }] })
    );
    catalog = jasmine.createSpyObj('CatalogService', ['getIdentityDocumentTypes']);
    catalog.getIdentityDocumentTypes.and.returnValue(of([{ id: 'ti-1', tipoIdentificacion: 'CC', nombre: 'Cédula de ciudadanía' }]));
    consultas = jasmine.createSpyObj('ConsultasTransversalesService', ['getEstadosSistema']);
    consultas.getEstadosSistema.and.returnValue(of({ exitoso: true, datos: estados }));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'catalogos', component: AdminCatalogosSistemaComponent }]),
        { provide: ToastService, useValue: toast },
        { provide: AdminManagementService, useValue: admin },
        { provide: AdminCatalogosService, useValue: catalogos },
        { provide: CatalogService, useValue: catalog },
        { provide: ConsultasTransversalesService, useValue: consultas },
      ],
    });
  });

  async function abrir(url = '/catalogos') {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, AdminCatalogosSistemaComponent);
    harness.detectChanges();
    return { harness, el: harness.routeNativeElement as HTMLElement };
  }

  const celdas = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody td')).map((td) => td.textContent?.trim());
  const cabeceras = (el: HTMLElement) => Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim());

  it('muestra una sola tarjeta con el encabezado, un chip por catálogo con su cantidad y una sola tabla', async () => {
    const { el } = await abrir();
    expect(el.textContent).toContain('Catálogos predefinidos del sistema (solo consulta)');
    expect(el.querySelectorAll('table')).toHaveSize(1);
    const chips = el.querySelectorAll('[data-testid="selector-catalogos"] button');
    expect(chips).toHaveSize(CATALOGOS_SISTEMA.length);
    expect(el.querySelector('[data-catalogo="tipos-programa"]')?.textContent).toContain('2');
    expect(el.querySelector('[data-catalogo="estados-estudiante-grupo"]')?.textContent).toContain('2');
    expect(el.querySelector('[data-catalogo="motivos-cancelacion"]')?.textContent).toContain('1');
  });

  it('sin parámetro muestra tipos de programa, con columna de estado', async () => {
    const { el } = await abrir();
    expect(el.querySelector('[data-catalogo="tipos-programa"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(cabeceras(el)).toEqual(['Código', 'Nombre', 'Estado']);
    expect(el.textContent).toContain('postgrado');
    expect(el.textContent).toContain('Inactivo');
  });

  it('el selector cambia la tabla, adapta las columnas y deja el catálogo en la URL', async () => {
    const { harness, el } = await abrir();
    const router = TestBed.inject(Router);

    (el.querySelector('[data-catalogo="categorias-justificacion"]') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/catalogos?catalogo=categorias-justificacion');
    expect(cabeceras(el)).toEqual(['Código', 'Nombre', 'Descripción', 'Requiere soporte', 'Estado']);
    expect(celdas(el)).toContain('Expedida por salud');
    expect(celdas(el)).toContain('—');
    expect(celdas(el)).toContain('Sí');

    (el.querySelector('[data-catalogo="motivos-cancelacion"]') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(cabeceras(el)).toEqual(['Código', 'Nombre', 'Orden', 'Estado']);
    expect(celdas(el)).toContain('FUERZA_MAYOR');
    expect(celdas(el)).toContain('7');
    expect(el.textContent).not.toContain('Expedida por salud');

    (el.querySelector('[data-catalogo="tipos-identificacion"]') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(cabeceras(el)).toEqual(['Código', 'Nombre']);
    expect(celdas(el)).toContain('CC');
  });

  it('?catalogo= preselecciona el catálogo al abrir (sobrevive a la recarga)', async () => {
    const { el } = await abrir('/catalogos?catalogo=estados-estudiante-grupo');
    expect(el.querySelector('[data-catalogo="estados-estudiante-grupo"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(cabeceras(el)).toEqual(['Código', 'Nombre']);
    expect(celdas(el)).toContain('cancelado por inasistencia');
    expect(celdas(el)).not.toContain('pendiente');
  });

  it('un valor desconocido de ?catalogo= cae en tipos de programa', async () => {
    const { el } = await abrir('/catalogos?catalogo=inexistente');
    expect(el.querySelector('[data-catalogo="tipos-programa"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('los estados de reclamos se muestran sin columna de estado activo', async () => {
    const { el } = await abrir('/catalogos?catalogo=estados-reclamo');
    expect(celdas(el)).toEqual(['P', 'pendiente']);
    expect(el.textContent).not.toContain('Inactivo');
  });

  it('no muestra botones de escritura: solo los chips del selector', async () => {
    const { el } = await abrir('/catalogos?catalogo=categorias-justificacion');
    expect(el.querySelectorAll('button')).toHaveSize(CATALOGOS_SISTEMA.length);
    expect(el.textContent).not.toMatch(/Nueva|Nuevo|Editar|Desactivar|Activar|Crear/);
    expect(el.querySelector('input, textarea, select, dialog')).toBeNull();
  });

  it('la tabla usa tabla-tarjetas y su contenedor hace scroll propio (móvil sin scroll de página)', async () => {
    const { el } = await abrir();
    expect(el.querySelector('table')?.classList).toContain('tabla-tarjetas');
    expect(el.querySelector('[data-testid="catalogo-contenido"]')?.className).toContain('overflow-x-auto');
    expect(el.querySelector('tbody td')?.getAttribute('data-label')).toBe('Código');
  });

  it('mientras carga no afirma que el catálogo está vacío', async () => {
    const pendiente = new Subject<{ exitoso: boolean; datos: EstadoSistemaItem[] }>();
    consultas.getEstadosSistema.and.returnValue(pendiente);
    const { harness, el } = await abrir('/catalogos?catalogo=estados-reclamo');
    expect(el.textContent).toContain('Cargando…');
    expect(el.textContent).not.toContain('No hay estados de solicitud registrados.');
    pendiente.next({ exitoso: true, datos: [] });
    harness.detectChanges();
    expect(el.textContent).toContain('No hay estados de solicitud registrados.');
  });

  it('si un catálogo falla avisa con el mensaje del backend y lo indica en la tabla sin afectar a los demás', async () => {
    catalogos.listarMotivos.and.returnValue(throwError(() => ({ error: { message: 'Sin permisos' } })));
    const { el } = await abrir('/catalogos?catalogo=motivos-cancelacion');
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('No se pudo cargar el catálogo.');
    expect(el.querySelector('[data-catalogo="tipos-programa"]')?.textContent).toContain('2');
  });

  it('si fallan los estados avisa una sola vez y marca ambos catálogos', async () => {
    consultas.getEstadosSistema.and.returnValue(throwError(() => ({ error: { message: 'Sin permisos' } })));
    const { el } = await abrir('/catalogos?catalogo=estados-estudiante-grupo');
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('No se pudo cargar el catálogo.');
  });

  it('catálogos de la API sin datos se tratan como vacíos', async () => {
    catalogos.listarCategorias.and.returnValue(of({ exitoso: true, total: 0, datos: undefined as never }));
    consultas.getEstadosSistema.and.returnValue(of({ exitoso: true, datos: undefined as never }));
    const { el } = await abrir('/catalogos?catalogo=categorias-justificacion');
    expect(el.textContent).toContain('No hay categorías de justificación registradas.');
  });

  it('filasDeEstados separa las filas por catálogo', () => {
    expect(filasDeEstados(estados, 'SOLICITUD')).toEqual([{ id: 'e-1', codigo: 'P', nombre: 'pendiente' }]);
    expect(filasDeEstados(estados, 'ESTUDIANTE_GRUPO')).toHaveSize(2);
  });
});
