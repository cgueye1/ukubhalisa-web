// demande.component.ts (version mise à jour avec création de rapport)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService, Demande, Report } from './../../../services/demande.service';
import { AuthService, profil } from './../../features/auth/services/auth.service';
import { Subscription } from 'rxjs';

interface Comment {
  id: number;
  text: string;
  author: string;
  createdAt: Date;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-demande',
  templateUrl: './demande.component.html',
  styleUrls: ['./demande.component.css']
})
export class DemandeComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  selectedPeriod: string = 'Période';
  selectedStatus: string = 'Statut';
  showModal: boolean = false;
  selectedDemande: Demande | null = null;
  comment: string = '';
  
  // Modal de création de rapport
  showCreateReportModal: boolean = false;
  newReport: {
    title: string;
    version: string;
    file: File | null;
  } = {
    title: '',
    version: '',
    file: null
  };
  
  // États de création
  isCreatingReport: boolean = false;
  createReportError: string | null = null;
  
  // Données dynamiques
  demandes: Demande[] = [];
  filteredDemandes: Demande[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  
  // Commentaires simulés
  comments: Comment[] = [];
  
  // ID du BET (dynamique depuis l'utilisateur connecté)
  betId: number | null = null;
  
  // Subscription pour nettoyer les observables
  private subscriptions: Subscription = new Subscription();
  
  // Correction: Déclarer Math comme propriété
  Math = Math;

  constructor(
    private demandeService: DemandeService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.initializeBetId();
  }

  ngOnDestroy(): void {
    // Nettoyer les subscriptions pour éviter les fuites mémoire
    this.subscriptions.unsubscribe();
  }

  /**
   * Initialise l'ID du BET à partir de l'utilisateur connecté
   */
  private initializeBetId(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.currentUser();
      
      if (user && user.id) {
        this.betId = user.id;
        this.loadDemandes();
      } else {
        // Si l'utilisateur n'a pas d'ID, on rafraîchit les données utilisateur
        const refreshSubscription = this.authService.refreshUser().subscribe({
          next: (refreshedUser: { id: number | null; }) => {
            if (refreshedUser && refreshedUser.id) {
              this.betId = refreshedUser.id;
              this.loadDemandes();
            } else {
              this.handleUserError('Utilisateur non trouvé ou ID manquant');
            }
          },
          error: (error: any) => {
            this.handleUserError('Erreur lors du chargement des informations utilisateur');
            console.error('Erreur refreshUser:', error);
          }
        });
        
        this.subscriptions.add(refreshSubscription);
      }
    } else {
      this.handleUserError('Utilisateur non authentifié');
    }
  }

  /**
   * Gère les erreurs de chargement utilisateur
   */
  private handleUserError(message: string): void {
    console.error(message);
    this.error = message;
    this.loading = false;
  }

  /**
   * Vérifie si l'utilisateur est un BET
   */
  private isBETUser(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    if (typeof user.profil === 'string') {
      return user.profil === 'BET';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('BET' as any);
    }

    return false;
  }

  loadDemandes(page: number = 0) {
    // Vérifier que betId est défini avant de charger
    if (this.betId === null) {
      this.error = 'ID utilisateur non disponible';
      this.loading = false;
      return;
    }

    // Vérifier que l'utilisateur est bien un BET
    if (!this.isBETUser()) {
      this.error = 'Accès réservé aux utilisateurs BET';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    // this.betId
    this.demandeService.getDemande(1, page, this.pageSize).subscribe({
      next: (response) => {
        this.demandes = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.currentPage = response.number;
        
        this.filterDemandes();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des demandes:', err);
        this.error = 'Erreur lors du chargement des demandes';
        this.loading = false;
      }
    });
  }

  // Nouvelle méthode corrigée pour changer la taille de page
  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = +target.value;
    
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadDemandes();
  }

  filterDemandes() {
    this.filteredDemandes = this.demandes.filter(demande => {
      const matchesSearch = demande.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           demande.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesPeriod = this.selectedPeriod === 'Période' || this.matchesPeriodFilter(demande);
      const matchesStatus = this.selectedStatus === 'Statut' || this.mapStatusToFrench(demande.status) === this.selectedStatus;
      
      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }

  private matchesPeriodFilter(demande: Demande): boolean {
    const createdDate = this.arrayToDate(demande.createdAt);
    const now = new Date();
    
    switch (this.selectedPeriod) {
      case 'Cette semaine':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return createdDate >= weekAgo;
      case 'Ce mois':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return createdDate >= monthAgo;
      case 'Ce trimestre':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        return createdDate >= quarterAgo;
      default:
        return true;
    }
  }

  onSearchChange() {
    this.filterDemandes();
  }

  onPeriodChange() {
    this.filterDemandes();
  }

  onStatusChange() {
    this.filterDemandes();
  }

  arrayToDate(dateArray: number[]): Date {
    if (dateArray && dateArray.length >= 3) {
      return new Date(dateArray[0], dateArray[1] - 1, dateArray[2], 
                      dateArray[3] || 0, dateArray[4] || 0, dateArray[5] || 0);
    }
    return new Date();
  }

  formatDate(dateArray: number[]): string {
    const date = this.arrayToDate(dateArray);
    return date.toLocaleDateString('fr-FR');
  }

  mapStatusToFrench(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'VALIDATED':
        return 'Validée';
      case 'REJECTED':
        return 'Rejetée';
      default:
        return status;
    }
  }

  mapFrenchToStatus(frenchStatus: string): string {
    switch (frenchStatus) {
      case 'En attente':
        return 'PENDING';
      case 'Validée':
        return 'VALIDATED';
      case 'Rejetée':
        return 'REJECTED';
      default:
        return frenchStatus;
    }
  }

  getStatusClass(status: string): string {
    const frenchStatus = this.mapStatusToFrench(status);
    switch (frenchStatus) {
      case 'En attente':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'En cours':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Livrée':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Validée':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejetée':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  openDetails(demande: Demande) {
    this.selectedDemande = demande;
    this.showModal = true;
    this.comment = '';
    this.loadComments(demande.id);
  }

  closeModal() {
    this.showModal = false;
    this.selectedDemande = null;
    this.comment = '';
    this.comments = [];
  }

  acceptDemande() {
    if (this.selectedDemande) {
      console.log('Demande acceptée:', this.selectedDemande.id);
      console.log('Commentaire:', this.comment);
      this.selectedDemande.status = 'VALIDATED';
      this.filterDemandes();
    }
    this.closeModal();
  }

  rejectDemande() {
    if (this.selectedDemande) {
      console.log('Demande rejetée:', this.selectedDemande.id);
      console.log('Commentaire:', this.comment);
      this.selectedDemande.status = 'REJECTED';
      this.filterDemandes();
    }
    this.closeModal();
  }

  sendComment() {
    if (this.comment.trim() && this.selectedDemande) {
      const newComment: Comment = {
        id: this.comments.length + 1,
        text: this.comment.trim(),
        author: 'Utilisateur actuel',
        createdAt: new Date()
      };
      
      this.comments.push(newComment);
      this.comment = '';
    }
  }

  private loadComments(demandeId: number) {
    this.comments = [];
  }

  canAcceptOrReject(): boolean {
    return this.selectedDemande?.status === 'PENDING';
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.loadDemandes(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.loadDemandes(this.currentPage + 1);
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.loadDemandes(page);
    }
  }

  getProgressSteps(status: string): { step: number; label: string; active: boolean; completed: boolean }[] {
    const frenchStatus = this.mapStatusToFrench(status);
    const steps = [
      { step: 1, label: 'En attente de réponse', active: false, completed: false },
      { step: 2, label: 'En cours d\'acceptation', active: false, completed: false },
      { step: 3, label: 'En cours de livraison', active: false, completed: false },
      { step: 4, label: 'Validation/Rejet', active: false, completed: false }
    ];

    switch (frenchStatus) {
      case 'En attente':
        steps[0].active = true;
        break;
      case 'En cours':
        steps[0].completed = true;
        steps[1].active = true;
        break;
      case 'Livrée':
        steps[0].completed = true;
        steps[1].completed = true;
        steps[2].active = true;
        break;
      case 'Validée':
      case 'Rejetée':
        steps[0].completed = true;
        steps[1].completed = true;
        steps[2].completed = true;
        steps[3].active = true;
        steps[3].completed = true;
        break;
    }

    return steps;
  }

  /**
   * Méthode pour obtenir le nom de l'utilisateur connecté
   */
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  /**
   * Méthode pour debug - afficher les informations utilisateur
   */
  debugUserInfo(): void {
    console.log('Current User:', this.authService.currentUser());
    console.log('BET ID:', this.betId);
    console.log('Is BET User:', this.isBETUser());
  }

  // ========== MÉTHODES POUR LA CRÉATION DE RAPPORT ==========

  /**
   * Ouvre le modal de création de rapport
   */
  openCreateReportModal(): void {
    this.showCreateReportModal = true;
    this.resetNewReportForm();
    this.createReportError = null;
  }

  /**
   * Ferme le modal de création de rapport
   */
  closeCreateReportModal(): void {
    this.showCreateReportModal = false;
    this.resetNewReportForm();
    this.createReportError = null;
    this.isCreatingReport = false;
  }

  /**
   * Remet à zéro le formulaire de création de rapport
   */
  private resetNewReportForm(): void {
    this.newReport = {
      title: '',
      version: '',
      file: null
    };
  }

  /**
   * Gère la sélection de fichier
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newReport.file = input.files[0];
    }
  }

  /**
   * Valide le formulaire de création de rapport
   */
  private isCreateReportFormValid(): boolean {
    return !!(
      this.newReport.title.trim() && 
      this.newReport.version.trim() && 
      this.newReport.file // Fichier obligatoire
    );
  }

/**
 * Crée un nouveau rapport - Version simplifiée
 */
createReport(): void {
  // Validations de base
  if (!this.isCreateReportFormValid()) {
    this.createReportError = 'Veuillez remplir tous les champs obligatoires';
    return;
  }

  if (!this.selectedDemande) {
    this.createReportError = 'Aucune demande sélectionnée';
    return;
  }

  if (!this.newReport.file) {
    this.createReportError = 'Veuillez sélectionner un fichier';
    return;
  }

  if (!this.betId) {
    this.createReportError = 'ID utilisateur non disponible';
    return;
  }

  // Vérification d'authentification
  if (!this.authService.isAuthenticated()) {
    this.createReportError = 'Session expirée. Veuillez vous reconnecter.';
    return;
  }

  this.isCreatingReport = true;
  this.createReportError = null;

  // Préparer les données du rapport
  const reportData = {
    title: this.newReport.title.trim(),
    versionNumber: parseInt(this.newReport.version), // Convertir en number
    studyRequestId: this.selectedDemande.id,
    authorId: this.betId
  };

  console.log('=== DEBUG CRÉATION RAPPORT ===');
  console.log('Report Data:', reportData);
  console.log('File:', this.newReport.file);
  console.log('User authenticated:', this.authService.isAuthenticated());
  console.log('Token présent:', !!this.authService.getToken());

  // Appel du service simplifié
  const createSubscription = this.demandeService.createReport(reportData, this.newReport.file).subscribe({
    next: (response: Report) => {
      console.log('✅ Rapport créé avec succès:', response);
      this.handleReportCreationSuccess(response);
    },
    error: (error: any) => {
      console.error('❌ Erreur lors de la création du rapport:');
      console.error('Status:', error.status);
      console.error('Error:', error.error);
      console.error('Message:', error.message);
      
      this.handleReportCreationError(error);
    }
  });

  this.subscriptions.add(createSubscription);
}

/**
 * Méthode alternative pour débugger FormData sans utiliser entries()
 */
private debugFormDataAlternative(formData: FormData): void {
  console.log('FormData debug (alternative method):');
  
  // Liste des clés que nous avons ajoutées
  const keys = ['title', 'versionNumber', 'studyRequestId', 'authorId', 'file'];
  
  keys.forEach(key => {
    const value = formData.get(key);
    if (value !== null) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`${key}:`, value);
      }
    } else {
      console.log(`${key}: null`);
    }
  });
}


  /**
   * Gère le succès de la création du rapport
   */
  private handleReportCreationSuccess(response: Report): void {
    // Ajouter le nouveau rapport à la demande sélectionnée
    if (this.selectedDemande) {
      if (!this.selectedDemande.reports) {
        this.selectedDemande.reports = [];
      }
      
      this.selectedDemande.reports.push(response);
    }
    
    // Fermer le modal
    this.closeCreateReportModal();
    
    // Optionnel: recharger les demandes pour avoir les données à jour
    // this.loadDemandes(this.currentPage);
  }

  /**
   * Gère l'erreur de création du rapport
   */
  private handleReportCreationError(error: any): void {
    this.createReportError = 'Erreur lors de la création du rapport. Veuillez réessayer.';
    this.isCreatingReport = false;
  }

  /**
   * Annule la création du rapport
   */
  cancelCreateReport(): void {
    this.closeCreateReportModal();
  }

  /**
   * Obtient la date actuelle sous forme de tableau (format backend)
   */
  private getCurrentDateArray(): number[] {
    const now = new Date();
    return [
      now.getFullYear(),
      now.getMonth() + 1, // Les mois commencent à 0 en JavaScript
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ];
  }

  /**
   * Formate le nom du fichier pour l'affichage
   */
  getFileName(): string {
    return this.newReport.file ? this.newReport.file.name : 'Aucun fichier choisi';
  }

  /**
   * Vérifie si un fichier est sélectionné
   */
  hasFileSelected(): boolean {
    return !!this.newReport.file;
  }
}