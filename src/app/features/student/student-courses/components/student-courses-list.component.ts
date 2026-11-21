import { formatearHorasMinutos } from '../../../../shared/pipes/horas-minutos.util';
import { HorasMinutosPipe } from '../../../../shared/pipes/horas-minutos.pipe';
import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';

import { AttendanceStatusBadgeComponent } from '../../../../shared/components/attendance-status-badge/attendance-status-badge.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { MateriaEstudianteItem, ResumenMateriasEstudiante } from '../../../../core/models/role-management.model';
import { LoadErrorState } from '../../../../core/api/errors/load-error.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

/** Minúsculas y sin tildes, para que "calculo" encuentre "Cálculo". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Parte de `total` que representa `valor`, entre 0 y 100. */
function porcentajeAcotado(valor: number, total: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (valor / total) * 100));
}

/** Lo que dibuja la barra de horas de una tarjeta. */
interface BarraHoras {
  /** Hay horas programadas (> 0): se dibuja la barra. Si no, se explica por qué no. */
  conBarra: boolean;
  asistidas: number;
  dictadas: number;
  /** `null` = el backend no las informa; 0 = el grupo aún no tiene sesiones. */
  programadas: number | null;
  anchoAsistidas: number;
  anchoDictadas: number;
  /** Porcentaje del curso ya dictado, en entero. */
  porcentajeAvance: number;
  /** Texto alternativo de la barra. */
  descripcion: string;
}

