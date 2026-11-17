import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { DeanManagementService } from '../../../core/services/dean-management.service';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { CoordinatorIndicatorsService } from '../../../core/services/coordinator-indicators.service';
import { CoordinadorSesionesService } from '../../../core/services/coordinador-sesiones.service';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { AdminIndicatorsService } from '../../../core/services/admin-indicators.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { TeacherGruposResumenService } from '../../../core/services/teacher-grupos-resumen.service';
import { KpisInstitucion } from '../../../core/models/admin-indicators.model';
import { KpisDecano } from '../../../core/models/dean-indicators.model';
import { KpisCoordinador } from '../../../core/models/coordinator-indicators.model';
import { EstadoIndicadores } from '../../../core/utils/cifra-indicador';
import { Course } from '../../../core/models/course.model';
import { UserRole, sinEntidadAsignada } from '../../../core/models/user.model';
import { SinEntidadAsignadaComponent } from '../../../shared/components/sin-entidad-asignada/sin-entidad-asignada.component';
import {
  DecanoItem,
  CoordinadorItem,
  DocenteItem,
  PlanEstudioItem,
  MateriaEstudianteItem,
  ResumenMateriasEstudiante,
  HorarioDocenteItem,
  HorarioItem,
} from '../../../core/models/role-management.model';
import { MOCK_USERS_BY_ROLE } from '../../../core/mocks/user.mock';
import {
  ProximaClaseInfo,
  ClaseHorarioItem,
  calcularProximaClaseDesdeItems,
  parseScheduleString,
} from './utils/proxima-clase.util';

// Componentes Desacoplados por Rol
import { OverviewHeroComponent } from './components/overview-hero.component';
import { OverviewAdminComponent } from './components/overview-admin.component';
import { OverviewDeanComponent } from './components/overview-dean.component';
import { OverviewCoordinatorComponent } from './components/overview-coordinator.component';
import { OverviewTeacherComponent } from './components/overview-teacher.component';
import { OverviewStudentComponent } from './components/overview-student.component';

@Component({
  selector: 'app-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    OverviewHeroComponent,
    OverviewAdminComponent,
    OverviewDeanComponent,
    SinEntidadAsignadaComponent,
    OverviewCoordinatorComponent,
    OverviewTeacherComponent,
    OverviewStudentComponent,
  ],
  template: `
    <div class="flex flex-col gap-6 animate-fade-in">
      <!-- 1. Hero Banner Adaptativo -->
      <app-overview-hero
        [userRole]="userRole()"
        [userName]="user().name"
        [institutionName]="user().institutionName"
        [department]="user().department"
        [pendingClaimsCount]="pendingClaimsCount()"
      />

      <!-- 2. Dashboard Especializado por Rol -->
      @switch (userRole()) {
        @case ('ADMINISTRADOR') {
          <app-overview-admin [decanos]="decanos()" [kpis]="adminKpis()" [estado]="adminEstado()" />
        }
        @case ('DECANO') {
          @if (decanoSinFacultad()) {
            <app-sin-entidad-asignada rol="DECANO" />
          } @else {
            <app-overview-dean [coordinadores]="coordinadores()" [kpis]="deanKpis()" [estado]="deanEstado()" />
          }
        }
        @case ('COORDINADOR') {
          @if (coordinadorSinPrograma()) {
            <app-sin-entidad-asignada rol="COORDINADOR" />
          } @else {
            <app-overview-coordinator
              [docentes]="docentes()"
              [planesEstudio]="planesEstudio()"
              [kpis]="coordKpis()"
              [estado]="coordEstado()"
              [solicitudesSesionPendientes]="solicitudesSesionPendientes()"
            />
          }
        }
        @case ('DOCENTE') {
          <app-overview-teacher
            [courses]="courses"
            [totalStudentsCount]="totalStudentsCount()"
            [pendingClaimsCount]="pendingClaimsCount()"
            [proximaClase]="proximaClase()"
            [isLoading]="isLoading()"
          />
        }
        @case ('ESTUDIANTE') {
          <app-overview-student
            [materias]="materias()"
            [estadoMaterias]="estadoMateriasEstudiante()"
            [resumen]="studentResumen()"
            [proximaClase]="proximaClase()"
          />
        }
      }
    </div>
  `,
})
export class OverviewComponent implements OnInit {
  private authService = inject(AuthService);
  private courseService = inject(CourseService);
  private adminService = inject(AdminManagementService);
  private deanService = inject(DeanManagementService);
  private deanIndicators = inject(DeanIndicatorsService);
  private adminIndicators = inject(AdminIndicatorsService);
  private coordinatorService = inject(CoordinatorManagementService);
  private coordinatorIndicators = inject(CoordinatorIndicatorsService);
  private coordinadorSesiones = inject(CoordinadorSesionesService);
  private coordinatorProgram = inject(CoordinatorProgramService);
  private studentService = inject(StudentManagementService);
  private claimService = inject(AttendanceClaimService);
  private teacherResumen = inject(TeacherGruposResumenService);
  private destroyRef = inject(DestroyRef);

