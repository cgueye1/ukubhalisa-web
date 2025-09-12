import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MaterialsService, MaterialsResponse, Order, CreateOrder } from '../../../../../services/materials.service';
import { CommonModule } from '@angular/common';
import { UnitParameterService } from '../../../../core/services/unite-parametre.service';
import { UnitParameter, PaginatedResponse } from '../../../../models/unit-parameter';
import { PropertyTypeService } from '../../../../core/services/property-type.service';
import { PropertyType } from '../../../../models/property-type';
import { StatistiqueComponent } from '../../statistique/statistique.component';
import { DashboardService, CriticalMaterial } from '../../../../../services/dashboard.service';
import { ActivatedRoute } from '@angular/router';

// Interfaces existantes (non modifiées)
interface StockAlerte {
  id: number;
  nom: string;
  quantiteActuelle: number;
  seuil: number;
  unite: string;
  status: 'Normal' | 'Faible' | 'Critique atteint';
  pourcentage: number;
  materialId: number;
}
interface Supplier {
  id: number;
  prenom: string;
  nom: string;
  telephone: string;
}


interface Unit {
  id: number;
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: string;
}

interface Property {
  id: number;
  name: string;
  number: string;
  address: string;
}

interface Material {
  id: number;
  label: string;
  quantity: number;
  criticalThreshold: number;
  createdAt: number[];
  unit: Unit;
  property: Property;
}

interface CreateMaterial {
  label: string;
  quantity: number;
  criticalThreshold: number;
  unitId: number;
  propertyId: number;
}

interface StockAlert {
  id: number;
  message: string;
  createdAt: Date;
  materialId: number;
}

interface Movement {
  id: number;
  type: 'ENTRY' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference: string;
  comment?: string;
  date: string;
  time: string;
  description: string;
  location: string;
  materialId: number;
}

interface Delivery {
orderDate: number[];
  id: number;
  number: string;
  date: string; // Attendu au format dd-MM-yyyy
  command: string;
  supplier: string;
  status: 'Complète' | 'Partielle' | 'Annulée';
  proof: string;
}

interface StockMovement {
  id: number;
  material: Material;
  quantity: number;
  type: 'ENTRY' | 'EXIT';
  movementDate: number[];
  comment: string;
}

interface StockMovementsResponse {
  content: StockMovement[];
  pageable: {
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
  };
  totalElements: number;
  totalPages: number;
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

interface CreateStockMovement {
  materialId: number;
  quantity: number;
  type: 'ENTRY' | 'EXIT';
  comment: string;
}

// Nouvelle interface pour la réponse de getLivraison
interface DeliveriesResponse {
  content: Delivery[];
  pageable: {
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
  };
  totalElements: number;
  totalPages: number;
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

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StatistiqueComponent],
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css']
})
export class StockComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  stockAlertes: StockAlerte[] = [];
  orders: Order[] = [];
  paginatedOrders: Order[] = [];
  totalOrderElements: number = 0;
  totalOrderPages: number = 0;
  orderCurrentPage: number = 0;
  showOrderModal: boolean = false;
  movements: StockMovement[] = [];
  paginatedMovements: StockMovement[] = [];
  totalMovementElements: number = 0;
  totalMovementPages: number = 0;
  movementCurrentPage: number = 0;
  criticalMaterials: CriticalMaterial[] = [];
  criticalMaterialsLoading: boolean = false;
  criticalMaterialsError: string | null = null;
  totalCriticalMaterials: number = 0;
  criticalMaterialsPage: number = 0;
  criticalMaterialsPageSize: number = 5;
  units: UnitParameter[] = [];
  properties: PropertyType[] = [];
  propertyId!: number;
  pageSize = 10;
  activeTab: string = 'inventaires';
  loading: boolean = false;
  showNewMaterialModal: boolean = false;
  showMovementModal: boolean = false;
  openDropdownIndex: number | null = null;
  materials: Material[] = [];
  filteredMaterials: Material[] = [];
  paginatedMaterials: Material[] = [];
  stockAlerts: StockAlert[] = [];
  recentMovements: Movement[] = [];
  deliveries: Delivery[] = [];
  paginatedDeliveries: Delivery[] = []; // Nouvelle propriété pour la pagination
  totalDeliveryElements: number = 0; // Total des livraisons
  totalDeliveryPages: number = 0; // Total des pages de livraisons
  deliveryCurrentPage: number = 0; // Page courante des livraisons
  selectedMaterial: Material | null = null;
  searchTerm: string = '';
  selectedCategory: string = '';
  selectedStockStatus: string = '';
  currentPage: number = 0;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;
  materialForm: FormGroup;
  movementForm: FormGroup;
  orderForm: FormGroup;
  currentSortField: string = 'label';
  currentSortDirection: 'asc' | 'desc' = 'asc';
  data: MaterialsResponse | null = null;
// Ajoutez ces propriétés pour la pagination et filtres des livraisons
searchDeliveryTerm: string = '';
statusDeliveryFilter: string = '';
filteredDeliveries: any[] = [];
materialCurrentPage: number = 0;
searchMaterialTerm: string = '';
statusMaterialFilter: string = '';

