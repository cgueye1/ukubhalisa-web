import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PlanAbonnementService, SubscriptionPlan } from '../../../services/plan-abonnement.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-abonnements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './abonnements.component.html',
  styleUrls: ['./abonnements.component.css']
})
export class AbonnementsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // État de chargement
  isLoading = true;
  isSearching = false;
  isDeleting = false;

  // Données
  allPlans: SubscriptionPlan[] = [];
  filteredPlans: SubscriptionPlan[] = [];
  
  // Recherche
  searchTerm: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalResults: number = 0;

  // Modal de confirmation
  showDeleteModal = false;
  planToDelete: SubscriptionPlan | null = null;
Math: any;

  constructor(
    private planService: PlanAbonnementService,
    private router: Router
  ) {
    console.log('🚀 AbonnementsComponent initialisé');
  }

  ngOnInit(): void {
    this.loadPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge tous les plans d'abonnement
   */
  loadPlans(): void {
    this.isLoading = true;
    
    this.planService.getAbonnements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subscriptions) => {
          console.log('✅ Abonnements chargés:', subscriptions);
          
          // Extraire les plans uniques des abonnements
          const planMap = new Map<number, SubscriptionPlan>();
          subscriptions.forEach(sub => {
            if (sub.subscriptionPlan && !planMap.has(sub.subscriptionPlan.id)) {
              planMap.set(sub.subscriptionPlan.id, sub.subscriptionPlan);
            }
          });
          
          this.allPlans = Array.from(planMap.values());
          this.filteredPlans = [...this.allPlans];
          this.totalResults = this.allPlans.length;
          this.isLoading = false;

          console.log('📊 Plans extraits:', this.allPlans.length);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des plans:', error);
          this.isLoading = false;
          
          // Optionnel: Afficher un message d'erreur à l'utilisateur
          alert(error.userMessage || 'Erreur lors du chargement des plans');
        }
      });
  }

  /**
   * Recherche dans les plans
   */
  searchPlans(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredPlans = [...this.allPlans];
      this.totalResults = this.allPlans.length;
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    
    // Recherche locale
    this.filteredPlans = this.allPlans.filter(plan =>
      plan.name.toLowerCase().includes(term) ||
      plan.label.toLowerCase().includes(term) ||
      plan.description.toLowerCase().includes(term)
    );
    
    this.totalResults = this.filteredPlans.length;
    this.currentPage = 1;

    console.log(`🔍 Recherche: "${term}" - ${this.totalResults} résultats`);
  }

  /**
   * Navigue vers la page de création de plan
   */
  createPlan(): void {
    this.router.navigate(['/create-plan']);
  }

  /**
   * Voir les détails d'un plan
   */
  viewPlan(plan: SubscriptionPlan): void {
    console.log('👁️ Voir plan:', plan);
    this.router.navigate(['/details-abonnement', plan.id], {
      queryParams: { mode: 'view' }
    });
  }

  /**
   * Modifier un plan
   */
  editPlan(plan: SubscriptionPlan): void {
    console.log('✏️ Modifier plan:', plan);
    this.router.navigate(['/create-plan', plan.id], {
      queryParams: { mode: 'edit' }
    });
  }

  /**
   * Activer/Désactiver un plan
   */
  togglePlanStatus(plan: SubscriptionPlan): void {
    console.log('🔄 Basculer statut plan:', plan);
    
    const newStatus = !plan.active;
    const action = newStatus ? 'activer' : 'désactiver';
    
    if (!confirm(`Voulez-vous vraiment ${action} le plan "${plan.label}" ?`)) {
      return;
    }

    this.planService.putPlanAbonnement(plan.id, { active: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedPlan) => {
          console.log('✅ Statut du plan mis à jour:', updatedPlan);
          
          // Mettre à jour le plan dans la liste
          const index = this.allPlans.findIndex(p => p.id === plan.id);
          if (index !== -1) {
            this.allPlans[index] = updatedPlan;
            this.searchPlans(); // Rafraîchir la liste filtrée
          }
          
          alert(`Plan ${action} avec succès`);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour du statut:', error);
          alert(error.userMessage || `Erreur lors de la modification du statut`);
        }
      });
  }

  /**
   * Ouvre la modal de confirmation de suppression
   */
  confirmDelete(plan: SubscriptionPlan): void {
    this.planToDelete = plan;
    this.showDeleteModal = true;
  }

  /**
   * Supprime un plan
   */
  deletePlan(): void {
    if (!this.planToDelete) return;

    this.isDeleting = true;
    const planId = this.planToDelete.id;
    const planLabel = this.planToDelete.label;

    this.planService.deletePlanAbonnement(planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Plan supprimé:', planId);
          
          // Retirer le plan de la liste
          this.allPlans = this.allPlans.filter(p => p.id !== planId);
          this.searchPlans(); // Rafraîchir la liste filtrée
          
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.planToDelete = null;
          
          alert(`Plan "${planLabel}" supprimé avec succès`);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          this.isDeleting = false;
          alert(error.userMessage || 'Erreur lors de la suppression du plan');
        }
      });
  }

  /**
   * Annule la suppression
   */
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.planToDelete = null;
  }

  /**
   * Formate le montant
   */
  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} F CFA`;
  }

  /**
   * Retourne la classe CSS pour le statut
   */
  getStatutClass(active: boolean): string {
    return active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  }

  /**
   * Retourne le texte du statut
   */
  getStatutText(active: boolean): string {
    return active ? 'Actif' : 'Inactif';
  }

  /**
   * Retourne la limite de projets formatée
   */
  getProjectLimit(plan: SubscriptionPlan): string {
    return plan.unlimitedProjects ? 'Illimité' : plan.projectLimit.toString();
  }

  /**
   * Pagination
   */
  get paginatedPlans(): SubscriptionPlan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredPlans.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.totalResults / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  /**
   * Exporte les plans (à implémenter selon vos besoins)
   */
  exportPlans(): void {
    console.log('📤 Export des plans...');
    // TODO: Implémenter l'export (CSV, Excel, etc.)
    alert('Fonctionnalité d\'export à venir');
  }
}