  user = computed(() => this.authService.currentUser() || MOCK_USERS_BY_ROLE.DOCENTE);
  userRole = computed<UserRole>(() => this.user()?.role || 'DOCENTE');
  /** HU178: el perfil confirmó que el decano no tiene facultad asignada. */
  decanoSinFacultad = computed(() => sinEntidadAsignada(this.user(), 'DECANO'));
  /** HU178: el perfil confirmó que el coordinador no tiene programa asignado. */
  coordinadorSinPrograma = computed(() => sinEntidadAsignada(this.user(), 'COORDINADOR'));

  // Próxima Clase Reactiva
  horariosDocente = signal<HorarioDocenteItem[]>([]);
  horariosEstudiante = signal<HorarioItem[]>([]);
  proximaClase = signal<ProximaClaseInfo | null>(null);

  // Datos Docente
  courses: Course[] = [];
  /** Total de reclamos pendientes del servidor; `null` si la consulta falló (la vista no muestra cifra). */
  pendingClaimsCount = signal<number | null>(0);
  /** CIERRE-W3I: estudiantes activos de sus grupos habilitados, calculados en la base; `null` mientras no llega o si falla. */
  totalStudentsCount = signal<number | null>(null);

  // Datos Administrador (CIERRE-W3I: las cifras las calcula la base; solo el directorio de decanos se lista)
  decanos = signal<DecanoItem[]>([]);
  adminKpis = signal<KpisInstitucion | null>(null);
  adminEstado = signal<EstadoIndicadores>('cargando');

  // Datos Decano (CIERRE-W3I: coordinadores, docentes, grupos y periodo salen de GET /decano/indicadores)
  coordinadores = signal<CoordinadorItem[]>([]);
  deanKpis = signal<KpisDecano | null>(null);
  deanEstado = signal<EstadoIndicadores>('cargando');

  // Datos Coordinador (CIERRE-W3I: docentes, grupos, estudiantes y riesgo salen de GET /coordinador/indicadores)
  docentes = signal<DocenteItem[]>([]);
  planesEstudio = signal<PlanEstudioItem[]>([]);
  coordKpis = signal<KpisCoordinador | null>(null);
  coordEstado = signal<EstadoIndicadores>('cargando');
  /** DEC-065 (2): solicitudes de sesión extraordinaria pendientes de aval; `null` = sin dato. */
  solicitudesSesionPendientes = signal<number | null>(null);

