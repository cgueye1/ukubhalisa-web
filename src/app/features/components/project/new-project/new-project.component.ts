
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RealestateService, PropertyType, Promoter } from '../../../../core/services/realestate.service';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-new-project',
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.css']
})
export class NewProjectComponent implements OnInit, OnDestroy {
  projectForm!: FormGroup;
  planFile?: File;
  isSubmitting = false;
  propertyTypes: PropertyType[] = [];
  promoters: Promoter[] = [];
  isLoadingData = false;
  loadingError = '';
  selectedFiles = { plan: null as string | null };
  private destroy$ = new Subject<void>();
managers: any;
moas: any;

  constructor(
    private fb: FormBuilder,
    private realestateService: RealestateService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const currentUser = this.authService.currentUser();
    const currentUserId = currentUser?.id || null;

    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      number: ['', [Validators.required]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      price: [null, [Validators.required, Validators.min(0)]],
      numberOfRooms: [null, [Validators.required, Validators.min(1)]],
      area: [null, [Validators.required, Validators.min(1)]],
      numberOfLots: [null, [Validators.required, Validators.min(1)]],
      promoterId: [currentUserId],
      propertyTypeId: [null, Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      latitude: [''],
      longitude: [''],
      description: ['', Validators.maxLength(1000)],
      moaId: [null],
      managerId: [null],
      hasHall: [false],
      hasParking: [false],
      hasElevator: [false],
      hasSwimmingPool: [false],
      hasGym: [false],
      hasPlayground: [false],
      hasSecurityService: [false],
      hasGarden: [false],
      hasSharedTerrace: [false],
      hasBicycleStorage: [false],
      hasLaundryRoom: [false],
      hasStorageRooms: [false],
      hasWasteDisposalArea: [false],
      mezzanine: [false]
    }, { validators: this.dateRangeValidator });
  }

