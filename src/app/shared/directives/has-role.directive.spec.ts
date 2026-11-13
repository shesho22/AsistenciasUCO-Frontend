import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HasRoleDirective } from './has-role.directive';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { signal } from '@angular/core';

@Component({
    imports: [HasRoleDirective],
    template: `
    <div *appHasRole="'DOCENTE'" id="docente-single">Docente Contenido</div>
    <div *appHasRole="['ADMINISTRADOR', 'DECANO']" id="multi-role">Admin o Decano</div>
    <div *appHasRole="'ESTUDIANTE'" id="estudiante-single">Estudiante Contenido</div>
  `
})
class TestHostComponent {}

describe('HasRoleDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let mockCurrentUser = signal<User | null>(null);

  beforeEach(async () => {
    mockCurrentUser = signal<User | null>(null);
    const mockAuthService = {
      currentUser: mockCurrentUser,
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('no muestra ningún elemento si no hay usuario autenticado', () => {
    expect(fixture.debugElement.query(By.css('#docente-single'))).toBeNull();
    expect(fixture.debugElement.query(By.css('#multi-role'))).toBeNull();
    expect(fixture.debugElement.query(By.css('#estudiante-single'))).toBeNull();
  });

  it('muestra solo el elemento correspondiente al rol del usuario', () => {
    mockCurrentUser.set({
      id: '123',
      name: 'Profesor X',
      email: 'docente@uco.edu.co',
      role: 'DOCENTE',
      institutionName: 'UCO',
      department: 'Docencia',
      status: 'active',
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#docente-single'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('#multi-role'))).toBeNull();
    expect(fixture.debugElement.query(By.css('#estudiante-single'))).toBeNull();
  });

  it('muestra elemento si el rol del usuario está dentro de la lista de roles permitidos', () => {
    mockCurrentUser.set({
      id: '456',
      name: 'Decano Y',
      email: 'decano@uco.edu.co',
      role: 'DECANO',
      institutionName: 'UCO',
      department: 'Ingeniería',
      status: 'active',
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#docente-single'))).toBeNull();
    expect(fixture.debugElement.query(By.css('#multi-role'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('#estudiante-single'))).toBeNull();
  });
});
