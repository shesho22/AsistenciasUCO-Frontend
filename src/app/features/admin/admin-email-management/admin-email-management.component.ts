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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminEmailNotificationService,
  EstadoCanalNotificacionDto,
  MarcadorPlantillaDto,
  NotificacionSalienteAdminDto,
  ResumenColaNotificacionDto,
  TipoPlantillaAdminDto,
  VersionPlantillaDto,
} from '../../../core/services/admin-email-notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

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

export type TabNotificaciones = 'PLANTILLAS' | 'COLA_OUTBOX' | 'CANAL_SMTP';

export interface PlantillaMetaInfo {
  titulo: string;
  hu: string;
  descripcion: string;
}

export const PLANTILLA_METADATA: Record<string, PlantillaMetaInfo> = {
  VERIFICACION_CORREO: {
    titulo: 'Verificación de Correo Institucional',
    hu: 'HU050 / IDENT-001',
    descripcion: 'Enlace seguro para validar el correo del estudiante en su primer acceso.',
  },
  RETIRO_ESTUDIANTE_GRUPO: {
    titulo: 'Retiro de Estudiante de Grupo',
    hu: 'HU051',
    descripcion: 'Notificación oficial cuando el docente titular desvincula un estudiante del grupo.',
  },
  SOLICITUD_INGRESO_REGISTRADA: {
    titulo: 'Nueva Solicitud de Ingreso a Grupo',
    hu: 'HU053',
    descripcion: 'Aviso al docente titular cuando un alumno solicita cupo en su asignatura.',
  },
  SOLICITUD_INGRESO_RESUELTA: {
    titulo: 'Resolución de Solicitud de Ingreso',
    hu: 'HU054 / HU055',
    descripcion: 'Aviso al estudiante con la decisión del docente (aceptada, espera o rechazada).',
  },
  SOLICITUD_INGRESO_RETIRADA: {
    titulo: 'Cancelación de Solicitud de Ingreso',
    hu: 'HU055',
    descripcion: 'Aviso al docente informando que el estudiante canceló su petición de cupo.',
  },
  RECLAMO_ASISTENCIA_RADICADO: {
    titulo: 'Nueva Solicitud de Revisión de Asistencia',
    hu: 'HU010 / HU035',
    descripcion: 'Aviso al docente titular cuando un estudiante radica una reclamación de inasistencia.',
  },
  RECLAMO_ASISTENCIA_RESUELTO: {
    titulo: 'Resolución de Reclamo de Asistencia',
    hu: 'HU037 / HU042',
    descripcion: 'Aviso al alumno con la decisión sobre su reclamo o justificación de falta.',
  },
  ALERTA_RIESGO_INASISTENCIA: {
    titulo: 'Alerta Preventiva de Ausentismo (15%)',
    hu: 'HU026C (15%)',
    descripcion: 'Alerta temprana al estudiante antes de alcanzar el umbral de reprobación.',
  },
  ALERTA_PERDIDA_INASISTENCIA: {
    titulo: 'Pérdida de Asignatura por Inasistencia (20%)',
    hu: 'HU026C (20%)',
    descripcion: 'Notificación formal institucional de pérdida de materia por inasistencia.',
  },
  CIERRE_MASIVO_PERIODO_EJECUTADO: {
    titulo: 'Consolidación de Cierre Masivo de Período',
    hu: 'HU174',
    descripcion: 'Resumen oficial enviado al administrador tras consolidar el cierre masivo del semestre.',
  },
  ALERTA_INASISTENCIA_15: {
    titulo: 'Alerta Preventiva de Ausentismo (15%)',
    hu: 'HU026C (15%)',
    descripcion: 'Alerta temprana al estudiante antes de alcanzar el umbral de reprobación.',
  },
  PERDIDA_ASIGNATURA_20: {
    titulo: 'Pérdida de Asignatura por Inasistencia (20%)',
    hu: 'HU026C (20%)',
    descripcion: 'Notificación formal institucional de pérdida de materia por inasistencia.',
  },
  CIERRE_SESION_ASISTENCIA: {
    titulo: 'Consolidación de Sesión de Clase',
    hu: 'HU010/HU035',
    descripcion: 'Resumen digital de asistencia enviado al docente tras consolidar la clase.',
  },
  SOLICITUD_REVISION_ASISTENCIA: {
    titulo: 'Nueva Solicitud de Revisión de Faltas',
    hu: 'HU010 / HU035',
    descripcion: 'Aviso al docente cuando un estudiante radica una reclamación con soportes.',
  },
};

