import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

// Interface pour l'utilisateur
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adress: string;
  profil: string; // SIMPLIFIÉ: juste un string
  activated: boolean;
  photo: string | null;
  funds: number;
  note: number;
}

// Interface pour la réponse de login
interface LoginResponse {
  token: string;
  refreshToken: string;
}

// Interface pour reset password
interface ResetPasswordRequest {
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://innov.sn/preproduk/api';

  // Signals pour l'état d'authentification
  private _currentUser = signal<User | null>(null);
  private _isAuthenticated = signal(false);
  private _token = signal<string | null>(null);

  // Signaux en lecture seule
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = this._isAuthenticated.asReadonly();
  
  userProfile = computed(() => {
    const user = this._currentUser();
    return user?.profil || null;
  });

  userFullName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.prenom} ${user.nom}` : null;
  });

  isUserActivated = computed(() => this._currentUser()?.activated || false);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken && this.isTokenValidFormat(storedToken)) {
        this._token.set(storedToken);
        this._isAuthenticated.set(true);
        
        // Vérifier la validité du token
        if (this.isTokenValid()) {
          // Récupérer l'utilisateur depuis le localStorage ou l'API
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              this._currentUser.set(user);
              console.log('✅ Utilisateur récupéré depuis localStorage:', user);
            } catch (error) {
              console.error('❌ Erreur parsing user:', error);
              this.clearAuthData();
            }
          }
        } else {
          console.warn('⚠️ Token expiré, nettoyage automatique');
          this.clearAuthData();
        }
      }
    }
  }

  private isTokenValidFormat(token: string): boolean {
    try {
      const parts = token.split('.');
      return parts.length === 3;
    } catch {
      return false;
    }
  }

  // ✅ MÉTHODE LOGIN CORRIGÉE - Ne retourne que token et refreshToken
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    console.log('🔐 Tentative de connexion avec:', credentials.email);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/v1/auth/signin`, credentials)
      .pipe(
        tap(response => {
          console.log('✅ Réponse login reçue:', {
            hasToken: !!response.token,
            hasRefreshToken: !!response.refreshToken
          });
          
          // Sauvegarder les tokens
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('refreshToken', response.refreshToken);
            console.log('💾 Tokens sauvegardés dans localStorage');
          }
          
          // Mettre à jour le signal du token
          this._token.set(response.token);
          this._isAuthenticated.set(true);
          
          console.log('✅ État d\'authentification initial mis à jour');
        }),
        catchError(error => {
          console.error('❌ Erreur lors de la connexion:', error);
          console.error('Détails erreur:', {
            status: error.status,
            message: error.message,
            error: error.error
          });
          
          throw error;
        })
      );
  }

  // ✅ MÉTHODE getCurrentUser() - Appel à /v1/user/me
  getCurrentUser(): Observable<User> {
    const token = this._token();
    
    if (!token) {
      console.error('❌ Pas de token disponible pour getCurrentUser');
      return throwError(() => new Error('No token available'));
    }

    console.log('🔍 Appel /v1/user/me avec token:', token.substring(0, 20) + '...');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const url = `${this.apiUrl}/v1/user/me`;
    console.log('🌐 URL:', url);

    return this.http.get<any>(url, { headers }).pipe(
      tap(userMe => {
        if (userMe) {
          console.log('✅ UserMe reçu:', userMe);
          
          // Convertir la réponse en User
          const user: User = {
            id: userMe.id,
            nom: userMe.nom,
            prenom: userMe.prenom,
            email: userMe.email,
            telephone: userMe.telephone || '',
            adress: userMe.adress || '',
            profil: userMe.profil || 'USER',
            activated: userMe.activated,
            photo: userMe.photo || null,
            funds: userMe.funds || 0,
            note: userMe.note || 0
          };

          // Sauvegarder dans le signal
          this._currentUser.set(user);
          
          // Sauvegarder aussi dans localStorage
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          
          console.log('✅ User sauvegardé:', {
            id: user.id,
            email: user.email,
            profil: user.profil,
            activated: user.activated
          });
        }
      }),
      catchError(error => {
        console.error('❌ Erreur getCurrentUser:', error);
        console.error('  Status:', error.status);
        console.error('  Message:', error.message);
        console.error('  URL:', error.url);
        
        // Si erreur 401/403, nettoyer les données
        if (error.status === 401 || error.status === 403) {
          console.log('🧹 Token invalide, nettoyage');
          this.clearAuthData();
        }
        
        throw error;
      })
    );
  }

  // ✅ MÉTHODE RESET PASSWORD
  resetPassword(email: string): Observable<any> {
    console.log('🔄 Demande de réinitialisation de mot de passe pour:', email);
    
    const request: ResetPasswordRequest = { email };
    const url = `${this.apiUrl}/v1/auth/password/reset`;
    
    return this.http.post(url, request).pipe(
      tap(response => {
        console.log('✅ Demande de réinitialisation envoyée avec succès');
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la réinitialisation:', error);
        throw error;
      })
    );
  }

  logout(): void {
    this.clearAuthData();
  }

  private clearAuthData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    
    this._token.set(null);
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    
    console.log('🧹 Données d\'authentification nettoyées');
  }

  getToken(): string | null {
    const token = this._token();
    
    if (!token) {
      console.warn('⚠️ Aucun token dans le signal');
      return null;
    }

    if (!this.isTokenValid()) {
      console.warn('⚠️ Token expiré, nettoyage automatique');
      this.clearAuthData();
      return null;
    }

    return token;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    
    if (!token) {
      console.error('❌ Aucun token valide disponible');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  isTokenValid(): boolean {
    const token = this._token();
    
    if (!token) {
      return false;
    }
    
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('❌ Format de token invalide');
        return false;
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Vérifier l'expiration avec une marge de 5 minutes
      if (payload.exp) {
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        const marginTime = 5 * 60 * 1000; // 5 minutes
        
        if (expirationTime - marginTime <= currentTime) {
          console.warn('⚠️ Token proche de l\'expiration ou expiré');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erreur validation token:', error);
      return false;
    }
  }

  // Vérifications de profil
  isADMINProfile(): boolean {
    const user = this.currentUser();
    return user?.profil === 'ADMIN';
  }

  isBETProfile(): boolean {
    const user = this.currentUser();
    return user?.profil === 'BET';
  }

  isSUPPLIERProfile(): boolean {
    const user = this.currentUser();
    return user?.profil === 'SUPPLIER';
  }

  isSiteManagerProfile(): boolean {
    const user = this.currentUser();
    return user?.profil === 'SITE_MANAGER';
  }

  isSubcontractorProfile(): boolean {
    const user = this.currentUser();
    return user?.profil === 'SUBCONTRACTOR';
  }

  isPromoteurProfile(): boolean {
    const user = this.currentUser();
    return user?.profil === 'PROMOTEUR';
  }

  // Méthodes utilitaires
  getConnectedUserId(): number | null {
    return this._currentUser()?.id ?? null;
  }

  getUserInitials(): string {
    const user = this._currentUser();
    if (!user) return '';
    
    const firstInitial = user.prenom.charAt(0).toUpperCase();
    const lastInitial = user.nom.charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }

  getUserDisplayName(): string {
    return this.userFullName() || 'Utilisateur';
  }

  getUserPhotoUrl(): string {
    const user = this._currentUser();
    return user?.photo || 'assets/images/profil.png';
  }

  hasUserPhoto(): boolean {
    const user = this._currentUser();
    return user?.photo !== null && user?.photo !== undefined;
  }

  refreshUser(): Observable<User> {
    return this.getCurrentUser();
  }

  // Méthode de debug
  debugAuthState(): void {
    console.log('=== DEBUG AUTH STATE ===');
    console.log('Token:', this._token() ? 'Present' : 'Absent');
    console.log('Token valide:', this.isTokenValid());
    console.log('Authentifié:', this.isAuthenticated());
    console.log('Utilisateur:', this._currentUser());
    console.log('Profil:', this.userProfile());
    console.log('=======================');
  }
}