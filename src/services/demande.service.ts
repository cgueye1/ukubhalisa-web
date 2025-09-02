// services/demande.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// models/demande.model.ts
export interface Report {
  id: number;
  title: string;
  fileUrl: string;
  versionNumber: number;
  submittedAt: number[];
  authorId: number;
  authorName: string;
}

export interface Demande {
  id: number;
  title: string;
  description: string;
  status: 'VALIDATED' | 'REJECTED' | 'PENDING' | 'IN_PROGRESS' | 'DELIVERED';
  createdAt: number[];
  propertyId: number;
  propertyName: string;
  propertyImg: string;
  moaId: number;
  moaName: string;
  betId: number;
  betName: string;
  reports: Report[];
}

export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface DemandeResponse {
  content: Demande[];
  pageable: Pageable;
  totalPages: number;
  totalElements: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  first: boolean;
  empty: boolean;
}

// Interface pour la réponse des pourcentages
export interface PercentageCountResponse {
  total: number;
  percentages: {
    PENDING: number;
    IN_PROGRESS: number;
    DELIVERED: number;
    VALIDATED: number;
    REJECTED: number;
  };
  counts: {
    PENDING: number;
    IN_PROGRESS: number;
    DELIVERED: number;
    VALIDATED: number;
    REJECTED: number;
  };
}

// Interface pour la réponse de volumétrie
export interface VolumetryResponse {
  totalStudyRequests: number;
  distinctPropertiesCount: number;
  totalReports: number;
}

@Injectable({
  providedIn: 'root'
})
export class DemandeService {
  private apiUrl = 'https://wakana.online/api/study-requests/bet';
  private kpiUrl = 'https://wakana.online/api/study-requests/kpi/bet';

  constructor(private http: HttpClient) { }

  /**
   * Récupère les demandes avec pagination dynamique
   * @param betId ID du BET
   * @param page Numéro de page (commence à 0)
   * @param size Nombre d'éléments par page (dynamique)
   * @returns Observable avec la réponse paginée
   */
  getDemande(betId: number, page: number = 0, size: number = 10): Observable<DemandeResponse> {
    // Création des paramètres de requête
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<DemandeResponse>(`${this.apiUrl}/${betId}`, { params });
  }

  /**
   * Récupère les statistiques de pourcentage par statut
   * @param betId ID du BET
   * @returns Observable avec les pourcentages et counts par statut
   */
  getPercentageCount(betId: number): Observable<PercentageCountResponse> {
    return this.http.get<PercentageCountResponse>(`${this.kpiUrl}/${betId}`);
  }

  /**
   * Récupère les données de volumétrie
   * @param betId ID du BET
   * @returns Observable avec les données de volumétrie
   */
  getVolumetry(betId: number): Observable<VolumetryResponse> {
    return this.http.get<VolumetryResponse>(`${this.kpiUrl}/${betId}/volumetry`);
  }

  /**
   * Récupère toutes les demandes en paginant automatiquement
   * @param betId ID du BET
   * @param pageSize Nombre d'éléments par page
   * @returns Observable avec toutes les demandes
   */
  getAllDemandes(betId: number, pageSize: number = 20): Observable<Demande[]> {
    return new Observable<Demande[]>(observer => {
      const allDemandes: Demande[] = [];
      let currentPage = 0;
      let totalPages = 1;

      const fetchNextPage = () => {
        this.getDemande(betId, currentPage, pageSize).subscribe({
          next: (response: DemandeResponse) => {
            // Ajouter les demandes de la page courante
            allDemandes.push(...response.content);
            
            // Mettre à jour le nombre total de pages
            totalPages = response.totalPages;
            
            // Si ce n'est pas la dernière page, récupérer la suivante
            if (currentPage < totalPages - 1) {
              currentPage++;
              fetchNextPage();
            } else {
              // Toutes les pages ont été récupérées
              observer.next(allDemandes);
              observer.complete();
            }
          },
          error: (err) => {
            observer.error(err);
          }
        });
      };

      // Commencer la récupération
      fetchNextPage();
    });
  }

  /**
   * Récupère les demandes avec filtrage optionnel par statut
   * @param betId ID du BET
   * @param page Numéro de page
   * @param size Taille de la page
   * @param status Filtre par statut (optionnel)
   * @returns Observable avec les demandes filtrées
   */
  getDemandesByStatus(betId: number, page: number = 0, size: number = 10, status?: string): Observable<DemandeResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<DemandeResponse>(`${this.apiUrl}/${betId}`, { params });
  }

  /**
   * Met à jour dynamiquement la taille de la page
   * @param betId ID du BET
   * @param page Numéro de page
   * @param newSize Nouvelle taille de page
   * @returns Observable avec la nouvelle page
   */
  changePageSize(betId: number, page: number, newSize: number): Observable<DemandeResponse> {
    return this.getDemande(betId, page, newSize);
  }
}