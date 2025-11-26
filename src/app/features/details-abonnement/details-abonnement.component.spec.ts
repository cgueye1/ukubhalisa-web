import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsAbonnementComponent } from './details-abonnement.component';

describe('DetailsAbonnementComponent', () => {
  let component: DetailsAbonnementComponent;
  let fixture: ComponentFixture<DetailsAbonnementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsAbonnementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailsAbonnementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
