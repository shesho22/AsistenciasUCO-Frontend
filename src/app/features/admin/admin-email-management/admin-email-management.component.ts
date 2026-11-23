import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  InjectionToken,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminEmailNotificationService,
  EstadoCanalNotificacionDto,
  NotificacionSalienteAdminDto,
  ResumenColaNotificacionDto,
  TipoPlantillaAdminDto,
  VistaPreviaPlantillaResponse,
} from '../../../core/services/admin-email-notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { getApiErrorCode, getBackendUserMessage } from '../../../core/api/errors/api-error.util';
import { AdminEmailPlantillaEditorComponent, DestinoMarcador } from './admin-email-plantilla-editor.component';
import { AdminEmailColaTablaComponent } from './admin-email-cola-tabla.component';
import { AdminEmailCanalComponent, ResultadoPruebaCorreo } from './admin-email-canal.component';
import { AdminEmailNoDisponibleComponent } from './admin-email-no-disponible.component';
import { etiquetaPlantilla } from './admin-email-formato.util';

/**
 * Token de desacoplamiento para delegar la consola de correos al micro-frontend
 * del equipo transversal de notificaciones cuando esté disponible.
 */
export const EMAIL_ADMIN_EXTERNAL_MODE = new InjectionToken<boolean>(
  'EMAIL_ADMIN_EXTERNAL_MODE',
  {
    providedIn: 'root',
    factory: () => false,
  }
);

/** Código con que el backend avisa que el servicio de notificaciones no responde (503). */
const CODIGO_SERVICIO_NO_DISPONIBLE = 'ERR_NOTIFICACIONES_NO_DISPONIBLE';

export type TabNotificaciones = 'PLANTILLAS' | 'COLA_OUTBOX' | 'CANAL_SERVICIO';

