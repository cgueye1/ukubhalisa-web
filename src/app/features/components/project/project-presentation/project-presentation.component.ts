import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusReportComponent } from '../status-report/status-report.component';
import { ProjectBudgetComponent } from '../project-budget/project-budget.component';
import { ActivatedRoute } from '@angular/router';
import { EntrepriseService, RealEstateProperty } from '../../../../../services/entreprise.service';
import { DashboardService, PhaseIndicator } from '../../../../../services/dashboard.service';
import { ProjectBudgetService, BudgetResponse } from '../../../../../services/project-details.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-project-presentation',
  standalone: true,
  imports: [CommonModule, StatusReportComponent, ProjectBudgetComponent],
  templateUrl: './project-presentation.component.html',
  styleUrl: './project-presentation.component.css'
})
export class ProjectPresentationComponent implements OnInit {
  filebaseUrl = environment.filebaseUrl;
  private route = inject(ActivatedRoute);
  private entrepriseService = inject(EntrepriseService);
  private dashboardService = inject(DashboardService);
  private projectBudgetService = inject(ProjectBudgetService);

  projet: RealEstateProperty | null = null;
  loading = true;
  error: string | null = null;
  activeTab = 'general';

  averageProgress: number | null = null;
  isLoadingProgress = true;
  progressError: string | null = null;
  
  budgetUtilise: number = 0;
  budgetTotal: number = 0;
  progressionBudgetaire: number = 0;
  budgetData: BudgetResponse | null = null;
  isLoadingBudget = true;
  budgetError: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const projectId = +id;
      this.loadProjectDetails(projectId);
      this.loadProgression();
      this.loadBudget(projectId);
    }
  }

  private loadProjectDetails(id: number): void {
    this.loading = true;
    this.error = null;
  
    this.entrepriseService.getEntrepriseDetails(id).subscribe({
      next: (response) => {
        console.log('📋 Réponse complète du serveur:', response);
        
        if (response && response.realEstateProperty) {
          this.projet = response.realEstateProperty;
          console.log('✅ Données du projet:', this.projet);
        } 
        // else {
        //   this.projet = response || null;
        // }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du projet:', error);
        this.error = 'Erreur lors du chargement des détails du projet';
        this.projet = null;
        this.loading = false;
      }
    });
  }
  getPlanFileName(){
    return `${this.filebaseUrl}${this.projet?.plan} `;
  }
  private loadProgression(): void {
    this.isLoadingProgress = true;
    this.dashboardService.etatAvancement().pipe(
      catchError(error => {
        console.error('Erreur progression:', error);
        this.progressError = 'Impossible de charger la progression';
        this.isLoadingProgress = false;
        return of([] as PhaseIndicator[]);
      })
    ).subscribe((phases: PhaseIndicator[]) => {
      const relevantPhases = phases.filter(p =>
        ['GROS_OEUVRE', 'SECOND_OEUVRE', 'FINITION'].includes(p.phaseName)
      );
      
      const total = relevantPhases.reduce((sum, p) => sum + p.averageProgressPercentage, 0);
      const count = relevantPhases.length;

      this.averageProgress = count > 0 ? Math.round(total / count) : 0;
      this.isLoadingProgress = false;
    });
  }

  private loadBudget(propertyId: number): void {
    this.isLoadingBudget = true;
    this.budgetError = null;

    this.projectBudgetService.GetProjectBudget(propertyId).pipe(
      catchError(error => {
        console.error('Erreur lors du chargement du budget:', error);
        this.budgetError = 'Impossible de charger les données du budget';
        this.isLoadingBudget = false;
        return of(null);
      })
    ).subscribe((budgetResponse: BudgetResponse | null) => {
      if (budgetResponse) {
        this.budgetData = budgetResponse;
        this.budgetTotal = budgetResponse.plannedBudget;
        this.budgetUtilise = budgetResponse.consumedBudget;
        
        if (this.budgetTotal > 0) {
          this.progressionBudgetaire = Math.round((this.budgetUtilise / this.budgetTotal) * 100);
        } else {
          this.progressionBudgetaire = 0;
        }
      } else {
        // Utiliser le budget du projet si disponible
        if (this.projet?.budget) {
          this.budgetTotal = this.projet.budget;
          this.budgetUtilise = 0;
          this.progressionBudgetaire = 0;
        } else {
          this.budgetTotal = 0;
          this.budgetUtilise = 0;
          this.progressionBudgetaire = 0;
        }
      }
      
      this.isLoadingBudget = false;
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  isActiveTab(tab: string): boolean {
    return this.activeTab === tab;
  }

  get statutFrancais(): string {
    if (!this.projet?.status) return 'Non défini';
    
    const statusMap: { [key: string]: string } = {
      'IN_PROGRESS': 'En cours',
      'EN_COURS': 'En cours',
      'COMPLETED': 'Terminé',
      'TERMINE': 'Terminé',
      'NOT_STARTED': 'Non démarré',
      'NON_DEMARRE': 'Non démarré',
      'PENDING': 'En attente',
      'EN_ATTENTE': 'En attente',
      'SUSPENDED': 'Suspendu',
      'SUSPENDU': 'Suspendu',
      'PAUSED': 'En pause',
      'PLANNED': 'Planifié',
      'PLANIFIE': 'Planifié',
      'AVAILABLE': 'Disponible',
      'DISPONIBLE': 'Disponible'
    };
    
    const status = this.projet.status.toUpperCase();
    return statusMap[status] || this.projet.status;
  }

  get dateDebut(): string {
    // La structure n'a pas de startDate, utiliser une date par défaut ou créer la logique appropriée
    return '01/01/25';
  }

  get dateFinPrevue(): string {
    // La structure n'a pas de endDate, utiliser une date par défaut ou créer la logique appropriée
    return '01/01/27';
  }

  getGradientBackgroundDetail(percentage: number): string {
    // Toujours retourner orange pour rester cohérent avec le design
    return 'linear-gradient(90deg, #FE6102 100%)';
  }

  onModifier(): void {
    console.log('Modification du projet:', this.projet?.id);
    // Implémenter la logique de modification si nécessaire
  }

  get typeProprieteFrancais(): string {
    if (!this.projet?.propertyType) return 'Non défini';
    return this.projet.propertyType.typeName || 'Non défini';
  }

  get promoterName(): string {
    if (!this.projet?.promoter) return 'Non défini';
    return `${this.projet.promoter.prenom} ${this.projet.promoter.nom}`;
  }

  get promoterContact(): string {
    if (!this.projet?.promoter) return '';
    return this.projet.promoter.telephone || this.projet.promoter.email || '';
  }
}