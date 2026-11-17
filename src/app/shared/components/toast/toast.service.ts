import { Injectable, signal } from '@angular/core';

/**
 * Estado global del aviso (toast). VAL EST-10: vive aparte del componente para que los interceptores y el manejador
 * global de errores (bundle inicial) no arrastren la plantilla del componente.
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  visible: boolean;
  message: string;
  type: ToastType;
  /** VAL OBS-14: id de correlación (o referencia local) que el usuario puede citar al reportar el error. */
  reference?: string | null;
  /**
   * Número del aviso publicado: crece con cada `show`. Permite al componente distinguir un aviso nuevo de uno ya
   * visible aunque `visible` no cambie (el último aviso publicado siempre dura su tiempo completo).
   */
  secuencia: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly state = signal<ToastData>({
    visible: false,
    message: '',
    type: 'success',
    secuencia: 0,
  });

  currentToast = this.state.asReadonly();

  show(message: string, type: ToastType = 'success', reference: string | null = null): void {
    const secuencia = this.state().secuencia + 1;
    this.state.set(
      reference ? { visible: true, message, type, secuencia, reference } : { visible: true, message, type, secuencia }
    );
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  /** Error con la referencia opcional que se muestra bajo el texto (correlationId del backend o id local). */
  error(message: string, reference: string | null = null): void {
    this.show(message, 'error', reference);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  dismiss(): void {
    this.state.update((s) => ({ ...s, visible: false }));
  }
}
