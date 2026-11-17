import { TestBed } from '@angular/core/testing';
import { AVATAR_FONDOS, AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  function crear(name: string) {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    const caja = (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
    return { fixture, caja };
  }

  const fondoDe = (caja: HTMLElement) => AVATAR_FONDOS.filter((clase) => caja.classList.contains(clase));

  beforeEach(() => TestBed.configureTestingModule({ imports: [AvatarComponent] }));

  it('pinta el fondo con una clase de la paleta, no con un estilo en línea', () => {
    // Tailwind solo publica los colores del tema que encuentra como clase en el código: con
    // style="background-color: var(--color-avatar-N)" la variable no existía y el avatar quedaba blanco.
    const { caja } = crear('Gabriel Esteban Vélez Uribe');
    expect(fondoDe(caja).length).toBe(1);
    expect(caja.style.backgroundColor).toBe('');
  });

  it('la paleta son las ocho clases bg-avatar-N escritas completas', () => {
    expect(AVATAR_FONDOS).toEqual([
      'bg-avatar-1', 'bg-avatar-2', 'bg-avatar-3', 'bg-avatar-4',
      'bg-avatar-5', 'bg-avatar-6', 'bg-avatar-7', 'bg-avatar-8',
    ]);
  });

  it('el mismo nombre recibe siempre el mismo color y los títulos académicos no lo cambian', () => {
    const uno = fondoDe(crear('María Fernanda Ríos').caja);
    const dos = fondoDe(crear('María Fernanda Ríos').caja);
    const conTitulo = fondoDe(crear('Dra. María Fernanda Ríos').caja);
    expect(dos).toEqual(uno);
    expect(conTitulo).toEqual(uno);
  });

  it('nombres distintos se reparten entre varios colores', () => {
    const nombres = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio', 'Gloria', 'Hugo', 'Irene', 'Jorge', 'Karen', 'Luis'];
    const usados = new Set(nombres.map((n) => fondoDe(crear(n).caja)[0]));
    expect(usados.size).toBeGreaterThan(2);
  });

  it('muestra la inicial sin el título y conserva el tamaño pedido', () => {
    const { fixture, caja } = crear('Ing. pedro gómez');
    expect(caja.textContent?.trim()).toBe('P');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    expect(caja.classList.contains('w-12')).toBeTrue();
    expect(fondoDe(caja).length).toBe(1);
  });

  it('sin nombre usa la inicial U y aun así tiene color', () => {
    const { caja } = crear('');
    expect(caja.textContent?.trim()).toBe('U');
    expect(fondoDe(caja).length).toBe(1);
  });
});
