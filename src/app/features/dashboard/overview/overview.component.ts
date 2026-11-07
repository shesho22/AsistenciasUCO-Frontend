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
import { AdminIndicatorsService } from '../../../core/services/admin-indicators.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { Course } from '../../../core/models/course.model';
import { UserRole } from '../../../core/models/user.model';
import {
  DecanoItem,
  CoordinadorItem,
  DocenteItem,
  PlanEstudioItem,
  MateriaEstudianteItem,
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
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    OverviewHeroComponent,
    OverviewAdminComponent,
    OverviewDeanComponent,
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
          <app-overview-admin
            [decanos]="decanos()"
            [totalFacultades]="totalFacultadesAdmin()"
            [totalProgramas]="totalProgramasAdmin()"
          />
        }
        @case ('ADMIN') {
          <app-overview-admin
            [decanos]="decanos()"
            [totalFacultades]="totalFacultadesAdmin()"
            [totalProgramas]="totalProgramasAdmin()"
          />
        }
        @case ('DECANO') {
          <app-overview-dean
            [coordinadores]="coordinadores()"
            [totalDocentes]="totalDocentesFacultad()"
            [totalGrupos]="gruposActivosFacultad()"
            [periodo]="periodoFacultad()"
            [porcentajeAsistencia]="porcentajeAsistenciaFacultad()"
          />
        }
        @case ('COORDINADOR') {
          <app-overview-coordinator
            [docentes]="docentes()"
            [planesEstudio]="planesEstudio()"
            [totalGrupos]="totalGruposPrograma()"
            [totalEstudiantes]="totalEstudiantesPrograma()"
          />
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
            [materiasEnRiesgo]="studentMateriasEnRiesgo()"
            [horasFalta]="studentHorasFalta()"
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
  private studentService = inject(StudentManagementService);
  private claimService = inject(AttendanceClaimService);
  private destroyRef = inject(DestroyRef);

  user = computed(() => this.authService.currentUser() || MOCK_USERS_BY_ROLE.DOCENTE);
  userRole = computed<UserRole>(() => this.user()?.role || 'DOCENTE');

  // Próxima Clase Reactiva
  horariosDocente = signal<HorarioDocenteItem[]>([]);
  horariosEstudiante = signal<HorarioItem[]>([]);
  proximaClase = signal<ProximaClaseInfo | null>(null);

  // Datos Docente
  courses: Course[] = [];
  /** Total de reclamos pendientes del servidor; `null` si la consulta falló (la vista no muestra cifra). */
  pendingClaimsCount = signal<number | null>(0);
  totalStudentsCount = signal<number>(0);

  // Datos Administrador
  decanos = signal<DecanoItem[]>([]);
  totalFacultadesAdmin = computed<number>(() => {
    const list = this.decanos();
    if (!list || list.length === 0) return 0;
    const unique = new Set(list.map((d) => d.facultad).filter(Boolean));
    return unique.size || list.length;
  });

  // Datos Decano
  coordinadores = signal<CoordinadorItem[]>([]);
  porcentajeAsistenciaFacultad = signal<number | null>(null);
  totalProgramasAdmin = signal<number | null>(null);
  totalDocentesFacultad = computed<number>(() => {
    return this.coordinadores().reduce((acc, c) => acc + (c.totalDocentes || 0), 0);
  });
  /**
   * DASH-13: «Grupos en curso» sale de los indicadores de la facultad (grupos activos del período vigente) y no de la
   * suma por coordinador, que daba 0 cuando el coordinador no tenía grupos propios aunque la facultad sí.
   */
  gruposActivosFacultad = signal<number | null>(null);
  periodoFacultad = signal<string | null>(null);

  // Datos Coordinador
  docentes = signal<DocenteItem[]>([]);
  planesEstudio = signal<PlanEstudioItem[]>([]);
  totalGruposPrograma = computed<number>(() => {
    return this.docentes().reduce((acc, d) => acc + (d.totalGruposAsignados || 0), 0);
  });
  totalEstudiantesPrograma = signal<number>(0);

  // Datos Estudiante
  materias = signal<MateriaEstudianteItem[]>([]);
  /** `null` = sin fuente autoritativa de asistencia (no se muestran ceros inventados). */
  studentMateriasEnRiesgo = signal<number | null>(null);
  studentHorasFalta = signal<number | null>(null);

  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadDataForRole(this.userRole());
  }

  loadDataForRole(role: UserRole): void {
    this.isLoading.set(true);

    switch (role) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        this.adminIndicators.consultarKpis().subscribe({
          next: (res) => this.totalProgramasAdmin.set(res.datos?.totalProgramas ?? null),
          error: () => this.totalProgramasAdmin.set(null),
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
        this.deanIndicators.consultarKpis().subscribe({
          next: (res) => {
            this.porcentajeAsistenciaFacultad.set(res.datos?.porcentajeAsistencia ?? null);
            this.gruposActivosFacultad.set(res.datos?.gruposActivos ?? null);
            this.periodoFacultad.set(res.datos?.nombrePeriodoAcademico ?? null);
          },
          error: () => {
            this.porcentajeAsistenciaFacultad.set(null);
            this.gruposActivosFacultad.set(null);
            this.periodoFacultad.set(null);
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
        this.coordinatorService.getPlanesEstudio().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.planesEstudio.set(res.datos);
            }
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
        this.coordinatorService.getEstudiantesDirectorio().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.totalEstudiantesPrograma.set(res.datos.length);
            }
          },
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
              const total = res.datos.reduce(
                (acc: number, c: Course) => acc + (c.enrolledStudentsCount || 0),
                0
              );
              this.totalStudentsCount.set(total);
              this.recalcularProximaClase();
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
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
        this.studentService.getMaterias().subscribe({
          next: (res) => {
            if (res.exitoso && res.datos) {
              this.materias.set(res.datos);
              // CULM-001 B.2: solo se cuentan y suman valores que ya entrega el backend (por horas).
              const conIndicadores = res.datos.filter((m) => m.indicadores !== null);
              if (conIndicadores.length > 0) {
                this.studentMateriasEnRiesgo.set(
                  conIndicadores.filter((m) => m.indicadores!.codigoPermanencia === 'RIESGO' || m.indicadores!.codigoPermanencia === 'PERDIDA').length
                );
                this.studentHorasFalta.set(conIndicadores.reduce((acc, m) => acc + m.indicadores!.horasFalta, 0));
              } else {
                this.studentMateriasEnRiesgo.set(null);
                this.studentHorasFalta.set(null);
              }
              this.recalcularProximaClase();
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
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
