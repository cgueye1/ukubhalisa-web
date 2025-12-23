// services/entreprise.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EntrepriseRequest {
  name: string;
  number: string;
  address: string;
  price: number;
  numberOfRooms: number;
  area: number;
  latitude: string;
  longitude: string;
  description: string;
  numberOfLots: number;
  promoterId: number;
  moaId: number;
  managerId: number;
  propertyTypeId: number;
  plan?: File;
}

export interface SearchEntrepriseRequest {
  promoterId: number;
  name: string;
}

export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: Sort;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface Sort {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface Entreprise {
  id?: number;
  name?: string;
  number?: string;
  address?: string;
  price?: number;
  numberOfRooms?: number;
  area?: number;
  latitude?: string;
  longitude?: string;
  description?: string;
  numberOfLots?: number;
  promoterId?: number;
  moaId?: number;
  managerId?: number;
  propertyTypeId?: number;
  plan?: string;
}

export interface EntrepriseResponse {
  content: Entreprise[];
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

@Injectable({
  providedIn: 'root'
})
export class EntrepriseService {
  private baseUrl = 'https://innov.sn/preproduk/api';

  constructor(private http: HttpClient) { }

  // Créer une entreprise
  createEntreprise(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/realestate/save`, formData);
  }

  // Récupérer les entreprises avec pagination
  getEntreprises(request: SearchEntrepriseRequest, page: number = 0, size: number = 10): Observable<EntrepriseResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.post<EntrepriseResponse>(
      `${this.baseUrl}/realestate/search-by-promoter`,
      request,
      { params }
    );
  }

  // Supprimer une entreprise
  deleteEntreprise(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/realestate/delete/${id}`);
  }

  // Mettre à jour une entreprise
  updateEntreprise(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/realestate/update/${id}`, formData);
  }

  // Méthode utilitaire pour convertir un objet en FormData
  createEntrepriseFormData(data: EntrepriseRequest): FormData {
    const formData = new FormData();
    
    formData.append('name', data.name);
    formData.append('number', data.number);
    formData.append('address', data.address);
    formData.append('price', data.price.toString());
    formData.append('numberOfRooms', data.numberOfRooms.toString());
    formData.append('area', data.area.toString());
    formData.append('latitude', data.latitude);
    formData.append('longitude', data.longitude);
    formData.append('description', data.description);
    formData.append('numberOfLots', data.numberOfLots.toString());
    formData.append('promoterId', data.promoterId.toString());
    formData.append('moaId', data.moaId.toString());
    formData.append('managerId', data.managerId.toString());
    formData.append('propertyTypeId', data.propertyTypeId.toString());
    
    if (data.plan) {
      formData.append('plan', data.plan);
    }
    
    return formData;
  }
}