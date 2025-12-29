import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TeamService, Worker, WorkerResponse, CreateWorkerRequest } from '../../../services/team.service';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  telephone: string;
  present: boolean;
  address: string;
  email: string;
  avatar: string;
}

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.css']
})
export class TeamListComponent implements OnInit {
  teamMembers: TeamMember[] = [];
  currentPage = 0; // API utilise 0-based indexing
  totalPages = 1;
  totalElements = 0;
  pageSize = 10;
  isLoading = false;
  error: string | null = null;

  currentPropertyId: number | null = null;

  // Variables pour le modal d'ajout
  showAddMemberModal = false;
  newMember: CreateWorkerRequest = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    telephone: '',
    date: '',
    lieunaissance: '',
    adress: '',
    profil: 'WORKER',
  };
  photoPreview: string | null = null;
  selectedPhoto: File | null = null;
  isSubmitting = false;
  submitError: string | null = null;
  submitSuccess: string | null = null;

  constructor(
    private teamService: TeamService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getPropertyIdAndLoadData();
  }

  private getPropertyIdAndLoadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.currentPropertyId = +id;
      this.loadTeamMembers();
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
      this.error = "ID de propriété non trouvé dans l'URL.";
    }
  }

  loadTeamMembers(): void {
    if (this.currentPropertyId === null) {
      this.error = 'ID de propriété non disponible';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.teamService.getWorkers(this.currentPropertyId, this.currentPage, this.pageSize).subscribe({
      next: (response: WorkerResponse) => {
        this.teamMembers = this.mapWorkersToTeamMembers(response.content);
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
        console.log('✅ Workers chargés:', response.content);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des workers:', error);
        this.error = 'Erreur lors du chargement des membres de l\'équipe';
        this.isLoading = false;
      }
    });
  }

  private mapWorkersToTeamMembers(workers: Worker[]): TeamMember[] {
    return workers.map(worker => ({
      id: worker.id,
      name: `${worker.prenom} ${worker.nom}`,
      role: this.mapRole(worker.profil),
      telephone: worker.telephone,
      present: worker.activated, // Utiliser activated comme indicateur de présence
      address: worker.adress,
      email: worker.email,
      avatar: worker.photo || this.getDefaultAvatar(),
    }));
  }

  private mapRole(profil: string): string {
    const roleMap: { [key: string]: string } = {
      'WORKER': 'Ouvrier',
      'CHEF_CHANTIER': 'Chef de chantier',
      'MAITRE_OEUVRE': 'Maître d\'œuvre',
      'MAITRE_OUVRAGE': 'Maître d\'ouvrage',
      'ARCHITECTE': 'Architecte',
      'INGENIEUR': 'Ingénieur'
    };
    return roleMap[profil] || profil;
  }

  private getDefaultAvatar(): string {
    const defaultAvatars = [
      'assets/images/av1.svg',
      'assets/images/av2.svg',
      'assets/images/av3.png',
      'assets/images/av6.png',
      'assets/images/av9.svg'
    ];
    return defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
  }

  getPresentText(present: boolean): string {
    return present ? 'Oui' : 'Non';
  }

  getPresentClass(present: boolean): string {
    return present 
      ? 'inline-block px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full'
      : 'inline-block px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full';
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadTeamMembers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTeamMembers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTeamMembers();
    }
  }

  hasNextPage(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 0;
  }

  getPaginationText(): string {
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
    return `Voir ${start}-${end} sur ${this.totalElements}`;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 0; i < this.totalPages; i++) pages.push(i);
    } else {
      const halfRange = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(0, this.currentPage - halfRange);
      let endPage = Math.min(this.totalPages - 1, this.currentPage + halfRange);
      
      if (endPage - startPage < maxPagesToShow - 1) {
        if (startPage === 0) {
          endPage = Math.min(this.totalPages - 1, startPage + maxPagesToShow - 1);
        } else {
          startPage = Math.max(0, endPage - maxPagesToShow + 1);
        }
      }
      
      for (let i = startPage; i <= endPage; i++) pages.push(i);
    }
    
    return pages;
  }

  refresh(): void {
    this.currentPage = 0;
    this.loadTeamMembers();
  }

  // Modal d'ajout
  openAddMemberModal(): void {
    this.showAddMemberModal = true;
    this.resetNewMemberForm();
  }

  closeAddMemberModal(): void {
    this.showAddMemberModal = false;
    this.resetNewMemberForm();
  }

  private resetNewMemberForm(): void {
    this.newMember = {
      nom: '',
      prenom: '',
      email: '',
      password: '',
      telephone: '',
      date: '',
      lieunaissance: '',
      adress: '',
      profil: 'WORKER',
    };
    this.photoPreview = null;
    this.selectedPhoto = null;
    this.submitError = null;
    this.submitSuccess = null;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Vérification du type
      if (!file.type.startsWith('image/')) {
        this.submitError = 'Veuillez sélectionner une image valide';
        return;
      }

      // Vérification de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.submitError = 'La taille de l\'image ne doit pas dépasser 5MB';
        return;
      }

      this.selectedPhoto = file;
      
      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
      
      console.log('📸 Photo sélectionnée:', file.name);
    }
  }

  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
    const input = document.getElementById('photo') as HTMLInputElement;
    if (input) input.value = '';
  }

  private validateForm(): boolean {
    if (!this.newMember.nom.trim()) {
      this.submitError = 'Le nom est requis';
      return false;
    }
    if (!this.newMember.prenom.trim()) {
      this.submitError = 'Le prénom est requis';
      return false;
    }
    if (!this.newMember.email.trim()) {
      this.submitError = 'L\'email est requis';
      return false;
    }
    if (!this.isValidEmail(this.newMember.email)) {
      this.submitError = 'L\'email n\'est pas valide';
      return false;
    }
    if (!this.newMember.password) {
      this.submitError = 'Le mot de passe est requis';
      return false;
    }
    if (this.newMember.password.length < 6) {
      this.submitError = 'Le mot de passe doit contenir au moins 6 caractères';
      return false;
    }
    if (!this.newMember.telephone.trim()) {
      this.submitError = 'Le téléphone est requis';
      return false;
    }
    if (!this.newMember.date) {
      this.submitError = 'La date de naissance est requise';
      return false;
    }
    if (!this.newMember.lieunaissance.trim()) {
      this.submitError = 'Le lieu de naissance est requis';
      return false;
    }
    if (!this.newMember.adress.trim()) {
      this.submitError = 'L\'adresse est requise';
      return false;
    }
    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    
    // Si déjà au format DD-MM-YYYY
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateString;
    }
    
    // Si au format YYYY-MM-DD (input type="date")
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    }
    
    return dateString;
  }

  submitAddMember(): void {
    if (!this.validateForm()) return;

    if (this.currentPropertyId === null) {
      this.submitError = 'ID de propriété non disponible';
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;
    this.submitSuccess = null;

    // Créer le FormData
    const formData = new FormData();
    formData.append('nom', this.newMember.nom.trim());
    formData.append('prenom', this.newMember.prenom.trim());
    formData.append('email', this.newMember.email.trim());
    formData.append('password', this.newMember.password);
    formData.append('telephone', this.newMember.telephone.trim());
    formData.append('date', this.formatDateForAPI(this.newMember.date));
    formData.append('lieunaissance', this.newMember.lieunaissance.trim());
    formData.append('adress', this.newMember.adress.trim());
    formData.append('profil', this.newMember.profil);
    
    if (this.selectedPhoto) {
      formData.append('photo', this.selectedPhoto, this.selectedPhoto.name);
    }

    console.log('📤 Création du worker pour propertyId:', this.currentPropertyId);

    this.teamService.createWorker(this.currentPropertyId, formData).subscribe({
      next: (response) => {
        console.log('✅ Worker créé avec succès:', response);
        this.isSubmitting = false;
        this.submitSuccess = 'Membre ajouté avec succès!';
        
        setTimeout(() => {
          this.closeAddMemberModal();
          this.currentPage = 0;
          this.loadTeamMembers();
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Erreur lors de la création du worker:', error);
        
        if (error.status === 400) {
          this.submitError = 'Données invalides. Vérifiez les informations saisies.';
        } else if (error.status === 409) {
          this.submitError = 'Un utilisateur avec cet email existe déjà.';
        } else if (error.status === 401) {
          this.submitError = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          this.submitError = 'Vous n\'avez pas les permissions nécessaires.';
        } else {
          this.submitError = error.error?.message || 'Erreur lors de l\'ajout du membre. Veuillez réessayer.';
        }
      }
    });
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeAddMemberModal();
    }
  }
}