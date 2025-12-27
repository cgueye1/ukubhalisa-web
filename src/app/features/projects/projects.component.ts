import { 
  Component, 
  OnInit, 
  OnDestroy, 
  inject,
  signal,
  computed
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, EMPTY, timer } from 'rxjs';
import { 
  debounceTime, 
  distinctUntilChanged, 
  startWith, 
  switchMap, 
  catchError, 
  finalize, 
  map,
  tap,
  retry,
  timeout,
  takeUntil
} from 'rxjs/operators';

import { 
  EntrepriseService, 
  Entreprise, 
  EntrepriseResponse,
  SearchEntrepriseRequest 
} from '../../../services/entreprise.service';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '../../../environments/environment.prod';

interface EntrepriseListState {
  entreprises: Entreprise[];
  loading: boolean;
  error: string | null;
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  filebaseUrl = environment.filebaseUrl;

  private readonly router = inject(Router);
  private readonly entrepriseService = inject(EntrepriseService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  private readonly DEFAULT_PAGE_SIZE = 6;
  private readonly SEARCH_DEBOUNCE_TIME = 300;
  private readonly REQUEST_TIMEOUT = 15000;
  private readonly MAX_RETRIES = 2;

  promoterId: number = 0;

  // State management
  private readonly stateSignal = signal<EntrepriseListState>({
    entreprises: [],
    loading: false,
    error: null,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
    pageSize: this.DEFAULT_PAGE_SIZE
  });

  readonly entreprises = computed(() => this.stateSignal().entreprises);
  readonly loading = computed(() => this.stateSignal().loading);
  readonly error = computed(() => this.stateSignal().error);
  readonly pagination = computed(() => {
    const state = this.stateSignal();
    return {
      totalElements: state.totalElements,
      totalPages: state.totalPages,
      currentPage: state.currentPage,
      pageSize: state.pageSize
    };
  });

  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  readonly pageSizeOptions = [2, 5, 10, 20] as const;

  readonly searchForm = this.fb.group({
    search: [''],
    period: ['all'],
    status: ['all']
  });

  ngOnInit(): void {
    this.getPromoteurConnecter();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchSubscription(): void {
    this.searchForm.get('search')?.valueChanges
      .pipe(
        debounceTime(this.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
        tap(() => this.updateState({ currentPage: 0 })),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchSubject.next(searchTerm || '');
      });

    this.searchSubject
      .pipe(
        startWith(''),
        switchMap(searchTerm => this.loadEntreprises(searchTerm)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private getPromoteurConnecter(): void {
    this.updateState({ loading: true, error: null });
    
    this.authService.getCurrentUser().pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry(1),
      catchError(error => {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        this.updateState({ 
          loading: false, 
          error: "Impossible de récupérer les informations utilisateur" 
        });
        return EMPTY;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response?.id) {
          this.promoterId = response.id;
          this.searchSubject.next('');
        } else {
          this.updateState({ 
            loading: false, 
            error: "ID utilisateur non trouvé" 
          });
        }
      }
    });
  }

  private loadEntreprises(searchTerm: string = ''): any {
    if (!this.promoterId || this.promoterId <= 0) {
      this.updateState({ 
        loading: false, 
        error: "ID promoteur invalide" 
      });
      return EMPTY;
    }

    this.updateState({ loading: true, error: null });

    const request: SearchEntrepriseRequest = {
      promoterId: this.promoterId,
      name: searchTerm
    };

    const state = this.stateSignal();

    return this.entrepriseService
      .getEntreprises(request, state.currentPage, state.pageSize)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => timer(1000 * Math.pow(2, retryCount))
        }),
        tap((response: EntrepriseResponse) => {
          this.updateState({
            entreprises: response.content || [],
            totalElements: response.totalElements,
            totalPages: response.totalPages,
            loading: false,
            error: null
          });
        }),
        catchError(error => {
          this.handleLoadError(error);
          return EMPTY;
        }),
        finalize(() => this.updateState({ loading: false }))
      );
  }

  private handleLoadError(error: any): void {
    let errorMessage = 'Une erreur inattendue s\'est produite.';
    
    if (error.name === 'TimeoutError') {
      errorMessage = 'Le serveur met trop de temps à répondre.';
    } else if (error.status === 0) {
      errorMessage = 'Problème de connectivité réseau.';
    } else if (error.status >= 500) {
      errorMessage = 'Erreur serveur.';
    } else if (error.status >= 400) {
      errorMessage = 'Erreur de requête.';
    }

    this.updateState({ loading: false, error: errorMessage });
  }

  private updateState(partialState: Partial<EntrepriseListState>): void {
    this.stateSignal.update(current => ({ ...current, ...partialState }));
  }

  onSearch(): void {
    const searchValue = this.searchForm.get('search')?.value || '';
    this.updateState({ currentPage: 0 });
    this.searchSubject.next(searchValue);
  }

  onRefresh(): void {
    this.searchForm.patchValue({ search: '' });
    this.updateState({ currentPage: 0 });
    this.searchSubject.next('');
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (!target?.value) return;
    const size = parseInt(target.value, 10);
    this.updateState({ pageSize: size, currentPage: 0 });
    this.searchSubject.next(this.searchForm.get('search')?.value || '');
  }

  goToPreviousPage(): void {
    const state = this.stateSignal();
    if (state.currentPage > 0) {
      this.updateState({ currentPage: state.currentPage - 1 });
      this.searchSubject.next(this.searchForm.get('search')?.value || '');
    }
  }

  goToNextPage(): void {
    const state = this.stateSignal();
    if (state.currentPage < state.totalPages - 1) {
      this.updateState({ currentPage: state.currentPage + 1 });
      this.searchSubject.next(this.searchForm.get('search')?.value || '');
    }
  }

  onEntrepriseClick(entreprise: Entreprise): void {
    console.log( entreprise.id)
    
    if (entreprise?.id) {
      this.router.navigate(['/detailprojet', entreprise.id]);
    }
   /* if (entreprise?.id) {
      this.router.navigate(['/detail-entreprise', entreprise.id]);
    }*/
  }

  deleteEntreprise(entreprise: Entreprise, event: Event): void {
    event.stopPropagation();
    
    if (!entreprise?.id) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${entreprise.name}" ?`)) {
      this.entrepriseService.deleteEntreprise(entreprise.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          alert('Entreprise supprimée avec succès');
          this.onRefresh();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert('Erreur lors de la suppression');
        }
      });
    }
  }

  getPaginationInfo(): string {
    const pag = this.pagination();
    const start = pag.currentPage * pag.pageSize + 1;
    const end = Math.min((pag.currentPage + 1) * pag.pageSize, pag.totalElements);
    return `${start} - ${end} sur ${pag.totalElements} entreprises`;
  }

  trackByEntrepriseId = (index: number, item: Entreprise): number => item.id || index;

  getImageUrl(plan: string | undefined): string {

    if (!plan) return `${this.filebaseUrl}${plan}`;
    if (plan.startsWith('http')) return plan;
    return `${this.filebaseUrl}${plan}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/architecte.png';
  }
}