import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, output } from '@angular/core';

const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SELECTOR_DIALOGO_ANIDADO = '[role="dialog"], [role="alertdialog"], [aria-modal="true"]';

/**
 * Comportamiento accesible de un diálogo modal artesanal (WCAG 2.1.1, 2.4.3 y 4.1.2): al abrirse el foco entra en
 * el diálogo, Tab queda atrapado dentro, Escape pide cerrarlo y al destruirse el foco vuelve al elemento que lo abrió.
 * El nombre accesible lo aporta la plantilla (`role="dialog"`, `aria-modal` y `aria-labelledby`). Si dentro hay otro
 * diálogo abierto, este deja que lo gestione el de dentro.
 */
@Directive({
  selector: '[appDialogoAccesible]',
  standalone: true,
  host: {
    tabindex: '-1',
    '(document:keydown)': 'alTeclear($event)',
  },
})
export class DialogoAccesibleDirective implements AfterViewInit, OnDestroy {
  private readonly raiz = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly elementoPrevio = document.activeElement as HTMLElement | null;

  /** Escape pulsado con este diálogo como el más interno. */
  readonly cerrarSolicitado = output<void>();

  ngAfterViewInit(): void {
    this.raiz.focus();
  }

  ngOnDestroy(): void {
    if (this.elementoPrevio && document.contains(this.elementoPrevio)) {
      this.elementoPrevio.focus();
    }
  }

  alTeclear(evento: KeyboardEvent): void {
    if (this.raiz.querySelector(SELECTOR_DIALOGO_ANIDADO)) return;
    if (evento.key === 'Escape') {
      this.cerrarSolicitado.emit();
      return;
    }
    if (evento.key === 'Tab') {
      this.atraparTab(evento);
    }
  }

  private atraparTab(evento: KeyboardEvent): void {
    const items = Array.from(this.raiz.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES));
    if (items.length === 0) {
      evento.preventDefault();
      this.raiz.focus();
      return;
    }
    const primero = items[0];
    const ultimo = items[items.length - 1];
    const activo = document.activeElement;
    if (evento.shiftKey && (activo === primero || activo === this.raiz)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    } else if (!this.raiz.contains(activo)) {
      evento.preventDefault();
      primero.focus();
    }
  }
}
