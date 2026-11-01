import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CourseService, GrupoCoordinadorPayload } from '../../../core/services/course.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { Course, FranjaHorario } from '../../../core/models/course.model';
import { AsignaturaPlanItem, PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { DocentePrograma } from '../../../core/models/docente-programa.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

/** Días de dbo.Dia en el orden de la semana (código y nombre visible). */
export const DIAS_SEMANA: ReadonlyArray<{ codigo: string; nombre: string }> = [
  { codigo: 'LU', nombre: 'Lunes' },
  { codigo: 'MA', nombre: 'Martes' },
  { codigo: 'MI', nombre: 'Miércoles' },
  { codigo: 'JU', nombre: 'Jueves' },
  { codigo: 'VI', nombre: 'Viernes' },
  { codigo: 'SA', nombre: 'Sábado' },
  { codigo: 'DO', nombre: 'Domingo' },
];

interface GrupoForm {
  idAsignatura: string;
  idPeriodoAcademico: string;
  codigo: number | null;
  nombre: string;
  idDocente: string;
  cupoMaximo: number | null;
  franjas: FranjaHorario[];
}

/**
 * F1 (2026-10-30): el COORDINADOR crea y edita los grupos de su programa y define su horario semanal (varias franjas,
 * sin traslapes). El backend guarda grupo y horario en una sola transacción y valida en la DB los traslapes (HOR_003) y
 * el cruce del docente con otro grupo a la misma hora (HOR_002); aquí solo se anticipan las validaciones de formato.
 */
@Component({
  selector: 'app-coordinator-groups',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
            Coordinación de Programa
          </span>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight mt-1">Grupos y Horarios</h1>
          <p class="text-sm text-warm-600 mt-1">
            Crea los grupos del programa, asigna el docente titular y define su horario semanal.
          </p>
        </div>
        @if (vista() === 'LISTA') {
          <button type="button" data-testid="nuevo-grupo" (click)="abrirCrear()"
            class="px-4 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-sm font-semibold text-white transition-colors">
            Nuevo grupo
          </button>
        }
      </div>

      @if (vista() === 'LISTA') {
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
          @if (cargando()) {
            <p class="p-6 text-sm text-warm-500">Cargando grupos...</p>
          } @else if (grupos().length === 0) {
            <p class="p-6 text-sm text-warm-500" data-testid="sin-grupos">El programa aún no tiene grupos.</p>
          } @else {
            <table class="w-full text-sm">
              <thead class="bg-warm-50 text-xs text-warm-600 text-left">
                <tr>
                  <th class="px-4 py-3">Asignatura</th>
                  <th class="px-4 py-3">Grupo</th>
                  <th class="px-4 py-3">Docente</th>
                  <th class="px-4 py-3">Horario semanal</th>
                  <th class="px-4 py-3">Cupo</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (grupo of grupos(); track grupo.id) {
                  <tr class="border-t border-warm-100">
                    <td class="px-4 py-3 font-medium text-warm-900">{{ grupo.name }}</td>
                    <td class="px-4 py-3">{{ grupo.section }}</td>
                    <td class="px-4 py-3">{{ nombreDocente(grupo.docenteId) }}</td>
                    <td class="px-4 py-3">{{ grupo.schedule || 'Sin horario' }}</td>
                    <td class="px-4 py-3">{{ grupo.enrolledStudentsCount ?? 0 }} / {{ grupo.cupoMaximo ?? '-' }}</td>
                    <td class="px-4 py-3 text-right">
                      <button type="button" class="text-xs font-semibold text-primary-700 hover:underline" (click)="abrirEditar(grupo)">
                        Editar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      @if (vista() === 'FORM') {
        <form class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-5 max-w-3xl" (ngSubmit)="guardar()">
          <h2 class="font-serif font-bold text-xl text-warm-900">{{ modo() === 'CREAR' ? 'Nuevo grupo' : 'Editar grupo' }}</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @if (modo() === 'CREAR') {
              <label class="text-xs font-semibold text-warm-700">Asignatura
                <select name="idAsignatura" [(ngModel)]="form.idAsignatura" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm">
                  <option value="">Seleccione...</option>
                  @for (a of asignaturas(); track a.id) {
                    <option [value]="a.id">{{ a.codigo }} - {{ a.nombre }}</option>
                  }
                </select>
              </label>
              <label class="text-xs font-semibold text-warm-700">Período académico
                <select name="idPeriodoAcademico" [(ngModel)]="form.idPeriodoAcademico" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm">
                  <option value="">Seleccione...</option>
                  @for (p of periodos(); track p.id) {
                    <option [value]="p.id">{{ p.nombre }}</option>
                  }
                </select>
              </label>
            }
            <label class="text-xs font-semibold text-warm-700">Código del grupo
              <input name="codigo" type="number" min="1" [(ngModel)]="form.codigo" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
            </label>
            <label class="text-xs font-semibold text-warm-700">Nombre del grupo
              <input name="nombre" type="text" maxlength="50" [(ngModel)]="form.nombre" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
            </label>
            <label class="text-xs font-semibold text-warm-700">Docente titular
              <select name="idDocente" [(ngModel)]="form.idDocente" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm">
                <option value="">Seleccione...</option>
                @for (d of docentes(); track d.idDocente) {
                  <option [value]="d.idDocente">{{ d.nombreCompleto }}</option>
                }
              </select>
            </label>
            @if (modo() === 'EDITAR') {
              <label class="text-xs font-semibold text-warm-700">Cupo máximo
                <input name="cupoMaximo" type="number" min="1" [(ngModel)]="form.cupoMaximo" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
              </label>
            }
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-warm-800">Horario semanal</h3>
              <button type="button" data-testid="agregar-franja" (click)="agregarFranja()" class="text-xs font-semibold text-primary-700 hover:underline">
                + Agregar franja
              </button>
            </div>
            <p class="text-[11px] text-warm-500">
              Un bloque por día y hora. Las franjas del grupo no pueden cruzarse entre sí y el docente no puede tener otro grupo a la misma hora.
            </p>
            @for (franja of form.franjas; track $index; let i = $index) {
              <div class="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <select [name]="'dia' + i" [(ngModel)]="franja.dia" class="px-3 py-2 border border-warm-200 rounded-xl text-sm">
                  @for (d of dias; track d.codigo) {
                    <option [value]="d.codigo">{{ d.nombre }}</option>
                  }
                </select>
                <input [name]="'inicio' + i" type="time" [(ngModel)]="franja.horaInicio" class="px-3 py-2 border border-warm-200 rounded-xl text-sm" />
                <input [name]="'fin' + i" type="time" [(ngModel)]="franja.horaFin" class="px-3 py-2 border border-warm-200 rounded-xl text-sm" />
                <button type="button" (click)="quitarFranja(i)" class="text-xs text-red-600 hover:underline" title="Quitar franja">Quitar</button>
              </div>
            }
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-warm-100">
            <button type="button" (click)="volver()" class="px-4 py-2 rounded-xl bg-warm-50 border border-warm-200 text-sm font-semibold text-warm-700">
              Cancelar
            </button>
            <button type="submit" [disabled]="guardando()" class="px-4 py-2 rounded-xl bg-primary-700 text-sm font-semibold text-white disabled:opacity-60">
              {{ guardando() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class CoordinatorGroupsComponent implements OnInit {
  private readonly courseService = inject(CourseService);
  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);

  readonly dias = DIAS_SEMANA;
  vista = signal<'LISTA' | 'FORM'>('LISTA');
  modo = signal<'CREAR' | 'EDITAR'>('CREAR');
  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);
  grupos = signal<Course[]>([]);
  asignaturas = signal<AsignaturaPlanItem[]>([]);
  periodos = signal<PeriodoAcademicoItem[]>([]);
  docentes = signal<DocentePrograma[]>([]);
  private grupoEditado: string | null = null;
  private readonly nombresDocente = computed(() => new Map(this.docentes().map((d) => [d.idDocente, d.nombreCompleto])));

  form: GrupoForm = this.formVacio();

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarCatalogos();
  }

  cargarGrupos(): void {
    this.cargando.set(true);
    this.courseService.getCoordinatorCourses().subscribe({
      next: (res) => {
        this.grupos.set(res.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.toast.error(getApiErrorMessage(err) || 'No fue posible cargar los grupos.');
      },
    });
  }

  /** Asignaturas de los planes del programa, docentes activos del programa y períodos académicos. */
  cargarCatalogos(): void {
    this.coordinatorService
      .getPlanesEstudio()
      .pipe(
        switchMap((res) => {
          const planes = res.datos ?? [];
          return planes.length === 0
            ? of([] as AsignaturaPlanItem[])
            : forkJoin(planes.map((p) => this.coordinatorService.getAsignaturasPorPlan(p.id).pipe(
                map((r) => r.datos ?? []),
                catchError(() => of([] as AsignaturaPlanItem[]))
              ))).pipe(map((listas) => listas.flat()));
        }),
        catchError(() => of([] as AsignaturaPlanItem[]))
      )
      .subscribe((asignaturas) => this.asignaturas.set(asignaturas));

    this.coordinatorService
      .getDocentesPrograma({ pagina: 1, tamano: 100, estaActivo: true })
      .pipe(catchError(() => of({ exitoso: false, datos: [] as DocentePrograma[] })))
      .subscribe((res) => this.docentes.set(res.datos ?? []));

    this.coordinatorService
      .getPeriodosAcademicos()
      .pipe(catchError(() => of({ exitoso: false, datos: [] as PeriodoAcademicoItem[] })))
      .subscribe((res) => this.periodos.set(res.datos ?? []));
  }

  nombreDocente(idDocente: string | undefined): string {
    return (idDocente && this.nombresDocente().get(idDocente)) || 'Sin asignar';
  }

  abrirCrear(): void {
    this.modo.set('CREAR');
    this.grupoEditado = null;
    this.form = this.formVacio();
    this.vista.set('FORM');
  }

  abrirEditar(grupo: Course): void {
    this.modo.set('EDITAR');
    this.grupoEditado = grupo.id;
    this.form = {
      idAsignatura: grupo.asignaturaId ?? '',
      idPeriodoAcademico: '',
      codigo: grupo.code ? Number(grupo.code) : null,
      nombre: grupo.section,
      idDocente: grupo.docenteId ?? '',
      cupoMaximo: grupo.cupoMaximo ?? null,
      franjas: (grupo.franjas ?? []).map((f) => ({ ...f })),
    };
    this.vista.set('FORM');
  }

  agregarFranja(): void {
    this.form.franjas = [...this.form.franjas, { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' }];
  }

  quitarFranja(indice: number): void {
    this.form.franjas = this.form.franjas.filter((_, i) => i !== indice);
  }

  volver(): void {
    this.vista.set('LISTA');
    this.grupoEditado = null;
  }

  guardar(): void {
    const error = this.validar();
    if (error) {
      this.toast.warning(error);
      return;
    }
    const payload: GrupoCoordinadorPayload = {
      codigo: Number(this.form.codigo),
      nombre: this.form.nombre.trim(),
      idDocente: this.form.idDocente,
      franjas: this.form.franjas,
    };
    const peticion =
      this.modo() === 'CREAR'
        ? this.courseService.crearGrupo({
            ...payload,
            idAsignatura: this.form.idAsignatura,
            idPeriodoAcademico: this.form.idPeriodoAcademico,
          })
        : this.courseService.actualizarGrupo(this.grupoEditado as string, {
            ...payload,
            cupoMaximo: this.form.cupoMaximo ? Number(this.form.cupoMaximo) : undefined,
          });

    this.guardando.set(true);
    peticion.subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || 'Grupo guardado.');
          this.volver();
          this.cargarGrupos();
        } else {
          this.toast.error(res.mensajeUsuario || 'No fue posible guardar el grupo.');
        }
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.toast.error(getApiErrorMessage(err) || 'No fue posible guardar el grupo.');
      },
    });
  }

  /** Validaciones de formato antes de llamar al backend (las reglas de negocio las confirma la DB). */
  validar(): string | null {
    if (this.modo() === 'CREAR' && (!this.form.idAsignatura || !this.form.idPeriodoAcademico)) {
      return 'Seleccione la asignatura y el período académico.';
    }
    if (!this.form.codigo || Number(this.form.codigo) < 1 || !this.form.nombre.trim()) {
      return 'El código y el nombre del grupo son obligatorios.';
    }
    if (!this.form.idDocente) {
      return 'Seleccione el docente titular.';
    }
    for (const franja of this.form.franjas) {
      if (!franja.horaInicio || !franja.horaFin || franja.horaFin <= franja.horaInicio) {
        return 'En cada franja la hora de fin debe ser mayor que la de inicio.';
      }
    }
    const cruce = this.form.franjas.some((a, i) =>
      this.form.franjas.some((b, j) => j > i && a.dia === b.dia && a.horaInicio < b.horaFin && a.horaFin > b.horaInicio)
    );
    return cruce ? 'Las franjas del horario no pueden cruzarse entre sí.' : null;
  }

  private formVacio(): GrupoForm {
    return {
      idAsignatura: '',
      idPeriodoAcademico: '',
      codigo: null,
      nombre: '',
      idDocente: '',
      cupoMaximo: null,
      franjas: [{ dia: 'LU', horaInicio: '08:00', horaFin: '10:00' }],
    };
  }
}
