import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ToastService } from '../../../../../shared/components/toast/toast.component';
import { Course } from '../../../../../core/models/course.model';

@Component({
  selector: 'app-teacher-matricula-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
  template: `
    @if (isOpen() && curso()) {
      <div class="fixed inset-0 bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white rounded-3xl border border-warm-200 shadow-warm-2xl max-w-lg w-full overflow-hidden animate-scale-up">
          <!-- Header Modal Matrícula -->
          <div class="p-6 border-b border-warm-100 flex items-center justify-between bg-emerald-900 text-white">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-400 text-emerald-950 flex items-center justify-center font-bold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 class="font-serif font-bold text-xl leading-tight">
                  Inscripción y Matrícula al Grupo
                </h3>
                <p class="text-xs text-emerald-200">
                  {{ curso()?.name }} • {{ curso()?.code }} ({{ curso()?.section }})
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="closed.emit()"
              class="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 sm:p-8 space-y-6 text-center">
            <p class="text-xs sm:text-sm text-warm-600">
              Comparte este código PIN o proyecta el código QR para que los estudiantes se matriculen automáticamente a este grupo desde su portal estudiantil.
            </p>

            <!-- Bento: PIN & QR Matrícula -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <!-- Tarjeta PIN Matrícula -->
              <div class="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-warm-sm space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Código de Grupo (PIN)
                </span>
                <div class="font-mono font-extrabold text-3xl sm:text-4xl text-emerald-950 tracking-wider my-2 select-all">
                  {{ curso()?.id }}
                </div>
                <button
                  type="button"
                  (click)="copiarPin()"
                  class="w-full py-2 px-3 text-xs font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition-all shadow-xs inline-flex items-center justify-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copiar Código
                </button>
              </div>

              <!-- Tarjeta QR Matrícula -->
              <div class="p-5 rounded-2xl bg-warm-50 border-2 border-warm-200 shadow-warm-sm flex flex-col items-center space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-warm-700">
                  Escanear para Matricularse
                </span>
                <div class="w-36 h-36 bg-white p-2 rounded-xl border border-warm-300 shadow-inner flex items-center justify-center">
                  <img
                    [src]="qrUrl()"
                    alt="Código QR de Matrícula"
                    class="w-full h-full object-contain"
                  />
                </div>
                <span class="text-[11px] font-mono text-warm-500">
                  ID: {{ curso()?.code }}
                </span>
              </div>
            </div>

            <!-- Enlace Directo Estudiante -->
            <div class="p-3.5 rounded-2xl bg-warm-50 border border-warm-200 flex items-center justify-between text-left gap-3">
              <div class="truncate text-xs text-warm-600">
                <span class="font-bold text-warm-800">Enlace de auto-matrícula:</span>
                <div class="font-mono text-[11px] truncate text-warm-500">
                  /app/estudiante/materias?matricularGrupo={{ curso()?.id }}
                </div>
              </div>
              <button
                type="button"
                (click)="copiarEnlace()"
                class="shrink-0 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-warm-100 border border-warm-300 rounded-lg text-warm-700 transition-colors"
              >
                Copiar Enlace
              </button>
            </div>
          </div>

          <div class="p-4 border-t border-warm-100 bg-warm-50/70 flex items-center justify-end">
            <app-button variant="secondary" size="sm" (clicked)="closed.emit()">
              Cerrar
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TeacherMatriculaModalComponent {
  private toast = inject(ToastService);

  isOpen = input.required<boolean>();
  curso = input<Course | null>(null);
  closed = output<void>();

  qrUrl = computed(() => {
    const id = this.curso()?.id || 'demo';
    const payload = `${window.location.origin}/app/estudiante/materias?matricularGrupo=${encodeURIComponent(id)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(payload)}`;
  });

  copiarPin(): void {
    const id = this.curso()?.id;
    if (id) {
      void navigator.clipboard?.writeText(id);
      this.toast.success('Código PIN de matrícula copiado al portapapeles.');
    }
  }

  copiarEnlace(): void {
    const id = this.curso()?.id;
    if (id) {
      const url = `${window.location.origin}/app/estudiante/materias?matricularGrupo=${encodeURIComponent(id)}`;
      void navigator.clipboard?.writeText(url);
      this.toast.success('Enlace de matrícula copiado al portapapeles.');
    }
  }
}
