// portail.component.ts
import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { PlanAbonnementService, SubscriptionPlan } from '../../../../services/plan-abonnement.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-portail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portail.component.html',
  styleUrls: ['./portail.component.css'],
  animations: [
    trigger('fadeInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('fadeInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class PortailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isScrolled = false;
  mobileMenuOpen = false;
  isLoadingPlans = true;

  // Plans d'abonnement
  premiumPlan: SubscriptionPlan | null = null;
  basicPlan: SubscriptionPlan | null = null;

  features = [
    {
      title: 'Suivi en temps réel',
      description: 'Suivez l\'avancement de vos chantiers en temps réel avec des mises à jour instantanées.',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Pointages digitaux',
      description: 'Gérez les pointages de vos équipes facilement depuis le terrain.',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Planning interactif',
      description: 'Organisez et visualisez tous vos projets avec des plannings intelligents.',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      title: 'Rapports PDF',
      description: 'Générez automatiquement des rapports professionnels en format PDF.',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      title: 'Gestion des coûts',
      description: 'Suivez et contrôlez les budgets de vos projets en toute transparence.',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Photos & Documents',
      description: 'Centralisez tous vos documents et photos de chantier au même endroit.',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    }
  ];

  profiles = [
    { title: 'MOA', initial: 'M', description: 'Maître d\'ouvrage' },
    { title: 'BET', initial: 'B', description: 'Bureau d\'études' },
    { title: 'Chef de chantier', initial: 'C', description: 'Supervision terrain' },
    { title: 'Équipes', initial: 'E', description: 'Personnel terrain' }
  ];

  constructor(
    private router: Router,
    private planService: PlanAbonnementService
  ) {}

  ngOnInit(): void {
    console.log('🚀 PortailComponent initialisé');
    this.loadPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge les plans d'abonnement PROMOTEUR
   */
  loadPlans(): void {
    this.isLoadingPlans = true;
    
    this.planService.getPlansByName('PROMOTEUR')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          console.log('✅ Plans PROMOTEUR chargés:', plans);
          
          // Trouver les plans PREMIUM et BASIC
          this.premiumPlan = plans.find(p => p.label === 'PREMIUM') || null;
          this.basicPlan = plans.find(p => p.label === 'BASIC') || null;
          
          this.isLoadingPlans = false;
          
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des plans:', error);
          this.isLoadingPlans = false;
        }
      });
  }

  /**
   * Tronque la description à 2 lignes maximum
   * Prend les 2 premières lignes de la description
   */
  truncateDescription(description: string): string {
    if (!description) return '';
    
    // Diviser la description par les sauts de ligne
    const lines = description.split('\n').filter(line => line.trim() !== '');
    
    // Prendre seulement les 2 premières lignes
    const truncated = lines.slice(0, 2).join('\n');
    
    return truncated;
  }

  /**
   * Formatte le montant en FCFA
   */
  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }

  /**
   * Méthode pour naviguer vers la page login
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  scrollToSection(sectionId: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Fermer le menu mobile après le clic
      this.mobileMenuOpen = false;
    }
  }
}