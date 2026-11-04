import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService, TipoIdentificacionItem } from '../../../core/services/catalog.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

/** Reglas del backend (HU153): código de 1 a 5 letras (solo en el alta) y nombre de 3 a 50 caracteres. */
export const CODIGO_TIPO_DOCUMENTO = /^[A-Za-z]{1,5}$/;

export function tipoDocumentoValido(codigo: string, nombre: string, esEdicion: boolean): boolean {
  const largo = nombre.trim().length;
  return largo >= 3 && largo <= 50 && (esEdicion || CODIGO_TIPO_DOCUMENTO.test(codigo.trim()));
}

/**
 * HU153 (decisión de John, 2026-11-04): catálogo de tipos de documento de identidad. El administrador crea tipos y
 * edita su nombre; el código es inmutable porque identifica a los usuarios y los tipos no se inactivan.
 */
@Component({
  selector: 'app-admin-tipos-documento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold font-serif text-warm-900">Tipos de Documento</h2>
          <p class="text-sm text-warm-600">Documentos de identidad aceptados para registrar usuarios.</p>
        </div>
        <button type="button" (click)="nuevo()"
          class="px-4 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-bold hover:bg-primary-800 transition-colors">
          Nuevo tipo de documento
        </button>
      </div>

      @if (abierto()) {
        <form class="bg-white rounded-2xl border border-warm-200 p-5 space-y-4" (ngSubmit)="guardar()">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label class="text-xs font-bold text-warm-700 uppercase">
              Código *
              <input name="codigoDocumento" type="text" maxlength="5" [(ngModel)]="codigo" [disabled]="seleccionado() !== null"
                placeholder="Ej: PEP" aria-label="Código del tipo de documento"
                class="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm uppercase disabled:bg-warm-100" />
              <span class="block text-[10px] font-normal normal-case text-warm-500 mt-1">De 1 a 5 letras; no se modifica después.</span>
            </label>
            <label class="sm:col-span-2 text-xs font-bold text-warm-700 uppercase">
              Nombre *
              <input name="nombreDocumento" type="text" maxlength="50" [(ngModel)]="nombre" aria-label="Nombre del tipo de documento"
                placeholder="Ej: Permiso especial de permanencia"
                class="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm" />
              <span class="block text-[10px] font-normal normal-case text-warm-500 mt-1">Entre 3 y 50 caracteres.</span>
            </label>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" (click)="abierto.set(false)" [disabled]="enviando()" class="px-4 py-2 rounded-xl border border-warm-200 text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" [disabled]="enviando() || !valido()" class="px-4 py-2 rounded-xl bg-primary-700 text-white text-sm font-bold disabled:opacity-60">
              {{ enviando() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      }

      <div class="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-warm-50 text-xs uppercase text-warm-600">
            <tr>
              <th class="text-left px-4 py-3">Código</th>
              <th class="text-left px-4 py-3">Nombre</th>
              <th class="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (t of tipos(); track t.id) {
              <tr class="border-t border-warm-100">
                <td class="px-4 py-3 font-mono font-bold">{{ t.tipoIdentificacion }}</td>
                <td class="px-4 py-3">{{ t.nombre }}</td>
                <td class="px-4 py-3 text-right">
                  <button type="button" (click)="editar(t)" class="text-primary-700 font-semibold">Editar nombre</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="px-4 py-8 text-center text-warm-500">No hay tipos de documento registrados.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AdminTiposDocumentoComponent implements OnInit {
  private readonly catalogos = inject(CatalogService);
  private readonly toast = inject(ToastService);

  tipos = signal<TipoIdentificacionItem[]>([]);
  abierto = signal(false);
  enviando = signal(false);
  seleccionado = signal<TipoIdentificacionItem | null>(null);
  codigo = '';
  nombre = '';

  ngOnInit(): void {
    this.recargar();
  }

  nuevo(): void {
    this.seleccionado.set(null);
    this.codigo = '';
    this.nombre = '';
    this.abierto.set(true);
  }

  editar(tipo: TipoIdentificacionItem): void {
    this.seleccionado.set(tipo);
    this.codigo = tipo.tipoIdentificacion;
    this.nombre = tipo.nombre;
    this.abierto.set(true);
  }

  valido(): boolean {
    return tipoDocumentoValido(this.codigo, this.nombre, this.seleccionado() !== null);
  }

  guardar(): void {
    if (!this.valido() || this.enviando()) return;
    const tipo = this.seleccionado();
    const nombre = this.nombre.trim();
    this.enviando.set(true);
    const solicitud = tipo
      ? this.catalogos.actualizarTipoIdentificacion(tipo.id, nombre)
      : this.catalogos.crearTipoIdentificacion(this.codigo.trim().toUpperCase(), nombre);
    solicitud.subscribe({
      next: () => {
        this.enviando.set(false);
        this.abierto.set(false);
        this.toast.success(tipo ? 'Nombre del tipo de documento actualizado.' : 'Tipo de documento registrado.');
        this.recargar();
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  private recargar(): void {
    this.catalogos.getIdentityDocumentTypes().subscribe({
      next: (tipos) => this.tipos.set(tipos ?? []),
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }
}