@Component({
    selector: 'app-admin-email-management',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
      FormsModule,
      PaginationComponent,
      AdminEmailPlantillaEditorComponent,
      AdminEmailColaTablaComponent,
      AdminEmailCanalComponent,
      AdminEmailNoDisponibleComponent,
    ],
    template: `
    <div class="space-y-4">
      <!-- ================= HEADER & BREADCRUMB ================= -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>Gobierno de TI & Comunicaciones</span>
            <span>/</span>
            <span class="text-primary-700">Correos y notificaciones</span>
          </div>
          <h2 class="text-2xl font-serif font-bold text-warm-900">Gestión de Correos y Notificaciones</h2>
          <p class="text-sm text-warm-600">
            Administración de las plantillas de correo, seguimiento de los envíos pendientes y diagnóstico del canal de correo institucional.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="recargarTodo()"
            [disabled]="cargando()"
            class="px-4 py-2 bg-white border border-warm-300 text-warm-700 rounded-xl text-xs font-bold hover:bg-warm-50 shadow-sm transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4" [class.animate-spin]="cargando()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <!-- ================= MODO EXTERNO (DESACOPLAMIENTO) ================= -->
      @if (isExternalMode) {
        <div class="rounded-2xl border border-primary-200 bg-primary-50/70 p-6 shadow-warm-sm">
          <div class="flex items-start gap-4">
            <div class="p-3 rounded-xl bg-primary-100 text-primary-800 shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-warm-900">Consola Externa de Notificaciones</h2>
              <p class="text-sm text-warm-700 mt-1 leading-relaxed">
                El canal y las plantillas de correo se gestionan de forma externa en el servicio institucional de notificaciones.
                Desde esta pantalla no es necesario hacer ninguna configuración.
              </p>
              <div class="mt-4 flex gap-3">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-800">
                  <span class="w-2 h-2 rounded-full bg-success-600"></span>
                  Proveedor Externo Operativo
                </span>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- ================= TABS SELECTOR ================= -->
        <div class="flex border-b border-warm-200 gap-2">
          <button
            (click)="tabActiva.set('PLANTILLAS')"
            [class]="tabActiva() === 'PLANTILLAS' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
            class="px-4 py-3 text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>Plantillas y Mensajes Automáticos @if (!plantillasNoDisponible()) {({{ plantillas().length }})}</span>
          </button>

          <button
            (click)="tabActiva.set('COLA_OUTBOX')"
            [class]="tabActiva() === 'COLA_OUTBOX' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
            class="px-4 py-3 text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span>Cola de Envíos y Reintentos (Outbox)</span>
            @if (resumenCola().fallidasDefinitivas > 0) {
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-danger-100 text-danger-800">
                {{ resumenCola().fallidasDefinitivas }}
              </span>
            }
          </button>

          <button
            (click)="tabActiva.set('CANAL_SERVICIO')"
            [class]="tabActiva() === 'CANAL_SERVICIO' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
            class="px-4 py-3 text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span>{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_014') }}</span>
          </button>
        </div>

        <!-- ================= TAB 1: PLANTILLAS ================= -->
        @if (tabActiva() === 'PLANTILLAS' && plantillasNoDisponible(); as aviso) {
          <app-admin-email-no-disponible [aviso]="aviso" (reintentar)="cargarPlantillas()" />
        } @else if (tabActiva() === 'PLANTILLAS') {
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <!-- Left Column: Master List (4 cols) -->
            <div class="superficie lg:col-span-4 p-4 space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-warm-100">
                <span class="text-xs font-bold uppercase tracking-wider text-warm-600">Catálogo de Notificaciones</span>
                <span class="text-xs text-warm-400 font-mono">{{ plantillasFiltradas().length }} tipos</span>
              </div>

              <!-- Search Input -->
              <div class="relative">
                <input aria-label="Buscar plantilla de correo"
                  type="text"
                  [ngModel]="busquedaPlantilla()"
                  (ngModelChange)="busquedaPlantilla.set($event)"
                  placeholder="Buscar plantilla..."
                  class="w-full text-xs py-2 pl-8 pr-3 bg-warm-50 border border-warm-200 rounded-xl text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <svg class="w-4 h-4 text-warm-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <!-- Lista maestra compacta: una fila por tipo, con encabezado fijo -->
              <div class="tabla-scroll" role="region" tabindex="0" aria-label="Catálogo de notificaciones">
                <table class="w-full text-xs" data-testid="plantillas-tabla">
                  <thead>
                    <tr class="text-left uppercase tracking-wider text-warm-500 border-b border-warm-100">
                      <th scope="col" class="py-1.5 pr-2">Notificación</th>
                      <th scope="col" class="py-1.5 text-right">Versión</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (tpl of plantillasFiltradas(); track tpl.tipo) {
                      <tr class="border-b border-warm-50" [class.bg-primary-50]="selectedTipo() === tpl.tipo">
                        <td class="p-0">
                          <button
                            type="button"
                            (click)="seleccionarPlantilla(tpl)"
                            [attr.aria-pressed]="selectedTipo() === tpl.tipo"
                            class="w-full min-h-10 text-left py-1.5 pr-2 cursor-pointer hover:bg-warm-50/80 focus-visible:ring-2 focus-visible:ring-primary-600 outline-none"
                          >
                            <span class="block font-bold text-warm-900 leading-tight">{{ etiqueta(tpl) }}</span>
                            <span class="block font-mono text-[10px] text-primary-800">{{ tpl.tipo }}</span>
                          </button>
                        </td>
                        <td class="py-1.5 text-right whitespace-nowrap">
                          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warm-100 text-warm-700">v{{ tpl.versionActiva }}</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            @if (selectedPlantilla(); as tpl) {
              <app-admin-email-plantilla-editor
                class="block lg:col-span-8"
                [plantilla]="tpl"
                [(asunto)]="asuntoEditado"
                [(cuerpo)]="cuerpoEditado"
                [faltantes]="marcadoresObligatoriosFaltantes()"
                [puedeGuardar]="puedeGuardar()"
                [guardando]="guardando()"
                [generandoPreview]="generandoPreview()"
                [vistaPrevia]="vistaPrevia()"
                (marcadorInsertado)="insertarMarcador($event.marcador, $event.destino)"
                (vistaPreviaSolicitada)="generarVistaPrevia()"
                (restaurarSolicitado)="restaurarTextoActivo()"
                (guardarSolicitado)="guardarYActivarNuevaVersion()"
                (versionActivada)="activarVersionExistente($event.tipo, $event.version)"
              />
            }
          </div>
        }

        <!-- ================= TAB 2: COLA OUTBOX ================= -->
        @if (tabActiva() === 'COLA_OUTBOX' && colaNoDisponible(); as aviso) {
          <app-admin-email-no-disponible [aviso]="aviso" (reintentar)="cargarCola()" />
        } @else if (tabActiva() === 'COLA_OUTBOX') {
          <div class="space-y-4">
            <!-- Top Bento Grid with 5 KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <!-- Entregadas -->
              <div class="superficie p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-success-50 text-success-700 flex items-center justify-center shrink-0 border border-success-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Entregadas</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().entregadas }}</span>
                </div>
              </div>

              <!-- Pendientes -->
              <div class="superficie p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-warning-50 text-warning-700 flex items-center justify-center shrink-0 border border-warning-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Pendientes</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().pendientes }}</span>
                </div>
              </div>

              <!-- Reservadas (En Proceso) -->
              <div class="superficie p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-info-50 text-info-700 flex items-center justify-center shrink-0 border border-info-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Reservadas</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().reservadas }}</span>
                </div>
              </div>

              <!-- Reintentables -->
              <div class="superficie p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-warning-100 text-warning-800 flex items-center justify-center shrink-0 border border-warning-200">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Reintentables</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().fallidasReintentables }}</span>
                </div>
              </div>

              <!-- Fallidas Definitivas -->
              <div class="superficie p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
                <div class="w-10 h-10 rounded-xl bg-danger-50 text-danger-700 flex items-center justify-center shrink-0 border border-danger-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Dead-Letter</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().fallidasDefinitivas }}</span>
                </div>
              </div>
            </div>

            <!-- Filters Bar -->
            <div class="superficie p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-3">
                <div>
                  <label for="cola-filtro-estado" class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Estado</label>
                  <select id="cola-filtro-estado" aria-label="Filtrar la cola de correos por estado"
                    [ngModel]="filtroEstado()"
                    (ngModelChange)="cambiarFiltroEstado($event)"
                    class="text-xs font-semibold py-1.5 px-3 bg-warm-50 border border-warm-300 rounded-lg text-warm-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="TODOS">Todos los estados</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="RESERVADA">RESERVADA (En proceso)</option>
                    <option value="FALLIDA_REINTENTABLE">FALLIDA_REINTENTABLE</option>
                    <option value="ENTREGADA">ENTREGADA</option>
                    <option value="FALLIDA_DEFINITIVA">FALLIDA_DEFINITIVA</option>
                  </select>
                </div>

                <div>
                  <label for="cola-filtro-tipo" class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Tipo de Evento</label>
                  <select id="cola-filtro-tipo" aria-label="Filtrar la cola de correos por tipo"
                    [ngModel]="filtroTipo()"
                    (ngModelChange)="cambiarFiltroTipo($event)"
                    class="text-xs font-semibold py-1.5 px-3 bg-warm-50 border border-warm-300 rounded-lg text-warm-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="TODOS">Todos los tipos</option>
                    @for (tipo of tiposDisponibles(); track tipo) {
                      <option [value]="tipo">{{ tipo }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  (click)="cargarCola()"
                  class="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Actualizar Bandeja</span>
                </button>
              </div>
            </div>

            <!-- Queue Table -->
            <div class="superficie overflow-hidden">
              <app-admin-email-cola-tabla
                [items]="colaItems()"
                [reintentandoId]="reintentandoId()"
                (reintentar)="reintentar($event)"
              />

              <!-- Paginación compartida -->
              <app-pagination
                [totalItems]="totalCola()"
                [pageSize]="tamanoPagina()"
                [currentPage]="paginaActual()"
                [showPageSizeSelector]="false"
                (pageChange)="cambiarPagina($event)"
              />
            </div>
          </div>
        }

        <!-- ================= TAB 3: SERVICIO DE NOTIFICACIONES ================= -->
        @if (tabActiva() === 'CANAL_SERVICIO') {
          <app-admin-email-canal
            [estado]="canalEstado()"
            [servicioNoDisponible]="servicioNoDisponible()"
            [plantillas]="plantillas()"
            [enviando]="enviandoPrueba()"
            [resultado]="resultadoPrueba()"
            [(pruebaTipo)]="pruebaTipo"
            [(pruebaCorreoDestino)]="pruebaCorreoDestino"
            (enviar)="enviarCorreoPrueba()"
          />
        }
      }
    </div>
  `
})
export class AdminEmailManagementComponent implements OnInit {
  private readonly notificationService = inject(AdminEmailNotificationService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isExternalMode = inject(EMAIL_ADMIN_EXTERNAL_MODE);

  // Tabs
  readonly tabActiva = signal<TabNotificaciones>('PLANTILLAS');

  // Loading States
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly generandoPreview = signal<boolean>(false);
  readonly enviandoPrueba = signal<boolean>(false);
  readonly reintentandoId = signal<string | null>(null);

  // Tab 1: Plantillas
  readonly plantillas = signal<TipoPlantillaAdminDto[]>([]);
  readonly busquedaPlantilla = signal<string>('');
  readonly selectedTipo = signal<string>('');
  readonly asuntoEditado = signal<string>('');
  readonly cuerpoEditado = signal<string>('');
  readonly vistaPrevia = signal<VistaPreviaPlantillaResponse | null>(null);

  // Tab 2: Outbox
  readonly colaItems = signal<NotificacionSalienteAdminDto[]>([]);
  readonly resumenCola = signal<ResumenColaNotificacionDto>({
    pendientes: 0,
    reservadas: 0,
    entregadas: 0,
    fallidasReintentables: 0,
    fallidasDefinitivas: 0,
  });
  readonly filtroEstado = signal<string>('TODOS');
  readonly filtroTipo = signal<string>('TODOS');
  readonly paginaActual = signal<number>(1);
  readonly tamanoPagina = signal<number>(10);
  readonly totalCola = signal<number>(0);
  readonly totalPaginasCola = signal<number>(1);

  // Tab 3: Servicio de notificaciones
  readonly canalEstado = signal<EstadoCanalNotificacionDto | null>(null);
  /** Mensaje del backend cuando el servicio de notificaciones no responde (ERR_NOTIFICACIONES_NO_DISPONIBLE). */
  readonly servicioNoDisponible = signal<string | null>(null);
  /** Mensaje del backend si la consulta de plantillas falló por la caída del servicio; null si responde. */
  readonly plantillasNoDisponible = signal<string | null>(null);
  /** Ídem para la cola de envíos. */
  readonly colaNoDisponible = signal<string | null>(null);
  readonly mensaje = mensajeUi;
  readonly pruebaTipo = signal<string>('');
  readonly pruebaCorreoDestino = signal<string>('');
  readonly resultadoPrueba = signal<ResultadoPruebaCorreo | null>(null);

  // Computeds
  readonly plantillasFiltradas = computed<TipoPlantillaAdminDto[]>(() => {
    const query = this.busquedaPlantilla().trim().toLowerCase();
    const list = this.plantillas();
    if (!query) return list;
    return list.filter((item) => {
      const matchTipo = item.tipo.toLowerCase().includes(query);
      const matchDescripcion = etiquetaPlantilla(item).toLowerCase().includes(query);
      return matchTipo || matchDescripcion;
    });
  });

  readonly selectedPlantilla = computed<TipoPlantillaAdminDto | null>(() => {
    const tipo = this.selectedTipo();
    if (!tipo) return this.plantillas()[0] || null;
    return this.plantillas().find((p) => p.tipo === tipo) || this.plantillas()[0] || null;
  });

  readonly marcadoresObligatoriosFaltantes = computed<string[]>(() => {
    const tpl = this.selectedPlantilla();
    if (!tpl) return [];
    const textoCompleto = `${this.asuntoEditado()} ${this.cuerpoEditado()}`;
    return tpl.marcadores
      .filter((m) => m.obligatorio)
      .filter((m) => !textoCompleto.includes(`{${m.marcador}}`))
      .map((m) => m.marcador);
  });

  readonly todosLosObligatoriosPresentes = computed<boolean>(() => {
    return this.marcadoresObligatoriosFaltantes().length === 0;
  });

  readonly puedeGuardar = computed<boolean>(() => {
    const asunto = this.asuntoEditado().trim();
    const cuerpo = this.cuerpoEditado().trim();
    if (!asunto || !cuerpo) return false;
    return this.marcadoresObligatoriosFaltantes().length === 0;
  });

  readonly tiposDisponibles = computed<string[]>(() => {
    return this.plantillas().map((p) => p.tipo);
  });

  ngOnInit(): void {
    if (this.isExternalMode) {
      return;
    }

    const usr = this.authService.currentUser();
    if (usr?.email) {
      this.pruebaCorreoDestino.set(usr.email);
    }

    this.recargarTodo();
  }

  recargarTodo(): void {
    this.cargando.set(true);
    this.cargarPlantillas();
    this.cargarCola();
    this.cargarEstadoCanal();
  }

  // ================= PLANTILLAS =================
  cargarPlantillas(): void {
    this.notificationService
      .listarPlantillas('es')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.plantillasNoDisponible.set(null);
          this.plantillas.set(items);
          this.cargando.set(false);
          if (items.length > 0 && !items.some((p) => p.tipo === this.pruebaTipo())) {
            this.pruebaTipo.set(items[0].tipo);
          }
          if (items.length > 0 && !this.selectedTipo()) {
            this.seleccionarPlantilla(items[0]);
          }
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.plantillasNoDisponible.set(this.registrarServicioNoDisponible(err));
          this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_001')));
        },
      });
  }

  seleccionarPlantilla(tpl: TipoPlantillaAdminDto): void {
    this.selectedTipo.set(tpl.tipo);
    this.asuntoEditado.set(tpl.asuntoActivo || '');
    this.cuerpoEditado.set(tpl.cuerpoActivo || '');
    this.vistaPrevia.set(null);
  }

  insertarMarcador(marcador: string, destino: DestinoMarcador = 'cuerpo'): void {
    const token = `{${marcador}}`;
    if (destino === 'asunto') {
      const actual = this.asuntoEditado();
      const sep = actual.endsWith(' ') || actual === '' ? '' : ' ';
      this.asuntoEditado.set(actual + sep + token);
    } else {
      const actual = this.cuerpoEditado();
      const sep = actual.endsWith(' ') || actual.endsWith('\n') || actual === '' ? '' : ' ';
      this.cuerpoEditado.set(actual + sep + token);
    }
  }

  restaurarTextoActivo(): void {
    const tpl = this.selectedPlantilla();
    if (tpl) {
      this.asuntoEditado.set(tpl.asuntoActivo || '');
      this.cuerpoEditado.set(tpl.cuerpoActivo || '');
      this.vistaPrevia.set(null);
      this.toast.info(mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_002'));
    }
  }

  generarVistaPrevia(): void {
    const tpl = this.selectedPlantilla();
    if (!tpl) return;

    this.generandoPreview.set(true);
    this.notificationService
      .generarVistaPrevia(tpl.tipo, {
        asunto: this.asuntoEditado(),
        cuerpo: this.cuerpoEditado(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.generandoPreview.set(false);
          this.vistaPrevia.set(res);
        },
        error: (err: unknown) => {
          this.generandoPreview.set(false);
          this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_003')));
        },
      });
  }

  guardarYActivarNuevaVersion(): void {
    const tpl = this.selectedPlantilla();
    if (!tpl || !this.puedeGuardar()) return;

    this.guardando.set(true);
    const payload = {
      idioma: tpl.idioma || 'es',
      asunto: this.asuntoEditado().trim(),
      cuerpo: this.cuerpoEditado().trim(),
    };

    this.notificationService
      .guardarVersionPlantilla(tpl.tipo, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nuevaVersion) => {
          this.notificationService
            .activarVersionPlantilla(tpl.tipo, nuevaVersion.version, payload.idioma)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.guardando.set(false);
                this.toast.success(mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_010', { version: nuevaVersion.version }));
                this.cargarPlantillas();
              },
              error: () => {
                this.guardando.set(false);
                this.toast.warning(mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_011', { version: nuevaVersion.version }));
                this.cargarPlantillas();
              },
            });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_004')));
        },
      });
  }

  activarVersionExistente(tipo: string, version: number): void {
    this.notificationService
      .activarVersionPlantilla(tipo, version)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_012', { version }));
          this.cargarPlantillas();
        },
        error: (err: unknown) => {
          this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_013', { version })));
        },
      });
  }

  formatMissingMarkers(): string {
    return this.marcadoresObligatoriosFaltantes().map((m) => `{${m}}`).join(', ');
  }

  /** Descripción del tipo entregada por el servicio; sin ella, el código del tipo. */
  etiqueta(tpl: TipoPlantillaAdminDto): string {
    return etiquetaPlantilla(tpl);
  }

  // ================= COLA OUTBOX =================
  cargarCola(): void {
    this.notificationService
      .consultarCola({
        estado: this.filtroEstado(),
        tipo: this.filtroTipo(),
        pagina: this.paginaActual(),
        tamano: this.tamanoPagina(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.colaNoDisponible.set(null);
          this.colaItems.set(resp.elementos || []);
          this.totalCola.set(resp.totalElementos || 0);
          this.totalPaginasCola.set(resp.totalPaginas || 1);
          if (resp.resumen) {
            this.resumenCola.set(resp.resumen);
          }
        },
        error: (err: unknown) => {
          this.colaNoDisponible.set(this.registrarServicioNoDisponible(err));
          this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_005')));
        },
      });
  }

  cambiarFiltroEstado(nuevo: string): void {
    this.filtroEstado.set(nuevo);
    this.paginaActual.set(1);
    this.cargarCola();
  }

  cambiarFiltroTipo(nuevo: string): void {
    this.filtroTipo.set(nuevo);
    this.paginaActual.set(1);
    this.cargarCola();
  }

  cambiarPagina(nueva: number): void {
    if (nueva >= 1 && nueva <= this.totalPaginasCola()) {
      this.paginaActual.set(nueva);
      this.cargarCola();
    }
  }

  reintentar(id: string): void {
    this.reintentandoId.set(id);
    this.notificationService
      .reintentarNotificacion(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reintentandoId.set(null);
          this.toast.success(mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_006'));
          this.cargarCola();
        },
        error: (err: unknown) => {
          this.reintentandoId.set(null);
          this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_007')));
        },
      });
  }

  // ================= SERVICIO DE NOTIFICACIONES =================
  /** Si el error es la caída del servicio, muestra el mensaje del backend en la tarjeta de estado (por código, sin leer texto). */
  private registrarServicioNoDisponible(err: unknown): string | null {
    if (getApiErrorCode(err) !== CODIGO_SERVICIO_NO_DISPONIBLE) {
      return null;
    }
    const aviso = getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_017'));
    this.servicioNoDisponible.set(aviso);
    return aviso;
  }

  cargarEstadoCanal(): void {
    this.notificationService
      .obtenerEstadoCanal()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estado) => {
          this.canalEstado.set(estado);
          this.servicioNoDisponible.set(null);
        },
        error: (err: unknown) => {
          if (this.registrarServicioNoDisponible(err) === null) {
            this.toast.error(getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_008')));
          }
        },
      });
  }

  enviarCorreoPrueba(): void {
    this.enviandoPrueba.set(true);
    this.resultadoPrueba.set(null);

    const payload = {
      tipo: this.pruebaTipo(),
      correoDestino: this.pruebaCorreoDestino().trim() || undefined,
    };

    this.notificationService
      .enviarCorreoPrueba(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.enviandoPrueba.set(false);
          this.resultadoPrueba.set({
            exitoso: res.exitoso,
            mensaje: res.mensajeUsuario || mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_009'),
          });
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_009'));
          this.cargarEstadoCanal();
          this.cargarCola();
        },
        error: (err: unknown) => {
          this.enviandoPrueba.set(false);
          this.registrarServicioNoDisponible(err);
          const msg = getBackendUserMessage(err, mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_017'));
          this.resultadoPrueba.set({
            exitoso: false,
            mensaje: msg,
          });
          this.toast.error(msg);
        },
      });
  }
}
