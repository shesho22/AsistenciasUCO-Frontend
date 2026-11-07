import { CancelacionSesion, detalleCancelacion } from '../../../../core/models/sesion-estado.model';
import { Component, ChangeDetectionStrategy, input, output, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { StudentAttendance, AttendanceStatus } from '../../../../core/models/attendance.model';
import {
  ATTENDANCE_WINDOW_MESSAGES,
  AttendanceWindowState,
} from '../../../../core/utils/session-attendance-window.util';

@Component({
  selector: 'app-attendance-control-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent, AvatarComponent],
  host: {
    class: 'block w-full'
  },
  template: `
    <div class="space-y-4">
      @if (windowMessage()) {
        <div
          role="status"
          class="flex items-start gap-2 bg-warning-50 border border-warning-200 text-warning-900 text-xs font-medium rounded-2xl px-3.5 py-2.5"
        >
          <svg class="w-4 h-4 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ windowMessage() }}@if (detalleCancelacion()) { <strong class="font-semibold"> {{ detalleCancelacion() }}.</strong> } La consulta del registro sigue disponible.</span>
        </div>
      }
      <!-- Barra Unificada Compacta: Buscador + Filtros -->
      <section class="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-warm-200 shadow-warm-sm">
        <!-- Buscador -->
        <div class="relative w-full md:w-72">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar por estudiante o código..."
            class="w-full bg-warm-50 text-warm-900 border border-warm-300 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-2.5 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Filtros Rápidos (Desplazables en móvil sin desbordar) -->
        <div class="flex items-center bg-warm-100/80 p-1 rounded-xl gap-1 shrink-0 w-full md:w-auto justify-start md:justify-end overflow-x-auto max-w-full">
          <button
            type="button"
            (click)="filterStatus.set('TODOS')"
            [class]="filterBtnClasses('TODOS')"
            class="whitespace-nowrap shrink-0"
          >
            Todos ({{ students().length }})
          </button>
          <button
            type="button"
            (click)="filterStatus.set('AN')"
            [class]="filterBtnClasses('AN')"
            class="whitespace-nowrap shrink-0"
          >
            Asistencia Normal
          </button>
          <button
            type="button"
            (click)="filterStatus.set('SJC')"
            [class]="filterBtnClasses('SJC')"
            class="whitespace-nowrap shrink-0"
          >
            Sin Justa Causa
          </button>
          <button
            type="button"
            (click)="filterStatus.set('EX')"
            [class]="filterBtnClasses('EX')"
            class="whitespace-nowrap shrink-0"
          >
            Excusa
          </button>
        </div>
      </section>

      <!-- Lista de Estudiantes -->
      @if (isLoading()) {
        <div class="space-y-2.5">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="bg-white p-3.5 rounded-2xl border border-warm-200 animate-pulse flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-warm-200 rounded-xl shrink-0"></div>
                <div class="space-y-1.5">
                  <div class="h-3 w-36 bg-warm-200 rounded"></div>
                  <div class="h-2 w-20 bg-warm-200 rounded"></div>
                </div>
              </div>
              <div class="h-7 w-28 bg-warm-200 rounded-xl"></div>
            </div>
          }
        </div>
      } @else {
        <!-- VISTA MÓVIL (<640px) -->
        <div class="block sm:hidden space-y-2.5">
          @for (student of filteredStudents(); track student.studentId; let idx = $index) {
            <div
              (click)="activeFocusedIndex.set(idx)"
              [class]="mobileCardClasses(idx)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <app-avatar [name]="student.studentName"></app-avatar>
                  <div class="min-w-0">
                    <p class="font-semibold text-warm-900 text-xs truncate leading-tight">{{ student.studentName }}</p>
                    <p class="text-[10px] font-mono text-warm-500 mt-0.5">{{ student.studentCode }}</p>
                    @if (student.status === null) {
                      <p class="text-[10px] font-semibold text-warning-700 mt-0.5">Sin registrar</p>
                    }
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  [disabled]="controlsDisabled()"
                  (click)="statusChange.emit({ studentId: student.studentId, status: 'AN' })"
                  [class]="mobileStatusBtnClasses(student.status, 'AN')"
                >
                  <svg class="w-3.5 h-3.5 mr-1 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Presente
                </button>
                <button
                  type="button"
                  [disabled]="controlsDisabled()"
                  (click)="statusChange.emit({ studentId: student.studentId, status: 'SJC' })"
                  [class]="mobileStatusBtnClasses(student.status, 'SJC')"
                >
                  <svg class="w-3.5 h-3.5 mr-1 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Ausente
                </button>
                <button
                  type="button"
                  [disabled]="controlsDisabled()"
                  (click)="openExcuseModal.emit(student)"
                  [class]="mobileStatusBtnClasses(student.status, 'EX')"
                >
                  <svg class="w-3.5 h-3.5 mr-1 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excusa
                </button>
              </div>
            </div>
          }

          <!-- Botón Móvil de Guardado -->
          <div class="pt-2">
            <app-button
              variant="primary"
              size="md"
              [fullWidth]="true"
              [loading]="isSaving()"
              [disabled]="controlsDisabled()"
              (clicked)="saveAttendance.emit()"
            >
              Guardar Asistencia
            </app-button>
          </div>
        </div>

        <!-- VISTA ESCRITORIO (>=640px Tabla de Alta Densidad) -->
        <div class="hidden sm:block">
          <app-card padding="none">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-warm-700">
                <thead class="bg-warm-100/70 border-b border-warm-200 uppercase text-[11px] font-bold text-warm-600 tracking-wider">
                  <tr>
                    <th class="py-3 px-4">Estudiante</th>
                    <th class="py-3 px-4">Código</th>
                    <th class="py-3 px-4 text-center">Estado de Asistencia</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100">
                  @for (student of filteredStudents(); track student.studentId; let idx = $index) {
                    <tr
                      (click)="activeFocusedIndex.set(idx)"
                      [class]="desktopRowClasses(idx)"
                    >
                      <td class="py-2.5 px-4">
                        <div class="flex items-center gap-3">
                          <app-avatar [name]="student.studentName"></app-avatar>
                          <div>
                            <p class="font-semibold text-warm-900 text-xs flex items-center gap-1.5">
                              {{ student.studentName }}
                            </p>
                            @if (student.status === null) {
                              <p class="text-[10px] font-semibold text-warning-700 mt-0.5">Sin registrar</p>
                            }
                          </div>
                        </div>
                      </td>

                      <td class="py-2.5 px-4 font-mono font-medium text-warm-600">
                        {{ student.studentCode }}
                      </td>

                      <td class="py-2.5 px-4">
                        <div class="flex items-center justify-center gap-1.5 bg-warm-100/80 p-0.5 rounded-xl border border-warm-200/80 max-w-fit mx-auto shadow-xs">
                          <button
                            type="button"
                            [disabled]="controlsDisabled()"
                            (click)="statusChange.emit({ studentId: student.studentId, status: 'AN' })"
                            [class]="segmentedChipClasses(student.status, 'AN')"
                          >
                            Asistencia Normal
                          </button>
                          <button
                            type="button"
                            [disabled]="controlsDisabled()"
                            (click)="statusChange.emit({ studentId: student.studentId, status: 'SJC' })"
                            [class]="segmentedChipClasses(student.status, 'SJC')"
                          >
                            Sin Justa Causa
                          </button>
                          <button
                            type="button"
                            [disabled]="controlsDisabled()"
                            (click)="openExcuseModal.emit(student)"
                            [class]="segmentedChipClasses(student.status, 'EX')"
                          >
                            Excusa
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- UNICO BOTÓN PRINCIPAL AL FINAL DE LA TABLA -->
            <div class="p-4 bg-warm-50/90 border-t border-warm-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span class="text-xs text-warm-600 font-medium">Fin del registro ({{ students().length }} alumnos en lista)</span>
              <app-button
                variant="primary"
                size="md"
                [loading]="isSaving()"
                [disabled]="controlsDisabled()"
                (clicked)="saveAttendance.emit()"
              >
                Guardar Asistencia
              </app-button>
            </div>
          </app-card>
        </div>
      }
    </div>
  `,
})
export class AttendanceControlTableComponent {
  students = input<StudentAttendance[]>([]);
  isLoading = input<boolean>(false);
  isSaving = input<boolean>(false);
  sessionsEnabled = input<boolean>(true);
  attendanceEnabled = input<boolean>(true);
  /** SES-01: estado derivado de los instantes v2; no es un estado persistido de la sesión. */
  attendanceWindowState = input<AttendanceWindowState>('ABIERTA');
  /** HU047: detalle de la cancelación de la sesión mostrada (motivo o festivo), tal como lo entrega el backend. */
  cancelacion = input<CancelacionSesion | null | undefined>(null);
  detalleCancelacion = computed(() =>
    this.attendanceWindowState() === 'CANCELADA' ? detalleCancelacion(this.cancelacion()) : ''
  );

  // Gate de los controles: features + guardado en curso + ventana de registro (SES-01). La ventana
  // se deriva en el frontend solo para presentar; backend/DB la validan con su reloj y rechazan con 409.
  controlsDisabled = computed(
    () =>
      !this.sessionsEnabled() ||
      !this.attendanceEnabled() ||
      this.isSaving() ||
      this.attendanceWindowState() !== 'ABIERTA'
  );

  windowMessage = computed(() => {
    const state = this.attendanceWindowState();
    return state === 'ABIERTA' ? '' : ATTENDANCE_WINDOW_MESSAGES[state];
  });

  statusChange = output<{ studentId: string; status: AttendanceStatus }>();
  openExcuseModal = output<StudentAttendance>();
  saveAttendance = output<void>();

  searchQuery = signal<string>('');
  filterStatus = signal<'TODOS' | AttendanceStatus>('TODOS');
  activeFocusedIndex = signal<number>(-1);

  filteredStudents = computed(() => {
    let result = this.students();
    const status = this.filterStatus();
    if (status !== 'TODOS') {
      result = result.filter((s) => s.status === status);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q)
      );
    }
    return result;
  });

  filterBtnClasses(status: 'TODOS' | AttendanceStatus): string {
    const isSelected = this.filterStatus() === status;
    return isSelected
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-warm-900 shadow-xs transition-all'
      : 'px-3 py-1.5 rounded-lg text-xs font-medium text-warm-600 hover:text-warm-900 transition-all';
  }

  mobileCardClasses(idx: number): string {
    const isFocused = this.activeFocusedIndex() === idx;
    return `bg-white p-3 rounded-2xl border ${isFocused ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-warm-200'} shadow-warm-xs space-y-2.5 transition-all`;
  }

  mobileStatusBtnClasses(current: AttendanceStatus | null, target: AttendanceStatus): string {
    const isSelected = current === target;
    if (target === 'AN') {
      return isSelected
        ? 'py-1.5 px-2 rounded-xl text-[11px] font-bold bg-success-600 text-white shadow-xs'
        : 'py-1.5 px-2 rounded-xl text-[11px] font-medium bg-warm-100 text-warm-700';
    }
    if (target === 'SJC') {
      return isSelected
        ? 'py-1.5 px-2 rounded-xl text-[11px] font-bold bg-danger-600 text-white shadow-xs'
        : 'py-1.5 px-2 rounded-xl text-[11px] font-medium bg-warm-100 text-warm-700';
    }
    return isSelected
      ? 'py-1.5 px-2 rounded-xl text-[11px] font-bold bg-warning-600 text-white shadow-xs'
      : 'py-1.5 px-2 rounded-xl text-[11px] font-medium bg-warm-100 text-warm-700';
  }

  desktopRowClasses(idx: number): string {
    const isFocused = this.activeFocusedIndex() === idx;
    return `${isFocused ? 'bg-primary-50/40' : 'hover:bg-warm-50/60'} transition-colors`;
  }

  segmentedChipClasses(current: AttendanceStatus | null, target: AttendanceStatus): string {
    const isSelected = current === target;
    if (target === 'AN') {
      return isSelected
        ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-success-600 text-white shadow-xs transition-all'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium text-warm-600 hover:text-warm-900 transition-all';
    }
    if (target === 'SJC') {
      return isSelected
        ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-danger-600 text-white shadow-xs transition-all'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium text-warm-600 hover:text-warm-900 transition-all';
    }
    return isSelected
      ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-warning-600 text-white shadow-xs transition-all'
      : 'px-3 py-1.5 rounded-lg text-xs font-medium text-warm-600 hover:text-warm-900 transition-all';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.controlsDisabled()) {
      return;
    }

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const currentList = this.filteredStudents();
    if (currentList.length === 0) return;

    const idx = Math.max(0, this.activeFocusedIndex());
    const currentStudent = currentList[idx];
    const statusOrder: AttendanceStatus[] = ['AN', 'SJC', 'EX'];

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeFocusedIndex.set((idx + 1) % currentList.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeFocusedIndex.set((idx - 1 + currentList.length) % currentList.length);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const currentPos =
        currentStudent.status === null
          ? -1
          : statusOrder.indexOf(currentStudent.status);
      const nextStatus = statusOrder[(currentPos + 1) % statusOrder.length];
      this.statusChange.emit({ studentId: currentStudent.studentId, status: nextStatus });
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const currentPos =
        currentStudent.status === null
          ? 0
          : statusOrder.indexOf(currentStudent.status);
      const prevStatus = statusOrder[(currentPos - 1 + statusOrder.length) % statusOrder.length];
      this.statusChange.emit({ studentId: currentStudent.studentId, status: prevStatus });
    } else if (event.key === '1') {
      this.statusChange.emit({ studentId: currentStudent.studentId, status: 'AN' });
    } else if (event.key === '2') {
      this.statusChange.emit({ studentId: currentStudent.studentId, status: 'SJC' });
    } else if (event.key === '3') {
      this.openExcuseModal.emit(currentStudent);
    }
  }
}
