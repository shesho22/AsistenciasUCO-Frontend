import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TipoPlantillaAdminDto } from '../../../core/services/admin-email-notification.service';
import { AdminEmailPlantillaEditorComponent } from './admin-email-plantilla-editor.component';

describe('AdminEmailPlantillaEditorComponent', () => {
  let fixture: ComponentFixture<AdminEmailPlantillaEditorComponent>;

  const plantilla: TipoPlantillaAdminDto = {
    tipo: 'VERIFICACION_CORREO',
    descripcion: 'Verificación del correo institucional',
    idioma: 'es',
    versionActiva: 2,
    asuntoActivo: 'Asunto {nombre}',
    cuerpoActivo: 'Cuerpo {nombre}',
    actualizadoEn: '2026-11-01T10:00:00Z',
    marcadores: [{ marcador: 'nombre', descripcion: 'Nombre', ejemplo: 'Ana', obligatorio: true }],
    versiones: [
      { id: 'v2', tipo: 'VERIFICACION_CORREO', idioma: 'es', version: 2, asunto: 'A2', cuerpo: 'C2', activa: true, creadoEn: '2026-11-02T10:00:00Z' },
      { id: 'v1', tipo: 'VERIFICACION_CORREO', idioma: 'es', version: 1, asunto: 'A1', cuerpo: 'C1', activa: false, creadoEn: '2026-11-01T10:00:00Z' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminEmailPlantillaEditorComponent] }).compileComponents();
    fixture = TestBed.createComponent(AdminEmailPlantillaEditorComponent);
    fixture.componentRef.setInput('plantilla', plantilla);
    fixture.componentRef.setInput('asunto', 'Asunto {nombre}');
    fixture.componentRef.setInput('cuerpo', 'Cuerpo');
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;

  it('usa la descripción del servicio como título, o el código del tipo como respaldo', () => {
    expect(el().querySelector('h2')?.textContent?.trim()).toBe('Verificación del correo institucional');
    fixture.componentRef.setInput('plantilla', { ...plantilla, descripcion: '' });
    fixture.detectChanges();
    expect(el().querySelector('h2')?.textContent?.trim()).toBe('VERIFICACION_CORREO');
  });

  it('avisa los marcadores obligatorios faltantes en texto', () => {
    fixture.componentRef.setInput('faltantes', ['nombre', 'enlace']);
    fixture.detectChanges();
    expect(el().textContent).toContain('{nombre}, {enlace}');
  });

  it('indica que todos los marcadores están presentes cuando no falta ninguno', () => {
    expect(el().textContent).toContain('Todos los marcadores obligatorios están presentes');
  });

  it('emite el marcador y su destino al pulsarlo', () => {
    const emitidos: { marcador: string; destino: string }[] = [];
    fixture.componentInstance.marcadorInsertado.subscribe((e) => emitidos.push(e));
    boton('{nombre}').click();
    boton('+ Asunto').click();
    expect(emitidos).toEqual([
      { marcador: 'nombre', destino: 'cuerpo' },
      { marcador: 'nombre', destino: 'asunto' },
    ]);
  });

  it('emite las acciones de vista previa, restaurar, guardar y activar versión histórica', () => {
    fixture.componentRef.setInput('puedeGuardar', true);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const eventos: string[] = [];
    c.vistaPreviaSolicitada.subscribe(() => eventos.push('preview'));
    c.restaurarSolicitado.subscribe(() => eventos.push('restaurar'));
    c.guardarSolicitado.subscribe(() => eventos.push('guardar'));
    c.versionActivada.subscribe((e) => eventos.push(`activar:${e.tipo}:${e.version}`));
    boton('Vista Previa').click();
    boton('Restaurar Texto Activo').click();
    boton('Guardar y Activar').click();
    Array.from(el().querySelectorAll('tbody button')).find((b) => b.textContent?.trim() === 'Activar')
      ?.dispatchEvent(new MouseEvent('click'));
    expect(eventos).toEqual(['preview', 'restaurar', 'guardar', 'activar:VERIFICACION_CORREO:1']);
  });

  it('deshabilita el guardado sin permiso y durante el guardado', () => {
    expect(boton('Guard').disabled).toBeTrue();
    fixture.componentRef.setInput('puedeGuardar', true);
    fixture.detectChanges();
    expect(boton('Guard').disabled).toBeFalse();
    fixture.componentRef.setInput('guardando', true);
    fixture.detectChanges();
    expect(boton('Guard').disabled).toBeTrue();
  });

  it('sanitiza el HTML de la vista previa sin marcarlo como confiable', () => {
    fixture.componentRef.setInput('vistaPrevia', {
      asunto: 'a',
      textoPlano: 'b',
      html: '<p>hola</p><script>window.__xss = true</script>',
      origen: 'preview',
    });
    fixture.detectChanges();
    expect(el().textContent).toContain('hola');
    expect(el().querySelector('script')).toBeNull();
    expect((window as unknown as Record<string, unknown>)['__xss']).toBeUndefined();
  });
});