@Component({
  selector: 'app-admin-email-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="space-y-6">
      <!-- ================= HEADER & BREADCRUMB ================= -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>Gobierno de TI & Comunicaciones</span>
            <span>/</span>
            <span class="text-primary-700">NOTIF-002B · TD-069</span>
          </div>
          <h1 class="text-2xl font-serif font-bold text-warm-900">Gestión de Correos y Notificaciones</h1>
          <p class="text-sm text-warm-600">
            Administración de plantillas institucionales, supervisión de la cola transaccional outbox y diagnóstico del canal SMTP/Gmail.
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
                El canal y las plantillas de correo se encuentran gestionados de forma externa a través del micro-frontend
                institucional de notificaciones (<code class="px-1.5 py-0.5 rounded bg-primary-100/80 font-mono text-xs">EMAIL_ADMIN_EXTERNAL_MODE = true</code>).
                La arquitectura del sistema mantiene el principio de Clean Architecture y la interfaz unificada <code class="px-1.5 py-0.5 rounded bg-primary-100/80 font-mono text-xs">NotificacionPort</code>.
              </p>
              <div class="mt-4 flex gap-3">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
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
            <span>Plantillas y Mensajes Automáticos ({{ plantillas().length }})</span>
          </button>

          <button
            (click)="tabActiva.set('COLA_OUTBOX')"
            [class]="tabActiva() === 'COLA_OUTBOX' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
            class="px-4 py-3 text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span>Cola de Envíos y Reintentos (Outbox)</span>
            @if (resumenCola().fallidasDefinitivas > 0) {
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                {{ resumenCola().fallidasDefinitivas }}
              </span>
            }
          </button>

          <button
            (click)="tabActiva.set('CANAL_SMTP')"
            [class]="tabActiva() === 'CANAL_SMTP' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
            class="px-4 py-3 text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span>Canal Gmail / SMTP & Desacoplamiento</span>
          </button>
        </div>

        <!-- ================= TAB 1: PLANTILLAS ================= -->
        @if (tabActiva() === 'PLANTILLAS') {
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- Left Column: Master List (4 cols) -->
            <div class="lg:col-span-4 bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-warm-100">
                <span class="text-xs font-bold uppercase tracking-wider text-warm-600">Catálogo de Notificaciones</span>
                <span class="text-xs text-warm-400 font-mono">{{ plantillasFiltradas().length }} tipos</span>
              </div>

              <!-- Search Input -->
              <div class="relative">
                <input
                  type="text"
                  [ngModel]="busquedaPlantilla()"
                  (ngModelChange)="busquedaPlantilla.set($event)"
                  placeholder="Buscar plantilla o HU..."
                  class="w-full text-xs py-2 pl-8 pr-3 bg-warm-50 border border-warm-200 rounded-xl text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <svg class="w-4 h-4 text-warm-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <!-- List of Template Cards -->
              <div class="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                @for (tpl of plantillasFiltradas(); track tpl.tipo) {
                  <button
                    type="button"
                    (click)="seleccionarPlantilla(tpl)"
                    [class]="selectedTipo() === tpl.tipo ? 'border-primary-600 bg-primary-50/60 shadow-xs' : 'border-warm-200 bg-white hover:bg-warm-50/80'"
                    class="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 font-mono">
                        {{ getMetadata(tpl.tipo).hu }}
                      </span>
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warm-100 text-warm-700">
                        v{{ tpl.versionActiva }}
                      </span>
                    </div>
                    <div class="font-bold text-xs text-warm-900 leading-tight">
                      {{ getMetadata(tpl.tipo).titulo }}
                    </div>
                    <div class="text-[11px] text-warm-500 line-clamp-1 font-mono">
                      {{ tpl.tipo }}
                    </div>
                  </button>
                }
              </div>
            </div>

            <!-- Right Column: Detail & Editor (8 cols) -->
            @if (selectedPlantilla(); as tpl) {
              <div class="lg:col-span-8 space-y-5">
                <!-- Header Card -->
                <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 font-mono">
                          {{ getMetadata(tpl.tipo).hu }}
                        </span>
                        <span class="text-xs font-semibold text-warm-500 font-mono">{{ tpl.tipo }}</span>
                      </div>
                      <h2 class="text-lg font-serif font-bold text-warm-900 mt-1">
                        {{ getMetadata(tpl.tipo).titulo }}
                      </h2>
                      <p class="text-xs text-warm-600 mt-0.5">
                        {{ getMetadata(tpl.tipo).descripcion }}
                      </p>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      <span class="text-xs text-warm-500">Versión activa:</span>
                      <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        v{{ tpl.versionActiva }} Activa
                      </span>
                    </div>
                  </div>

                  <!-- Marcadores Disponibles -->
                  <div class="mt-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold uppercase tracking-wider text-warm-600">Marcadores Dinámicos Disponibles</span>
                      <span class="text-[11px] text-warm-400">Haz clic en un marcador para insertarlo</span>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      @for (m of tpl.marcadores; track m.marcador) {
                        <div class="inline-flex items-center border border-warm-200 rounded-lg bg-warm-50/70 p-1 text-xs">
                          <button
                            type="button"
                            (click)="insertarMarcador(m.marcador, 'cuerpo')"
                            title="Insertar en el cuerpo: {{ m.descripcion }} (Ej: {{ m.ejemplo }})"
                            class="font-mono font-bold text-primary-800 hover:text-primary-900 px-1.5 py-0.5 rounded hover:bg-primary-100/60 transition-colors"
                          >
                            {{ '{' + m.marcador + '}' }}
                          </button>
                          <span
                            [class]="m.obligatorio ? 'bg-amber-100 text-amber-800' : 'bg-warm-200 text-warm-700'"
                            class="text-[9px] font-bold px-1.5 py-0.2 rounded ml-1"
                          >
                            {{ m.obligatorio ? 'Obligatorio' : 'Opcional' }}
                          </span>
                          <button
                            type="button"
                            (click)="insertarMarcador(m.marcador, 'asunto')"
                            title="Insertar en asunto"
                            class="text-[9px] font-semibold text-warm-400 hover:text-primary-700 ml-1 px-1 py-0.2 rounded hover:bg-warm-200 transition-colors"
                          >
                            + Asunto
                          </button>
                        </div>
                      }
                    </div>

                    <!-- Client Validation Warning / Success Indicator -->
                    <div class="mt-3">
                      @if (marcadoresObligatoriosFaltantes().length > 0) {
                        <div class="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                          <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                          <span>
                            Faltan marcadores obligatorios en el texto:
                            <strong>{{ formatMissingMarkers() }}</strong>. Deben estar presentes en el asunto o cuerpo.
                          </span>
                        </div>
                      } @else {
                        <div class="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                          <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                          <span>Todos los marcadores obligatorios están presentes en la plantilla.</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Editor Form -->
                  <div class="mt-5 space-y-4">
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs font-bold text-warm-700">Asunto del Correo Electrónico</label>
                        <span class="text-[11px] text-warm-400 font-mono">{{ asuntoEditado().length }} / 200</span>
                      </div>
                      <input
                        type="text"
                        [ngModel]="asuntoEditado()"
                        (ngModelChange)="asuntoEditado.set($event)"
                        maxlength="200"
                        class="w-full text-sm font-semibold p-2.5 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Asunto institucional..."
                      />
                    </div>

                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label class="text-xs font-bold text-warm-700">Cuerpo del Mensaje (Texto con Marcadores)</label>
                        <span class="text-[11px] text-warm-400 font-mono">{{ cuerpoEditado().length }} / 4000</span>
                      </div>
                      <textarea
                        rows="7"
                        [ngModel]="cuerpoEditado()"
                        (ngModelChange)="cuerpoEditado.set($event)"
                        maxlength="4000"
                        class="w-full text-xs font-mono p-3 bg-white border border-warm-300 rounded-xl text-warm-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Redacta el cuerpo de la plantilla..."
                      ></textarea>
                    </div>

                    <!-- Actions Bar -->
                    <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          (click)="generarVistaPrevia()"
                          [disabled]="generandoPreview()"
                          class="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <svg class="w-4 h-4 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          <span>{{ generandoPreview() ? 'Generando...' : 'Vista Previa Institucional' }}</span>
                        </button>

                        <button
                          type="button"
                          (click)="restaurarTextoActivo()"
                          class="px-3 py-2 text-warm-500 hover:text-warm-800 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Restaurar Texto Activo
                        </button>
                      </div>

                      <button
                        type="button"
                        (click)="guardarYActivarNuevaVersion()"
                        [disabled]="guardando() || !puedeGuardar()"
                        class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        <span>{{ guardando() ? 'Guardando versión...' : 'Guardar y Activar Nueva Versión' }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Preview Box -->
                @if (vistaPrevia(); as vp) {
                  <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-warm-100">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-warm-700">Renderizado de Vista Previa</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-100 text-accent-800 font-mono">
                          Origen: {{ vp.origen }}
                        </span>
                      </div>
                      <span class="text-[11px] text-warm-400">Diseño Aurora UCO</span>
                    </div>

                    <div class="p-3 bg-warm-50 rounded-xl border border-warm-200 text-xs">
                      <span class="font-bold text-warm-600 uppercase text-[10px] block mb-1">Asunto Renderizado:</span>
                      <p class="font-bold text-warm-900 text-sm">{{ vp.asunto }}</p>
                    </div>

                    <!-- Email Client Layout Mockup -->
                    <div class="border border-warm-200 rounded-xl overflow-hidden shadow-xs bg-white">
                      <!-- Email Header Mockup -->
                      <div class="bg-primary-800 text-white px-5 py-3 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="font-serif font-bold text-sm tracking-wide">Universidad Católica de Oriente</span>
                          <span class="text-primary-200 text-xs">· Asistencias UCO</span>
                        </div>
                        <span class="text-[10px] font-mono text-primary-200">notificaciones&#64;uco.edu.co</span>
                      </div>

                      <!-- Email Body -->
                      <div class="p-5" [innerHTML]="safeHtmlPreview()"></div>

                      <!-- Email Footer Mockup -->
                      <div class="bg-warm-50 border-t border-warm-200 px-5 py-3 text-[11px] text-warm-500 flex items-center justify-between">
                        <span>Gestión de Asistencia Académica UCO · Sistema Central</span>
                        <span>Mensaje transaccional automático</span>
                      </div>
                    </div>
                  </div>
                }

                <!-- Version History Table -->
                <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm">
                  <div class="flex items-center justify-between mb-3 pb-2 border-b border-warm-100">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-warm-700">Historial de Versiones de la Plantilla</h3>
                    <span class="text-xs text-warm-400">{{ tpl.versiones.length }} versión(es)</span>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-warm-50 text-warm-600 uppercase text-[10px] font-bold">
                        <tr>
                          <th class="py-2.5 px-3">Versión</th>
                          <th class="py-2.5 px-3">Fecha</th>
                          <th class="py-2.5 px-3">Asunto</th>
                          <th class="py-2.5 px-3">Estado</th>
                          <th class="py-2.5 px-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-warm-100 text-warm-800">
                        @for (v of tpl.versiones; track v.id) {
                          <tr class="hover:bg-warm-50/60 transition-colors">
                            <td class="py-2.5 px-3 font-mono font-bold">v{{ v.version }}</td>
                            <td class="py-2.5 px-3 text-warm-500 whitespace-nowrap">{{ formatearFecha(v.creadoEn) }}</td>
                            <td class="py-2.5 px-3 max-w-[260px] truncate font-medium" [title]="v.asunto">{{ v.asunto }}</td>
                            <td class="py-2.5 px-3">
                              @if (v.activa) {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Activa
                                </span>
                              } @else {
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warm-100 text-warm-600">
                                  Histórica
                                </span>
                              }
                            </td>
                            <td class="py-2.5 px-3 text-right">
                              @if (!v.activa) {
                                <button
                                  type="button"
                                  (click)="activarVersionExistente(tpl.tipo, v.version)"
                                  class="px-2.5 py-1 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  Activar
                                </button>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ================= TAB 2: COLA OUTBOX ================= -->
        @if (tabActiva() === 'COLA_OUTBOX') {
          <div class="space-y-6">
            <!-- Top Bento Grid with 5 KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <!-- Entregadas -->
              <div class="bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Entregadas</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().entregadas }}</span>
                </div>
              </div>

              <!-- Pendientes -->
              <div class="bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Pendientes</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().pendientes }}</span>
                </div>
              </div>

              <!-- Reservadas (En Proceso) -->
              <div class="bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Reservadas</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().reservadas }}</span>
                </div>
              </div>

              <!-- Reintentables -->
              <div class="bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Reintentables</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().fallidasReintentables }}</span>
                </div>
              </div>

              <!-- Fallidas Definitivas -->
              <div class="bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm flex items-center gap-3 col-span-2 sm:col-span-1">
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-warm-500 uppercase tracking-wider block">Dead-Letter</span>
                  <span class="text-xl font-bold text-warm-900">{{ resumenCola().fallidasDefinitivas }}</span>
                </div>
              </div>
            </div>

            <!-- Filters Bar -->
            <div class="bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-3">
                <div>
                  <label class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Estado</label>
                  <select
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
                  <label class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Tipo de Evento</label>
                  <select
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
            <div class="bg-white border border-warm-200 rounded-2xl shadow-warm-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-warm-50 text-warm-600 uppercase text-[10px] font-bold border-b border-warm-200">
                    <tr>
                      <th class="py-3 px-4">Tipo / Evento</th>
                      <th class="py-3 px-4">Asunto</th>
                      <th class="py-3 px-4">Destinatarios</th>
                      <th class="py-3 px-4">Estado</th>
                      <th class="py-3 px-4">Intentos</th>
                      <th class="py-3 px-4">Fecha Creación</th>
                      <th class="py-3 px-4">Error / Detalle</th>
                      <th class="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-warm-100 text-warm-800">
                    @for (item of colaItems(); track item.id) {
                      <tr class="hover:bg-warm-50/60 transition-colors">
                        <td class="py-3 px-4">
                          <span class="font-mono font-bold text-[11px] text-warm-900 block">{{ item.tipo }}</span>
                          <span class="text-[10px] text-warm-400 font-mono">ID: {{ item.id.substring(0, 8) }}...</span>
                        </td>
                        <td class="py-3 px-4 max-w-[280px]">
                          <span class="font-medium text-warm-900 block truncate" [title]="item.asunto">{{ item.asunto }}</span>
                          <span class="text-[10px] text-warm-400 font-mono">Corr: {{ item.idCorrelacion }}</span>
                        </td>
                        <td class="py-3 px-4 font-mono font-semibold">
                          {{ item.cantidadDestinatarios }} dest.
                        </td>
                        <td class="py-3 px-4">
                          <span
                            [class]="getEstadoBadgeClass(item.codigoEstado)"
                            class="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                          >
                            <span class="w-1.5 h-1.5 rounded-full" [class]="getEstadoDotClass(item.codigoEstado)"></span>
                            {{ item.nombreEstado || item.codigoEstado }}
                          </span>
                        </td>
                        <td class="py-3 px-4 font-mono font-bold">{{ item.intentos }}</td>
                        <td class="py-3 px-4 text-warm-500 whitespace-nowrap">
                          <div>{{ formatearFecha(item.creadoEn) }}</div>
                          @if (item.entregadoEn) {
                            <div class="text-[10px] text-emerald-700">Entregado: {{ formatearFecha(item.entregadoEn) }}</div>
                          }
                        </td>
                        <td class="py-3 px-4 max-w-[220px]">
                          @if (item.detalleError) {
                            <div class="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-1.5 rounded-lg font-mono truncate" [title]="item.detalleError">
                              {{ item.codigoError ? item.codigoError + ': ' : '' }}{{ item.detalleError }}
                            </div>
                          } @else {
                            <span class="text-warm-300">—</span>
                          }
                        </td>
                        <td class="py-3 px-4 text-right">
                          @if (puedeReintentar(item.codigoEstado)) {
                            <button
                              type="button"
                              (click)="reintentar(item.id)"
                              [disabled]="reintentandoId() === item.id"
                              class="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              {{ reintentandoId() === item.id ? 'Reintentando...' : 'Reintentar' }}
                            </button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="8" class="py-8 text-center text-warm-500 text-xs">
                          No se encontraron notificaciones en la cola para los filtros seleccionados.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Pagination Footer -->
              <div class="p-3 bg-warm-50 border-t border-warm-200 flex items-center justify-between text-xs text-warm-600">
                <span>Total: <strong>{{ totalCola() }}</strong> elementos</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="cambiarPagina(paginaActual() - 1)"
                    [disabled]="paginaActual() <= 1"
                    class="px-2.5 py-1 rounded bg-white border border-warm-300 disabled:opacity-40 text-warm-700 hover:bg-warm-100 font-semibold"
                  >
                    Anterior
                  </button>
                  <span class="font-bold text-warm-800">Pág. {{ paginaActual() }} de {{ totalPaginasCola() || 1 }}</span>
                  <button
                    type="button"
                    (click)="cambiarPagina(paginaActual() + 1)"
                    [disabled]="paginaActual() >= totalPaginasCola()"
                    class="px-2.5 py-1 rounded bg-white border border-warm-300 disabled:opacity-40 text-warm-700 hover:bg-warm-100 font-semibold"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- ================= TAB 3: CANAL SMTP ================= -->
        @if (tabActiva() === 'CANAL_SMTP') {
          <div class="space-y-6">
            <!-- Architecture & Decoupling Status Card -->
            <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-warm-100">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-primary-700">Clean Architecture & Hexagonal</span>
                  <h3 class="text-lg font-serif font-bold text-warm-900 mt-0.5">Estado del Puerto de Notificaciones y Canal de Transporte</h3>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Desacoplado vía NotificacionPort
                </span>
              </div>

              <!-- Architecture Highlights Grid -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl bg-warm-50 border border-warm-200">
                  <span class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Proveedor Primario Activo</span>
                  <span class="text-sm font-mono font-bold text-warm-900 block">{{ canalEstado()?.provider || 'outbox' }}</span>
                  <span class="text-[11px] text-warm-500 mt-1 block">Cola durable transaccional en SQL Server</span>
                </div>

                <div class="p-4 rounded-xl bg-warm-50 border border-warm-200">
                  <span class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Canal de Salida (Sender)</span>
                  <span class="text-sm font-mono font-bold text-primary-800 block">{{ canalEstado()?.sender || 'smtp' }}</span>
                  <span class="text-[11px] text-warm-500 mt-1 block">Implementación NotificacionChannelSender</span>
                </div>

                <div class="p-4 rounded-xl bg-warm-50 border border-warm-200">
                  <span class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Despachador en Segundo Plano</span>
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="w-2.5 h-2.5 rounded-full" [class]="canalEstado()?.dispatcherEnabled ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                    <span class="text-xs font-bold" [class]="canalEstado()?.dispatcherEnabled ? 'text-emerald-800' : 'text-rose-800'">
                      {{ canalEstado()?.dispatcherEnabled ? 'Activo (Hilo outbox activo)' : 'Inactivo' }}
                    </span>
                  </div>
                  <span class="text-[11px] text-warm-500 mt-1 block">Barrido configurable cada X segundos</span>
                </div>
              </div>

              <!-- Informative Banner about Third Party Retiring Plan -->
              <div class="p-4 rounded-xl bg-primary-50/60 border border-primary-200 text-xs text-warm-800 leading-relaxed">
                <p class="font-bold text-primary-900 mb-1">Gobernanza de Retiro y Reemplazo (NOTIF-001 / ADR-005):</p>
                <p>
                  El núcleo de dominio y los casos de uso universitarios solo interactúan con <code class="px-1 py-0.5 rounded bg-primary-100 font-mono text-[11px]">NotificacionPort</code>.
                  El canal SMTP actual (<code class="px-1 py-0.5 rounded bg-primary-100 font-mono text-[11px]">SmtpNotificacionChannelSender</code>) envía a través de credenciales de aplicación Gmail.
                  Cuando el componente transversal del otro equipo sea homologado, bastará con alternar <code class="px-1 py-0.5 rounded bg-primary-100 font-mono text-[11px]">OUTBOX_NOTIFICATION_SENDER=http</code>
                  o suministrar el proveedor externo sin alterar la lógica de negocio ni las vistas de usuario.
                </p>
              </div>
            </div>

            <!-- SMTP Connection Diagnostic & Live Test Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <!-- Card: Connection Details (Read-only, Zero secret exposure) -->
              <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm space-y-4">
                <div class="pb-3 border-b border-warm-100 flex items-center justify-between">
                  <h4 class="text-sm font-bold text-warm-900 uppercase tracking-wider">Parámetros del Servidor SMTP</h4>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-700">Solo Diagnóstico</span>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-[10px] text-warm-500 font-bold uppercase block mb-1">Servidor Host</span>
                    <span class="font-mono font-bold text-warm-900">{{ canalEstado()?.host || 'smtp.gmail.com' }}</span>
                  </div>

                  <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-[10px] text-warm-500 font-bold uppercase block mb-1">Puerto</span>
                    <span class="font-mono font-bold text-warm-900">{{ canalEstado()?.port || 587 }}</span>
                  </div>

                  <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-[10px] text-warm-500 font-bold uppercase block mb-1">Seguridad TLS</span>
                    <span class="font-bold text-emerald-800">
                      {{ canalEstado()?.starttls ? 'STARTTLS Activo' : (canalEstado()?.ssl ? 'SSL' : 'Plano') }}
                    </span>
                  </div>

                  <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-[10px] text-warm-500 font-bold uppercase block mb-1">Password Configurada</span>
                    <span
                      [class]="canalEstado()?.tienePasswordConfigurado ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-100'"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                    >
                      {{ canalEstado()?.tienePasswordConfigurado ? 'Configurada (Protegida)' : 'Sin Configurar' }}
                    </span>
                  </div>
                </div>

                <div class="space-y-2 text-xs">
                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-warm-600">Remitente Institucional:</span>
                    <span class="font-bold text-warm-900 font-mono text-[11px]">
                      {{ canalEstado()?.fromName }} &lt;{{ canalEstado()?.fromAddress }}&gt;
                    </span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-warm-600">Usuario Autenticación:</span>
                    <span class="font-bold text-warm-900 font-mono text-[11px]">{{ canalEstado()?.username }}</span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-warm-600">Tope de Envíos:</span>
                    <span class="font-bold text-warm-800 font-mono text-[11px]">
                      {{ canalEstado()?.ratePerMinute }} / min · {{ canalEstado()?.ratePerDay }} / día
                    </span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-warm-50 border border-warm-100">
                    <span class="text-warm-600">Modo de Pruebas (Redirección):</span>
                    @if (canalEstado()?.testModeEnabled) {
                      <span class="text-amber-800 font-bold text-[11px] bg-amber-100 px-2 py-0.5 rounded-full">
                        Activo ({{ canalEstado()?.testModeRedirectCount || 0 }} redirigidos)
                      </span>
                    } @else {
                      <span class="text-emerald-800 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">
                        Producción (Envíos directos)
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- Card: Live Test Email -->
              <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm space-y-4">
                <div class="pb-3 border-b border-warm-100">
                  <h4 class="text-sm font-bold text-warm-900 uppercase tracking-wider">Probar Envío de Correo en Vivo</h4>
                  <p class="text-xs text-warm-600 mt-0.5">
                    Envía un correo de comprobación de conectividad utilizando las credenciales SMTP configuradas.
                  </p>
                </div>

                <div class="space-y-3">
                  <div>
                    <label class="text-xs font-bold text-warm-700 block mb-1">Tipo de Plantilla de Prueba</label>
                    <select
                      [ngModel]="pruebaTipo()"
                      (ngModelChange)="pruebaTipo.set($event)"
                      class="w-full text-xs font-semibold py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      @for (tpl of plantillas(); track tpl.tipo) {
                        <option [value]="tpl.tipo">{{ tpl.tipo }} — {{ getMetadata(tpl.tipo).titulo }}</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="text-xs font-bold text-warm-700 block mb-1">Correo Electrónico de Destino</label>
                    <input
                      type="email"
                      [ngModel]="pruebaCorreoDestino()"
                      (ngModelChange)="pruebaCorreoDestino.set($event)"
                      placeholder="admin@uco.edu.co"
                      class="w-full text-xs py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <span class="text-[10px] text-warm-400 mt-1 block">
                      Por defecto se enviará a tu correo de administrador conectado.
                    </span>
                  </div>

                  <div class="pt-2">
                    <button
                      type="button"
                      (click)="enviarCorreoPrueba()"
                      [disabled]="enviandoPrueba()"
                      class="w-full py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg class="w-4 h-4" [class.animate-spin]="enviandoPrueba()" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                      <span>{{ enviandoPrueba() ? 'Enviando correo de prueba...' : 'Enviar Correo de Prueba en Vivo' }}</span>
                    </button>
                  </div>

                  @if (resultadoPrueba()) {
                    <div
                      [class]="resultadoPrueba()?.exitoso ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'"
                      class="p-3 rounded-xl border text-xs"
                    >
                      <p class="font-bold">{{ resultadoPrueba()?.exitoso ? '¡Envío Exitoso!' : 'Error de Envío' }}</p>
                      <p class="mt-0.5 text-[11px]">{{ resultadoPrueba()?.mensaje }}</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class AdminEmailManagementComponent implements OnInit {
  private readonly notificationService = inject(AdminEmailNotificationService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
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
  readonly vistaPrevia = signal<{ asunto: string; textoPlano: string; html: string; origen: string } | null>(null);

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

  // Tab 3: Canal SMTP
  readonly canalEstado = signal<EstadoCanalNotificacionDto | null>(null);
  readonly pruebaTipo = signal<string>('VERIFICACION_CORREO');
  readonly pruebaCorreoDestino = signal<string>('');
  readonly resultadoPrueba = signal<{ exitoso: boolean; mensaje: string } | null>(null);

  // Computeds
  readonly plantillasFiltradas = computed<TipoPlantillaAdminDto[]>(() => {
    const query = this.busquedaPlantilla().trim().toLowerCase();
    const list = this.plantillas();
    if (!query) return list;
    return list.filter((item) => {
      const meta = PLANTILLA_METADATA[item.tipo];
      const matchTipo = item.tipo.toLowerCase().includes(query);
      const matchTitulo = meta?.titulo.toLowerCase().includes(query);
      const matchHu = meta?.hu.toLowerCase().includes(query);
      return matchTipo || matchTitulo || matchHu;
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

  readonly safeHtmlPreview = computed<SafeHtml>(() => {
    const vp = this.vistaPrevia();
    if (!vp) return '';
    return this.sanitizer.bypassSecurityTrustHtml(vp.html);
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
          this.plantillas.set(items);
          this.cargando.set(false);
          if (items.length > 0 && !this.selectedTipo()) {
            this.seleccionarPlantilla(items[0]);
          }
        },
        error: () => {
          this.cargando.set(false);
          this.toast.error('No fue posible cargar el catálogo de plantillas.');
        },
      });
  }

  seleccionarPlantilla(tpl: TipoPlantillaAdminDto): void {
    this.selectedTipo.set(tpl.tipo);
    this.asuntoEditado.set(tpl.asuntoActivo || '');
    this.cuerpoEditado.set(tpl.cuerpoActivo || '');
    this.vistaPrevia.set(null);
  }

  insertarMarcador(marcador: string, destino: 'cuerpo' | 'asunto' = 'cuerpo'): void {
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
      this.toast.info('Texto restaurado a la versión activa.');
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
        error: () => {
          this.generandoPreview.set(false);
          this.toast.error('No fue posible generar la vista previa institucional.');
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
                this.toast.success(`Versión v${nuevaVersion.version} guardada y activada con éxito.`);
                this.cargarPlantillas();
              },
              error: () => {
                this.guardando.set(false);
                this.toast.warning(`Versión v${nuevaVersion.version} guardada pero pendiente de activación.`);
                this.cargarPlantillas();
              },
            });
        },
        error: () => {
          this.guardando.set(false);
          this.toast.error('Error al guardar la nueva versión de la plantilla.');
        },
      });
  }

  activarVersionExistente(tipo: string, version: number): void {
    this.notificationService
      .activarVersionPlantilla(tipo, version)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(`Versión v${version} activada como la plantilla oficial.`);
          this.cargarPlantillas();
        },
        error: () => {
          this.toast.error(`Error al activar la versión v${version}.`);
        },
      });
  }

  formatMissingMarkers(): string {
    return this.marcadoresObligatoriosFaltantes().map((m) => `{${m}}`).join(', ');
  }

  getMetadata(tipo: string): PlantillaMetaInfo {
    return (
      PLANTILLA_METADATA[tipo] || {
        titulo: tipo,
        hu: 'HU-AUTO',
        descripcion: 'Plantilla de notificación automática transaccional.',
      }
    );
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
          this.colaItems.set(resp.elementos || []);
          this.totalCola.set(resp.totalElementos || 0);
          this.totalPaginasCola.set(resp.totalPaginas || 1);
          if (resp.resumen) {
            this.resumenCola.set(resp.resumen);
          }
        },
        error: () => {
          this.toast.error('No fue posible consultar la cola outbox.');
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

  puedeReintentar(codigoEstado: string): boolean {
    return codigoEstado === 'FALLIDA_DEFINITIVA' || codigoEstado === 'FALLIDA_REINTENTABLE';
  }

  reintentar(id: string): void {
    this.reintentandoId.set(id);
    this.notificationService
      .reintentarNotificacion(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reintentandoId.set(null);
          this.toast.success('Notificación reprogramada para reintento inmediato.');
          this.cargarCola();
        },
        error: () => {
          this.reintentandoId.set(null);
          this.toast.error('Error al solicitar el reintento de la notificación.');
        },
      });
  }

  getEstadoBadgeClass(codigo: string): string {
    switch (codigo) {
      case 'ENTREGADA':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'RESERVADA':
        return 'bg-sky-100 text-sky-800 border border-sky-200';
      case 'FALLIDA_REINTENTABLE':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'FALLIDA_DEFINITIVA':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      default:
        return 'bg-warm-100 text-warm-700';
    }
  }

  getEstadoDotClass(codigo: string): string {
    switch (codigo) {
      case 'ENTREGADA':
        return 'bg-emerald-500';
      case 'PENDIENTE':
      case 'FALLIDA_REINTENTABLE':
        return 'bg-amber-500';
      case 'RESERVADA':
        return 'bg-sky-500';
      case 'FALLIDA_DEFINITIVA':
        return 'bg-rose-500';
      default:
        return 'bg-warm-400';
    }
  }

  // ================= CANAL SMTP =================
  cargarEstadoCanal(): void {
    this.notificationService
      .obtenerEstadoCanal()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estado) => {
          this.canalEstado.set(estado);
        },
        error: () => {
          this.toast.error('No se pudo obtener el diagnóstico del canal SMTP.');
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
            mensaje: res.mensajeUsuario || 'Correo de prueba despachado con éxito al canal SMTP.',
          });
          this.toast.success(res.mensajeUsuario || 'Correo de prueba enviado con éxito.');
          this.cargarEstadoCanal();
          this.cargarCola();
        },
        error: (err) => {
          this.enviandoPrueba.set(false);
          const msg = err?.error?.message || err?.error?.mensajeUsuario || 'Error al conectar con el servidor SMTP.';
          this.resultadoPrueba.set({
            exitoso: false,
            mensaje: msg,
          });
          this.toast.error(msg);
        },
      });
  }

  formatearFecha(isoStr?: string | null): string {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  }
}
