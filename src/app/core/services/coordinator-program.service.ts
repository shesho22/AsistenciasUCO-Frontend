import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { obtenerTodasLasPaginas } from '../api/pagination.util';
import { ProgramaResumen } from '../models/role-management.model';

const CLAVE_SESION = 'coordinador.programaId';

interface PlanDelCoordinador {
  idPrograma: string;
  nombrePrograma: string;
}

/**
 * CULM-001 B2NM (S4): un coordinador puede tener varios programas. Los programas de su ámbito se derivan de sus planes
 * (`GET /coordinador/planes-estudio`) y la selección vive en la sesión del navegador; las consultas del coordinador
 * envían siempre `programaId` para no recibir `COO_002`.
 */
@Injectable({ providedIn: 'root' })
export class CoordinatorProgramService {
  private readonly http = inject(HttpClient);

  /** DEC-065 (2): varias pantallas piden los programas a la vez; comparten una sola consulta en curso. */
  private enCurso: Observable<ProgramaResumen[]> | null = null;

  private readonly programasSignal = signal<ProgramaResumen[]>([]);
  readonly programas = this.programasSignal.asReadonly();
  readonly cargado = signal(false);
  readonly programaId = signal<string | null>(leerSesion());
  /** El selector solo aparece cuando hay más de un programa. */
  readonly requiereSelector = computed(() => this.programasSignal().length > 1);

  /** Carga una vez los programas del ámbito y deja una selección válida (nunca `null` si hay programas). */
  cargar(forzar = false): Observable<ProgramaResumen[]> {
    if (this.cargado() && !forzar) {
      return of(this.programasSignal());
    }
    if (this.enCurso && !forzar) {
      return this.enCurso;
    }
    const consulta = obtenerTodasLasPaginas<PlanDelCoordinador>(this.http, `${environment.apiUrl}/coordinador/planes-estudio`).pipe(
      map(({ elementos }) => programasDistintos(elementos)),
      tap((programas) => {
        this.programasSignal.set(programas);
        this.cargado.set(true);
        const actual = this.programaId();
        if (!actual || !programas.some((p) => p.idPrograma === actual)) {
          this.fijar(programas[0]?.idPrograma ?? null);
        }
      }),
      finalize(() => {
        if (this.enCurso === consulta) this.enCurso = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.enCurso = consulta;
    return consulta;
  }

  seleccionar(idPrograma: string): void {
    if (this.programasSignal().some((p) => p.idPrograma === idPrograma)) {
      this.fijar(idPrograma);
    }
  }

  private fijar(id: string | null): void {
    this.programaId.set(id);
    try {
      if (id) sessionStorage.setItem(CLAVE_SESION, id);
      else sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      // Sin almacenamiento de sesión la selección vive solo en memoria.
    }
  }
}

function leerSesion(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_SESION);
  } catch {
    return null;
  }
}

function programasDistintos(planes: PlanDelCoordinador[]): ProgramaResumen[] {
  const vistos = new Map<string, ProgramaResumen>();
  for (const plan of planes) {
    if (plan.idPrograma && !vistos.has(plan.idPrograma)) {
      vistos.set(plan.idPrograma, { idPrograma: plan.idPrograma, nombrePrograma: plan.nombrePrograma });
    }
  }
  return [...vistos.values()];
}
