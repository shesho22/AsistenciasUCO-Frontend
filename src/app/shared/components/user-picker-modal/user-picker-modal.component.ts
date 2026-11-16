import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { BadgeComponent } from '../badge/badge.component';
import { TeacherService } from '../../../core/services/teacher.service';
import { classifyLoadError, LoadErrorState } from '../../../core/api/errors/load-error.util';
import { ErrorCargaComponent } from '../error-carga/error-carga.component';
import { ModalComponent } from '../modal/modal.component';

export interface UserPickerItem {
  id: string;
  numeroIdentificacion: string;
  tipoIdentificacion?: string;
  primerNombre?: string;
  primerApellido?: string;
  segundoNombre?: string;
  segundoApellido?: string;
  nombres: string;
  apellidos: string;
  /** Solo si el backend lo entrega; el directorio de docentes (`GET /docentes`) no incluye correo. */
  correo?: string;
  dependenciaOPrograma?: string;
  rolActual?: string;
}

@Component({
    selector: 'app-user-picker-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent, FormsModule, ButtonComponent, BadgeComponent, ErrorCargaComponent],
    template: `
    <app-modal [isOpen]="isOpen()" [title]="title()" [subtitulo]="subtitle()" tamano="2xl" (closed)="cancelar()">
      <div modal-encabezado class="flex items-center gap-2 mt-1">
        <app-badge variant="neutral" size="sm">{{ roleBadge() }}</app-badge>
        <span class="text-xs text-warm-400" aria-hidden="true">•</span>
        <span class="text-xs font-semibold text-primary-700">Comunidad Universitaria</span>
      </div>

      <!-- Barra de Búsqueda -->
      <div class="pb-3 border-b border-warm-100/60 bg-white">
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar por cédula, nombre completo o correo institucional..."
            class="w-full pl-10 pr-4 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-warm-400"
          />
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-warm-500">
          <span>Coincidencias encontradas: {{ filteredUsers().length }}</span>
          <span class="italic text-warm-400">Selecciona una persona para vincular</span>
        </div>
      </div>

      <!-- Lista de Personas -->
      <div class="pt-4 overflow-y-auto space-y-2.5 max-h-[50vh] divide-y divide-warm-100">
        @if (isLoading()) {
          <div class="py-12 flex flex-col items-center justify-center text-center">
            <div class="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="text-sm font-medium text-warm-600">Consultando directorio universitario...</p>
          </div>
        } @else if (error(); as fallo) {
          <app-error-carga [error]="fallo" (reintentar)="cargarDirectorio()" />
        } @else if (filteredUsers().length === 0) {
          <div class="py-12 flex flex-col items-center justify-center text-center px-4">
            <div class="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center text-warm-400 mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h4 class="text-sm font-semibold text-warm-800 mb-1">No se encontraron resultados</h4>
            <p class="text-xs text-warm-500 max-w-sm">
              No hay ninguna persona registrada con los criterios ingresados. Puedes registrarla como nueva si es necesario.
            </p>
            @if (allowNew()) {
              <div class="mt-4">
                <app-button variant="secondary" size="sm" (clicked)="crearNuevo()">
                  <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar como nuevo
                </app-button>
              </div>
            }
          </div>
        } @else {
          @for (user of filteredUsers(); track user.id) {
            <div class="pt-2.5 first:pt-0 flex items-center justify-between p-3 rounded-2xl hover:bg-primary-50/40 border border-transparent hover:border-primary-100 transition-all group">
              <div class="flex items-center gap-3.5 min-w-0">
                <!-- Avatar con iniciales -->
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                  {{ getInitials(user.nombres, user.apellidos) }}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-semibold text-warm-900 truncate">
                      {{ user.nombres }} {{ user.apellidos }}
                    </h4>
                    @if (user.rolActual) {
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-warm-100 text-warm-700">
                        {{ user.rolActual }}
                      </span>
                    }
                  </div>
                  <div class="flex flex-wrap items-center gap-y-0.5 gap-x-3 text-xs text-warm-500 mt-0.5">
                    @if (user.numeroIdentificacion) {
                      <span class="font-mono text-warm-700">Doc: {{ user.numeroIdentificacion }}</span>
                    }
                    @if (user.correo) {
                      @if (user.numeroIdentificacion) {
                        <span>•</span>
                      }
                      <span class="truncate text-primary-700 font-medium">{{ user.correo }}</span>
                    }
                    @if (user.dependenciaOPrograma) {
                      <span>•</span>
                      <span class="truncate text-warm-500">{{ user.dependenciaOPrograma }}</span>
                    }
                  </div>
                </div>
              </div>

              <div class="shrink-0 pl-3">
                <app-button variant="primary" size="sm" (clicked)="seleccionar(user)">
                  <span>Vincular</span>
                  <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </app-button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Footer del Modal -->
      <div modal-footer class="w-full flex items-center justify-between">
        @if (allowNew()) {
          <button
            type="button"
            (click)="crearNuevo()"
            class="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1.5 focus:outline-none"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            ¿No se encuentra en la lista? Registrar nuevo
          </button>
        } @else {
          <div></div>
        }

        <app-button variant="secondary" size="sm" (clicked)="cancelar()">
          Cerrar
        </app-button>
      </div>
    </app-modal>
  `
})
export class UserPickerModalComponent implements OnInit {
  private teacherService = inject(TeacherService);

