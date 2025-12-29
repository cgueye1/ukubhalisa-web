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
import { trigger, transition, style, animate } from '@angular/animations';

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
  styleUrls: ['./projects.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ])
  ]
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

  // Modal de suppression
  readonly showDeleteModal = signal<boolean>(false);
  readonly entrepriseToDelete = signal<Entreprise | null>(null);
  readonly isDeleting = signal<boolean>(false);

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
    this.onRefresh();
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

  // NOUVELLES MÉTHODES POUR LA PAGINATION

  goToFirstPage(): void {
    if (this.pagination().currentPage !== 0) {
      this.updateState({ currentPage: 0 });
      this.searchSubject.next(this.searchForm.get('search')?.value || '');
    }
  }

  goToLastPage(): void {
    const state = this.stateSignal();
    const lastPage = state.totalPages - 1;
    if (state.currentPage !== lastPage) {
      this.updateState({ currentPage: lastPage });
      this.searchSubject.next(this.searchForm.get('search')?.value || '');
    }
  }

  // MÉTHODES POUR LE MODAL DE SUPPRESSION

  openDeleteModal(entreprise: Entreprise, event: Event): void {
    event.stopPropagation();
    this.entrepriseToDelete.set(entreprise);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    if (!this.isDeleting()) {
      this.showDeleteModal.set(false);
      this.entrepriseToDelete.set(null);
    }
  }

  confirmDelete(): void {
    const entreprise = this.entrepriseToDelete();
    
    if (!entreprise?.id) return;
    
    this.isDeleting.set(true);

    this.entrepriseService.deleteEntreprise(entreprise.id).pipe(
      timeout(this.REQUEST_TIMEOUT),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.showSuccessNotification(`L'entreprise "${entreprise.name}" a été supprimée avec succès`);
        this.onRefresh();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.isDeleting.set(false);
        this.showErrorNotification('Une erreur est survenue lors de la suppression');
      }
    });
  }

  // MÉTHODES DE NOTIFICATION (vous pouvez les personnaliser avec un service de toast/snackbar)

  private showSuccessNotification(message: string): void {
    // Implémentez ici votre système de notification
    // Par exemple avec un service de toast ou snackbar
    console.log('SUCCESS:', message);
    // Exemple simple avec l'API navigateur:
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Succès', { body: message });
    }
  }

  private showErrorNotification(message: string): void {
    // Implémentez ici votre système de notification d'erreur
    console.error('ERROR:', message);
    this.updateState({ error: message });
  }

  // MÉTHODES EXISTANTES

  onEntrepriseClick(entreprise: Entreprise): void {
    if (entreprise?.id) {
      this.router.navigate(['/detail-entreprise', entreprise.id]);
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
    if (!plan) return 'assets/images/architecte.png';
    if (plan.startsWith('http')) return plan;
    return `${this.filebaseUrl}${plan}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/architecte.png';
  }
}