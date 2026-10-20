import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminCatalogsComponent } from './admin-catalogs.component';

describe('AdminCatalogsComponent', () => {
  let fixture: ComponentFixture<AdminCatalogsComponent>;
  let component: AdminCatalogsComponent;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [AdminCatalogsComponent],
      providers: [{ provide: Router, useValue: routerSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCatalogsComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse y redirigir a /app/admin/facultades', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/admin/facultades'], { replaceUrl: true });
  });
});
