import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsUtilisateurComponent } from './details-utilisateur.component';

describe('DetailsUtilisateurComponent', () => {
  let component: DetailsUtilisateurComponent;
  let fixture: ComponentFixture<DetailsUtilisateurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsUtilisateurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailsUtilisateurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