materialPageSize: number = 5;
totalMaterialElements: number = 0;
totalMaterialPages: number = 0;
  constructor(
    private fb: FormBuilder,
    private materialsService: MaterialsService,
    private unitParameterService: UnitParameterService,
    private propertyService: PropertyTypeService,
    private dashboardService: DashboardService,
    private route: ActivatedRoute
  ) {
    this.materialForm = this.fb.group({
      label: ['', [Validators.required, Validators.minLength(2)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      criticalThreshold: [0, [Validators.required, Validators.min(0)]],
      unitId: [1, [Validators.required, Validators.min(1)]],
      propertyId: [this.propertyId, [Validators.required, Validators.min(1)]]
    });
    this.orderForm = this.fb.group({
      propertyId: [1, Validators.required],
      materials: this.fb.array([
        this.fb.group({
          materialId: ['', Validators.required],
          quantity: [1, [Validators.required, Validators.min(1)]]
        })
      ])
    });
    this.movementForm = this.fb.group({
      type: ['ENTRY', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      reference: ['', Validators.required],
      comment: ['']
    });
  }

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.propertyId = +idFromUrl;
      this.materialForm.patchValue({ propertyId: this.propertyId });
      this.orderForm.patchValue({ propertyId: this.propertyId });
      this.loadStock();
      this.loadStockMovements();
      this.loadOrders();
      this.loadDeliveries(); // Remplace loadMockDeliveries
      this.loadRecentMovements();
      this.loadUnits();
      this.loadProperties();
      this.loadCriticalMaterials();
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
    }
  }



  public formatDeliveryDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    
    const [year, month, day, hours = 0, minutes = 0] = dateArray;
    
    // Formatage en français dd/MM/yyyy HH:mm
    const dayStr = day.toString().padStart(2, '0');
    const monthStr = month.toString().padStart(2, '0');
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${dayStr}/${monthStr}/${year} ${hoursStr}:${minutesStr}`;
  }


// Formater le nom complet du fournisseur
formatSupplierName(supplier: any): string {
  if (!supplier) return 'N/A';
  
  const prenom = supplier.prenom || '';
  const nom = supplier.nom || '';
  
  return `${prenom} ${nom}`.trim() || 'N/A';
}

// Obtenir le texte du statut de livraison
getDeliveryStatusText(status: string): string {
  const texts = {
    'IN_DELIVERY': 'En cours',
    'DELIVERY': 'Livré', 
    'DELIVERED': 'Livré',
    'CANCELLED': 'Annulé',
    'PENDING': 'En attente'
  };
  return texts[status as keyof typeof texts] || status;
}

// Mettre à jour les méthode  existante

private normalizeMaterialStatus(displayStatus: string): string[] {
  const statusMapping: { [key: string]: string[] } = {
    'stock normal': ['NORMAL'],
    'stock faible': ['LOW'],
    'rupture de stock': ['CRITICAL']
  };
  
  return statusMapping[displayStatus.toLowerCase()] || [];
}



  getDeliveryPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let startPage = Math.max(0, this.deliveryCurrentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalDeliveryPages - 1, startPage + maxPages - 1);
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(0, endPage - maxPages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  loadStock(): void {
    this.loading = true;
    if (!this.propertyId || this.propertyId <= 0) {
      console.error('ID de propriété invalide:', this.propertyId);
      this.showErrorMessage('ID de propriété invalide');
      this.loading = false;
      return;
    }
    
    console.log(`Chargement du stock pour la propriété ${this.propertyId}`);
    this.materialsService.getStock(this.propertyId, 0, 100) // Charger plus d'éléments pour le filtrage côté client
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: MaterialsResponse) => {
          console.log('Réponse reçue:', response);
          this.data = response;
          this.materials = response.content || [];
          this.totalElements = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
          
          // Initialiser les matériaux filtrés
          this.filteredMaterials = [...this.materials];
          this.updatePaginatedMaterials();
          this.generateStockAlerts();
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur complète lors du chargement du stock:', error);
          this.loading = false;
          if (error.status === 403) {
            this.showErrorMessage('Accès refusé - Vérifiez vos permissions pour cette propriété');
          } else if (error.status === 401) {
            this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
          } else if (error.status === 404) {
            this.showErrorMessage('Propriété non trouvée');
          } else {
            this.showErrorMessage(error.message || 'Erreur lors du chargement du stock');
          }
        }
      });
  }

  loadOrders(): void {
    this.loading = true;
    this.materialsService.getCommand(this.propertyId, this.orderCurrentPage, this.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.orders = response.content || [];
          this.totalOrderElements = response.totalElements || 0;
          this.totalOrderPages = response.totalPages || 0;
          this.paginatedOrders = this.orders;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des commandes:', error);
          this.loading = false;
          if (error.status === 403) {
            this.showErrorMessage('Accès refusé - Vérifiez vos permissions');
          } else if (error.status === 401) {
            this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
          } else if (error.status === 404) {
            this.showErrorMessage('Aucune commande trouvée');
          } else {
            this.showErrorMessage('Erreur lors du chargement des commandes');
          }
        }
      });
  }

  loadRecentMovements(): void {
    this.loading = true;
    if (!this.propertyId || this.propertyId <= 0) {
      console.error('ID de propriété invalide:', this.propertyId);
      this.showErrorMessage('ID de propriété invalide');
      this.loading = false;
      return;
    }
    console.log(`Chargement des mouvements récents pour la propriété ${this.propertyId}`);
    this.materialsService.getStockMove(this.propertyId, 0, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: StockMovementsResponse) => {
          console.log('Mouvements récents reçus:', response);
          if (response.content && response.content.length > 0) {
            this.recentMovements = response.content.map(movement => ({
              id: movement.id,
              type: movement.type === 'ENTRY' ? 'ENTRY' : 'OUT' as 'ENTRY' | 'OUT' | 'ADJUSTMENT',
              quantity: movement.quantity,
              reference: `MVT-${movement.id.toString().padStart(4, '0')}`,
              comment: movement.comment,
              date: this.formatMovementDate(movement.movementDate),
              time: this.getTimeFromDateArray(movement.movementDate),
              description: `${movement.quantity} ${movement.material.unit.code} de ${movement.material.label}`,
              location: movement.material.property.name,
              materialId: movement.material.id
            }));
          } else {
            this.recentMovements = [];
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des mouvements récents:', error);
          this.loading = false;
          this.recentMovements = [];
          if (error.status === 403) {
            this.showErrorMessage('Accès refusé - Vérifiez vos permissions');
          } else if (error.status === 401) {
            this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
          } else if (error.status === 404) {
            console.log('Aucun mouvement trouvé pour cette propriété');
          } else {
            this.showErrorMessage('Erreur lors du chargement des mouvements récents');
          }
        }
      });
  }

  loadUnits(): void {
    this.unitParameterService.units$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PaginatedResponse<UnitParameter> | null) => {
          if (res) {
            this.units = res.content;
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des unités', err);
        }
      });
    this.unitParameterService.getUnits({ page: 0, size: this.pageSize });
  }

  loadProperties(): void {
    this.propertyService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PropertyType[]) => {
          this.properties = response;
        },
        error: (err) => {
          console.error('Erreur lors de la récupération des propriétés:', err);
        }
      });
  }

  loadCriticalMaterials(): void {
    this.criticalMaterialsLoading = true;
    this.criticalMaterialsError = null;
    if (!this.dashboardService) {
      console.error('DashboardService n\'est pas injecté');
      this.criticalMaterialsLoading = false;
      this.criticalMaterialsError = 'Service indisponible';
      return;
    }
    this.dashboardService.materiauxCritique(this.criticalMaterialsPage, this.criticalMaterialsPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.criticalMaterials = (response.content || []).map((item: any) => ({
            ...item,
            createdAt: item.createdAt || [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()]
          }));
          this.totalCriticalMaterials = response.totalElements || 0;
          this.criticalMaterialsLoading = false;
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des matériaux critiques:', error);
          this.criticalMaterialsLoading = false;
          this.criticalMaterialsError = 'Erreur lors du chargement des matériaux critiques';
        }
      });
  }

  // Autres méthodes existantes (non modifiées)
  getStockPercentage(material: any): number {
    if (!material.criticalThreshold || material.criticalThreshold === 0) {
      return material.quantity > 0 ? 100 : 0;
    }
    const percentage = (material.quantity / (material.criticalThreshold * 2)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  changeCriticalMaterialsPage(page: number): void {
    this.criticalMaterialsPage = page;
    this.loadCriticalMaterials();
  }

  openOrderModal(): void {
    this.showOrderModal = true;
  }

  closeOrderModal(): void {
    this.showOrderModal = false;
    this.orderForm.reset({
      propertyId: this.propertyId,
      materials: [{ materialId: '', quantity: 1 }]
    });
  }

  calculateOrderTotal(order: Order): number {
    if (!order.items || order.items.length === 0) {
      return 0;
    }
    return order.items.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  }

  addMaterialToOrder(): void {
    const materials = this.orderForm.get('materials') as FormArray;
    materials.push(this.fb.group({
      materialId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    }));
  }

  removeMaterialFromOrder(index: number): void {
    const materials = this.orderForm.get('materials') as FormArray;
    if (materials.length > 1) {
      materials.removeAt(index);
    }
  }

  onSubmitOrder(): void {
    if (this.orderForm.valid && !this.loading) {
      this.loading = true;
      const orderData: CreateOrder = {
        propertyId: this.orderForm.value.propertyId,
        materials: this.orderForm.value.materials
      };
      this.materialsService.createCommand(orderData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (createdOrder) => {
            this.loading = false;
            this.closeOrderModal();
            this.loadOrders();
            this.showSuccessMessage('Commande créée avec succès !');
          },
          error: (error) => {
            this.loading = false;
            console.error('Erreur lors de la création de la commande:', error);
            this.showErrorMessage('Erreur lors de la création de la commande');
          }
        });
    }
  }

  generateStockAlerts(): void {
    this.stockAlerts = [];
    this.materials.forEach(material => {
      const status = this.getMaterialStatus(material);
      if (status === 'CRITICAL' || status === 'LOW') {
        const alert: StockAlert = {
          id: material.id,
          message: `${material.label} - ${material.quantity} ${material.unit.code} restant${material.quantity > 1 ? 's' : ''}`,
          createdAt: new Date(),
          materialId: material.id
        };
        this.stockAlerts.push(alert);
      }
    });
  }

  getFormattedDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
  }

  // Autres méthodes utilitaires et d'interaction (non modifiées)
  getMaterialName(material: Material): string {
    return material.label || 'N/A';
  }

  getMaterialStock(material: Material): number {
    return material.quantity || 0;
  }

  getMaterialUnit(material: Material): string {
    return material.unit?.code || material.unit?.label || 'N/A';
  }

  getMaterialThreshold(material: Material): number {
    return material.criticalThreshold || 0;
  }

  getMaterialStatus(material: Material): string {
    const stock = this.getMaterialStock(material);
    const threshold = this.getMaterialThreshold(material);
    if (stock === 0) {
      return 'CRITICAL';
    } else if (stock <= threshold) {
      return 'CRITICAL';
    } else if (stock <= threshold * 1.5) {
      return 'LOW';
    }
    return 'NORMAL';
  }

  getStatusClass(status: string): string {
    const classes = {
      'NORMAL': 'bg-green-100 text-green-800',
      'LOW': 'bg-yellow-100 text-yellow-800',
      'CRITICAL': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const texts = {
      'NORMAL': 'Stock normal',
      'LOW': 'Stock faible',
      'CRITICAL': 'Rupture de stock'
    };
    return texts[status as keyof typeof texts] || 'Inconnu';
  }

  getMovementTypeClass(type: string): string {
    const classes = {
      'ENTRY': 'text-green-600',
      'OUT': 'text-red-600',
      'ADJUSTMENT': 'text-blue-600'
    };
    return classes[type as keyof typeof classes] || 'text-gray-600';
  }

  getMovementTypeText(type: string): string {
    const texts = {
      'ENTRY': 'Entrée',
      'OUT': 'Sortie',
      'ADJUSTMENT': 'Ajustement'
    };
    return texts[type as keyof typeof texts] || type;
  }

  getDeliveryStatusClass(status: string): string {
    const classes = {
      'Complète': 'bg-green-100 text-green-800',
      'Partielle': 'bg-yellow-100 text-yellow-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  checkAuthStatus(): void {
    console.log('=== DEBUG AUTHENTIFICATION ===');
    console.log('localStorage auth_token:', localStorage.getItem('auth_token'));
    console.log('localStorage token:', localStorage.getItem('token'));
    console.log('sessionStorage auth_token:', sessionStorage.getItem('auth_token'));
    console.log('sessionStorage token:', sessionStorage.getItem('token'));
    console.log('Property ID:', this.propertyId);
    console.log('Current page:', this.currentPage);
    console.log('Page size:', this.pageSize);
    console.log('================================');
  }

  testApiConnection(): void {
    console.log('Test de connexion à l\'API...');
    this.materialsService.checkTokenValidity()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Token valide:', response);
          this.showSuccessMessage('Connexion API réussie');
        },
        error: (error) => {
          console.error('Erreur de connexion API:', error);
          this.showErrorMessage('Erreur de connexion à l\'API');
        }
      });
  }
// Méthode pour filtrer les matériaux
filterMaterials(): void {
  this.filteredMaterials = this.materials.filter(material => {
    const matchesSearch = !this.searchMaterialTerm || 
      this.getMaterialName(material).toLowerCase().includes(this.searchMaterialTerm.toLowerCase()) ||
      this.getMaterialUnit(material).toLowerCase().includes(this.searchMaterialTerm.toLowerCase());
    
    let matchesStatus = true;
    if (this.statusMaterialFilter) {
      const technicalStatuses = this.normalizeMaterialStatus(this.statusMaterialFilter);
      const materialStatus = this.getMaterialStatus(material);
      matchesStatus = technicalStatuses.length > 0 ? 
        technicalStatuses.includes(materialStatus) : 
        false;
    }
    
    return matchesSearch && matchesStatus;
  });
  
  // Réinitialiser la pagination après filtrage
  this.materialCurrentPage = 0;
  this.updatePaginatedMaterials();
}

updatePaginatedMaterials(): void {
  const startIndex = this.materialCurrentPage * this.materialPageSize;
  const endIndex = startIndex + this.materialPageSize;
  this.paginatedMaterials = this.filteredMaterials.slice(startIndex, endIndex);
  this.totalMaterialElements = this.filteredMaterials.length;
  this.totalMaterialPages = Math.ceil(this.totalMaterialElements / this.materialPageSize);
}

// Méthode appelée lors du changement de recherche
onMaterialSearchChange(): void {
  this.filterMaterials();
}

// Méthode appelée lors du changement de filtre de statut
onMaterialStatusFilterChange(): void {
  this.filterMaterials();
}
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadStock();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadStock();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadStock();
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleDropdown(index: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }

  closeDropdown(): void {
    this.openDropdownIndex = null;
  }

  openNewMaterialModal(): void {
    this.showNewMaterialModal = true;
    this.resetMaterialForm();
  }

  closeNewMaterialModal(): void {
    this.showNewMaterialModal = false;
    this.resetMaterialForm();
  }
  resetMaterialFilters(): void {
    this.searchMaterialTerm = '';
    this.statusMaterialFilter = '';
    this.filteredMaterials = [...this.materials];
    this.materialCurrentPage = 0;
    this.updatePaginatedMaterials();
  }
// Méthodes de navigation pour la pagination des matériaux
previousMaterialPage(): void {
  if (this.materialCurrentPage > 0) {
    this.materialCurrentPage--;
    this.updatePaginatedMaterials();
  }
}
  openMovementModal(material: Material): void {
    this.selectedMaterial = material;
    this.showMovementModal = true;
    this.resetMovementForm();
    const suggestedType = material.quantity <= material.criticalThreshold ? 'ENTRY' : 'OUT';
    this.movementForm.patchValue({
      type: suggestedType,
      quantity: 1
    });
  }

  loadStockMovements(): void {
    this.loading = true;
    if (!this.propertyId || this.propertyId <= 0) {
      console.error('ID de propriété invalide:', this.propertyId);
      this.showErrorMessage('ID de propriété invalide');
      this.loading = false;
      return;
    }
    console.log(`Chargement des mouvements pour la propriété ${this.propertyId}`);
    this.materialsService.getStockMove(this.propertyId, this.movementCurrentPage, this.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: StockMovementsResponse) => {
          console.log('Mouvements reçus:', response);
          this.movements = response.content || [];
          this.totalMovementElements = response.totalElements || 0;
          this.totalMovementPages = response.totalPages || 0;
          this.paginatedMovements = this.movements;
          this.loading = false;
          this.updateRecentMovements();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des mouvements:', error);
          this.loading = false;
          if (error.status === 403) {
            this.showErrorMessage('Accès refusé - Vérifiez vos permissions');
          } else if (error.status === 401) {
            this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
          } else {
            this.showErrorMessage('Erreur lors du chargement des mouvements');
          }
        }
      });
  }

  updateRecentMovements(): void {
    const recent = this.movements.slice(0, 3).map(movement => ({
      id: movement.id,
      type: movement.type === 'ENTRY' ? 'ENTRY' : 'OUT' as 'ENTRY' | 'OUT' | 'ADJUSTMENT',
      quantity: movement.quantity,
      reference: `MVT-${movement.id}`,
      date: this.formatMovementDate(movement.movementDate),
      time: this.getTimeFromDateArray(movement.movementDate),
      description: `${movement.quantity} ${ movement.material.unit.code} de ${movement.material.label}`,
      location: movement.material.property.name,
      materialId: movement.material.id
    }));
    this.recentMovements = [...recent, ...this.recentMovements.slice(0, 3 - recent.length)] as Movement[];
  }

  formatMovementDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day] = dateArray;
    const movementDate = new Date(year, month - 1, day);
    const today = new Date();
    if (movementDate.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (movementDate.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
  }

  getTimeFromDateArray(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 5) return '00:00';
    const [_, __, ___, hours, minutes] = dateArray;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  onCreateMovement(): void {
    if (this.movementForm.valid && this.selectedMaterial && !this.loading) {
      this.loading = true;
      const newMovement: CreateStockMovement = {
        materialId: this.selectedMaterial.id,
        quantity: this.movementForm.value.quantity,
        type: this.movementForm.value.type,
        comment: this.movementForm.value.comment || ''
      };
      this.materialsService.createStockMove(newMovement)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (createdMovement) => {
            console.log('Mouvement créé:', createdMovement);
            this.loading = false;
            this.closeMovementModal();
            this.addToRecentMovements(createdMovement, this.selectedMaterial!);
            this.loadStock();
            this.loadStockMovements();
            this.showSuccessMessage('Mouvement enregistré avec succès !');
          },
          error: (error) => {
            this.loading = false;
            console.error('Erreur lors de la création du mouvement:', error);
            if (error.status === 403) {
              this.showErrorMessage('Accès refusé - Vous n\'avez pas les permissions nécessaires');
            } else if (error.status === 401) {
              this.showErrorMessage('Non authentifié - Veuillez vous reconnecter');
            } else {
              this.showErrorMessage('Erreur lors de l\'enregistrement du mouvement');
            }
          }
        });
    }
  }

  private addToRecentMovements(createdMovement: any, material: Material): void {
    const now = new Date();
    const newRecentMovement: Movement = {
      id: createdMovement.id || Date.now(),
      type: createdMovement.type,
      quantity: createdMovement.quantity,
      reference: `MVT-${(createdMovement.id || Date.now()).toString().padStart(4, '0')}`,
      comment: createdMovement.comment,
      date: 'À l\'instant',
      time: now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      description: `${createdMovement.quantity} ${material.unit.code} de ${material.label}`,
      location: material.property.name,
      materialId: material.id
    };
    this.recentMovements.unshift(newRecentMovement);
    this.recentMovements = this.recentMovements.slice(0, 5);
  }

  closeMovementModal(): void {
    this.showMovementModal = false;
    this.selectedMaterial = null;
    this.resetMovementForm();
  }

  resetMaterialForm(): void {
    this.materialForm.reset({
      label: '',
      quantity: 0,
      criticalThreshold: 0,
      unitId: 1,
      propertyId: this.propertyId
    });
  }

  resetMovementForm(): void {
    this.movementForm.reset({
      type: 'ENTRY',
      quantity: 0,
      reference: '',
      comment: ''
    });
  }

  isFormValid(): boolean {
    return this.materialForm.valid;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.materialForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.materialForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'Ce champ est requis';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      }
    }
    return '';
  }

  onAction(action: string, material: Material, event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    switch (action) {
      case 'modifier':
        this.editMaterial(material);
        break;
      case 'commander':
        this.orderMaterial(material);
        break;
      case 'historique':
        this.showMaterialHistory(material);
        break;
      case 'supprimer':
        this.deleteMaterial(material);
        break;
    }
  }

  onSaveNewStock(): void {
    if (this.materialForm.valid && !this.loading) {
      this.loading = true;
      const newMaterial: CreateMaterial = {
        label: this.materialForm.value.label,
        quantity: this.materialForm.value.quantity,
        criticalThreshold: this.materialForm.value.criticalThreshold,
        unitId: this.materialForm.value.unitId,
        propertyId: this.propertyId
      };
      this.materialsService.createStock(newMaterial)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading = false;
            this.closeNewMaterialModal();
            this.loadStock();
            this.showSuccessMessage('Matériau ajouté avec succès !');
          },
          error: (error) => {
            this.loading = false;
            console.error('Erreur lors de l\'ajout:', error);
            if (error.status === 403) {
              this.showErrorMessage('Accès refusé - Vous n\'avez pas les permissions nécessaires');
            } else if (error.status === 401) {
              this.showErrorMessage('Non authentifié - Veuillez vous reconnecter');
            } else {
              this.showErrorMessage('Erreur lors de l\'ajout du matériau');
            }
          }
        });
    }
  }

  editMaterial(material: Material): void {
    console.log('Modifier', material);
  }

  orderMaterial(material: Material): void {
    console.log('Commander', material);
  }

  showMaterialHistory(material: Material): void {
    console.log('Historique', material);
  }

  deleteMaterial(material: Material): void {
    if (confirm(`Supprimer "${material.label}" ?`)) {
      console.log('Supprimer', material);
    }
  }
  nextMaterialPage(): void {
    if (this.materialCurrentPage < this.totalMaterialPages - 1) {
      this.materialCurrentPage++;
      this.updatePaginatedMaterials();
    }
  }
  getMaterialPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 3; // Moins de pages visibles car plus petite pagination
    let startPage = Math.max(0, this.materialCurrentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalMaterialPages - 1, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(0, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
  goToMaterialPage(page: number): void {
    if (page >= 0 && page < this.totalMaterialPages && page !== this.materialCurrentPage) {
      this.materialCurrentPage = page;
      this.updatePaginatedMaterials();
    }
  }
  showSuccessMessage(message: string): void {
    console.log('✅', message);
  }

  showErrorMessage(message: string): void {
    console.error('❌', message);
  }

  get displayCurrentPage(): number {
    return this.currentPage + 1;
  }

  previousOrderPage(): void {
    if (this.orderCurrentPage > 0) {
      this.orderCurrentPage--;
      this.loadOrders();
    }
  }

  nextOrderPage(): void {
    if (this.orderCurrentPage < this.totalOrderPages - 1) {
      this.orderCurrentPage++;
      this.loadOrders();
    }
  }

  goToOrderPage(page: number): void {
    if (page >= 0 && page < this.totalOrderPages && page !== this.orderCurrentPage) {
      this.orderCurrentPage = page;
      this.loadOrders();
    }
  }

  getOrderPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let startPage = Math.max(0, this.orderCurrentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalOrderPages - 1, startPage + maxPages - 1);
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(0, endPage - maxPages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getOrderStatusClass(status: string): string {
    const classes = {
      'EN_ATTENTE': 'bg-yellow-100 text-yellow-800',
      'CONFIRMEE': 'bg-blue-100 text-blue-800',
      'EN_COURS': 'bg-purple-100 text-purple-800',
      'LIVREE': 'bg-green-100 text-green-800',
      'ANNULEE': 'bg-red-100 text-red-800',
      'PARTIELLEMENT_LIVREE': 'bg-orange-100 text-orange-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getOrderStatusText(status: string): string {
    const texts = {
      'EN_ATTENTE': 'En attente',
      'CONFIRMEE': 'Confirmée',
      'EN_COURS': 'En cours',
      'LIVREE': 'Livrée',
      'ANNULEE': 'Annulée',
      'PARTIELLEMENT_LIVREE': 'Partiellement livrée'
    };
    return texts[status as keyof typeof texts] || status;
  }

  onOrderAction(action: string, order: Order, event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    switch (action) {
      case 'voir':
        this.viewOrderDetails(order);
        break;
      case 'modifier':
        this.editOrder(order);
        break;
      case 'dupliquer':
        this.duplicateOrder(order);
        break;
      case 'annuler':
        this.cancelOrder(order);
        break;
    }
  }

  viewOrderDetails(order: Order): void {
    console.log('Voir détails de la commande:', order);
  }

  editOrder(order: Order): void {
    if (order.status === 'LIVREE' || order.status === 'ANNULEE') {
      this.showErrorMessage('Impossible de modifier une commande livrée ou annulée');
      return;
    }
    console.log('Modifier la commande:', order);
  }

  duplicateOrder(order: Order): void {
    console.log('Dupliquer la commande:', order);
    if (order.materials && order.materials.length > 0) {
      const materialsArray = this.orderForm.get('materials') as FormArray;
      while (materialsArray.length !== 0) {
        materialsArray.removeAt(0);
      }
      order.materials.forEach((material: { id: any; quantity: any; }) => {
        materialsArray.push(this.fb.group({
          materialId: [material.id, Validators.required],
          quantity: [material.quantity || 1, [Validators.required, Validators.min(1)]]
        }));
      });
    }
    this.orderForm.patchValue({
      propertyId: order.supplier?.id || this.propertyId
    });
    this.openOrderModal();
  }

  cancelOrder(order: Order): void {
    if (order.status === 'LIVREE' || order.status === 'ANNULEE') {
      this.showErrorMessage('Impossible d\'annuler une commande déjà livrée ou annulée');
      return;
    }
    const confirmMessage = `Êtes-vous sûr de vouloir annuler la commande CMD-${order.id.toString().padStart(4, '0')} ?`;
  }

  get orderMaterials(): FormArray {
    return this.orderForm.get('materials') as FormArray;
  }

  getCriticalMaterialStatus(material: CriticalMaterial): string {
    const stock = material.quantity || 0;
    const threshold = material.criticalThreshold || 0;
    if (stock === 0) {
      return 'CRITICAL';
    } else if (stock <= threshold) {
      return 'CRITICAL';
    } else if (stock <= threshold * 1.5) {
      return 'LOW';
    }
    return 'NORMAL';
  }

  getCriticalMaterialStockPercentage(material: CriticalMaterial): number {
    if (!material.criticalThreshold || material.criticalThreshold === 0) {
      return material.quantity > 0 ? 100 : 0;
    }
    const percentage = (material.quantity / (material.criticalThreshold * 2)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  getCriticalMaterialName(material: CriticalMaterial): string {
    return material.label || 'N/A';
  }

  getCriticalMaterialUnit(material: CriticalMaterial): string {
    return material.unit?.code || material.unit?.label || 'N/A';
  }

  Math = Math;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  filterDeliveries(): void {
    this.filteredDeliveries = this.deliveries.filter(delivery => {
      const matchesSearch = !this.searchDeliveryTerm || 
        delivery.number.toLowerCase().includes(this.searchDeliveryTerm.toLowerCase()) ||
        delivery.supplier.toLowerCase().includes(this.searchDeliveryTerm.toLowerCase()) ||
        delivery.command.toLowerCase().includes(this.searchDeliveryTerm.toLowerCase());
      
      let matchesStatus = true;
      if (this.statusDeliveryFilter) {
        const technicalStatuses = this.normalizeDeliveryStatus(this.statusDeliveryFilter);
        matchesStatus = technicalStatuses.length > 0 ? 
          technicalStatuses.includes(delivery.status) : 
          false;
      }
      
      return matchesSearch && matchesStatus;
    });
    
    // Réinitialiser la pagination après filtrage
    this.deliveryCurrentPage = 0;
    this.updatePaginatedDeliveries();
  }

// Méthode pour mettre à jour la pagination des livraisons filtrées
updatePaginatedDeliveries(): void {
  const startIndex = this.deliveryCurrentPage * this.pageSize;
  const endIndex = startIndex + this.pageSize;
  this.paginatedDeliveries = this.filteredDeliveries.slice(startIndex, endIndex);
  this.totalDeliveryElements = this.filteredDeliveries.length;
  this.totalDeliveryPages = Math.ceil(this.totalDeliveryElements / this.pageSize);
}

// Méthode appelée lors du changement de recherche
onDeliverySearchChange(): void {
  this.filterDeliveries();
}

// Méthode appelée lors du changement de filtre de statut
onDeliveryStatusFilterChange(): void {
  this.filterDeliveries();
}

// Méthode pour réinitialiser les filtres des livraisons
resetDeliveryFilters(): void {
  this.searchDeliveryTerm = '';
  this.statusDeliveryFilter = '';
  this.filteredDeliveries = [...this.deliveries];
  this.deliveryCurrentPage = 0;
  this.updatePaginatedDeliveries();
}

// Méthode pour les actions sur les livraisons
onDeliveryAction(action: string, delivery: Delivery, event: Event): void {
  event.stopPropagation();
  this.closeDropdown();
  
  switch (action) {
    case 'voir':
      this.viewDeliveryDetails(delivery);
      break;
    case 'modifier':
      this.editDelivery(delivery);
      break;
    case 'telecharger':
      this.downloadDeliveryProof(delivery);
      break;
    case 'supprimer':
      this.deleteDelivery(delivery);
      break;
  }
}

// Méthodes d'action pour les livraisons
viewDeliveryDetails(delivery: Delivery): void {
  console.log('Voir détails de la livraison:', delivery);
  // Logique pour afficher les détails
}

editDelivery(delivery: Delivery): void {
  if (delivery.status === 'Annulée') {
    this.showErrorMessage('Impossible de modifier une livraison annulée');
    return;
  }
  console.log('Modifier la livraison:', delivery);
  // Logique pour modifier la livraison
}

downloadDeliveryProof(delivery: Delivery): void {
  if (delivery.proof === 'Aucune') {
    this.showErrorMessage('Aucune preuve disponible pour cette livraison');
    return;
  }
  console.log('Télécharger la preuve:', delivery.proof);
  // Logique pour télécharger la preuve
}

deleteDelivery(delivery: Delivery): void {
  const confirmMessage = `Êtes-vous sûr de vouloir supprimer la livraison ${delivery.number} ?`;
  if (confirm(confirmMessage)) {
    console.log('Supprimer la livraison:', delivery);
    // Logique pour supprimer la livraison
  }
}

// Méthode pour obtenir l'icône selon le type de preuve
getDeliveryProofIcon(proof: string): string {
  if (proof === 'Aucune') return '';
  
  const extension = proof.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'jpg':
    case 'jpeg':
    case 'png':
      return '🖼️';
    case 'doc':
    case 'docx':
      return '📝';
    default:
      return '📎';
  }
}

// Modifier la méthode loadDeliveries existante pour intégrer le filtrage
loadDeliveries(): void {
  this.loading = true;
  
  if (!this.propertyId || this.propertyId <= 0) {
    console.error('ID de propriété invalide:', this.propertyId);
    this.showErrorMessage('ID de propriété invalide');
    this.loading = false;
    return;
  }
  
  console.log(`Chargement des livraisons pour la propriété ${this.propertyId}, page ${this.deliveryCurrentPage}`);
  
  this.materialsService.getLivraison(this.propertyId, 0, 10) // Charger toutes les livraisons pour le filtrage côté client
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        console.log('Livraisons reçues:', response);

        if (response && Array.isArray(response.content)) {
          this.deliveries = response.content.map((delivery: any) => ({
            ...delivery,
            date: delivery.orderDate, // Garder les données brutes
            formattedDate: this.formatDeliveryDate(delivery.orderDate), // Ajouter une version formatée
          }));
          
          // Initialiser les livraisons filtrées
          this.filteredDeliveries = [...this.deliveries];
          this.updatePaginatedDeliveries();
        } else {
          console.warn('Structure de réponse inattendue:', response);
          this.deliveries = [];
          this.filteredDeliveries = [];
          this.paginatedDeliveries = [];
        }
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des livraisons:', error);
        this.loading = false;
        this.deliveries = [];
        this.filteredDeliveries = [];
        this.paginatedDeliveries = [];
        
        if (error.status === 403) {
          this.showErrorMessage('Accès refusé - Vérifiez vos permissions');
        } else if (error.status === 401) {
          this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
        } else if (error.status === 404) {
          console.log('Aucune livraison trouvée pour cette propriété');
          this.showErrorMessage('Aucune livraison trouvée');
        } else {
          this.showErrorMessage('Erreur lors du chargement des livraisons');
        }
      }
    });
}

// Modifier les méthodes de pagination existantes
previousDeliveryPage(): void {
  if (this.deliveryCurrentPage > 0) {
    this.deliveryCurrentPage--;
    this.updatePaginatedDeliveries();
  }
}

nextDeliveryPage(): void {
  if (this.deliveryCurrentPage < this.totalDeliveryPages - 1) {
    this.deliveryCurrentPage++;
    this.updatePaginatedDeliveries();
  }
}

goToDeliveryPage(page: number): void {
  if (page >= 0 && page < this.totalDeliveryPages && page !== this.deliveryCurrentPage) {
    this.deliveryCurrentPage = page;
    this.updatePaginatedDeliveries();
  }
}
private normalizeDeliveryStatus(displayStatus: string): string[] {
  const statusMapping: { [key: string]: string[] } = {
    'livré': ['DELIVERY', 'DELIVERED'],
    'en cours': ['IN_DELIVERY'],
    'annulé': ['CANCELLED'],
    'en attente': ['PENDING']
  };
  
  return statusMapping[displayStatus.toLowerCase()] || [];
}
  
}