  isOpen = input<boolean>(false);
  title = input<string>('Seleccionar Docente o Funcionario');
  subtitle = input<string>('Busca por documento, nombre o correo institucional para vincularlo.');
  roleBadge = input<string>('Personal UCO');
  allowNew = input<boolean>(true);
  customUsers = input<UserPickerItem[] | null>(null);

  userSelected = output<UserPickerItem>();
  requestNew = output<void>();
  cancelled = output<void>();

  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  /** Fallo al consultar el directorio: se muestra como error con reintento, nunca como lista vacía ni con datos de respaldo. */
  error = signal<LoadErrorState | null>(null);
  usersList = signal<UserPickerItem[]>([]);

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const source = this.customUsers() ?? this.usersList();

    if (!query) {
      return source;
    }

    return source.filter((u) => {
      const matchName =
        u.nombres.toLowerCase().includes(query) ||
        u.apellidos.toLowerCase().includes(query);
      const matchDoc = u.numeroIdentificacion.toLowerCase().includes(query);
      const matchEmail = (u.correo ?? '').toLowerCase().includes(query);
      const matchDep = (u.dependenciaOPrograma || '').toLowerCase().includes(query);

      return matchName || matchDoc || matchEmail || matchDep;
    });
  });

  ngOnInit(): void {
    if (!this.customUsers()) {
      this.cargarDirectorio();
    }
  }

  /** Muestra solo lo que entrega el backend: lo que no viene (correo, tipo de documento, dependencia) no se muestra. */
  cargarDirectorio(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.teacherService.getAllTeachers().subscribe({
      next: (teachers) => {
        this.usersList.set(
          (Array.isArray(teachers) ? teachers : []).map((t): UserPickerItem => ({
            id: t.id,
            numeroIdentificacion: t.numeroIdentificacion === null || t.numeroIdentificacion === undefined ? '' : String(t.numeroIdentificacion),
            nombres: t.nombreCompleto ?? '',
            apellidos: '',
            rolActual: 'DOCENTE',
          }))
        );
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.usersList.set([]);
        this.error.set(classifyLoadError(error));
        this.isLoading.set(false);
      },
    });
  }

  getInitials(nombres: string, apellidos: string): string {
    const nombre = (nombres || '').trim();
    const apellido = (apellidos || '').trim();
    if (apellido) return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U';
    // El directorio entrega el nombre completo en un solo campo: iniciales de su primera y última palabra (solo presentación).
    const palabras = nombre.split(/\s+/).filter(Boolean);
    const iniciales = palabras.length > 1 ? palabras[0].charAt(0) + palabras[palabras.length - 1].charAt(0) : (palabras[0] ?? '').charAt(0);
    return iniciales.toUpperCase() || 'U';
  }

  seleccionar(user: UserPickerItem): void {
    this.userSelected.emit(user);
  }

  crearNuevo(): void {
    this.requestNew.emit();
  }

  cancelar(): void {
    this.cancelled.emit();
  }
}
