import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService, ProjectData, ApiResponse } from '../../../../../services/projet.service';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

// Interfaces pour les données de référence
interface PropertyType {
  id: number;
  typename: string;
}

interface Promoter {
  id: number;
  name: string;
}

interface Moa {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  name: string;
}

@Component({
  selector: 'app-new-project',
  standalone:true,
  imports: [
    CommonModule,
    ReactiveFormsModule  // Ajoutez cette ligne
  ],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
  
})
export class NewProjectComponent implements OnInit, OnDestroy {
  projectForm!: FormGroup;
  isSubmitting = false;
  isLoadingData = false;
  loadingError: string | null = null;

  // Données de référence
  propertyTypes: PropertyType[] = [];
  promoters: Promoter[] = [];
  moas: Moa[] = [];
  managers: Manager[] = [];

  // Fichier plan
  planFile: File | null = null;

  // Subscription pour nettoyer les observables
  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.initializeUserData();
  }

  ngOnDestroy(): void {
    // Nettoyer les subscriptions pour éviter les fuites mémoire
    this.subscriptions.unsubscribe();
  }

  /**
   * Initialise les données utilisateur et met à jour le formulaire
   */
  private initializeUserData(): void {
    if (this.authService.isAuthenticated()) {
      const userSubscription = this.authService.refreshUser().subscribe({
        next: (user) => {
          this.updateFormWithUserData();
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'utilisateur:', error);
        }
      });
      
      this.subscriptions.add(userSubscription);
    } else {
      // Si l'utilisateur n'est pas connecté, utiliser les données actuelles
      this.updateFormWithUserData();
    }
  }

  /**
   * Met à jour le formulaire avec les données de l'utilisateur connecté
   */
  private updateFormWithUserData(): void {
    const currentUser = this.authService.currentUser();
    
    if (currentUser && currentUser.id) {
      // Mettre à jour le formulaire avec l'ID de l'utilisateur comme manager
      this.projectForm.patchValue({
        managerId: currentUser.id,
        moaId: 1,      // Fixé à 1 comme demandé
        promoterId: 1  // Fixé à 1 comme demandé
      });
    }
  }

  /**
   * Initialise le formulaire avec les validations
   */
  private initializeForm(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      number: ['', Validators.required],
      propertyTypeId: ['', Validators.required],
      area: ['', [Validators.required, Validators.min(1)]],
      price: ['', [Validators.required, Validators.min(0)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      address: ['', [Validators.required, Validators.minLength(5)]],
      numberOfLots: ['', [Validators.required, Validators.min(1)]],
      numberOfRooms: ['', [Validators.required, Validators.min(1)]],
      promoterId: [1], // Fixé à 1
      moaId: [1], // Fixé à 1
      managerId: [''], // Sera rempli avec l'ID de l'utilisateur connecté
      constructionStatus: [''],
      latitude: [''],
      longitude: [''],
      description: ['', Validators.maxLength(1000)],
      // Équipements
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

  /**
   * Validateur personnalisé pour vérifier que la date de fin est après la date de début
   */
  private dateRangeValidator(control: AbstractControl): {[key: string]: any} | null {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
        return { dateRange: { message: 'La date de fin doit être postérieure à la date de début' } };
      }
    }
    return null;
  }

  /**
   * Charge les données de référence
   */
  private async loadReferenceData(): Promise<void> {
    this.isLoadingData = true;
    this.loadingError = null;

    try {
      // Simuler le chargement des données de référence
      // Remplacez ces appels par vos vrais services
      await Promise.all([
        this.loadPropertyTypes(),
        this.loadPromoters(),
        this.loadMoas(),
        this.loadManagers()
      ]);
    } catch (error) {
      this.loadingError = 'Erreur lors du chargement des données de référence';
      console.error('Erreur de chargement:', error);
    } finally {
      this.isLoadingData = false;
    }
  }

  /**
   * Charge les types de propriétés (à adapter selon votre service)
   */
  private async loadPropertyTypes(): Promise<void> {
    // Exemple de données - remplacez par votre service réel
    this.propertyTypes = [
      { id: 1, typename: 'Appartement' },
      { id: 2, typename: 'Villa' },
      { id: 3, typename: 'Immeuble' },
      { id: 4, typename: 'Terrain' }
    ];
  }

  /**
   * Charge les promoteurs (à adapter selon votre service)
   */
  private async loadPromoters(): Promise<void> {
    // Exemple de données - remplacez par votre service réel
    this.promoters = [
      { id: 1, name: 'Promoteur A' },
      { id: 2, name: 'Promoteur B' },
      { id: 3, name: 'Promoteur C' }
    ];
  }

  /**
   * Charge les MOAs (à adapter selon votre service)
   */
  private async loadMoas(): Promise<void> {
    // Exemple de données - remplacez par votre service réel
    this.moas = [
      { id: 1, name: 'MOA Alpha' },
      { id: 2, name: 'MOA Beta' },
      { id: 3, name: 'MOA Gamma' }
    ];
  }

  /**
   * Charge les managers (à adapter selon votre service)
   */
  private async loadManagers(): Promise<void> {
    // Exemple de données - remplacez par votre service réel
    this.managers = [
      { id: 1, name: 'Manager 1' },
      { id: 2, name: 'Manager 2' },
      { id: 3, name: 'Manager 3' }
    ];
  }

  /**
   * Réessaie le chargement des données
   */
  retryLoadData(): void {
    this.loadReferenceData();
  }

  /**
   * Gère le changement de fichier
   */
  onFileChange(event: any, fileType: string): void {
    const file = event.target.files[0];
    if (file) {
      if (fileType === 'plan') {
        // Vérification du type de fichier
        if (!file.type.startsWith('image/')) {
          alert('Veuillez sélectionner un fichier image valide');
          return;
        }
        
        // Vérification de la taille (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          alert('Le fichier est trop volumineux. Taille maximale: 10MB');
          return;
        }
        
        this.planFile = file;
      }
    }
  }

  /**
   * Supprime le fichier plan
   */
  removePlanFile(): void {
    this.planFile = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('planFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Vérifie si un fichier plan est sélectionné
   */
  isPlanFileSelected(): boolean {
    return this.planFile !== null;
  }

  /**
   * Retourne le nom du fichier plan
   */
  getPlanFileName(): string {
    return this.planFile?.name || '';
  }

  /**
   * Formate le prix avec des espaces
   */
  onPriceInput(event: any): void {
    let value = event.target.value;
    // Supprimer tous les caractères non numériques sauf les points
    value = value.replace(/[^\d]/g, '');
    
    // Ajouter des espaces pour la lisibilité
    if (value) {
      value = parseInt(value).toLocaleString('fr-FR');
    }
    
    // Mettre à jour le contrôle du formulaire avec la valeur numérique
    const numericValue = value ? parseInt(value.replace(/\s/g, '')) : '';
    this.projectForm.patchValue({ price: numericValue });
    
    // Mettre à jour l'affichage
    event.target.value = value;
  }

  /**
   * Convertit la date au format requis par l'API (MM-DD-YYYY)
   */
  private convertDateToApiFormat(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}-${day}-${year}`;
  }

 /**
 * Soumet le formulaire
 */
 async onSubmit(): Promise<void> {
  if (this.projectForm.invalid || !this.planFile) {
    this.projectForm.markAllAsTouched();
    return;
  }

  // Vérifier que l'utilisateur est authentifié
  if (!this.authService.isAuthenticated()) {
    alert('Vous devez être connecté pour créer un projet');
    this.router.navigate(['/login']);
    return;
  }

  this.isSubmitting = true;

  try {
    // Préparer les données du projet
    const formValues = this.projectForm.value;
    const currentUser = this.authService.currentUser();

    
    if (!currentUser || !currentUser.id) {
      alert('Erreur: Impossible de récupérer les informations de l\'utilisateur connecté');
      this.isSubmitting = false;
      return;
    }
    
    // Convertir propertyTypeId en nombre
    const propertyTypeId = Number(formValues.propertyTypeId);
    
    const projectData: ProjectData = {
      name: formValues.name,
      number: formValues.number,
      address: formValues.address,
      price: typeof formValues.price === 'string' ? 
             parseInt(formValues.price.replace(/\s/g, '')) : formValues.price,
      numberOfRooms: formValues.numberOfRooms,
      area: formValues.area,
      latitude: formValues.latitude || undefined,
      longitude: formValues.longitude || undefined,
      description: formValues.description || undefined,
      numberOfLots: formValues.numberOfLots,
      promoterId: 1, // Fixé à 1
      moaId: 1, // Fixé à 1
      managerId: currentUser.id, // ID de l'utilisateur connecté
      propertyTypeId: propertyTypeId, // Converti en nombre
      plan: this.planFile,
      // Dates converties au format requis
      startDate: this.convertDateToApiFormat(formValues.startDate),
      endDate: this.convertDateToApiFormat(formValues.endDate),
      // Équipements
      hasHall: formValues.hasHall || false,
      hasParking: formValues.hasParking || false,
      hasElevator: formValues.hasElevator || false,
      hasSwimmingPool: formValues.hasSwimmingPool || false,
      hasGym: formValues.hasGym || false,
      hasPlayground: formValues.hasPlayground || false,
      hasSecurityService: formValues.hasSecurityService || false,
      hasGarden: formValues.hasGarden || false,
      hasSharedTerrace: formValues.hasSharedTerrace || false,
      hasBicycleStorage: formValues.hasBicycleStorage || false,
      hasLaundryRoom: formValues.hasLaundryRoom || false,
      hasStorageRooms: formValues.hasStorageRooms || false,
      hasWasteDisposalArea: formValues.hasWasteDisposalArea || false,
      mezzanine: formValues.mezzanine || false
    };

    // Appeler le service pour créer le projet
    const response = await this.projectService.createProject(projectData).toPromise();
    
    if (response?.success) {
      alert('Projet créé avec succès !');
      this.router.navigate(['/projects']); // Rediriger vers la liste des projets
    } else {
      alert('Erreur lors de la création du projet: ' + (response?.message || 'Erreur inconnue'));
    }

  } catch (error: any) {
    console.error('Erreur complète:', error);
    if (error.status === 403) {
      alert('Accès refusé. Vérifiez vos permissions ou reconnectez-vous.');
      this.authService.logout();
      this.router.navigate(['/login']);
    } else {
      alert('Erreur lors de la création du projet: ' + (error.message || error.error || 'Erreur inconnue'));
    }
  } finally {
    this.isSubmitting = false;
  }
}

  /**
   * Annule et retourne à la liste
   */
  onCancel(): void {
    if (confirm('Êtes-vous sûr de vouloir annuler? Toutes les données saisies seront perdues.')) {
      this.router.navigate(['/projects']);
    }
  }

  // Méthodes utilitaires pour les erreurs et la validation

  /**
   * Vérifie si un champ a une erreur spécifique
   */
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.projectForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  /**
   * Retourne le message d'erreur pour un champ
   */
  getErrorMessage(fieldName: string): string {
    const field = this.projectForm.get(fieldName);
    if (!field?.errors || !field?.touched) return '';

    const errors: {[key: string]: string} = {
      required: 'Ce champ est requis',
      minlength: `Minimum ${field.errors?.['minlength']?.requiredLength} caractères`,
      maxlength: `Maximum ${field.errors?.['maxlength']?.requiredLength} caractères`,
      min: `La valeur doit être supérieure ou égale à ${field.errors?.['min']?.min}`,
      email: 'Format d\'email invalide'
    };

    // Gestion spéciale pour le validateur de plage de dates
    if (fieldName === 'endDate' && this.projectForm.hasError('dateRange')) {
      return 'La date de fin doit être postérieure à la date de début';
    }

    // Messages spécifiques par champ
    const fieldMessages: {[key: string]: {[key: string]: string}} = {
      name: {
        required: 'Le nom du projet est requis',
        minlength: 'Le nom doit contenir au moins 3 caractères'
      },
      number: {
        required: 'Le numéro du projet est requis'
      },
      propertyTypeId: {
        required: 'Veuillez sélectionner un type de projet'
      },
      area: {
        required: 'La surface est requise',
        min: 'La surface doit être positive'
      },
      price: {
        required: 'Le prix est requis',
        min: 'Le prix ne peut pas être négatif'
      },
      startDate: {
        required: 'La date de début est requise'
      },
      endDate: {
        required: 'La date de fin est requise'
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
        required: 'Le nombre de chambres est requis',
        min: 'Le nombre de chambres doit être positif'
      },
      promoterId: {
        required: 'Veuillez sélectionner un promoteur'
      },
      description: {
        maxlength: 'La description ne peut pas dépasser 1000 caractères'
      }
    };

    // Retourner le message spécifique au champ et à l'erreur
    const errorType = Object.keys(field.errors)[0];
    return fieldMessages[fieldName]?.[errorType] || errors[errorType] || 'Erreur de validation';
  }

  // Getters pour les contrôles du formulaire (pour faciliter l'accès dans le template)
  get nameControl() { return this.projectForm.get('name'); }
  get areaControl() { return this.projectForm.get('area'); }
  get priceControl() { return this.projectForm.get('price'); }
  get addressControl() { return this.projectForm.get('address'); }
  get numberOfLotsControl() { return this.projectForm.get('numberOfLots'); }
  get numberOfRoomsControl() { return this.projectForm.get('numberOfRooms'); }
  get descriptionControl() { return this.projectForm.get('description'); }

  // Getters pour l'accès aux informations utilisateur (similaire au sidebar)
  get currentUser() {
    return this.authService.currentUser();
  }

  get userFullName() {
    return this.authService.userFullName();
  }

  get isUserAuthenticated() {
    return this.authService.isAuthenticated();
  }

  /**
   * Obtient le nom d'affichage formaté de l'utilisateur connecté
   */
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  // Méthodes de tracking pour les listes (optimisation Angular)
  trackByTypeId(index: number, item: PropertyType): number {
    return item.id;
  }

  trackByPromoterId(index: number, item: Promoter): number {
    return item.id;
  }

  trackByMoaId(index: number, item: Moa): number {
    return item.id;
  }

  trackByManagerId(index: number, item: Manager): number {
    return item.id;
  }
}