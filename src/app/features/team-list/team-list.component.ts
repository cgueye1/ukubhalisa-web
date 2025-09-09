import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UtilisateurService, Worker, WorkersResponse, CreateWorkerRequest } from '../../../services/utilisateur.service';
import { AuthService } from './../../features/auth/services/auth.service';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  phone: string;
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
  currentPage = 1;
  totalPages = 1;
  totalElements = 0;
  pageSize = 5; // Nombre d'éléments par page
  isLoading = false;
  error: string | null = null;

  // Variables pour le popup d'ajout
  showAddMemberModal = false;
  newMember: any = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    telephone: '',
    date: '',
    lieunaissance: '',
    adress: '',
    profil: 'WORKER',
    confirmPassword: ''
  };
  isSubmitting = false;
  submitError: string | null = null;
  submitSuccess: string | null = null;

  constructor(
    private utilisateurService: UtilisateurService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTeamMembers();
  }

  /**
   * Charge la liste des membres de l'équipe
   */
  loadTeamMembers(): void {
    this.isLoading = true;
    this.error = null;

    // L'API utilise une pagination basée sur 0, mais l'UI utilise une pagination basée sur 1
    const apiPage = this.currentPage - 1;

    this.utilisateurService.listUsers(apiPage, this.pageSize).subscribe({
      next: (response: WorkersResponse) => {
        this.teamMembers = this.mapWorkersToTeamMembers(response.content);
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.error = 'Erreur lors du chargement des membres de l\'équipe';
        this.isLoading = false;
      }
    });
  }

  /**
   * Mappe les Workers de l'API vers les TeamMembers pour l'affichage
   */
  private mapWorkersToTeamMembers(workers: Worker[]): TeamMember[] {
    return workers.map(worker => ({
      id: worker.id,
      name: `${worker.prenom} ${worker.nom}`,
      role: this.mapRole(worker.profil),
      phone: worker.telephone,
      address: worker.adress,
      email: worker.email,
      avatar: worker.photo || this.getDefaultAvatar()
    }));
  }

  /**
   * Mappe les rôles de l'API vers des libellés plus lisibles
   */
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

  /**
   * Retourne un avatar par défaut
   */
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

  /**
   * Navigue vers une page spécifique
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadTeamMembers();
    }
  }

  /**
   * Navigue vers la page suivante
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTeamMembers();
    }
  }

  /**
   * Navigue vers la page précédente
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTeamMembers();
    }
  }

  /**
   * Vérifie si la page suivante est disponible
   */
  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  /**
   * Vérifie si la page précédente est disponible
   */
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Retourne le texte de pagination
   */
  getPaginationText(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalElements);
    return `Voir ${start}-${end} sur ${this.totalElements}`;
  }

  /**
   * Génère un tableau de numéros de pages à afficher
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Afficher toutes les pages si elles sont peu nombreuses
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique pour afficher les pages avec des ellipses
      const halfRange = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfRange);
      let endPage = Math.min(this.totalPages, this.currentPage + halfRange);
      
      // Ajuster si on est près du début ou de la fin
      if (endPage - startPage < maxPagesToShow - 1) {
        if (startPage === 1) {
          endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
        } else {
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  /**
   * Recharge les données
   */
  refresh(): void {
    this.currentPage = 1;
    this.loadTeamMembers();
  }

  /**
   * Ouvre le modal d'ajout de membre
   */
  openAddMemberModal(): void {
    this.showAddMemberModal = true;
    this.resetNewMemberForm();
  }

  /**
   * Ferme le modal d'ajout de membre
   */
  closeAddMemberModal(): void {
    this.showAddMemberModal = false;
    this.resetNewMemberForm();
  }

  /**
   * Réinitialise le formulaire d'ajout de membre
   */
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
    this.submitError = null;
    this.submitSuccess = null;
  }

  /**
   * Valide le formulaire d'ajout de membre
   */
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

  /**
   * Valide le format d'email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Formate la date pour l'API (convertit YYYY-MM-DD vers DD-MM-YYYY)
   */
  private formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    
    // Si la date est déjà au format DD-MM-YYYY, la retourner telle quelle
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateString;
    }
    
    // Si la date est au format YYYY-MM-DD (format HTML date input), la convertir
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    }
    
    return dateString;
  }

  /**
   * Soumet le formulaire d'ajout de membre
   */
  submitAddMember(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;
    this.submitSuccess = null;

    // Préparer les données pour l'API selon le format exact requis
    const userData = {
      nom: this.newMember.nom.trim(),
      prenom: this.newMember.prenom.trim(),
      email: this.newMember.email.trim(),
      password: this.newMember.password,
      telephone: this.newMember.telephone.trim(),
      date: this.formatDateForAPI(this.newMember.date),
      lieunaissance: this.newMember.lieunaissance.trim(),
      adress: this.newMember.adress.trim(),
      profil: this.newMember.profil
    };

    // Appeler le service pour créer l'utilisateur
    this.utilisateurService.createUser(userData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.submitSuccess = 'Membre ajouté avec succès!';
        
        // Recharger la liste des membres après un court délai
        setTimeout(() => {
          this.closeAddMemberModal();
          this.loadTeamMembers();
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Erreur lors de la création du membre:', error);
        
        if (error.status === 400) {
          this.submitError = 'Données invalides. Vérifiez les informations saisies.';
        } else if (error.status === 409) {
          this.submitError = 'Un utilisateur avec cet email existe déjà.';
        } else {
          this.submitError = 'Erreur lors de l\'ajout du membre. Veuillez réessayer.';
        }
      }
    });
  }

  /**
   * Gère le clic sur le backdrop du modal
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeAddMemberModal();
    }
  }
}