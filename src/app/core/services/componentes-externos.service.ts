import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ComponenteExterno = 'seguridad' | 'mensajes';

/**
 * Disponibilidad de los componentes que viven fuera de esta SPA (administración de seguridad y de mensajes).
 * `habilitado` depende solo del entorno (`SECURITY_PROVIDER=baseline`) y gobierna el menú: la entrada nunca se retira
 * por un fallo de carga (DEC-065). `disponible` suma el último resultado informado por la pantalla del componente;
 * no hay sondeo: son las propias pantallas las que informan el resultado de su carga.
 */
@Injectable({ providedIn: 'root' })
export class ComponentesExternosService {
  private readonly caidos = signal<ReadonlySet<ComponenteExterno>>(new Set());

  habilitado(_componente: ComponenteExterno): boolean {
    return environment.security.provider === 'baseline';
  }

  disponible(componente: ComponenteExterno): boolean {
    return this.habilitado(componente) && !this.caidos().has(componente);
  }

  marcarNoDisponible(componente: ComponenteExterno): void {
    this.caidos.update((actual) => new Set(actual).add(componente));
  }

  marcarDisponible(componente: ComponenteExterno): void {
    this.caidos.update((actual) => {
      const siguiente = new Set(actual);
      siguiente.delete(componente);
      return siguiente;
    });
  }
}