@Component({
    selector: 'app-student-courses-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [HorasMinutosPipe, PageHeaderComponent, BadgeComponent, ButtonComponent, AttendanceStatusBadgeComponent, PaginationComponent],
    template: `
    <div class="space-y-4">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Portal Estudiantil"
        contexto="Materias matriculadas"
        titulo="Gestión de Mis Materias"
        descripcion="Selecciona una asignatura para abrir su vista completa de sesiones, revisar tu registro de asistencia y radicar justificaciones."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="openCodeEnrollment.emit()"
            class="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            title="Matricularse a un grupo académico ingresando el código PIN o enlace provisto por el docente"
          >
            <svg class="w-4 h-4 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Matricularse con Código
          </button>

          <button
            type="button"
            (click)="registrarConPin.emit()"
            data-testid="registrar-con-pin"
            class="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            title="Registrar tu asistencia con el PIN de 6 dígitos que proyecta el docente"
          >
            <svg class="w-4 h-4 text-success-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Registrar asistencia con PIN
          </button>
        </div>
      </app-page-header>

      <!-- Métricas Generales -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="superficie p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Materias Inscritas</span>
            @if (resumen(); as r) {
              <p class="text-2xl font-serif font-bold text-warm-900" data-testid="resumen-total-materias">{{ r.totalMaterias }}</p>
            } @else {
              <p class="text-base font-serif font-bold text-warm-500" data-testid="materias-no-disponible">No disponible</p>
            }
          </div>
        </div>

        <div class="superficie p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-success-50 text-success-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Materias en riesgo</span>
            @if (materiasEnRiesgo() !== null) {
              <p class="text-2xl font-serif font-bold text-warm-900">{{ materiasEnRiesgo() }}</p>
            } @else {
              <p class="text-base font-serif font-bold text-warm-500" data-testid="riesgo-no-disponible">No disponible</p>
            }
          </div>
        </div>

        <div class="superficie p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-warning-50 text-warning-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Horas de falta</span>
            @if (resumen(); as r) {
              <p class="text-2xl font-serif font-bold text-warm-900">{{ r.totalHorasFalta | horasMinutos }}</p>
            } @else {
              <p class="text-base font-serif font-bold text-warm-500" data-testid="horas-falta-no-disponible">No disponible</p>
            }
          </div>
        </div>
      </div>

      <!-- HU007 (CERT-CULM001): búsqueda y filtrado de las materias matriculadas -->
      @if (!isLoading() && !error() && materias().length > 0) {
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <label for="buscar-materia" class="text-xs font-semibold text-warm-700 shrink-0">Buscar materia</label>
          <input
            id="buscar-materia"
            type="search"
            aria-label="Buscar materia por nombre, código, grupo o docente"
            placeholder="Nombre, código, grupo o docente"
            #campoBusqueda
            [value]="busqueda()"
            (input)="buscar(campoBusqueda.value)"
            class="w-full sm:max-w-sm bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-testid="buscar-materia"
          />
          @if (busqueda().trim()) {
            <span class="text-xs text-warm-500" aria-live="polite" data-testid="resultado-busqueda">{{ materiasFiltradas().length }} de {{ materias().length }} materias</span>
          }
        </div>
      }

      <!-- Grid de Materias -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (n of [1, 2, 3, 4]; track n) {
            <div class="h-52 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else if (error()) {
        <div class="bg-white p-8 rounded-2xl border border-danger-200 text-center space-y-3" role="alert" data-testid="materias-error">
          <p class="text-sm font-bold text-danger-800">{{ error()!.titulo }}</p>
          <p class="text-xs text-warm-600">{{ error()!.mensaje }}</p>
          <app-button variant="secondary" size="sm" (clicked)="retry.emit()">Reintentar</app-button>
        </div>
      } @else {
        @if (materiasPagina().length === 0) {
          @if (materias().length === 0) {
            <div class="superficie px-4 py-6 text-center" data-testid="materias-vacio">
              <p class="text-xs text-warm-500">No tienes asignaturas matriculadas actualmente.</p>
            </div>
          } @else {
            <p class="text-sm text-warm-600 text-center py-4" data-testid="sin-coincidencias">
              No hay materias que coincidan con «{{ busqueda().trim() }}».
            </p>
          }
        } @else {
          <div class="tabla-scroll" role="region" tabindex="0" aria-label="Materias matriculadas">
            <table class="tabla-tarjetas tabla-tarjetas-compacta w-full min-w-[56rem] text-sm" data-testid="materias-tabla">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="col-fija py-2 pr-3">Materia</th>
                  <th scope="col" class="py-2 pr-3">Grupo</th>
                  <th scope="col" class="py-2 pr-3">Docente</th>
                  <th scope="col" class="py-2 pr-3">Horario</th>
                  <th scope="col" class="py-2 pr-3">Asistencia</th>
                  <th scope="col" class="py-2 pr-3">Horas de la materia</th>
                  <th scope="col" class="py-2 pr-3">Estado</th>
                  <th scope="col" class="py-2 text-right"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (materia of materiasPagina(); track materia.claveGrupo) {
                  <tr class="border-b border-warm-50 align-top" data-testid="materia-fila">
                    <td class="col-fija tc-ancho py-2 pr-3">
                      <span class="block font-semibold text-warm-900 leading-snug">
                        @if (materia.codigo) {
                          <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded-md bg-warm-100 text-warm-800 mr-1">{{ materia.codigo }}</span>
                        }
                        {{ materia.nombre }}
                      </span>
                      @if (materia.creditos || materia.caracter) {
                        <span class="block text-xs text-warm-500" data-testid="materia-creditos-caracter">
                          @if (materia.creditos) { <span>{{ materia.creditos }} créditos</span> }
                          @if (materia.creditos && materia.caracter) { <span> · </span> }
                          @if (materia.caracter) { <span>{{ materia.caracter }}</span> }
                        </span>
                      }
                    </td>
                    <td class="py-2 pr-3 text-warm-700 whitespace-nowrap" data-label="Grupo" data-testid="materia-grupo">{{ materia.grupo }}</td>
                    <td class="py-2 pr-3 text-warm-700" data-label="Docente">{{ materia.docente ?? 'No informado' }}</td>
                    <td class="py-2 pr-3 text-warm-700" data-label="Horario">{{ materia.horario ?? 'Horario no informado' }}</td>
                    <td class="py-2 pr-3 tc-ancho" data-label="Asistencia">
                      <!-- Indicadores por horas (solo con fuente autoritativa: los entrega el backend) -->
                      @if (materia.indicadores; as ind) {
                        <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span class="font-bold text-warm-900" data-testid="porcentaje-inasistencia">{{ ind.porcentajeInasistencia }}% de inasistencia</span>
                          <app-attendance-status-badge [codigoPermanencia]="ind.codigoPermanencia" />
                        </span>
                        <span class="block text-xs text-warm-600">{{ ind.horasFalta | horasMinutos }} de falta de {{ ind.horasDictadas | horasMinutos }} dictadas</span>
                        <span class="block text-xs text-warm-500">Advertencia desde {{ ind.umbralAdvertencia }}% · pérdida desde {{ ind.umbralPerdida }}%</span>
                      } @else {
                        <span class="text-xs text-warm-500" data-testid="asistencia-no-disponible">
                          <span class="font-medium text-warm-600">Asistencia:</span> No disponible
                        </span>
                      }
                    </td>
                    <td class="py-2 pr-3 tc-ancho min-w-[12rem]" data-label="Horas de la materia">
                      <!-- HU019: horas asistidas, dictadas a la fecha y programadas del grupo (los tres valores los entrega el backend) -->
                      @if (barraHoras(materia); as barra) {
                        <div class="space-y-1" data-testid="barra-horas">
                          @if (barra.conBarra) {
                            <div
                              class="relative h-2.5 w-full rounded-full bg-warm-200 overflow-hidden"
                              role="img"
                              [attr.aria-label]="barra.descripcion"
                              data-testid="barra-horas-tramos"
                            >
                              <div class="absolute inset-y-0 left-0 bg-primary-300" data-testid="tramo-dictadas" [style.width.%]="barra.anchoDictadas"></div>
                              <div class="absolute inset-y-0 left-0 bg-primary-700" data-testid="tramo-asistidas" [style.width.%]="barra.anchoAsistidas"></div>
                            </div>
                            <span class="block text-xs text-warm-500" data-testid="avance-curso">{{ barra.porcentajeAvance }}% del curso dictado</span>
                            <ul class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-warm-600" data-testid="leyenda-horas">
                              <li class="flex items-center gap-1.5">
                                <span class="inline-block w-2.5 h-2.5 rounded-full bg-primary-700" aria-hidden="true"></span>
                                {{ barra.asistidas | horasMinutos }} asistidas
                              </li>
                              <li class="flex items-center gap-1.5">
                                <span class="inline-block w-2.5 h-2.5 rounded-full bg-primary-300" aria-hidden="true"></span>
                                {{ barra.dictadas | horasMinutos }} dictadas a la fecha
                              </li>
                              <li class="flex items-center gap-1.5">
                                <span class="inline-block w-2.5 h-2.5 rounded-full bg-warm-200 border border-warm-300" aria-hidden="true"></span>
                                {{ barra.programadas | horasMinutos }} programadas
                              </li>
                            </ul>
                          } @else if (barra.programadas === 0) {
                            <p class="text-xs text-warm-500" data-testid="horas-sin-sesiones">El grupo aún no tiene sesiones programadas.</p>
                          } @else {
                            <p class="text-xs text-warm-500" data-testid="horas-programadas-no-disponible">Horas programadas: no disponible</p>
                          }
                        </div>
                      }
                    </td>
                    <td class="py-2 pr-3" data-label="Estado">
                      @if (materia.estado) {
                        <app-badge [variant]="getBadgeVariant(materia.estado)">{{ materia.estado }}</app-badge>
                      }
                    </td>
                    <td class="py-2 text-right tc-ancho">
                      <app-button variant="secondary" size="sm" (clicked)="viewDetail.emit(materia)">Ver Detalle</app-button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="materiasFiltradas().length"
          [pageSize]="tamano()"
          [currentPage]="paginaEfectiva()"
          [pageSizeOptions]="[6, 12, 24]"
          (pageChange)="pagina.set($event)"
          (pageSizeChange)="cambiarTamano($event)"
        />
      }
    </div>
  `
})
export class StudentCoursesListComponent {
  materias = input<MateriaEstudianteItem[]>([]);
  isLoading = input<boolean>(false);
  error = input<LoadErrorState | null>(null);
  /**
   * Indicadores del tablero calculados por el backend con las mismas materias del listado; `null` = aun no llegan o no se
   * pudieron consultar (se muestra "No disponible", nunca un cero).
   */
  resumen = input<ResumenMateriasEstudiante | null>(null);
  /** Materias en riesgo del backend; `null` = sin resumen o sin umbrales configurados. */
  materiasEnRiesgo = computed(() => this.resumen()?.materiasEnRiesgo ?? null);

