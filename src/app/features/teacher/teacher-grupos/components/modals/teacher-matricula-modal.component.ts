import { Component, ChangeDetectionStrategy, Injector, input, output, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ToastService } from '../../../../../shared/components/toast/toast.component';
import { Course } from '../../../../../core/models/course.model';
import { MatriculaQrService } from '../../../../../core/services/matricula-qr.service';
import { GroupService } from '../../../../../core/services/group.service';
import { ProgramaResumen } from '../../../../../core/models/role-management.model';
import { RealtimeService } from '../../../../../core/realtime/realtime.service';
import { getApiErrorMessage } from '../../../../../core/api/errors/api-error.util';
import {
  EstudianteMatriculadoPayload,
  MATRICULA_QR_EVENT,
  MatriculaQrRotadoPayload,
  VentanaMatricula,
} from '../../../../../core/models/matricula-qr.model';

/**
 * HU176B: ventana de matricula por QR/PIN rotativo. El QR, el PIN y la URL los genera el backend (nunca el cliente ni un
 * tercero). El QR se renueva solo: el backend rota el token y lo empuja por el SSE del grupo (evento
 * `MATRICULA_QR_ROTADO`), sin timers ni polling. Si el stream se reconecta, se pide un codigo fresco porque el token en
 * claro no se guarda. La hora de fin de la ventana se muestra como hora absoluta, sin cuenta regresiva.
 */
