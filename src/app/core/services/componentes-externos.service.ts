import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ComponenteExterno = 'seguridad' | 'mensajes';

/**
 * Disponibilidad de los componentes que viven fuera de esta SPA (administración de seguridad y de mensajes).
 * Un componente está disponible si la bandera de entorno lo habilita (`SECURITY_PROVIDER=baseline`) y la pantalla no
 * reportó que el servicio externo no responde. El menú se apoya en esto para ocultar la entrada; no hay sondeo: son
 * las propias pantallas las que informan el resultado de su carga.
 */
@Injectable({ providedIn: 'root' })
export class ComponentesExternosService {
  private readonly caidos = signal<ReadonlySet<ComponenteExterno>>(new Set());

  disponible(componente: ComponenteExterno): boolean {
    return environment.security.provider === 'baseline' && !this.caidos().has(componente);
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
