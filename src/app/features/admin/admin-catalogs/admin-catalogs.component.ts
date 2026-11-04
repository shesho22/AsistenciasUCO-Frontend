import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { TipoProgramaItem } from '../../../core/models/role-management.model';
import { AdminTiposDocumentoComponent } from './admin-tipos-documento.component';

/** HU154: administracion del catalogo de tipos de programa (modalidades formativas). HU153: tipos de documento. */
@Component({
  selector: 'app-admin-catalogs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AdminTiposDocumentoComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">Administración Institucional</div>
          <h1 class="text-2xl font-bold font-serif text-warm-900">Tipos de Programa</h1>
          <p class="text-sm text-warm-600">Modalidades formativas disponibles para los programas académicos.</p>
        </div>
        <button
          type="button"
          (click)="abrirNuevo()"
          class="px-4 py-2.5 rounded-xl bg-primary-700 text-white text-sm font-bold hover:bg-primary-800 transition-colors"
        >
          Nuevo tipo de programa
        </button>
      </div>

      @if (formularioAbierto()) {
        <form
          class="bg-white rounded-2xl border border-warm-200 p-5 space-y-4"
          (ngSubmit)="guardar()"
        >
          <h2 class="font-serif font-bold text-warm-900">
            {{ edicion() ? 'Editar tipo de programa' : 'Registrar tipo de programa' }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label for="tp-codigo" class="block text-xs font-bold text-warm-700 uppercase mb-1">Código *</label>
              <input
                id="tp-codigo"
                name="codigo"
                type="text"
                maxlength="3"
                [(ngModel)]="form.codigo"
                [disabled]="edicion() !== null"
                placeholder="Ej: PRE"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm uppercase disabled:bg-warm-100"
              />
              <p class="text-[10px] text-warm-500 mt-1">3 caracteres alfanuméricos. No se puede modificar después de crear.</p>
            </div>
            <div class="sm:col-span-2">
              <label for="tp-nombre" class="block text-xs font-bold text-warm-700 uppercase mb-1">Nombre *</label>
              <input
                id="tp-nombre"
                name="nombre"
                type="text"
                maxlength="50"
                [(ngModel)]="form.nombre"
                placeholder="Ej: pregrado"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-sm"
              />
              <p class="text-[10px] text-warm-500 mt-1">Entre 3 y 50 caracteres.</p>
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" (click)="cancelar()" [disabled]="guardando()" class="px-4 py-2 rounded-xl border border-warm-200 text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" [disabled]="guardando()" class="px-4 py-2 rounded-xl bg-primary-700 text-white text-sm font-bold disabled:opacity-60">
              {{ guardando() ? 'Guardando...' : 'Guardar' }}
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
              <th class="text-left px-4 py-3">Estado</th>
              <th class="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (tipo of tipos(); track tipo.id) {
              <tr class="border-t border-warm-100">
                <td class="px-4 py-3 font-mono font-bold">{{ tipo.codigo }}</td>
                <td class="px-4 py-3">{{ tipo.nombre }}</td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-bold"
                    [class]="tipo.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ tipo.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                  <button type="button" (click)="abrirEdicion(tipo)" class="text-primary-700 font-semibold">Editar</button>
                  <button
                    type="button"
                    (click)="alternarEstado(tipo)"
                    [disabled]="cambiandoEstadoId() === tipo.id"
                    class="font-semibold text-warm-700 disabled:opacity-60"
                  >
                    {{ tipo.activo ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-8 text-center text-warm-500">No hay tipos de programa registrados.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-admin-tipos-documento />
    </div>
  `,
})
export class AdminCatalogsComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private toast = inject(ToastService);

  tipos = this.adminService.tiposPrograma;
  formularioAbierto = signal(false);
  edicion = signal<TipoProgramaItem | null>(null);
  guardando = signal(false);
  cambiandoEstadoId = signal<string | null>(null);
  form = { codigo: '', nombre: '' };

  ngOnInit(): void {
    this.adminService.cargarTiposPrograma().subscribe({
      error: (err) => this.toast.error(this.mensajeBackend(err, 'No fue posible cargar los tipos de programa.')),
    });
  }

  abrirNuevo(): void {
    this.edicion.set(null);
    this.form = { codigo: '', nombre: '' };
    this.formularioAbierto.set(true);
  }

  abrirEdicion(tipo: TipoProgramaItem): void {
    this.edicion.set(tipo);
    this.form = { codigo: tipo.codigo, nombre: tipo.nombre };
    this.formularioAbierto.set(true);
  }

  cancelar(): void {
    this.formularioAbierto.set(false);
  }

  guardar(): void {
    const nombre = this.form.nombre.trim();
    const codigo = this.form.codigo.trim();
    const enEdicion = this.edicion();
    const valido = nombre.length >= 3 && nombre.length <= 50 && (enEdicion !== null || /^[A-Za-z0-9]{3}$/.test(codigo));
    if (!valido || this.guardando()) return;

    this.guardando.set(true);
    const peticion = enEdicion
      ? this.adminService.actualizarTipoPrograma(enEdicion.id, { nombre })
      : this.adminService.crearTipoPrograma({ codigo, nombre });

    peticion.subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.exitoso) {
          this.toast.success(
            enEdicion ? 'Tipo de programa actualizado correctamente.' : 'Tipo de programa registrado correctamente.'
          );
          this.formularioAbierto.set(false);
        } else {
          this.toast.error(res.mensajeUsuario || 'No fue posible guardar el tipo de programa.');
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(this.mensajeBackend(err, 'No fue posible guardar el tipo de programa.'));
      },
    });
  }

  alternarEstado(tipo: TipoProgramaItem): void {
    if (this.cambiandoEstadoId() !== null) return;
    const deseado = !tipo.activo;
    this.cambiandoEstadoId.set(tipo.id);
    this.adminService.cambiarEstadoTipoPrograma(tipo.id, deseado).subscribe({
      next: (res) => {
        this.cambiandoEstadoId.set(null);
        if (res.exitoso) {
          this.toast.success(`Tipo de programa ${deseado ? 'activado' : 'desactivado'} correctamente.`);
        } else {
          this.toast.error(res.mensajeUsuario || 'No fue posible cambiar el estado del tipo de programa.');
        }
      },
      error: (err) => {
        this.cambiandoEstadoId.set(null);
        this.toast.error(this.mensajeBackend(err, 'No fue posible cambiar el estado del tipo de programa.'));
      },
    });
  }

  /** El texto proviene del backend (ApiErrorResponse.message); la UI no interpreta ni traduce errores. */
  private mensajeBackend(err: any, respaldo: string): string {
    return err?.error?.message || err?.error?.mensajeUsuario || respaldo;
  }
}