  /** HU007 (CERT-CULM001): texto libre para filtrar por nombre, código, grupo o docente. */
  readonly busqueda = signal('');
  readonly materiasFiltradas = computed(() => {
    const termino = normalizar(this.busqueda());
    if (!termino) {
      return this.materias();
    }
    return this.materias().filter((materia) =>
      [materia.nombre, materia.codigo, materia.grupo, materia.docente].some(
        (campo) => campo != null && normalizar(campo).includes(termino)
      )
    );
  });

  readonly pagina = signal(1);
  readonly tamano = signal(12);
  readonly paginaEfectiva = computed(() =>
    Math.min(this.pagina(), Math.max(1, Math.ceil(this.materiasFiltradas().length / this.tamano())))
  );
  readonly materiasPagina = computed(() => {
    const inicio = (this.paginaEfectiva() - 1) * this.tamano();
    return this.materiasFiltradas().slice(inicio, inicio + this.tamano());
  });

  /**
   * Barra de horas de una materia. Las horas las entrega el backend (asistidas y dictadas en `indicadores`, programadas
   * en `horasProgramadas`); aquí solo se convierten en el ancho de cada tramo. Sin indicadores no hay barra (`null`).
   */
  barraHoras(materia: MateriaEstudianteItem): BarraHoras | null {
    const indicadores = materia.indicadores;
    if (!indicadores) {
      return null;
    }
    const asistidas = indicadores.horasAsistidas;
    const dictadas = indicadores.horasDictadas;
    const programadas = materia.horasProgramadas ?? null;
    if (programadas === null || programadas <= 0) {
      return { conBarra: false, asistidas, dictadas, programadas, anchoAsistidas: 0, anchoDictadas: 0, porcentajeAvance: 0, descripcion: '' };
    }
    const anchoDictadas = porcentajeAcotado(dictadas, programadas);
    return {
      conBarra: true,
      asistidas,
      dictadas,
      programadas,
      anchoDictadas,
      // Lo asistido es parte de lo dictado: el tramo nunca sobresale del de las horas dictadas.
      anchoAsistidas: Math.min(porcentajeAcotado(asistidas, programadas), anchoDictadas),
      porcentajeAvance: Math.round(anchoDictadas),
      descripcion: `Asististe a ${formatearHorasMinutos(asistidas)} de ${formatearHorasMinutos(dictadas)} dictadas. El grupo tiene ${formatearHorasMinutos(programadas)} programadas.`,
    };
  }

  /** Cada búsqueda vuelve a la página 1 para no quedar en una página vacía. */
  buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

  retry = output<void>();
  openCodeEnrollment = output<void>();
  registrarConPin = output<void>();
  viewDetail = output<MateriaEstudianteItem>();

  getBadgeVariant(estado: MateriaEstudianteItem['estado'] | null): BadgeVariant {
    switch (estado) {
      case 'Al día':
        return 'success';
      case 'Riesgo':
        return 'warning';
      case 'Crítico':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}
