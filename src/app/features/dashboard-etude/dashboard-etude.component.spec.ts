import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEtudeComponent } from './dashboard-etude.component';

describe('DashboardEtudeComponent', () => {
  let component: DashboardEtudeComponent;
  let fixture: ComponentFixture<DashboardEtudeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEtudeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardEtudeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