  private dateRangeValidator(form: FormGroup) {
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return { dateRange: true };
    }
    return null;
  }

  private loadInitialData(): void {
    this.isLoadingData = true;
    this.loadingError = '';

    this.realestateService.getPropertyTypes().pipe(takeUntil(this.destroy$)).subscribe({
      next: (types) => {
        this.propertyTypes = types;
        console.log('Types de propriétés chargés:', types);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des types de propriétés:', error);
        this.loadingError = 'Erreur de chargement des types de propriétés';
        this.propertyTypes = [
          { id: 1, typename: 'Appartement' },
          { id: 2, typename: 'Villa' },
          { id: 3, typename: 'Bureau' },
          { id: 4, typename: 'Local commercial' }
        ];
      }
    });

    this.realestateService.getPromoters().pipe(takeUntil(this.destroy$)).subscribe({
      next: (promoters) => {
        this.promoters = promoters;
        this.isLoadingData = false;
        console.log('Promoteurs chargés:', promoters);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des promoteurs:', error);
        this.loadingError = 'Erreur de chargement des promoteurs';
        this.promoters = [
          { id: this.authService.currentUser()?.id || 1, name: 'Promoteur par défaut' }
        ];
        this.isLoadingData = false;
      }
    });
  }

  onFileChange(event: any, type: 'plan'): void {
    const file = event.target.files[0];
    if (!file) {
      this.planFile = undefined;
      this.selectedFiles.plan = null;
      return;
    }

    const validation = this.realestateService.validateFile(file, 'image');
    if (!validation.valid) {
      alert(validation.error);
      event.target.value = '';
      this.planFile = undefined;
      this.selectedFiles.plan = null;
      return;
    }

    this.planFile = file;
    this.selectedFiles.plan = file.name;
    console.log('Fichier plan sélectionné:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
  }

  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\s/g, '');
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      const formatted = new Intl.NumberFormat('fr-FR').format(numericValue);
      input.value = formatted;
      this.projectForm.get('price')?.setValue(numericValue);
    }
  }

  onSubmit(): void {
    console.log('=== DÉBUT DE L\'ENVOI ===');
    if (this.projectForm.invalid) {
      console.log('Formulaire invalide:', this.projectForm.errors);
      this.markFormGroupTouched();
      this.showValidationErrors();
      return;
    }

    if (!this.planFile) {
      console.log('Aucun fichier plan sélectionné');
      alert('Veuillez sélectionner un plan (image)');
      return;
    }

    this.isSubmitting = true;
    const formData = this.projectForm.value;
    const currentUser = this.authService.currentUser();
    const currentUserId = currentUser?.id;

    if (!currentUserId) {
      console.error('Utilisateur non identifié');
      alert('Erreur: utilisateur non identifié');
      this.isSubmitting = false;
      return;
    }

    const projectData = {
      name: formData.name,
      number: formData.number,
      address: formData.address,
      price: Number(formData.price),
      numberOfRooms: Number(formData.numberOfRooms),
      area: Number(formData.area),
      latitude: formData.latitude ? Number(formData.latitude) : undefined,
      longitude: formData.longitude ? Number(formData.longitude) : undefined,
      description: formData.description || '',
      numberOfLots: Number(formData.numberOfLots),
      promoterId: Number(formData.promoterId || currentUserId),
      moaId: formData.moaId ? Number(formData.moaId) : undefined,
      managerId: formData.managerId ? Number(formData.managerId) : undefined,
      propertyTypeId: Number(formData.propertyTypeId),
      startDate: this.formatDateForAPI(formData.startDate),
      endDate: this.formatDateForAPI(formData.endDate),
      hasHall: Boolean(formData.hasHall),
      hasParking: Boolean(formData.hasParking),
      hasElevator: Boolean(formData.hasElevator),
      hasSwimmingPool: Boolean(formData.hasSwimmingPool),
      hasGym: Boolean(formData.hasGym),
      hasPlayground: Boolean(formData.hasPlayground),
      hasSecurityService: Boolean(formData.hasSecurityService),
      hasGarden: Boolean(formData.hasGarden),
      hasSharedTerrace: Boolean(formData.hasSharedTerrace),
      hasBicycleStorage: Boolean(formData.hasBicycleStorage),
      hasLaundryRoom: Boolean(formData.hasLaundryRoom),
      hasStorageRooms: Boolean(formData.hasStorageRooms),
      hasWasteDisposalArea: Boolean(formData.hasWasteDisposalArea),
      mezzanine: Boolean(formData.mezzanine)
    };

    console.log('Données du projet à envoyer:', projectData);
    console.log('Fichier plan:', {
      name: this.planFile.name,
      size: this.planFile.size,
      type: this.planFile.type
    });

    this.realestateService.createProject(projectData, this.planFile, false) // Set to false for raw file upload
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Projet créé avec succès:', response);
          alert('Projet créé avec succès !');
          this.router.navigate(['/dashboard']);
          this.resetForm();
        },
        error: (error) => {
          console.error('Erreur lors de la création du projet:', error);
          alert(error.message || 'Erreur lors de la création du projet');
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
  }

  private formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  private showValidationErrors(): void {
    const errors: string[] = [];
    if (this.nameControl?.hasError('required')) errors.push('Le nom du projet est requis');
    if (this.numberControl?.hasError('required')) errors.push('Le numéro du projet est requis');
    if (this.addressControl?.hasError('required')) errors.push('L\'adresse est requise');
    if (this.priceControl?.hasError('required')) errors.push('Le prix est requis');
    if (this.numberOfRoomsControl?.hasError('required')) errors.push('Le nombre de pièces est requis');
    if (this.areaControl?.hasError('required')) errors.push('La surface est requise');
    if (this.numberOfLotsControl?.hasError('required')) errors.push('Le nombre de lots est requis');
    // if (this.propertyTypeControl?.hasError('required')) errors.push('Le type de propriété est requis');
    if (this.promoterControl?.hasError('required')) errors.push('Le promoteur est requis');
    if (this.startDateControl?.hasError('required')) errors.push('La date de début est requise');
    if (this.endDateControl?.hasError('required')) errors.push('La date de fin est requise');
    if (this.projectForm.hasError('dateRange')) errors.push('La date de fin doit être après la date de début');

    if (errors.length > 0) {
      alert('Veuillez corriger les erreurs suivantes:\n' + errors.join('\n'));
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.projectForm.controls).forEach(key => {
      this.projectForm.get(key)?.markAsTouched();
    });
  }

  private resetForm(): void {
    const currentUserId = this.authService.currentUser()?.id || null;
    this.projectForm.reset({
      promoterId: currentUserId,
      moaId: null,
      managerId: null,
      hasHall: false,
      hasParking: false,
      hasElevator: false,
      hasSwimmingPool: false,
      hasGym: false,
      hasPlayground: false,
      hasSecurityService: false,
      hasGarden: false,
      hasSharedTerrace: false,
      hasBicycleStorage: false,
      hasLaundryRoom: false,
      hasStorageRooms: false,
      hasWasteDisposalArea: false,
      mezzanine: false
    });
    this.planFile = undefined;
    this.selectedFiles.plan = null;
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => input.value = '');
  }

  onCancel(): void {
    if (confirm('Êtes-vous sûr de vouloir annuler ? Toutes les données saisies seront perdues.')) {
      this.resetForm();
      this.router.navigate(['/dashboard']);
    }
  }

  retryLoadData(): void {
    this.loadInitialData();
  }

  isPlanFileSelected(): boolean {
    return !!this.planFile && !!this.selectedFiles.plan;
  }

  getPlanFileName(): string {
    return this.selectedFiles.plan || 'Aucun fichier sélectionné';
  }

  removePlanFile(): void {
    this.planFile = undefined;
    this.selectedFiles.plan = null;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  get nameControl() { return this.projectForm.get('name'); }
  get numberControl() { return this.projectForm.get('number'); }
  get addressControl() { return this.projectForm.get('address'); }
  get priceControl() { return this.projectForm.get('price'); }
  get numberOfRoomsControl() { return this.projectForm.get('numberOfRooms'); }
  get areaControl() { return this.projectForm.get('area'); }
  get numberOfLotsControl() { return this.projectForm.get('numberOfLots'); }
  get propertyTypeControl() { return this.projectForm.get('propertyTypeId'); }
  get promoterControl() { return this.projectForm.get('promoterId'); }
  get startDateControl() { return this.projectForm.get('startDate'); }
  get endDateControl() { return this.projectForm.get('endDate'); }
  get latitudeControl() { return this.projectForm.get('latitude'); }
  get longitudeControl() { return this.projectForm.get('longitude'); }
  get descriptionControl() { return this.projectForm.get('description'); }
  get moaControl() { return this.projectForm.get('moaId'); }
  get managerControl() { return this.projectForm.get('managerId'); }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.projectForm.get(controlName);
    return !!(control?.hasError(errorType) && control?.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.projectForm.get(controlName);
    if (control?.hasError('required')) return 'Ce champ est requis';
    if (control?.hasError('minlength')) return `Minimum ${control.errors?.['minlength'].requiredLength} caractères`;
    if (control?.hasError('min')) return `La valeur doit être supérieure à ${control.errors?.['min'].min}`;
    if (control?.hasError('maxlength')) return `Maximum ${control.errors?.['maxlength'].requiredLength} caractères`;
    if (this.projectForm.hasError('dateRange')) return 'La date de fin doit être après la date de début';
    return '';
  }

  trackByTypeId(index: number, type: PropertyType): number {
    return type.id;
  }

  trackByPromoterId(index: number, promoter: Promoter): number {
    return promoter.id;
  }
}
