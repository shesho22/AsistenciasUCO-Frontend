import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalItems() > 0) {
      <nav aria-label="Paginación" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-warm-200 rounded-2xl shadow-warm-sm text-xs text-warm-600">
        <!-- Resumen de Conteo -->
        <div class="flex items-center gap-2">
          <span>
            Mostrando
            <strong class="font-bold text-warm-900">{{ startIndex() + 1 }}</strong>
            a
            <strong class="font-bold text-warm-900">{{ endIndex() }}</strong>
            de
            <strong class="font-bold text-warm-900">{{ totalItems() }}</strong>
            resultados
          </span>

          <!-- Selector de tamaño de página -->
          @if (showPageSizeSelector()) {
            <div class="hidden sm:flex items-center gap-1.5 ml-3 pl-3 border-l border-warm-200">
              <span class="text-warm-400">Por página:</span>
              <select
                aria-label="Resultados por página"
                [value]="pageSize()"
                (change)="onPageSizeChange($event)"
                class="bg-warm-50 border border-warm-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-warm-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                @for (opt of pageSizeOptions(); track opt) {
                  <option [value]="opt" [selected]="opt === pageSize()">{{ opt }}</option>
                }
              </select>
            </div>
          }
        </div>

        <!-- Controles de Navegación -->
        <div class="flex items-center gap-1">
          <!-- Botón Primera Página -->
          <button
            type="button"
            (click)="goToPage(1)"
            [disabled]="currentPage() === 1"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg border border-warm-200 text-warm-500 hover:text-warm-900 hover:bg-warm-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Primera página"
            aria-label="Primera página"
          >
            <svg class="w-3.5 h-3.5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>

          <!-- Botón Anterior -->
          <button
            type="button"
            (click)="goToPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
            aria-label="Página anterior"
            class="min-h-[44px] min-w-[44px] px-2.5 justify-center rounded-lg border border-warm-200 text-warm-600 hover:text-warm-900 hover:bg-warm-100 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            <span class="hidden sm:inline">Anterior</span>
          </button>

          <!-- Números de Página Visibles -->
          <div class="flex items-center gap-1 mx-1">
            @for (p of visiblePages(); track p) {
              @if (p === -1) {
                <span class="px-1 text-warm-400" aria-hidden="true">...</span>
              } @else {
                <button
                  type="button"
                  (click)="goToPage(p)"
                  [attr.aria-label]="'Página ' + p"
                  [attr.aria-current]="p === currentPage() ? 'page' : null"
                  [class]="p === currentPage() ? 'bg-primary-700 text-white font-bold shadow-xs' : 'bg-warm-50 text-warm-700 hover:bg-warm-100'"
                  class="min-w-[44px] min-h-[44px] rounded-lg text-xs transition-colors flex items-center justify-center font-medium"
                >
                  {{ p }}
                </button>
              }
            }
          </div>

          <!-- Botón Siguiente -->
          <button
            type="button"
            (click)="goToPage(currentPage() + 1)"
            [disabled]="currentPage() >= totalPages()"
            aria-label="Página siguiente"
            class="min-h-[44px] min-w-[44px] px-2.5 justify-center rounded-lg border border-warm-200 text-warm-600 hover:text-warm-900 hover:bg-warm-100 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1"
          >
            <span class="hidden sm:inline">Siguiente</span>
            <svg class="w-3.5 h-3.5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <!-- Botón Última Página -->
          <button
            type="button"
            (click)="goToPage(totalPages())"
            [disabled]="currentPage() >= totalPages()"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg border border-warm-200 text-warm-500 hover:text-warm-900 hover:bg-warm-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Última página"
            aria-label="Última página"
          >
            <svg class="w-3.5 h-3.5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly totalItems = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly currentPage = input<number>(1);
  readonly showPageSizeSelector = input<boolean>(true);
  readonly pageSizeOptions = input<number[]>([5, 10, 20, 50]);
  readonly totalPagesInput = input<number | undefined>(undefined, { alias: 'totalPages' });

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly totalPages = computed(() => {
    const fromInput = this.totalPagesInput();
    if (fromInput !== undefined && fromInput !== null) {
      return Math.max(1, fromInput);
    }
    return Math.max(1, Math.ceil(this.totalItems() / this.pageSize()));
  });

  readonly startIndex = computed(() => {
    return (this.currentPage() - 1) * this.pageSize();
  });

  readonly endIndex = computed(() => {
    return Math.min(this.startIndex() + this.pageSize(), this.totalItems());
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 1;

    if (total <= 6) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    pages.push(1);

    if (current - delta > 2) {
      pages.push(-1);
    }

    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current + delta < total - 1) {
      pages.push(-1);
    }

    pages.push(total);
    return pages;
  });

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    if (val && val !== this.pageSize()) {
      this.pageSizeChange.emit(val);
    }
  }
}
