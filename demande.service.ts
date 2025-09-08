  // services/demande.service.ts - Version complète et corrigée
  import { Injectable } from '@angular/core';
  import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
  import { Observable } from 'rxjs';
  import { AuthService } from '../app/features/auth/services/auth.service'; // Votre import existant

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

  // Interface pour la création d'un rapport
  export interface CreateReportRequest {
    title: string;
    versionNumber: number;
    authorId: number;
    authorName: string;
    studyRequestId: number; // ID de la demande à laquelle associer le rapport
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
    private reportsUrl = 'https://wakana.online/api/study-requests/reports'; // URL pour les rapports

    constructor(
      private http: HttpClient,
      private authService: AuthService  // ✅ Injection correcte d'AuthService
    ) {
      // Debug pour vérifier l'injection
      console.log('DemandeService initialisé - AuthService disponible:', !!this.authService);
    }

    /**
     * Crée un rapport avec FormData - Version principale corrigée
     * @param reportData Données du rapport
     * @param file Fichier à uploader
     * @returns Observable<Report>
     */
    createReport(reportData: {
      title: string;
      versionNumber: number;
      studyRequestId: number;
      authorId: number;
    }, file: File): Observable<Report> {
      
      console.log('=== SERVICE DEBUG CRÉATION ===');
      console.log('AuthService disponible:', !!this.authService);
      
      // Vérification de sécurité
      if (!this.authService) {
        throw new Error('AuthService non disponible dans DemandeService');
      }

      // Récupération sécurisée du token
      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Créer le FormData
      const formData = new FormData();
      
      // Ajouter les données dans l'ordre exact de Swagger
      formData.append('title', reportData.title);
      formData.append('file', file, file.name);
      formData.append('versionNumber', reportData.versionNumber.toString());
      formData.append('studyRequestId', reportData.studyRequestId.toString());
      formData.append('authorId', reportData.authorId.toString());

      // Headers avec token d'authentification
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      // Debug pour vérifier les données
      console.log('Token récupéré:', !!token);
      console.log('URL:', this.reportsUrl);
      console.log('FormData contents:');
      
      // Debug FormData de manière compatible
      const keys = ['title', 'file', 'versionNumber', 'studyRequestId', 'authorId'];
      keys.forEach(key => {
        const value = formData.get(key);
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}:`, value);
        }
      });

      return this.http.post<Report>(this.reportsUrl, formData, { headers });
    }

    /**
     * Version alternative qui reçoit le token depuis le composant (plus sûre)
     * @param reportData Données du rapport
     * @param file Fichier à uploader  
     * @param token Token d'authentification
     * @returns Observable<Report>
     */
    createReportWithToken(reportData: {
      title: string;
      versionNumber: number;
      studyRequestId: number;
      authorId: number;
    }, file: File, token: string): Observable<Report> {
      
      if (!token) {
        throw new Error('Token d\'authentification requis');
      }

      // Créer le FormData
      const formData = new FormData();
      formData.append('title', reportData.title);
      formData.append('file', file, file.name);
      formData.append('versionNumber', reportData.versionNumber.toString());
      formData.append('studyRequestId', reportData.studyRequestId.toString());
      formData.append('authorId', reportData.authorId.toString());

      // Headers avec token
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      console.log('=== SERVICE WITH EXTERNAL TOKEN ===');
      console.log('Token fourni:', !!token);
      console.log('Données envoyées:');
      console.log('- title:', reportData.title);
      console.log('- versionNumber:', reportData.versionNumber);
      console.log('- studyRequestId:', reportData.studyRequestId);
      console.log('- authorId:', reportData.authorId);
      console.log('- file:', file.name, '(', file.size, 'bytes )');

      return this.http.post<Report>(this.reportsUrl, formData, { headers });
    }

    /**
     * Méthode de compatibilité avec FormData pré-construit
     */
    createReportFormData(formData: FormData): Observable<Report> {
      if (!this.authService) {
        throw new Error('AuthService non disponible');
      }

      const token = this.authService.getToken();
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
      
      return this.http.post<Report>(this.reportsUrl, formData, { headers });
    }

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
     * Upload d'un fichier pour un rapport (si l'API le supporte)
     * @param reportId ID du rapport
     * @param file Fichier à uploader
     * @returns Observable<any>
     */
    uploadReportFile(reportId: number, file: File): Observable<any> {
      const formData = new FormData();
      formData.append('file', file);
      
      return this.http.post(`${this.reportsUrl}/${reportId}/upload`, formData);
    }

    /**
     * Crée un rapport avec upload de fichier en une seule fois (méthode legacy)
     * @param createData Données de création
     * @param file Fichier à uploader
     * @returns Observable<Report>
     */
    createReportWithFile(createData: CreateReportRequest, file: File): Observable<Report> {
      const formData = new FormData();
      
      // Ajouter les données du rapport
      formData.append('title', createData.title);
      formData.append('versionNumber', createData.versionNumber.toString());
      formData.append('authorId', createData.authorId.toString());
      formData.append('authorName', createData.authorName);
      formData.append('studyRequestId', createData.studyRequestId.toString());
      formData.append('file', file);
      
      return this.http.post<Report>(this.reportsUrl, formData);
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

    /**
     * Méthode de debug pour vérifier l'état du service
     */
    debugService(): void {
      console.log('=== DEBUG DEMANDE SERVICE ===');
      console.log('AuthService injecté:', !!this.authService);
      console.log('URLs configurées:');
      console.log('- apiUrl:', this.apiUrl);
      console.log('- reportsUrl:', this.reportsUrl);
      console.log('- kpiUrl:', this.kpiUrl);
      
      if (this.authService) {
        try {
          const token = this.authService.getToken();
          console.log('Token disponible:', !!token);
          console.log('Utilisateur authentifié:', this.authService.isAuthenticated());
        } catch (error) {
          console.error('Erreur accès AuthService:', error);
        }
      }
    }
  }