  // Datos Estudiante
  materias = signal<MateriaEstudianteItem[]>([]);
  /** Mientras la consulta no responde, o si falla, la vista no muestra "0 materias" ni "No tienes materias inscritas". */
  estadoMateriasEstudiante = signal<'CARGANDO' | 'LISTO' | 'ERROR'>('CARGANDO');
  /** Indicadores del tablero calculados por el backend (CIERRE-W2B); `null` = aun no llegan o no se pudieron consultar. */
  studentResumen = signal<ResumenMateriasEstudiante | null>(null);

  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadDataForRole(this.userRole());
  }

  loadDataForRole(role: UserRole): void {
    this.isLoading.set(true);

    switch (role) {
      case 'ADMINISTRADOR':
        this.adminIndicators.consultarKpis().subscribe({
          next: (res) => {
            this.adminKpis.set(res.datos ?? null);
            this.adminEstado.set(res.datos ? 'listo' : 'error');
          },
          error: () => {
            this.adminKpis.set(null);
            this.adminEstado.set('error');
          },
        });
        this.adminService.getDecanos().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.decanos.set(res.datos);
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
        break;

      case 'DECANO':
        // HU178: sin facultad asignada el panel muestra el aviso y no consulta indicadores que responderían 403.
        if (this.decanoSinFacultad()) {
          this.isLoading.set(false);
          break;
        }
        this.deanIndicators.consultarKpis().subscribe({
          next: (res) => {
            this.deanKpis.set(res.datos ?? null);
            this.deanEstado.set(res.datos ? 'listo' : 'error');
          },
          error: () => {
            this.deanKpis.set(null);
            this.deanEstado.set('error');
          },
        });
        this.deanService.getCoordinadores().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.coordinadores.set(res.datos);
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
        break;

      case 'COORDINADOR':
        // HU178: sin programa asignado el panel muestra el aviso y no consulta datos que responderían 403.
        if (this.coordinadorSinPrograma()) {
          this.isLoading.set(false);
          break;
        }
        this.coordinatorService.getPlanesEstudio().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.planesEstudio.set(res.datos);
            }
          },
        });
        // F-COORD-01: los indicadores y las solicitudes pendientes se piden con el programa ya resuelto (con varios programas
        // el backend exige `programaId`); antes se pedian a ciegas y un fallo dejaba el 0 inicial.
        this.coordinatorProgram.cargar().subscribe({
          next: () => {
            this.coordinatorIndicators.consultarKpis().subscribe({
              next: (res) => {
                this.coordKpis.set(res.datos ?? null);
                this.coordEstado.set(res.datos ? 'listo' : 'error');
              },
              error: () => {
                this.coordKpis.set(null);
                this.coordEstado.set('error');
              },
            });
            this.coordinadorSesiones.contarPendientes(this.coordinatorProgram.programaId()).subscribe({
              next: (n) => this.solicitudesSesionPendientes.set(n),
              error: () => this.solicitudesSesionPendientes.set(null),
            });
          },
          error: () => {
            this.coordKpis.set(null);
            this.coordEstado.set('error');
            this.solicitudesSesionPendientes.set(null);
          },
        });
        this.coordinatorService.getDocentes().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.docentes.set(res.datos);
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
        break;

      case 'DOCENTE':
        this.claimService.getHorarioDocente().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.horariosDocente.set(res.datos);
              this.recalcularProximaClase();
            }
          },
        });
        this.courseService.getTeacherCourses(this.user()?.id || '').subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.courses = res.datos;
              this.recalcularProximaClase();
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
        // CIERRE-W3I: el total de estudiantes de sus grupos lo calcula la base; el cliente no suma `enrolledStudentsCount`.
        this.teacherResumen.consultar().subscribe({
          next: (res) => this.totalStudentsCount.set(res.datos?.estudiantesActivos ?? null),
          error: () => this.totalStudentsCount.set(null),
        });
        // Total real del servidor (misma consulta de una fila que AC-04 de HU035), no la longitud de la primera página.
        this.claimService.getReclamosDocente({ estado: 'P', pagina: 1, tamano: 1 }).subscribe({
          next: (res) => this.pendingClaimsCount.set(res.total ?? res.datos.length),
          error: () => this.pendingClaimsCount.set(null),
        });
        this.iniciarRelojProximaClase();
        break;

      case 'ESTUDIANTE':
        this.studentService.getHorarios().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.horariosEstudiante.set(res.datos);
              this.recalcularProximaClase();
            }
          },
        });
        // CIERRE-W2B: los indicadores (materias, en riesgo, horas de falta) los calcula el backend con las mismas materias del
        // listado; el cliente no cuenta ni suma nada.
        this.studentService.getResumenMaterias().subscribe({
          next: (res) => this.studentResumen.set(res.exitoso ? res.datos : null),
          error: () => this.studentResumen.set(null),
        });
        this.estadoMateriasEstudiante.set('CARGANDO');
        this.studentService.getMaterias().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.materias.set(res.datos);
              this.estadoMateriasEstudiante.set('LISTO');
              this.recalcularProximaClase();
            } else {
              this.estadoMateriasEstudiante.set('ERROR');
            }
            this.isLoading.set(false);
          },
          error: () => {
            this.estadoMateriasEstudiante.set('ERROR');
            this.isLoading.set(false);
          },
        });
        this.iniciarRelojProximaClase();
        break;

      default:
        this.isLoading.set(false);
        break;
    }
  }

  private iniciarRelojProximaClase(): void {
    timer(60000, 60000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.recalcularProximaClase();
      });
  }

  recalcularProximaClase(): void {
    const role = this.userRole();
    const items: ClaseHorarioItem[] = [];

    if (role === 'DOCENTE') {
      const hd = this.horariosDocente();
      if (hd && hd.length > 0) {
        for (const h of hd) {
          items.push({
            codigoMateria: h.codigoMateria,
            nombreMateria: h.nombreMateria,
            dia: h.dia,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
            subtitulo: h.seccion || 'Grupo Docente',
          });
        }
      } else if (this.courses && this.courses.length > 0) {
        for (const c of this.courses) {
          const parsed = parseScheduleString(c.schedule);
          for (const p of parsed) {
            items.push({
              codigoMateria: c.code ?? '',
              nombreMateria: c.name,
              dia: p.dia,
              horaInicio: p.horaInicio,
              horaFin: p.horaFin,
              subtitulo: c.section || 'Sección',
            });
          }
        }
      }
    } else if (role === 'ESTUDIANTE') {
      const he = this.horariosEstudiante();
      if (he && he.length > 0) {
        for (const h of he) {
          items.push({
            codigoMateria: h.codigoMateria,
            nombreMateria: h.nombreMateria,
            dia: h.dia,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
            aula: h.aula || 'Aula no informada',
            subtitulo: `${h.grupo}${h.docente ? ' • ' + h.docente : ''}`,
          });
        }
      } else if (this.materias() && this.materias().length > 0) {
        for (const m of this.materias()) {
          // Sin horario informado por el backend no hay clases que proyectar (no se inventan).
          if (!m.horario) continue;
          const parsed = parseScheduleString(m.horario);
          for (const p of parsed) {
            items.push({
              codigoMateria: m.codigo ?? m.nombre,
              nombreMateria: m.nombre,
              dia: p.dia,
              horaInicio: p.horaInicio,
              horaFin: p.horaFin,
              aula: m.aula || 'Aula no informada',
              subtitulo: `${m.grupo}${m.docente ? ' • ' + m.docente : ''}`,
            });
          }
        }
      }
    }

    this.proximaClase.set(calcularProximaClaseDesdeItems(items));
  }
}
