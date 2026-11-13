import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { RevisionCancelacionService } from '../../../../core/services/revision-cancelacion.service';
import { RevisionCancelacion } from '../../../../core/models/revision-cancelacion.model';
import { nombreEstudianteRevision, porcentajeRevision } from '../../../../core/models/revision-cancelacion.util';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { SemaforoAsistenciaComponent } from '../../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-hora.pipes';
import { RevisionDecisionModalComponent } from '../../revision-cancelacion/revision-decision-modal.component';


/**
 * Decisiones pendientes del docente en un grupo (DEC-065): estudiantes que cruzaron el umbral de inasistencia
 * y esperan que el titular mantenga la matrícula o proponga la cancelación al coordinador.
 * Escucha el canal realtime del grupo que ya abre `TeacherGruposComponent` al seleccionar el grupo
 * (misma conexión, `events()` es el flujo compartido): no abre ni cierra una segunda conexión.
 */
@Component({
  selector: 'app-teacher-grupo-decisiones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FechaCortaPipe, SemaforoAsistenciaComponent, EmptyStateComponent, RevisionDecisionModalComponent],
  template: `
    @if (error(); as msg) {
      <div class="p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-800" role="alert">{{ msg }}</div>
    }

    @if (pendientes().length > 0) {
      <section
        data-testid="decisiones-tarjeta"
        aria-labelledby="decisiones-titulo"
        class="bg-white rounded-2xl border border-warning-300 shadow-warm-sm overflow-hidden"
      >
        <div class="px-5 py-4 bg-warning-50 border-b border-warning-200">
          <h3 id="decisiones-titulo" class="font-serif font-bold text-lg text-warm-900">
            Decisiones pendientes
            <span class="ml-1 px-2 py-0.5 rounded-full text-xs bg-warning-100 text-warning-800">{{ pendientes().length }}</span>
          </h3>
          <p class="text-xs text-warm-700 mt-0.5">
            Estos estudiantes superaron el límite de inasistencia. Decide si mantienes su matrícula o propones la cancelación al coordinador.
          </p>
        </div>
        <ul class="divide-y divide-warm-100">
          @for (rev of pendientes(); track rev.id) {
            <li class="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3" data-testid="decision-fila">
              <div class="min-w-0 space-y-1">
                <p class="font-bold text-warm-900 truncate">{{ nombre(rev) }}</p>
                @if (rev.numeroIdentificacionEstudiante) {
                  <p class="text-xs font-mono text-warm-500" data-testid="decision-documento">{{ rev.numeroIdentificacionEstudiante }}</p>
                }
                <p class="flex flex-wrap items-center gap-2 text-xs text-warm-600">
                  <app-semaforo-asistencia [porcentaje]="porcentaje(rev)" [umbralPerdida]="rev.umbralPerdida" />
                  <span>
                    {{ porcentaje(rev) | number: '1.1-2' }} % de inasistencia
                    @if (rev.umbralPerdida != null) { (límite {{ rev.umbralPerdida }} %) }
                  </span>
                  @if (rev.fechaCreacionUtc) {
                    <span data-testid="decision-fecha">· Cruzó el umbral el {{ rev.fechaCreacionUtc | fechaCorta }}</span>
                  }
                </p>
              </div>
              <button
                type="button"
                data-testid="decision-decidir"
                (click)="abrir(rev)"
                class="min-h-[44px] px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
              >Decidir</button>
            </li>
          }
        </ul>
      </section>
    } @else if (mostrarVacio() && !error()) {
      <app-empty-state
        data-testid="decisiones-vacio"
        title="No hay decisiones pendientes"
        description="Ningún estudiante de este grupo está esperando tu decisión por inasistencia."
        causa="Aparecerán aquí cuando un estudiante supere el límite de inasistencia."
      />
    }

    <app-revision-decision-modal
      [(isOpen)]="modalAbierto"
      [revision]="seleccionada()"
      [estudianteNombre]="seleccionada() ? nombre(seleccionada()!) : ''"
      (decisionRegistrada)="alRegistrarDecision()"
    />
  `,
})
export class TeacherGrupoDecisionesComponent {
  private readonly servicio = inject(RevisionCancelacionService);
  private readonly realtime = inject(RealtimeService, { optional: true });
  private readonly toast = inject(ToastService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private suscripcionCarga?: Subscription;

  readonly grupoId = input<string>('');
  /** En modo Grupo se muestra un estado vacío discreto; en Hoy la tarjeta solo aparece si hay pendientes. */
  readonly mostrarVacio = input<boolean>(false);
  /** El hub recarga la planilla cuando el docente registra una decisión. */
  readonly decisionRegistrada = output<void>();

  protected readonly pendientes = signal<RevisionCancelacion[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly modalAbierto = signal(false);
  protected readonly seleccionada = signal<RevisionCancelacion | null>(null);

  protected readonly nombre = nombreEstudianteRevision;
  protected readonly porcentaje = porcentajeRevision;

  constructor() {
    effect(() => {
      const grupo = this.grupoId();
      untracked(() => {
        if (!grupo) {
          this.pendientes.set([]);
          return;
        }
        this.cargar();
      });
    });
    this.escucharRealtime();
    this.destroyRef.onDestroy(() => this.suscripcionCarga?.unsubscribe());
  }

  protected abrir(rev: RevisionCancelacion): void {
    this.seleccionada.set(rev);
    this.modalAbierto.set(true);
  }

  protected alRegistrarDecision(): void {
    this.cargar();
    this.decisionRegistrada.emit();
  }

  private cargar(): void {
    this.suscripcionCarga?.unsubscribe();
    this.suscripcionCarga = this.servicio
      .consultarDocente({ soloPendientes: true, grupoId: this.grupoId(), pagina: 1, tamano: 50 })
      .subscribe({
        next: (res) => {
          this.error.set(null);
          this.pendientes.set(res.elementos ?? []);
        },
        error: (err: unknown) => {
          this.pendientes.set([]);
          this.error.set(getApiErrorMessage(err));
        },
      });
  }

  private escucharRealtime(): void {
    if (!this.realtime) return;
    this.realtime.events().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evt) => {
      if (!evt || !this.grupoId()) return;
      if (evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_CREADA) {
        this.cargar();
        this.toast?.info(mensajeUi('UI_TEACHER_GRUPO_DECISIONES_001'));
      } else if (
        evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_DECIDIDA ||
        evt.type === REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESUELTA ||
        evt.type === REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA
      ) {
        this.cargar();
      }
    });
  }
}