@Component({
  selector: 'app-teacher-matricula-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
  template: `
    @if (isOpen() && curso()) {
      <div class="fixed inset-0 bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white rounded-3xl border border-warm-200 shadow-warm-2xl max-w-lg w-full overflow-hidden animate-scale-up">
          <div class="p-6 border-b border-warm-100 flex items-center justify-between bg-primary-900 text-white">
            <div>
              <h3 class="font-serif font-bold text-xl leading-tight">Inscripción y Matrícula al Grupo</h3>
              <p class="text-xs text-success-200">
                {{ curso()?.name }}{{ curso()?.code ? ' • ' + curso()?.code : '' }} ({{ curso()?.section }})
              </p>
            </div>
            <button
              type="button"
              aria-label="Ocultar"
              data-testid="matricula-ocultar"
              (click)="closed.emit()"
              class="p-2 rounded-xl text-primary-200 hover:text-white hover:bg-primary-800 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 sm:p-8 space-y-5 text-center">
            @if (cargando()) {
              <p class="text-sm text-warm-600" role="status" data-testid="matricula-cargando">Generando el código de matrícula…</p>
            } @else if (error()) {
              <p class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3" role="alert" data-testid="matricula-error">
                {{ error() }}
              </p>
              <app-button variant="secondary" size="sm" (clicked)="reintentar()">Reintentar</app-button>
            } @else if (esperandoPrograma()) {
              <p class="text-xs sm:text-sm text-warm-600">
                Este grupo pertenece a varios programas. Elige el programa al que se matricularán los estudiantes que
                usen este código.
              </p>
              <label class="block text-left text-xs font-semibold text-warm-700">
                Programa
                <select
                  data-testid="matricula-programa"
                  class="mt-1 w-full px-3.5 py-2.5 bg-white border border-warm-300 rounded-xl text-sm text-warm-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  [value]="programaElegido()"
                  (change)="programaElegido.set($any($event.target).value)"
                >
                  <option value="">Selecciona el programa</option>
                  @for (p of programas(); track p.idPrograma) {
                    <option [value]="p.idPrograma" [selected]="p.idPrograma === programaElegido()">{{ p.nombrePrograma }}</option>
                  }
                </select>
              </label>
              <app-button variant="primary" size="sm" [disabled]="!programaElegido()" (clicked)="abrirConPrograma()">
                Abrir matrícula
              </app-button>
            } @else {
              @if (ventana(); as v) {
              <p class="text-xs sm:text-sm text-warm-600">
                Proyecta el código QR o comparte el PIN. El código cambia automáticamente cada pocos segundos: pide a los
                estudiantes que lo escaneen desde la red Wi-Fi del campus.
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                <div class="p-5 rounded-2xl bg-success-50 border-2 border-success-300 shadow-warm-sm space-y-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-success-800">PIN de matrícula</span>
                  <div class="font-mono font-extrabold text-3xl sm:text-4xl text-success-950 tracking-wider my-2 select-all" data-testid="matricula-pin">
                    {{ v.pin }}
                  </div>
                  <button type="button" (click)="copiarPin()" class="w-full py-2 px-3 text-xs font-bold bg-white hover:bg-primary-100 text-primary-800 border border-primary-300 rounded-xl transition-all">
                    Copiar PIN
                  </button>
                </div>

                <div class="p-5 rounded-2xl bg-warm-50 border-2 border-warm-200 shadow-warm-sm flex flex-col items-center space-y-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-warm-700">Escanear para matricularse</span>
                  <div class="w-40 h-40 bg-white p-2 rounded-xl border border-warm-300 shadow-inner flex items-center justify-center">
                    <img
                      [src]="'data:image/png;base64,' + v.qrPngBase64"
                      alt="Código QR de matrícula"
                      data-testid="matricula-qr"
                      class="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <p class="text-[11px] text-warm-500" data-testid="matricula-fin">
                La ventana de matrícula termina a las {{ v.fechaExpiracionUtc | date: 'shortTime' }}.
              </p>

              <div class="flex flex-wrap items-center justify-center gap-2">
                <button type="button" (click)="copiarEnlace()" class="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-warm-100 border border-warm-300 rounded-lg text-warm-700 transition-colors">
                  Copiar enlace
                </button>
                <button type="button" data-testid="matricula-regenerar" (click)="regenerar()" class="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-warm-100 border border-warm-300 rounded-lg text-warm-700 transition-colors">
                  Generar nuevo código
                </button>
              </div>
              }
            }
          </div>

          <div class="p-4 border-t border-warm-100 bg-warm-50/70 flex items-center justify-end gap-2">
            <app-button variant="secondary" size="sm" (clicked)="closed.emit()">Ocultar</app-button>
            <app-button variant="primary" size="sm" (clicked)="cerrarMatricula()">Cerrar matrícula</app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TeacherMatriculaModalComponent {
  private readonly toast = inject(ToastService);
  // Se resuelven al abrir el modal: el componente se instancia siempre dentro de otras pantallas (aunque este cerrado) y
  // no debe exigirles HttpClient ni el transporte realtime hasta que se use.
  private readonly injector = inject(Injector);

  private get matriculaQr(): MatriculaQrService {
    return this.injector.get(MatriculaQrService);
  }

  private get grupos(): GroupService {
    return this.injector.get(GroupService);
  }

  private get realtime(): RealtimeService {
    return this.injector.get(RealtimeService);
  }

  isOpen = input.required<boolean>();
  curso = input<Course | null>(null);
  /** Oculta el modal; la ventana sigue abierta y rotando hasta que se cierre la matrícula. */
  closed = output<void>();
  /** Un estudiante se matriculó: el padre vuelve a pedir el roster del grupo. */
  matriculado = output<string>();

  /** Programas del grupo: con más de uno, el programa es obligatorio antes de abrir la ventana (S3 mínimo). */
  readonly programas = signal<ProgramaResumen[]>([]);
  readonly programaElegido = signal('');
  readonly esperandoPrograma = computed(() => this.programas().length > 1 && !this.ventana());

  readonly ventana = signal<VentanaMatricula | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const abierto = this.isOpen();
      const grupoId = this.curso()?.id;
      if (!abierto || !grupoId) {
        untracked(() => this.resetear());
        return;
      }
      const suscripciones = new Subscription();
      untracked(() => this.iniciar(grupoId, suscripciones));
      onCleanup(() => suscripciones.unsubscribe());
    });
  }

  reintentar(): void {
    const grupoId = this.curso()?.id;
    if (grupoId) {
      this.abrir(grupoId, this.programaElegido() || undefined);
    }
  }

  abrirConPrograma(): void {
    const grupoId = this.curso()?.id;
    const programa = this.programaElegido();
    if (grupoId && programa) {
      this.abrir(grupoId, programa);
    }
  }

  regenerar(): void {
    const grupoId = this.curso()?.id;
    if (!grupoId) {
      return;
    }
    this.matriculaQr.rotarVentana(grupoId).subscribe({
      next: (ventana) => this.ventana.set(ventana),
      error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  cerrarMatricula(): void {
    const grupoId = this.curso()?.id;
    if (!grupoId) {
      this.closed.emit();
      return;
    }
    this.matriculaQr.cerrarVentana(grupoId).subscribe({
      next: () => {
        this.toast.success('La matrícula por código quedó cerrada.');
        this.closed.emit();
      },
      error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  copiarPin(): void {
    const pin = this.ventana()?.pin;
    if (pin) {
      void navigator.clipboard?.writeText(pin);
      this.toast.success('PIN de matrícula copiado al portapapeles.');
    }
  }

  copiarEnlace(): void {
    const url = this.ventana()?.urlMatricula;
    if (url) {
      void navigator.clipboard?.writeText(url);
      this.toast.success('Enlace de matrícula copiado al portapapeles.');
    }
  }

  private iniciar(grupoId: string, suscripciones: Subscription): void {
    this.resolverProgramas(grupoId);

    // El stream es por grupo y solo lo recibe el docente titular (CONTRACT A3).
    this.realtime.startForGroup(grupoId);
    suscripciones.add(
      this.realtime.listenType<MatriculaQrRotadoPayload>(MATRICULA_QR_EVENT.ROTADO).subscribe((evento) => {
        const payload = evento.payload;
        if (payload?.grupo !== grupoId) {
          return;
        }
        const actual = this.ventana();
        if (actual) {
          this.ventana.set({ ...actual, ...payload, idVentana: actual.idVentana });
        }
      })
    );
    suscripciones.add(
      this.realtime.listenType<EstudianteMatriculadoPayload>(MATRICULA_QR_EVENT.MATRICULADO).subscribe((evento) => {
        if (evento.payload?.grupo === grupoId) {
          this.matriculado.emit(grupoId);
        }
      })
    );

    // Tras una reconexion se pierde la rotacion en curso y el token en claro no se guarda: se pide un codigo fresco.
    let anterior: string | null = null;
    suscripciones.add(
      this.realtime.connectionState$.subscribe((estado) => {
        if (anterior === 'RECONNECTING' && estado === 'CONNECTED') {
          this.regenerar();
        }
        anterior = estado;
      })
    );
  }

  /** Con un solo programa (o sin la lista) la ventana se abre de inmediato; con varios, el docente elige primero. */
  private resolverProgramas(grupoId: string): void {
    this.cargando.set(true);
    this.error.set(null);
    this.grupos.getProgramasGrupo(grupoId).subscribe({
      next: (res) => {
        const lista = res.datos ?? [];
        if (lista.length > 1) {
          this.programas.set(lista);
          this.cargando.set(false);
          return;
        }
        this.programas.set([]);
        this.abrir(grupoId);
      },
      // Sin la lista se intenta abrir igual: el backend resuelve el programa o responde con su mensaje.
      error: () => this.abrir(grupoId),
    });
  }

  private abrir(grupoId: string, programaId?: string): void {
    this.cargando.set(true);
    this.error.set(null);
    const apertura = programaId ? this.matriculaQr.abrirVentana(grupoId, programaId) : this.matriculaQr.abrirVentana(grupoId);
    apertura.subscribe({
      next: (ventana) => {
        this.ventana.set(ventana);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.ventana.set(null);
        this.error.set(getApiErrorMessage(err));
        this.cargando.set(false);
      },
    });
  }

  private resetear(): void {
    this.programas.set([]);
    this.programaElegido.set('');
    this.ventana.set(null);
    this.cargando.set(false);
    this.error.set(null);
  }
}
