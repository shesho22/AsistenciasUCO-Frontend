import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('calcula correctamente totalPages, startIndex y endIndex', () => {
    fixture.componentRef.setInput('totalItems', 45);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('currentPage', 2);
    fixture.detectChanges();

    expect(component.totalPages()).toBe(5);
    expect(component.startIndex()).toBe(10);
    expect(component.endIndex()).toBe(20);
  });

  it('calcula visiblePages cuando totalPages <= 6', () => {
    fixture.componentRef.setInput('totalItems', 30);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.detectChanges();

    expect(component.visiblePages()).toEqual([1, 2, 3]);
  });

  it('calcula visiblePages con elipsis cuando totalPages > 6', () => {
    fixture.componentRef.setInput('totalItems', 100);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('currentPage', 5);
    fixture.detectChanges();

    const pages = component.visiblePages();
    expect(pages[0]).toBe(1);
    expect(pages[1]).toBe(-1); // Elipsis izquierda
    expect(pages.includes(5)).toBeTrue();
    expect(pages[pages.length - 2]).toBe(-1); // Elipsis derecha
    expect(pages[pages.length - 1]).toBe(10);
  });

  it('goToPage emite número de página válido', () => {
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.detectChanges();

    let emittedPage: number | undefined;
    component.pageChange.subscribe((p) => (emittedPage = p));

    component.goToPage(3);
    expect(emittedPage).toBe(3);

    // No emite si la página es la misma o inválida
    emittedPage = undefined;
    component.goToPage(1);
    expect(emittedPage).toBeUndefined();

    component.goToPage(0);
    expect(emittedPage).toBeUndefined();

    component.goToPage(10);
    expect(emittedPage).toBeUndefined();
  });

  it('onPageSizeChange emite el nuevo tamaño de página', () => {
    fixture.componentRef.setInput('totalItems', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.detectChanges();

    let newSize: number | undefined;
    component.pageSizeChange.subscribe((s) => (newSize = s));

    const mockEvent = {
      target: { value: '25' },
    } as unknown as Event;

    component.onPageSizeChange(mockEvent);
    expect(newSize).toBe(25);
  });

  // UX-10: el selector debe reflejar el pageSize real (antes mostraba 5 mientras la consulta enviaba tamano=10).
  it('el selector de tamaño muestra el pageSize actual y no la primera opción', () => {
    fixture.componentRef.setInput('totalItems', 5002);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.detectChanges();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('10');

    fixture.componentRef.setInput('pageSize', 20);
    fixture.detectChanges();
    expect(select.value).toBe('20');
  });

  it('todos los botones tienen nombre accesible y la pagina actual se marca (F-TRX-014)', () => {
    fixture.componentRef.setInput('totalItems', 100);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('currentPage', 3);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nav[aria-label="Paginación"]')).toBeTruthy();
    el.querySelectorAll('button').forEach((b) => {
      expect(b.getAttribute('aria-label') || b.textContent?.trim()).toBeTruthy();
    });
    expect(el.querySelector('button[aria-label="Primera página"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Última página"]')).toBeTruthy();
    expect(el.querySelector('button[aria-current="page"]')?.getAttribute('aria-label')).toBe('Página 3');
    expect(el.querySelector('select')?.getAttribute('aria-label')).toBe('Resultados por página');
  });
});
