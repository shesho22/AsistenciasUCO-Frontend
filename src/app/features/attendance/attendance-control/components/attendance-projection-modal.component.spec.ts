import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AttendanceProjectionModalComponent } from './attendance-projection-modal.component';

describe('AttendanceProjectionModalComponent', () => {
  let fixture: ComponentFixture<AttendanceProjectionModalComponent>;
  let component: AttendanceProjectionModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceProjectionModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceProjectionModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.onClose();
  });

  it('debe crearse e inicializar el countdown en 60', () => {
    expect(component).toBeTruthy();
    expect(component.countdown()).toBe(60);
  });

  it('debe emitir closed al invocar onClose', () => {
    spyOn(component.closed, 'emit');
    component.onClose();
    expect(component.closed.emit).toHaveBeenCalled();
  });
});
