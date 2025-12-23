import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { EntrepriseService, EntrepriseRequest } from '../../../../../services/entreprise.service';
import { AuthService } from '../../../auth/services/auth.service';

interface PropertyType {
  id: number;
  typename: string;
}

@Component({
  selector: 'app-new-entreprise',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnInit, OnDestroy {
  entrepriseForm!: FormGroup;
  isSubmitting = false;

  propertyTypes: PropertyType[] = [
    { id: 1, typename: 'Appartement' },
    { id: 2, typename: 'Villa' },
    { id: 3, typename: 'Immeuble' },
    { id: 4, typename: 'Terrain' }
  ];

  planFile: File | null = null;
  private subscriptions: Subscription = new Subscription();

  private readonly fb = inject(FormBuilder);
  private readonly entrepriseService = inject(EntrepriseService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  constructor() {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.initializeUserData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeUserData(): void {
    if (this.authService.isAuthenticated()) {
      const userSubscription = this.authService.refreshUser().subscribe({
        next: () => this.updateFormWithUserData(),
        error: (error) => console.error('Erreur lors du chargement de l\'utilisateur:', error)
      });
      this.subscriptions.add(userSubscription);
    } else {
      this.updateFormWithUserData();
    }
  }

  private updateFormWithUserData(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser?.id) {
      this.entrepriseForm.patchValue({
        managerId: currentUser.id,
        moaId: 1,
        promoterId: 1
      });
    }
  }

  private initializeForm(): void {
    this.entrepriseForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      number: ['', Validators.required],
      propertyTypeId: ['', Validators.required],
      area: ['', [Validators.required, Validators.min(1)]],
      price: ['', [Validators.required, Validators.min(0)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      numberOfLots: ['', [Validators.required, Validators.min(1)]],
      numberOfRooms: ['', [Validators.required, Validators.min(1)]],
      promoterId: [1],
      moaId: [1],
      managerId: [''],
      latitude: [''],
      longitude: [''],
      description: ['', Validators.maxLength(1000)]
    });
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide');
        return;
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('Le fichier est trop volumineux. Taille maximale: 10MB');
        return;
      }
      
      this.planFile = file;
    }
  }

  removePlanFile(): void {
    this.planFile = null;
    const fileInput = document.getElementById('planFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  isPlanFileSelected(): boolean {
    return this.planFile !== null;
  }

  getPlanFileName(): string {
    return this.planFile?.name || '';
  }

  onPriceInput(event: any): void {
    let value = event.target.value;
    value = value.replace(/[^\d]/g, '');
    
    if (value) {
      value = parseInt(value).toLocaleString('fr-FR');
    }
    
    const numericValue = value ? parseInt(value.replace(/\s/g, '')) : '';
    this.entrepriseForm.patchValue({ price: numericValue });
    event.target.value = value;
  }

  async onSubmit(): Promise<void> {
    if (this.entrepriseForm.invalid || !this.planFile) {
      this.entrepriseForm.markAllAsTouched();
      return;
    }

    if (!this.authService.isAuthenticated()) {
      alert('Vous devez être connecté pour créer une entreprise');
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting = true;

    try {
      const formValues = this.entrepriseForm.value;
      const currentUser = this.authService.currentUser();

      if (!currentUser?.id) {
        alert('Erreur: Impossible de récupérer les informations de l\'utilisateur');
        this.isSubmitting = false;
        return;
      }

      const entrepriseData: EntrepriseRequest = {
        name: formValues.name,
        number: formValues.number,
        address: formValues.address,
        price: typeof formValues.price === 'string' ? 
               parseInt(formValues.price.replace(/\s/g, '')) : formValues.price,
        numberOfRooms: formValues.numberOfRooms,
        area: formValues.area,
        latitude: formValues.latitude || '',
        longitude: formValues.longitude || '',
        description: formValues.description || '',
        numberOfLots: formValues.numberOfLots,
        promoterId: 1,
        moaId: 1,
        managerId: currentUser.id,
        propertyTypeId: Number(formValues.propertyTypeId),
        plan: this.planFile
      };

      const formData = this.entrepriseService.createEntrepriseFormData(entrepriseData);

      this.entrepriseService.createEntreprise(formData).subscribe({
        next: (response) => {
          alert('Entreprise créée avec succès !');
          this.router.navigate(['/entreprises']);
        },
        error: (error) => {
          console.error('Erreur:', error);
          if (error.status === 403) {
            alert('Accès refusé. Vérifiez vos permissions.');
            this.authService.logout();
            this.router.navigate(['/login']);
          } else {
            alert('Erreur lors de la création: ' + (error.message || 'Erreur inconnue'));
          }
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });

    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur: ' + (error.message || 'Erreur inconnue'));
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    if (confirm('Êtes-vous sûr de vouloir annuler? Toutes les données seront perdues.')) {
      this.router.navigate(['/entreprises']);
    }
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.entrepriseForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.entrepriseForm.get(fieldName);
    if (!field?.errors || !field?.touched) return '';

    const fieldMessages: {[key: string]: {[key: string]: string}} = {
      name: {
        required: 'Le nom de l\'entreprise est requis',
        minlength: 'Le nom doit contenir au moins 3 caractères'
      },
      number: {
        required: 'Le numéro est requis'
      },
      propertyTypeId: {
        required: 'Veuillez sélectionner un type'
      },
      area: {
        required: 'La surface est requise',
        min: 'La surface doit être positive'
      },
      price: {
        required: 'Le prix est requis',
        min: 'Le prix ne peut pas être négatif'
      },
      address: {
        required: 'L\'adresse est requise',
        minlength: 'L\'adresse doit contenir au moins 5 caractères'
      },
      numberOfLots: {
        required: 'Le nombre de lots est requis',
        min: 'Le nombre de lots doit être positif'
      },
      numberOfRooms: {
        required: 'Le nombre de pièces est requis',
        min: 'Le nombre de pièces doit être positif'
      },
      description: {
        maxlength: 'La description ne peut pas dépasser 1000 caractères'
      }
    };

    const errorType = Object.keys(field.errors)[0];
    return fieldMessages[fieldName]?.[errorType] || 'Erreur de validation';
  }

  get nameControl() { return this.entrepriseForm.get('name'); }
  get areaControl() { return this.entrepriseForm.get('area'); }
  get priceControl() { return this.entrepriseForm.get('price'); }
  get addressControl() { return this.entrepriseForm.get('address'); }
  get numberOfLotsControl() { return this.entrepriseForm.get('numberOfLots'); }
  get numberOfRoomsControl() { return this.entrepriseForm.get('numberOfRooms'); }
  get descriptionControl() { return this.entrepriseForm.get('description'); }

  get currentUser() {
    return this.authService.currentUser();
  }

  get userFullName() {
    return this.authService.userFullName();
  }

  get isUserAuthenticated() {
    return this.authService.isAuthenticated();
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  trackByTypeId(index: number, item: PropertyType): number {
    return item.id;
  }
}