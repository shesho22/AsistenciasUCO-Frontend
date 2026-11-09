import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Página amigable dentro del layout para una ruta inexistente (404) o de otro rol (403). Conserva la sesión: solo
 * informa y ofrece volver al inicio. El código llega por `data.codigo` de la ruta.
 */
@Component({
  selector: 'app-ruta-no-disponible',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'block w-full' },
  template: `
    <section class="bg-white p-8 sm:p-12 rounded-2xl border border-warm-200 shadow-warm-sm text-center space-y-4" role="alert">
      <p class="text-5xl font-serif font-bold text-primary-800" data-testid="codigo-ruta">{{ codigo }}</p>
      <h1 class="font-serif font-bold text-2xl text-warm-900" data-testid="titulo-ruta">{{ titulo }}</h1>
      <p class="text-sm text-warm-600 max-w-md mx-auto">{{ detalle }}</p>
      <a
        routerLink="/app/dashboard"
        class="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold transition-colors"
      >
        Volver al inicio
      </a>
    </section>
  `,
})
export class RutaNoDisponibleComponent {
  private readonly route = inject(ActivatedRoute);

  readonly codigo: 403 | 404 = this.route.snapshot.data['codigo'] === 403 ? 403 : 404;
  readonly titulo = this.codigo === 403 ? 'No tienes acceso a esta sección' : 'Página no encontrada';
  readonly detalle =
    this.codigo === 403
      ? 'Tu rol no tiene permisos para ver esta sección. Tu sesión sigue activa.'
      : 'La dirección que buscas no existe o fue movida. Tu sesión sigue activa.';
}
