import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  activeMenu = 'projects';
  private subscriptions: Subscription = new Subscription();
  baseUrl = 'https://wakana.online/repertoire_samater/';
  profileImageLoading = true;

  constructor(
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initializeActiveMenu();

    if (this.authService.isAuthenticated()) {
      const userSubscription = this.authService.refreshUser().subscribe({
        next: () => {
          this.initializeActiveMenu();
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'utilisateur:', error);
        }
      });

      this.subscriptions.add(userSubscription);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeActiveMenu(): void {
    const currentPath = this.router.url;
    if (currentPath.includes('projects')) {
      this.activeMenu = 'projects';
    } else if (currentPath.includes('mon-compte')) {
      this.activeMenu = 'mon-compte';
    }
  }

  navigateTo(path: string, label: string, menuId: string): void {
    this.activeMenu = menuId;
    this.router.navigate([path]);
    
    if (path !== '/projects') {
      this.breadcrumbService.setBreadcrumbs([{ label, path }]);
    } else {
      this.breadcrumbService.reset();
    }
  }

  isActive(menuId: string): boolean {
    return this.activeMenu === menuId;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getProfileImageUrl(): string {
    this.profileImageLoading = true;
    const user = this.authService.currentUser();

    if (user?.photo) {
      return `${this.baseUrl}${user.photo}?t=${new Date().getTime()}`;
    }

    return 'assets/images/profil.png';
  }

  onImageLoad(): void {
    this.profileImageLoading = false;
  }

  onImageError(event: any): void {
    console.warn('Erreur lors du chargement de la photo de profil');
    this.profileImageLoading = false;
    event.target.src = 'assets/images/profil.png';
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  getTranslatedProfile(): string {
    const profileTranslations: { [key: string]: string } = {
      'SITE_MANAGER': 'Manager',
      'SUBCONTRACTOR': 'Sous-traitant',
      'SUPPLIER': 'Fournisseur',
      'ADMIN': 'Administrateur',
      'BET': 'Bureau d\'études',
      'USER': 'Utilisateur',
      'PROMOTEUR': 'Promoteur',
      'MOA': 'Maître d\'Ouvrage'
    };

    const user = this.authService.currentUser();
    if (!user || !user.profil) {
      return 'Utilisateur';
    }

    return profileTranslations[user.profil] || user.profil;
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get userFullName() {
    return this.authService.userFullName();
  }

  get isUserAuthenticated() {
    return this.authService.isAuthenticated();
  }

  getUserInitials(): string {
    return this.authService.getUserInitials();
  }
}