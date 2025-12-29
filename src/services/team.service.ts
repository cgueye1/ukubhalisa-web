// services/team.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Authority {
  authority: string;
}

export interface Worker {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  adress: string;
  technicalSheet: string | null;
  profil: string;
  activated: boolean;
  notifiable: boolean;
  telephone: string;
  createdAt: string | number[];
  funds: number;
  note: number;
  photo: string;
  idCard: string | null;
  dateOfBirth: string;
  qrcode: string | null;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  accountNonLocked: boolean;
  username: string;
  authorities: Authority[];
  enabled: boolean;
}

export interface Sort {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: Sort;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface WorkerResponse {
  content: Worker[];
  pageable: Pageable;
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: Sort;
  first: boolean;
  empty: boolean;
}

export interface CreateWorkerRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  date: string;
  lieunaissance: string;
  adress: string;
  profil: string;
  photo?: File;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private baseUrl = 'https://innov.sn/pointage/api/workers/';

  constructor(private http: HttpClient) { }

  // Récupérer tous les workers d'une propriété avec pagination
  getWorkers(propertyId: number, page: number = 0, size: number = 10, sort?: string): Observable<WorkerResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<WorkerResponse>(`${this.baseUrl}property/${propertyId}`, { params });
  }

  // Créer un nouveau worker
  createWorker(propertyId: number, formData: FormData): Observable<Worker> {
    return this.http.post<Worker>(`${this.baseUrl}save/${propertyId}`, formData);
  }

  // Méthode utilitaire pour convertir un objet en FormData
  createWorkerFormData(data: CreateWorkerRequest): FormData {
    const formData = new FormData();
    
    formData.append('nom', data.nom);
    formData.append('prenom', data.prenom);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('telephone', data.telephone);
    formData.append('date', data.date);
    formData.append('lieunaissance', data.lieunaissance);
    formData.append('adress', data.adress);
    formData.append('profil', data.profil);
    
    if (data.photo) {
      formData.append('photo', data.photo);
    }
    
    return formData;
  }

  // Méthode pour récupérer un worker par ID
  getWorkerById(id: number): Observable<Worker> {
    return this.http.get<Worker>(`${this.baseUrl}${id}`);
  }  

  // Méthode pour mettre à jour un worker
  updateWorker(id: number, formData: FormData): Observable<Worker> {
    return this.http.put<Worker>(`${this.baseUrl}update/${id}`, formData);
  }

  // Méthode pour supprimer un worker
  deleteWorker(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}delete/${id}`);
  }

  // Méthode pour rechercher des workers
  searchWorkers(propertyId: number, searchTerm: string, page: number = 0, size: number = 10): Observable<WorkerResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('search', searchTerm);

    return this.http.get<WorkerResponse>(`${this.baseUrl}property/${propertyId}/search`, { params });
  }
}