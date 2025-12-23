// services/utilisateur.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegisterRequest {
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

export interface UpdateUserRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date: string;
  lieunaissance: string;
  adress: string;
  profil: string;
  photo?: File;
}

export interface UpdateProfilRequest {
  profil: string;
}

export interface Authority {
  authority: string;
}

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  adress: string;
  technicalSheet: any;
  profil: string;
  activated: boolean;
  notifiable: boolean;
  telephone: string;
  createdAt: number[];
  funds: number;
  note: number;
  photo: string;
  idCard: any;
  dateOfBirth: string;
  qrcode: any;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  accountNonLocked: boolean;
  username: string;
  authorities: Authority[];
  enabled: boolean;
}

export interface UserMe {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  adress: string;
  telephone: string;
  profil: string;
  activated: boolean;
  notifiable: boolean;
  funds: number;
  note: number;
  photo: string;
  idCard: any;
  dateOfBirth: string;
  qrcode: any;
  assignedCompany: any;
}

@Injectable({
  providedIn: 'root'
})
export class UtilisateurService {
  private baseUrl = 'https://innov.sn/preproduk/api';

  constructor(private http: HttpClient) { }

  // Inscription d'un utilisateur
  register(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/signup`, formData);
  }

  // Récupérer un utilisateur par ID
  getUtilisateurById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/v1/user/${id}`);
  }

  // Supprimer un utilisateur
  deleteUtilisateur(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/v1/user/${id}`);
  }

  // Mettre à jour un utilisateur
  updateUtilisateur(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/user/update/${id}`, formData);
  }

  // Mettre à jour le profil d'un utilisateur
  updateUtilisateurProfil(userId: number, profil: string): Observable<any> {
    const request: UpdateProfilRequest = { profil };
    return this.http.put(
      `${this.baseUrl}/v1/user/${userId}/change-profil`,
      request
    );
  }

  // Récupérer l'utilisateur connecté
  getMe(): Observable<UserMe> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get<UserMe>(`${this.baseUrl}/v1/user/me`, { headers });
  }

  // Méthode utilitaire pour convertir un objet RegisterRequest en FormData
  createRegisterFormData(data: RegisterRequest): FormData {
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

  // Méthode utilitaire pour convertir un objet UpdateUserRequest en FormData
  createUpdateUserFormData(data: UpdateUserRequest): FormData {
    const formData = new FormData();
    
    formData.append('nom', data.nom);
    formData.append('prenom', data.prenom);
    formData.append('email', data.email);
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
}