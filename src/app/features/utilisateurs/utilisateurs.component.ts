import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { UserService, User, UserPageResponse } from '../../../services/user.service';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './utilisateurs.component.html',
  styleUrls: ['./utilisateurs.component.css']
})
export class UtilisateursComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalResults: number = 0;
  
  Math = Math; // ✅ Correction : rendre Math accessible dans le template
  
  profilsToLoad = ['PROMOTEUR', 'MOA', 'BET', 'NOTAIRE', 'RESERVATAIRE', 'BANK', 
                   'AGENCY', 'ADMIN', 'PROPRIETAIRE', 'SYNDIC', 'LOCATAIRE', 
                   'PRESTATAIRE', 'TOM', 'SITE_MANAGER', 'SUPPLIER', 'SUBCONTRACTOR', 
                   'WORKER'];

  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  createUserForm = {
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    password: '',
    profil: '',
    adress: '',
    date: '',
    lieunaissance: ''
  };

  editUserForm = {
    id: 0,
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    profil: '',
    adress: '',
  };

  utilisateurs: User[] = [];
  filteredUtilisateurs: User[] = [];
  paginatedUtilisateurs: User[] = []; // ✅ Nouveau tableau pour la pagination

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Initialisation du composant Utilisateurs');
    this.loadAllUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge tous les utilisateurs de tous les profils
   */
  loadAllUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    console.log('📥 Chargement de tous les utilisateurs...');

    const requests = this.profilsToLoad.map(profil => 
      this.userService.getUserByProfil(profil, this.searchTerm, this.currentPage, 1000)
    );

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses: UserPageResponse[]) => {
          console.log('✅ Réponses reçues:', responses.length);
          
          this.utilisateurs = [];
          responses.forEach(response => {
            if (response && response.content) {
              this.utilisateurs.push(...response.content);
            }
          });

          this.totalResults = this.utilisateurs.length;
          this.totalPages = Math.ceil(this.totalResults / this.pageSize);

          console.log('📊 Total utilisateurs chargés:', this.totalResults);
          
          this.filteredUtilisateurs = [...this.utilisateurs];
          this.applyPagination();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des utilisateurs:', error);
          this.errorMessage = error.userMessage || 'Erreur lors du chargement des utilisateurs';
          this.isLoading = false;
        }
      });
  }

  /**
   * Recherche des utilisateurs
   */
  searchUtilisateurs(): void {
    console.log('🔍 Recherche:', this.searchTerm);
    
    if (this.searchTerm.trim() === '') {
      this.filteredUtilisateurs = [...this.utilisateurs];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUtilisateurs = this.utilisateurs.filter(user =>
        `${user.prenom} ${user.nom}`.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.profil.toLowerCase().includes(term) ||
        user.telephone.toLowerCase().includes(term)
      );
    }
    
    this.currentPage = 0;
    this.totalResults = this.filteredUtilisateurs.length;
    this.totalPages = Math.ceil(this.totalResults / this.pageSize);
    this.applyPagination();
  }

  /**
   * ✅ Correction : Applique la pagination correctement
   */
  applyPagination(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    // ✅ Utiliser un nouveau tableau pour la pagination
    this.paginatedUtilisateurs = this.filteredUtilisateurs.slice(start, end);
    console.log('📄 Pagination:', {
      page: this.currentPage,
      start,
      end,
      total: this.filteredUtilisateurs.length,
      displayed: this.paginatedUtilisateurs.length
    });
  }

  getUserStatus(user: User): 'Actif' | 'Suspendu' | 'En attente' {
    if (!user.enabled || !user.activated) return 'Suspendu';
    if (!user.accountNonLocked) return 'Suspendu';
    return user.subscription?.active ? 'Actif' : 'En attente';
  }

  getStatutPoint(user: User): 'green' | 'red' | 'yellow' {
    const status = this.getUserStatus(user);
    switch (status) {
      case 'Actif': return 'green';
      case 'Suspendu': return 'red';
      case 'En attente': return 'yellow';
      default: return 'yellow';
    }
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Actif': return 'bg-green-100 text-green-700';
      case 'Suspendu': return 'bg-red-100 text-red-700';
      case 'En attente': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getPointColor(color: string): string {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  }

  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
  }

  openCreateModal(): void {
    this.resetCreateForm();
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(user: User): void {
    this.editUserForm = {
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      telephone: user.telephone,
      email: user.email,
      profil: user.profil,
      adress: user.adress,
    };
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetCreateForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.resetEditForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  resetCreateForm(): void {
    this.createUserForm = {
      prenom: '',
      nom: '',
      telephone: '',
      email: '',
      password: '',
      profil: '',
      adress: '',
      date: '',
      lieunaissance: ''
    };
  }

  resetEditForm(): void {
    this.editUserForm = {
      id: 0,
      prenom: '',
      nom: '',
      telephone: '',
      email: '',
      profil: '',
      adress: '',
    };
  }

  /**
   * ✅ Correction : Conversion du format de date
   */
  private convertDateFormat(dateString: string): string {
    if (!dateString) return '';
    
    // Si la date est au format YYYY-MM-DD (HTML input date)
    const [year, month, day] = dateString.split('-');
    
    // Convertir en DD-MM-YYYY pour le backend
    const formattedDate = `${day}-${month}-${year}`;
    
    console.log('📅 Conversion date:', {
      original: dateString,
      formatted: formattedDate
    });
    
    return formattedDate;
  }

  /**
   * ✅ Correction : Validation et conversion des données
   */
  saveNewUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validation des champs requis
    if (!this.createUserForm.prenom || !this.createUserForm.nom || 
        !this.createUserForm.email || !this.createUserForm.password || 
        !this.createUserForm.telephone || !this.createUserForm.profil) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires (*)';
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.createUserForm.email)) {
      this.errorMessage = 'Format d\'email invalide';
      return;
    }

    // Validation téléphone (minimum 8 chiffres)
    const phoneRegex = /^\d{8,}$/;
    const cleanPhone = this.createUserForm.telephone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      this.errorMessage = 'Le téléphone doit contenir au moins 8 chiffres';
      return;
    }

    this.isLoading = true;

    // ✅ Conversion de la date au bon format DD-MM-YYYY
    const formattedDate = this.createUserForm.date ? 
      this.convertDateFormat(this.createUserForm.date) : '';

    // ✅ Construction de l'objet exactement comme dans Swagger
    const createData = {
      nom: this.createUserForm.nom.trim(),
      prenom: this.createUserForm.prenom.trim(),
      email: this.createUserForm.email.trim().toLowerCase(),
      password: this.createUserForm.password,
      telephone: cleanPhone,
      date: formattedDate,
      lieunaissance: this.createUserForm.lieunaissance.trim(),
      adress: this.createUserForm.adress.trim(),
      profil: this.createUserForm.profil
    };

    console.log('📤 Données envoyées (format exact):', {
      ...createData,
      password: '***' // Masquer le mot de passe
    });
    console.log('📤 JSON stringifié:', JSON.stringify(createData, null, 2));

    this.userService.createUser(createData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Utilisateur créé:', response);
          this.successMessage = 'Utilisateur créé avec succès';
          this.isLoading = false;
          
          setTimeout(() => {
            this.closeCreateModal();
            this.loadAllUsers();
          }, 1500);
        },
        error: (error) => {
          console.error('❌ Erreur création complète:', error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error message:', error.message);
          if (error.error) {
            console.error('❌ Error details:', error.error);
          }
          
          // Message plus détaillé pour l'utilisateur
          let userMsg = 'Erreur lors de la création';
          if (error.status === 400) {
            userMsg = 'Données invalides. Vérifiez tous les champs.';
          } else if (error.status === 409) {
            userMsg = 'Un utilisateur avec cet email existe déjà.';
          }
          
          this.errorMessage = error.userMessage || userMsg;
          this.isLoading = false;
        }
      });
  }

  saveEditedUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validation des champs requis
    if (!this.editUserForm.prenom || !this.editUserForm.nom || 
        !this.editUserForm.email || !this.editUserForm.telephone || 
        !this.editUserForm.profil) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires (*)';
      return;
    }

    this.isLoading = true;

    const userData: Partial<User> = {
      prenom: this.editUserForm.prenom,
      nom: this.editUserForm.nom,
      telephone: this.editUserForm.telephone.replace(/\s/g, ''),
      email: this.editUserForm.email,
      profil: this.editUserForm.profil,
      adress: this.editUserForm.adress
    };

    this.userService.putUser(this.editUserForm.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          console.log('✅ Utilisateur mis à jour:', updatedUser);
          this.successMessage = 'Utilisateur modifié avec succès';
          this.isLoading = false;
          
          setTimeout(() => {
            this.closeEditModal();
            this.loadAllUsers();
          }, 1500);
        },
        error: (error) => {
          console.error('❌ Erreur modification:', error);
          this.errorMessage = error.userMessage || 'Erreur lors de la modification';
          this.isLoading = false;
        }
      });
  }

  viewUser(user: User): void {
    this.router.navigate(['/details-utilisateur', user.id]);
  }

  editUser(user: User): void {
    this.openEditModal(user);
  }

  toggleUserStatus(user: User): void {
    console.log('🔄 Basculer statut utilisateur:', user);
    // TODO: Implémenter la logique de suspension/activation
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.applyPagination();
    }
  }
}