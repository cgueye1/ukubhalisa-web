// // core/guards/auth.guard.ts (version simplifiée pour les tests)
// import { Injectable } from '@angular/core';
// import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
// import { Observable } from 'rxjs';
// import { AuthService } from '../app/features/auth/services/auth.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuard implements CanActivate {
  
//   constructor(
//     private authService: AuthService, 
//     private router: Router
//   ) {}

//   canActivate(
//     route: ActivatedRouteSnapshot,
//     state: RouterStateSnapshot
//   ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
//     console.log('🔐 AuthGuard - Vérification de l\'accès à:', state.url);
    
//     // Vérifier si l'utilisateur est authentifié
//     const isAuthenticated = this.authService.isAuthenticated();
//     console.log('👤 Utilisateur authentifié:', isAuthenticated);
    
//     if (!isAuthenticated) {
//       console.log('❌ Accès refusé - Utilisateur non authentifié');
//       return this.router.createUrlTree(['/login'], { 
//         queryParams: { returnUrl: state.url }
//       });
//     }

//     // Vérifier la validité du token
//     if (!this.authService.isTokenValid()) {
//       console.log('❌ Token invalide ou expiré');
//       this.authService.logout();
//       return this.router.createUrlTree(['/login'], { 
//         queryParams: { returnUrl: state.url, reason: 'token_expired' }
//       });
//     }

//     // Vérifier la présence des données utilisateur
//     const user = this.authService.currentUser();
//     if (!user) {
//       console.log('❌ Aucune information utilisateur disponible');
//       return this.router.createUrlTree(['/login'], { 
//         queryParams: { returnUrl: state.url, reason: 'user_data_missing' }
//       });
//     }

//     // Pour les tests : afficher les informations de debug sans bloquer l'accès
//     console.log('📊 Informations utilisateur:', {
//       id: user.id,
//       email: user.email,
//       activated: user.activated,
//       enabled: user.enabled,
//       accountNonExpired: user.accountNonExpired,
//       credentialsNonExpired: user.credentialsNonExpired,
//       accountNonLocked: user.accountNonLocked,
//       profil: user.profil
//     });

//     // Vérifications non bloquantes avec warnings
//     if (!user.activated) {
//       console.warn('⚠️ Compte non activé - accès autorisé pour les tests');
//     }
//     if (!user.enabled) {
//       console.warn('⚠️ Compte désactivé - accès autorisé pour les tests');
//     }
//     if (!user.accountNonExpired) {
//       console.warn('⚠️ Compte expiré - accès autorisé pour les tests');
//     }
//     if (!user.credentialsNonExpired) {
//       console.warn('⚠️ Identifiants expirés - accès autorisé pour les tests');
//     }
//     if (!user.accountNonLocked) {
//       console.warn('⚠️ Compte verrouillé - accès autorisé pour les tests');
//     }

//     console.log('✅ AuthGuard - Accès autorisé');
//     return true;
//   }
// }