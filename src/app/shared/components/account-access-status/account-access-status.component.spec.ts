import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AccountAccessStatusComponent } from './account-access-status.component';
import { AccountAccessService } from '../../../core/services/account-access.service';
import { AccountAccess, AccountAccessState } from '../../../core/models/account-access.model';

function acceso(estado: AccountAccessState, detalle = ''): AccountAccess {
  return { usuario: 'u-1', estado, detalle, roles: [] };
}

describe('AccountAccessStatusComponent', () => {
  let service: jasmine.SpyObj<AccountAccessService>;

  function crear(correo: string | null) {
    const fixture = TestBed.createComponent(AccountAccessStatusComponent);
    fixture.componentRef.setInput('correo', correo);
    fixture.detectChanges();
    fixture.detectChanges(); // el efecto de la entrada corre tras la primera pasada
    return fixture;
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<AccountAccessService>('AccountAccessService', ['consult', 'reconcile']);
    TestBed.configureTestingModule({ providers: [{ provide: AccountAccessService, useValue: service }] });
  });

  it('no muestra nada ni consulta mientras no haya una cuenta registrada', () => {
    const fixture = crear(null);

    expect(fixture.nativeElement.querySelector('[data-testid="account-access-status"]')).toBeNull();
    expect(service.consult).not.toHaveBeenCalled();
  });

  it('una cuenta alineada se muestra ACTIVA y no ofrece reconciliar', () => {
    service.consult.and.returnValue(of({ exitoso: true, datos: acceso('ACTIVA') }));

    const fixture = crear('persona@uco.edu.co');
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('persona@uco.edu.co');
    expect(text).toContain('ACTIVA');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('una cuenta pendiente se muestra PENDIENTE DE SINCRONIZACIÓN con su detalle y permite reconciliar', () => {
    service.consult.and.returnValue(of({ exitoso: true, datos: acceso('PENDIENTE_SINCRONIZACION', 'DOCENTE: perfil por asignar') }));
    service.reconcile.and.returnValue(of({ exitoso: true, datos: acceso('ACTIVA') }));

    const fixture = crear('persona@uco.edu.co');
    expect(fixture.nativeElement.textContent).toContain('PENDIENTE DE SINCRONIZACIÓN');
    expect(fixture.nativeElement.textContent).toContain('DOCENTE: perfil por asignar');

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.reconcile).toHaveBeenCalledOnceWith('persona@uco.edu.co');
    expect(fixture.nativeElement.textContent).toContain('ACTIVA');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('un problema controlado se informa y también permite reintentar la reconciliación', () => {
    service.consult.and.returnValue(of({ exitoso: true, datos: acceso('PROBLEMA', 'DOCENTE: conflicto') }));

    const fixture = crear('persona@uco.edu.co');

    expect(fixture.nativeElement.textContent).toContain('PROBLEMA CONTROLADO');
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('una cuenta sin roles activos se muestra INACTIVA', () => {
    service.consult.and.returnValue(of({ exitoso: true, datos: acceso('INACTIVA') }));

    const fixture = crear('persona@uco.edu.co');

    expect(fixture.nativeElement.textContent).toContain('INACTIVA');
  });

  it('si la verificación falla no declara la cuenta activa y ofrece reintentar', () => {
    service.consult.and.returnValue(throwError(() => new Error('sin conexión')));

    const fixture = crear('persona@uco.edu.co');
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('No se pudo verificar');
    expect(text).not.toContain('ACTIVA');
    expect(text).toContain('Reintentar verificación');
  });

  it('un fallo al reconciliar conserva el estado previo y muestra el error', () => {
    service.consult.and.returnValue(of({ exitoso: true, datos: acceso('PENDIENTE_SINCRONIZACION') }));
    service.reconcile.and.returnValue(throwError(() => new Error('PDP caído')));

    const fixture = crear('persona@uco.edu.co');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('PENDIENTE DE SINCRONIZACIÓN');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('al cambiar la cuenta registrada se vuelve a verificar', () => {
    service.consult.and.returnValues(
      of({ exitoso: true, datos: acceso('ACTIVA') }),
      of({ exitoso: true, datos: acceso('PENDIENTE_SINCRONIZACION') }),
    );

    const fixture = crear('a@uco.edu.co');
    fixture.componentRef.setInput('correo', 'b@uco.edu.co');
    fixture.detectChanges();

    expect(service.consult.calls.allArgs()).toEqual([['a@uco.edu.co'], ['b@uco.edu.co']]);
    expect(fixture.nativeElement.textContent).toContain('PENDIENTE DE SINCRONIZACIÓN');
  });

  it('F-ADM-S07: el detalle tecnico va plegado y el boton y la ayuda no usan jerga interna', () => {
    service.consult.and.returnValue(of({ exitoso: true, datos: acceso('PENDIENTE_SINCRONIZACION', 'la credencial de servicio del PDP no esta configurada') }));
    const fixture = crear('persona@uco.edu.co');
    const el = fixture.nativeElement as HTMLElement;
    const detalle = el.querySelector('details') as HTMLDetailsElement;
    expect(detalle).toBeTruthy();
    expect(detalle.open).toBeFalse();
    expect(detalle.textContent).toContain('credencial de servicio del PDP');
    expect(el.textContent).not.toContain('Reconciliar');
    expect(el.textContent).not.toContain('idempotente');
    expect(el.querySelector('button')?.textContent).toContain('Reintentar activación');
  });
});
