import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';

// Définition locale des profils utilisateur
export enum UserRole {
  ADMIN = 'ADMIN',
  SITE_MANAGER = 'SITE_MANAGER',
  SUPPLIER = 'SUPPLIER',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  USER = 'USER',
  BET = 'BET',
  PROMOTEUR = 'PROMOTEUR'
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    console.log('🔒 RoleGuard - Vérification des rôles pour:', state.url);
    
    // Vérifier d'abord l'authentification
    if (!this.authService.isAuthenticated()) {
      console.log('❌ RoleGuard - Utilisateur non authentifié');
      return this.router.createUrlTree(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
    }

    const user = this.authService.currentUser();
    if (!user) {
      console.log('❌ RoleGuard - Aucune donnée utilisateur');
      return this.router.createUrlTree(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
    }

    // Récupérer les rôles requis pour cette route
    const requiredRoles = route.data['roles'] as string[];
    console.log('📋 Rôles requis:', requiredRoles);
    console.log('👤 Profil utilisateur:', user.profil);

    // Si aucun rôle spécifique n'est requis, autoriser l'accès
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('✅ RoleGuard - Aucun rôle spécifique requis');
      return true;
    }

    // Vérifier si l'utilisateur a au moins un des rôles requis
    const hasRequiredRole = this.checkUserRole(user.profil, requiredRoles);
    
    if (!hasRequiredRole) {
      console.log('❌ RoleGuard - Rôles insuffisants');
      console.log('🔄 Redirection vers /dashboard');
      
      return this.router.createUrlTree(['/dashboard'], { 
        queryParams: { 
          error: 'insufficient_permissions',
          attempted: state.url 
        }
      });
    }

    console.log('✅ RoleGuard - Accès autorisé');
    return true;
  }

  /**
   * Vérifie si l'utilisateur a au moins un des rôles requis
   */
  private checkUserRole(userProfile: string | null | undefined, requiredRoles: string[]): boolean {
    if (!userProfile || !requiredRoles || requiredRoles.length === 0) {
      return false;
    }

    console.log('🔍 Vérification:', {
      userProfile,
      requiredRoles
    });
    
    // Vérifier si le profil utilisateur correspond à l'un des rôles requis
    const hasRole = requiredRoles.includes(userProfile);
    
    console.log('🎯 Correspondance trouvée:', hasRole);
    return hasRole;
  }

  /**
   * Méthode utilitaire pour vérifier un rôle spécifique
   */
  hasRole(userProfile: string | null | undefined, role: string): boolean {
    return this.checkUserRole(userProfile, [role]);
  }

  /**
   * Méthode utilitaire pour vérifier si l'utilisateur est ADMIN
   */
  isAdmin(): boolean {
    return this.authService.isADMINProfile();
  }

  /**
   * Méthode utilitaire pour vérifier si l'utilisateur est BET
   */
  isBET(): boolean {
    return this.authService.isBETProfile();
  }

  /**
   * Méthode utilitaire pour vérifier si l'utilisateur est SUPPLIER
   */
  isSupplier(): boolean {
    return this.authService.isSUPPLIERProfile();
  }

  /**
   * Méthode utilitaire pour vérifier si l'utilisateur est SITE_MANAGER
   */
  isSiteManager(): boolean {
    return this.authService.isSiteManagerProfile();
  }

  /**
   * Méthode utilitaire pour vérifier si l'utilisateur est SUBCONTRACTOR
   */
  isSubcontractor(): boolean {
    return this.authService.isSubcontractorProfile();
  }

  /**
   * Méthode utilitaire pour vérifier si l'utilisateur est PROMOTEUR
   */
  isPromoteur(): boolean {
    return this.authService.isPromoteurProfile();
  }
}