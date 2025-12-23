import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../features/auth/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-compte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.scss']
})
export class CompteComponent implements OnInit {
  // Signals pour la gestion de l'état
  activeTab = signal<'informations'>('informations');
  isSaving = signal(false);
  isUploadingPhoto = signal(false);
  selectedPhotoFile = signal<File | null>(null);
  photoError = signal(false);

  // Formulaire
  userForm!: FormGroup;

  // URL de base pour les images
  private baseUrl = 'https://wakana.online/repertoire_samater/';

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,}$/)]],
      email: ['', [Validators.required, Validators.email]],
      adress: ['']
    });
  }

  private loadUserData(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.userForm.patchValue({
        prenom: user.prenom || '',
        nom: user.nom || '',
        telephone: user.telephone || '',
        email: user.email || '',
        adress: user.adress || ''
      });
    }
  }

  // Gestion des onglets
  setActiveTab(tab: 'informations'): void {
    this.activeTab.set(tab);
  }

  // Gestion de la photo de profil
  triggerPhotoInput(): void {
    const input = document.getElementById('photoInput') as HTMLInputElement;
    input?.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        return;
      }

      // Vérification de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La taille de l\'image ne doit pas dépasser 5MB');
        return;
      }

      this.selectedPhotoFile.set(file);
      console.log('📸 Photo sélectionnée:', file.name);
    }
  }

  getUserPhotoUrl(): string {
    const user = this.authService.currentUser();
    if (user?.photo) {
      return `${this.baseUrl}${user.photo}?t=${new Date().getTime()}`;
    }
    return 'assets/images/profil.png';
  }

  hasUserPhoto(): boolean {
    const user = this.authService.currentUser();
    return !this.photoError() && user?.photo !== null && user?.photo !== undefined && user?.photo !== '';
  }

  onPhotoError(): void {
    console.warn('Erreur de chargement de la photo');
    this.photoError.set(true);
  }

  resetPhotoError(): void {
    this.photoError.set(false);
  }

  // Validation des champs
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return 'Ce champ est requis';
    }
    if (field.errors['email']) {
      return 'Email invalide';
    }
    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }
    if (field.errors['pattern']) {
      return 'Format invalide';
    }
    return 'Champ invalide';
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (this.userForm.invalid && !this.selectedPhotoFile()) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const user = this.authService.currentUser();
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      this.isSaving.set(false);
      return;
    }

    // Créer FormData pour envoyer les données + photo
    const formData = new FormData();

    // Ajouter les données du formulaire
    if (this.userForm.dirty) {
      formData.append('nom', this.userForm.get('nom')?.value || '');
      formData.append('prenom', this.userForm.get('prenom')?.value || '');
      formData.append('email', this.userForm.get('email')?.value || '');
      formData.append('telephone', this.userForm.get('telephone')?.value || '');
      formData.append('adress', this.userForm.get('adress')?.value || '');
    }

    // Ajouter la photo si sélectionnée
    const photoFile = this.selectedPhotoFile();
    if (photoFile) {
      formData.append('photo', photoFile, photoFile.name);
    }

    // Appel à l'API de mise à jour
    // this.authService.updateUserWithFormData(user.id, formData).subscribe({
    //   next: (updatedUser) => {
    //     console.log('✅ Profil mis à jour avec succès:', updatedUser);
    //     this.isSaving.set(false);
    //     this.selectedPhotoFile.set(null);
    //     this.userForm.markAsPristine();
        
    //     // Recharger les données utilisateur
    //     this.loadUserData();
        
    //     alert('Profil mis à jour avec succès !');
    //   },
    //   error: (error) => {
    //     console.error('❌ Erreur lors de la mise à jour:', error);
    //     this.isSaving.set(false);
    //     alert('Erreur lors de la mise à jour du profil. Veuillez réessayer.');
    //   }
    // });
  }

  onCancel(): void {
    this.loadUserData();
    this.selectedPhotoFile.set(null);
    this.userForm.markAsPristine();
  }

  // Getters pour le template
  getUserFullName(): string {
    const user = this.authService.currentUser();
    if (!user) return 'Utilisateur';
    return `${user.prenom} ${user.nom}`;
  }

  getUserProfile(): string {
    const profileTranslations: { [key: string]: string } = {
      'SITE_MANAGER': 'Gestionnaire de Site',
      'SUBCONTRACTOR': 'Sous-traitant',
      'SUPPLIER': 'Fournisseur',
      'ADMIN': 'Administrateur',
      'BET': 'Bureau d\'études',
      'USER': 'Utilisateur',
      'PROMOTEUR': 'Promoteur',
      'MOA': 'Maître d\'Ouvrage'
    };

    const user = this.authService.currentUser();
    if (!user || !user.profil) return 'Utilisateur';

    return profileTranslations[user.profil] || user.profil;
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'U';

    const firstInitial = user.prenom?.charAt(0)?.toUpperCase() || '';
    const lastInitial = user.nom?.charAt(0)?.toUpperCase() || '';
    
    return `${firstInitial}${lastInitial}`;
  }
}