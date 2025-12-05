import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { PlanAbonnementService, SubscriptionPlan } from '../../../../services/plan-abonnement.service';
import { Subject, takeUntil, interval } from 'rxjs';

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
    ]),
    trigger('planFade', [
      transition('* => *', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class PortailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isScrolled = false;
  mobileMenuOpen = false;
  isLoadingPlans = true;

  // Plans d'abonnement actuels affichés
  currentPremiumPlan: SubscriptionPlan | null = null;
  currentBasicPlan: SubscriptionPlan | null = null;

  // Tous les plans groupés par name
  allPlansByName: { [key: string]: { premium: SubscriptionPlan | null, basic: SubscriptionPlan | null } } = {};
  planNames: string[] = [];
  currentNameIndex: number = 0;
  animationKey: number = 0; // Pour forcer la ré-animation

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
   * Charge tous les plans d'abonnement et lance l'animation
   */
  loadPlans(): void {
    this.isLoadingPlans = true;
    
    this.planService.getAllPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          console.log('✅ Tous les plans chargés:', plans);
          
          // Grouper les plans par name
          this.groupPlansByName(plans);
          
          // Obtenir la liste des names disponibles
          this.planNames = Object.keys(this.allPlansByName);
          console.log('📋 Names disponibles:', this.planNames);
          
          // Afficher le premier groupe de plans
          if (this.planNames.length > 0) {
            this.showPlansForName(0);
            
            // Lancer l'animation de rotation toutes les 2 secondes
            this.startPlanRotation();
          }
          
          this.isLoadingPlans = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des plans:', error);
          this.isLoadingPlans = false;
        }
      });
  }

  /**
   * Groupe les plans par name (PROMOTEUR, MOA, BET, etc.)
   */
  private groupPlansByName(plans: SubscriptionPlan[]): void {
    this.allPlansByName = {};
    
    plans.forEach(plan => {
      if (!this.allPlansByName[plan.name]) {
        this.allPlansByName[plan.name] = {
          premium: null,
          basic: null
        };
      }
      
      if (plan.label === 'PREMIUM') {
        this.allPlansByName[plan.name].premium = plan;
      } else if (plan.label === 'BASIC') {
        this.allPlansByName[plan.name].basic = plan;
      }
    });
    
    console.log('📊 Plans groupés par name:', this.allPlansByName);
  }

  /**
   * Affiche les plans pour un name donné
   */
  private showPlansForName(index: number): void {
    const name = this.planNames[index];
    if (!name) return;
    
    const planGroup = this.allPlansByName[name];
    this.currentPremiumPlan = planGroup.premium;
    this.currentBasicPlan = planGroup.basic;
    this.currentNameIndex = index;
    this.animationKey++; // Incrémenter pour forcer la ré-animation
    
    console.log(`🔄 Affichage des plans pour: ${name}`, {
      premium: this.currentPremiumPlan?.label,
      basic: this.currentBasicPlan?.label
    });
  }

  /**
   * Lance la rotation automatique des plans toutes les 2 secondes
   */
  private startPlanRotation(): void {
    interval(2000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const nextIndex = (this.currentNameIndex + 1) % this.planNames.length;
        this.showPlansForName(nextIndex);
      });
  }

  /**
   * Retourne le nom actuel affiché
   */
  getCurrentName(): string {
    return this.planNames[this.currentNameIndex] || '';
  }

  /**
   * Tronque la description à 2 lignes maximum
   */
  truncateDescription(description: string): string {
    if (!description) return '';
    
    const lines = description.split('\n').filter(line => line.trim() !== '');
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

      this.mobileMenuOpen = false;
    }
  }
}