import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { 
  CreateTaskRequest,
  UpdateTaskRequest,
  ProjectBudgetService, 
  Task, 
  TasksResponse 
} from './../../../services/project-details.service';
import { 
  UtilisateurService, 
  Worker, 
  WorkersResponse 
} from './../../../services/utilisateur.service';

interface User {
  id: number;
  avatarUrl: string;
  name: string;
}

interface TaskTag {
  name: string;
  colorClass: string;
  textColorClass: string;
}

interface TaskDisplay extends Task {
  assignedUsers: User[];
  additionalUsers: number;
  tag: TaskTag;
  comments: number;
  attachments: number;
  dueDate: string;
  isDone?: boolean;
}

interface TaskColumn {
  id: string;
  title: string;
  color: string;
  count: number;
  tasks: TaskDisplay[];
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit, OnDestroy {

  columns: TaskColumn[] = [];
  users: User[] = [];
  workers: Worker[] = [];
  
  // Form data
  newTask: Partial<Task> = {};
  updateTask: Partial<Task> = {};
  
  // UI state
  isEditMode = false;
  selectedTask: TaskDisplay | null = null;
  showTaskForm = false;
  showModal = false;
  loading = false;
  error: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Drag and drop state
  draggedTask: TaskDisplay | null = null;
  isDragging = false;
  dragOverColumn: string | null = null;
  isUpdatingTaskStatus = false;
  
  // Pagination
  currentPage = 0;
  pageSize = 50;
  totalTasks = 0;
  totalPages = 0;

  // File upload
  selectedFiles: File[] = [];
  
  // Property ID
  currentPropertyId: number = 21;

  // Task form
  currentTask: any = {
    id: null,
    title: '',
    description: '',
    priority: 'MEDIUM',
    startDate: this.getCurrentDateArray(),
    endDate: this.getCurrentDateArray(),
    realEstateProperty: { id: this.currentPropertyId },
    executors: [],
    status: 'TODO',
    pictures: []
  };

  private destroy$ = new Subject<void>();
  correctionTask: TaskDisplay | undefined;
  coulageTask: TaskDisplay | undefined;

  constructor(
    private projectBudgetService: ProjectBudgetService,
    private utilisateurService: UtilisateurService
  ) { }

  setPropertyId(propertyId: number): void {
    this.currentPropertyId = propertyId;
    this.currentTask.realEstateProperty = { id: propertyId };
    this.loadTasks();
    this.loadWorkers();
  }

  initializeWithProperty(propertyId: number): void {
    this.currentPropertyId = propertyId;
    this.currentTask.realEstateProperty = { id: propertyId };
    this.initializeUsers();
    this.loadWorkers();
    this.loadTasks();
  }

  ngOnInit(): void {
    this.initializeUsers();
    this.resetCurrentTask();
    
    if (this.currentPropertyId) {
      this.loadWorkers();
      this.loadTasks();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeUsers(): void {
    this.users = [];
  }

  private loadWorkers(): void {
    this.utilisateurService.listUsers(0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: WorkersResponse) => {
          this.workers = response.content;
          this.users = this.mapWorkersToUsers(this.workers);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des workers:', error);
          this.users = [
            { id: 1, avatarUrl: 'assets/images/av1.png', name: 'Ouvrier 1' },
            { id: 2, avatarUrl: 'assets/images/av2.png', name: 'Ouvrier 2' },
            { id: 3, avatarUrl: 'assets/images/av3.png', name: 'Ouvrier 3' },
            { id: 4, avatarUrl: 'assets/images/av4.png', name: 'Ouvrier 4' }
          ];
        }
      });
  }

  private mapWorkersToUsers(workers: Worker[]): User[] {
    return workers.map((worker, index) => {
      console.log('Worker photo:', worker.photo);
      return {
        id: worker.id,
        avatarUrl: worker.photo || this.getDefaultAvatar(index),
        name: `${worker.prenom} ${worker.nom}`
      };
    });
  }

  private getDefaultAvatar(index: number): string {
    const defaultAvatars = [
      'assets/images/av1.png',
      'assets/images/av2.png',
      'assets/images/av3.png',
      'assets/images/av4.png'
    ];
    return defaultAvatars[index % defaultAvatars.length];
  }

  private loadTasks(): void {
    if (!this.currentPropertyId) {
      console.warn('Property ID not set, cannot load tasks');
      this.error = 'ID de propriété non défini';
      this.initializeEmptyColumns();
      return;
    }

    this.loading = true;
    this.error = null;

    this.projectBudgetService.getTasks(this.currentPropertyId, this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: TasksResponse) => {
          console.log('Tasks loaded:', response);
          this.totalTasks = response.totalElements;
          this.totalPages = response.totalPages;
          this.organizeTasks(response.content);
          this.error = null;
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
          this.error = 'Erreur lors du chargement des tâches';
          this.errorMessage = `Impossible de charger les tâches: ${error.message || error}`;
          this.initializeEmptyColumns();
        }
      });
  }

  private organizeTasks(apiTasks: Task[]): void {
    const transformedTasks = apiTasks.map(task => this.transformApiTask(task));

    this.columns = [
      {
        id: 'TODO',
        title: 'À faire',
        color: 'gray',
        count: transformedTasks.filter(t => t.status === 'TODO').length,
        tasks: transformedTasks.filter(t => t.status === 'TODO')
      },
      {
        id: 'IN_PROGRESS',
        title: 'En cours',
        color: 'yellow-400',
        count: transformedTasks.filter(t => t.status === 'IN_PROGRESS').length,
        tasks: transformedTasks.filter(t => t.status === 'IN_PROGRESS')
      },
      {
        id: 'COMPLETED',
        title: 'Terminé',
        color: 'green-400',
        count: transformedTasks.filter(t => t.status === 'COMPLETED').length,
        tasks: transformedTasks.filter(t => t.status === 'COMPLETED')
      }
    ];
  }

  private initializeEmptyColumns(): void {
    this.columns = [
      { id: 'TODO', title: 'À faire', color: 'gray', count: 0, tasks: [] },
      { id: 'IN_PROGRESS', title: 'En cours', color: 'yellow-400', count: 0, tasks: [] },
      { id: 'COMPLETED', title: 'Terminé', color: 'green-400', count: 0, tasks: [] }
    ];
  }

  private transformApiTask(apiTask: Task): TaskDisplay {
    return {
      id: apiTask.id,
      title: apiTask.title,
      description: apiTask.description,
      priority: apiTask.priority,
      status: apiTask.status,
      startDate: apiTask.startDate,
      endDate: apiTask.endDate,
      pictures: apiTask.pictures,
      realEstateProperty: apiTask.realEstateProperty,
      executors: apiTask.executors,
      assignedUsers: this.getAssignedUsers(apiTask.executors),
      additionalUsers: Math.max(0, apiTask.executors.length - 3),
      tag: this.getTagForTask(apiTask),
      comments: 0,
      attachments: apiTask.pictures?.length || 0,
      dueDate: apiTask.endDate ? this.formatDate(apiTask.endDate) : 'N/A',
      isDone: apiTask.status === 'COMPLETED'
    };
  }

  private getAssignedUsers(executors: any[]): User[] {
    if (!executors || executors.length === 0) return [];
    
    return executors.slice(0, 3).map((executor) => {
      const worker = this.workers.find(w => w.id === executor.id);
      if (worker) {
        return {
          id: worker.id,
          avatarUrl: worker.photo || this.getDefaultAvatar(worker.id),
          name: `${worker.prenom} ${worker.nom}`
        };
      }
      
      return {
        id: executor.id,
        avatarUrl: 'assets/images/default-avatar.png',
        name: `Exécuteur ${executor.id}`
      };
    });
  }

  private getTagForTask(task: Task): TaskTag {
    const priorityTags: Record<string, TaskTag> = {
      'LOW': { 
        name: 'Basse priorité', 
        colorClass: 'bg-blue-50', 
        textColorClass: 'text-blue-500' 
      },
      'MEDIUM': { 
        name: 'Priorité moyenne', 
        colorClass: 'bg-yellow-50', 
        textColorClass: 'text-yellow-500' 
      },
      'HIGH': { 
        name: 'Haute priorité', 
        colorClass: 'bg-red-50', 
        textColorClass: 'text-red-500' 
      }
    };

    return priorityTags[task.priority] || { 
      name: 'Tâche', 
      colorClass: 'bg-gray-50', 
      textColorClass: 'text-gray-500' 
    };
  }

  private formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    
    try {
      const [year, month, day] = dateArray;
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'N/A';
    }
  }

  private resetCurrentTask(): void {
    this.currentTask = {
      id: null,
      title: '',
      description: '',
      priority: 'MEDIUM',
      startDate: this.getCurrentDateArray(),
      endDate: this.getCurrentDateArray(),
      realEstateProperty: { id: this.currentPropertyId },
      executors: [],
      status: 'TODO',
      pictures: []
    };
  }

  // ================== DRAG AND DROP METHODS ==================

  /**
   * Démarre le drag d'une tâche
   */
  onDragStart(event: DragEvent, task: TaskDisplay): void {
    console.log('🎯 Début du drag de la tâche:', task.title);
    
    if (event.dataTransfer && task.id) {
      this.draggedTask = { ...task }; // Clone de la tâche pour éviter les modifications directes
      this.isDragging = true;
      
      // Stocker l'ID de la tâche et son statut actuel
      event.dataTransfer.setData('application/json', JSON.stringify({
        taskId: task.id,
        originalStatus: task.status,
        taskTitle: task.title
      }));
      event.dataTransfer.effectAllowed = 'move';
      
      // Ajouter une classe CSS pour l'effet visuel
      if (event.target instanceof HTMLElement) {
        event.target.classList.add('dragging');
      }
    }
  }

  /**
   * Fin du drag (nettoyage)
   */
  onDragEnd(event: DragEvent): void {
    console.log('🏁 Fin du drag');
    
    this.draggedTask = null;
    this.isDragging = false;
    this.dragOverColumn = null;
    
    // Retirer la classe CSS
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('dragging');
    }
  }

  /**
   * Survol d'une zone de drop (colonne)
   */
  onDragOver(event: DragEvent, columnId?: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    // Mettre à jour la colonne survolée pour l'effet visuel
    if (columnId && this.isDragging) {
      this.dragOverColumn = columnId;
    }
  }

  /**
   * Quitte une zone de drop
   */
  onDragLeave(event: DragEvent, columnId: string): void {
    // Ne retirer l'effet que si on sort vraiment de la colonne
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (this.dragOverColumn === columnId) {
        this.dragOverColumn = null;
      }
    }
  }

  /**
   * Drop d'une tâche dans une colonne
   */
  onDrop(event: DragEvent, targetStatus: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('📥 Drop dans la colonne:', targetStatus);
    
    this.dragOverColumn = null;
    
    if (!event.dataTransfer) {
      console.warn('⚠️ Pas de dataTransfer disponible');
      return;
    }

    // Récupérer les données de la tâche
    let dragData;
    try {
      const dataTransferText = event.dataTransfer.getData('application/json');
      if (!dataTransferText) {
        console.warn('⚠️ Pas de données disponibles dans dataTransfer');
        return;
      }
      dragData = JSON.parse(dataTransferText);
    } catch (error) {
      console.error('⚠️ Erreur lors de la parsing des données de drag:', error);
      return;
    }

    const { taskId, originalStatus, taskTitle } = dragData;
    
    if (!taskId || isNaN(Number(taskId))) {
      console.warn('⚠️ ID de tâche invalide:', taskId);
      return;
    }

    // Vérifier si le statut a réellement changé
    if (originalStatus === targetStatus) {
      console.log('ℹ️ La tâche est déjà dans cette colonne');
      return;
    }

    console.log('🔄 Changement de statut demandé:', originalStatus, '->', targetStatus);
    
    // Trouver la tâche dans les colonnes
    const task = this.findTaskById(Number(taskId));
    if (!task) {
      console.warn('⚠️ Tâche introuvable avec l\'ID:', taskId);
      return;
    }

    // Mettre à jour le statut immédiatement dans l'interface (optimistic update)
    const originalTaskData = { ...task };
    this.updateTaskStatusLocally(task, targetStatus);
    
    // Puis sauvegarder sur le serveur
    this.updateTaskStatusOnServer(Number(taskId), targetStatus, originalTaskData, taskTitle);
  }

  /**
   * Trouve une tâche par son ID dans toutes les colonnes
   */
  private findTaskById(taskId: number): TaskDisplay | undefined {
    for (const column of this.columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }

  /**
   * Met à jour le statut d'une tâche localement (interface)
   */
  private updateTaskStatusLocally(task: TaskDisplay, newStatus: string): void {
    const oldStatus = task.status;
    
    // Retirer la tâche de son ancienne colonne
    const oldColumn = this.columns.find(col => col.id === oldStatus);
    if (oldColumn) {
      const taskIndex = oldColumn.tasks.findIndex(t => t.id === task.id);
      if (taskIndex > -1) {
        oldColumn.tasks.splice(taskIndex, 1);
        oldColumn.count = oldColumn.tasks.length;
      }
    }
    
    // Ajouter la tâche à sa nouvelle colonne
    const newColumn = this.columns.find(col => col.id === newStatus);
    if (newColumn) {
      task.status = newStatus as any;
      task.isDone = newStatus === 'COMPLETED';
      newColumn.tasks.push(task);
      newColumn.count = newColumn.tasks.length;
    }
    
    console.log('✅ Mise à jour locale terminée');
  }

  /**
   * Met à jour le statut d'une tâche sur le serveur
   */
  private updateTaskStatusOnServer(taskId: number, newStatus: string, originalTaskData: TaskDisplay, taskTitle: string): void {
    if (this.isUpdatingTaskStatus) {
      console.log('⏳ Mise à jour déjà en cours...');
      return;
    }

    this.isUpdatingTaskStatus = true;
    
    console.log('📤 Envoi de la mise à jour au serveur:', { taskId, status: newStatus });

    // Utiliser la méthode updateTaskStatus du service
    this.projectBudgetService.updateTaskStatus(taskId, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isUpdatingTaskStatus = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Statut mis à jour avec succès sur le serveur:', response);
          this.successMessage = `Tâche "${taskTitle}" déplacée vers "${this.getStatusColumnTitle(newStatus)}"`;
          
          // Auto-masquer le message de succès après 3 secondes
          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour du statut:', error);
          
          // Déterminer le message d'erreur approprié
          let errorMsg = 'Erreur lors du déplacement de la tâche';
          if (error.status === 403) {
            errorMsg = 'Accès refusé. Vous n\'avez pas les permissions pour modifier cette tâche.';
          } else if (error.status === 404) {
            errorMsg = 'Tâche non trouvée.';
          } else if (error.status === 401) {
            errorMsg = 'Session expirée. Veuillez vous reconnecter.';
          } else if (error.message) {
            errorMsg = `Erreur: ${error.message}`;
          }
          
          this.errorMessage = errorMsg;
          
          // Annuler le changement local en cas d'erreur
          this.revertTaskStatusLocally(originalTaskData);
          
          // Auto-masquer le message d'erreur après 5 secondes
          setTimeout(() => {
            this.errorMessage = null;
          }, 5000);
        }
      });
  }

  /**
   * Annule un changement de statut local en cas d'erreur serveur
   */
  private revertTaskStatusLocally(originalTaskData: TaskDisplay): void {
    console.log('🔄 Annulation du changement local...');
    
    // Trouver la tâche dans sa nouvelle position et la restaurer
    const currentTask = this.findTaskById(originalTaskData.id!);
    if (currentTask) {
      // Retirer la tâche de sa position actuelle
      const currentColumn = this.columns.find(col => col.tasks.includes(currentTask));
      if (currentColumn) {
        const taskIndex = currentColumn.tasks.indexOf(currentTask);
        if (taskIndex > -1) {
          currentColumn.tasks.splice(taskIndex, 1);
          currentColumn.count = currentColumn.tasks.length;
        }
      }
      
      // Remettre la tâche dans sa colonne d'origine
      const originalColumn = this.columns.find(col => col.id === originalTaskData.status);
      if (originalColumn) {
        // Restaurer les données originales
        Object.assign(currentTask, originalTaskData);
        originalColumn.tasks.push(currentTask);
        originalColumn.count = originalColumn.tasks.length;
      }
    } else {
      // Si on ne trouve pas la tâche, recharger toutes les tâches
      console.warn('Impossible de trouver la tâche pour l\'annulation, rechargement complet...');
      this.loadTasks();
    }
  }

  // ================== END DRAG AND DROP METHODS ==================

  // Modal methods
  openModal(task?: Task) {
    if (task) {
      this.isEditMode = true;
      this.currentTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        startDate: task.startDate,
        endDate: task.endDate,
        realEstateProperty: task.realEstateProperty,
        executors: [...task.executors],
        status: task.status,
        pictures: task.pictures || []
      };
    } else {
      this.isEditMode = false;
      this.resetCurrentTask();
    }
    this.selectedFiles = [];
    this.error = null;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedTask = null;
    this.selectedFiles = [];
    this.error = null;
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  // File handling
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }

  // Form validation
  validateTaskForm(): boolean {
    if (!this.currentTask.title?.trim()) {
      this.error = 'Le titre est requis';
      return false;
    }
    if (!this.currentTask.description?.trim()) {
      this.error = 'La description est requise';
      return false;
    }
    if (!this.currentTask.realEstateProperty?.id) {
      this.error = 'Propriété non définie';
      return false;
    }
    return true;
  }

  // Edit task
  editTask(task: TaskDisplay): void {
    this.openModal(task);
  }

  // Delete task
  deleteTask(taskId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }

    this.loading = true;
    
    setTimeout(() => {
      this.loading = false;
      this.loadTasks();
      this.successMessage = 'Tâche supprimée avec succès';
    }, 1000);
  }

  // Pagination
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTasks();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTasks();
    }
  }

  // Utility methods
  private getCurrentDateArray(): number[] {
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  }

  private getCurrentDate(): string {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  }

  /**
   * Formate une date pour l'API (format MM-DD-YYYY)
   */
  private formatDateForApi(dateArray: number[] | string): string {
    if (typeof dateArray === 'string') {
      return dateArray;
    }
    
    if (!dateArray || dateArray.length < 3) {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const year = now.getFullYear();
      return `${month}-${day}-${year}`;
    }
    
    const [year, month, day] = dateArray;
    return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${year}`;
  }

  resetForm(): void {
    this.closeModal();
    this.selectedFiles = [];
    this.resetCurrentTask();
  }

  clearError(): void {
    this.error = null;
    this.errorMessage = null;
  }

  clearSuccess(): void {
    this.successMessage = null;
  }

  // Refresh methods
  refreshTasks(): void {
    this.loadTasks();
  }

  refreshWorkers(): void {
    this.loadWorkers();
  }

  // UI Helpers
  getStatusColumnTitle(status: string): string {
    const statusMap: Record<string, string> = {
      'TODO': 'À faire',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminé'
    };
    return statusMap[status] || status;
  }

  getPropertyDetails(propertyId: number): any {
    return {
      id: propertyId,
      name: `Propriété ${propertyId}`,
      address: 'Adresse non disponible',
      plan: 'Plan non disponible'
    };
  }

  getExecutorDetails(executor: any): string {
    if (!executor) return 'Exécuteur non défini';
    
    const worker = this.workers.find(w => w.id === executor.id);
    if (worker) {
      return `${worker.prenom || ''} ${worker.nom || ''}`.trim();
    }
    
    return `Exécuteur ${executor.id}`;
  }

  getPropertyInfo(task: Task): string {
    if (task.realEstateProperty) {
      return `${task.realEstateProperty.name} - ${task.realEstateProperty.address}`;
    }
    return 'Propriété non définie';
  }

  getPropertyName(task?: Task): string {
    if (task?.realEstateProperty) {
      return task.realEstateProperty.name;
    }
    return `Propriété ${this.currentPropertyId}`;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'LOW': 'Basse',
      'MEDIUM': 'Moyenne',
      'HIGH': 'Haute'
    };
    return labels[priority] || priority;
  }

  trackByColumnId(index: number, column: TaskColumn): string {
    return column.id;
  }

  trackByTaskId(index: number, task: TaskDisplay): number {
    return task.id!;
  }

  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  closeTaskForm(): void {
    this.showTaskForm = false;
    this.resetForm();
  }

  saveTask(): void {
    if (!this.validateTaskForm()) {
      return;
    }
  
    this.loading = true;
    this.error = null;
    this.successMessage = null;
  
    const formatDateForApi = (dateArray: number[]): string => {
      if (!dateArray || dateArray.length < 3) {
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const year = now.getFullYear();
        return `${month}-${day}-${year}`;
      }
      const [year, month, day] = dateArray;
      return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${year}`;
    };

    const startDate = Array.isArray(this.currentTask.startDate) 
      ? this.currentTask.startDate 
      : this.getCurrentDateArray();
    
    const endDate = Array.isArray(this.currentTask.endDate) 
      ? this.currentTask.endDate 
      : this.getCurrentDateArray();
  
    const taskData: CreateTaskRequest = {
      title: this.currentTask.title.trim(),
      description: this.currentTask.description.trim(),
      priority: this.currentTask.priority,
      startDate: formatDateForApi(startDate),
      endDate: formatDateForApi(endDate),
      realEstatePropertyId: this.currentTask.realEstateProperty?.id || this.currentPropertyId,
      executorIds: this.currentTask.executors.map((executor: any) => executor.id) || [],
      pictures: this.currentTask.pictures || []
    };

    console.log('Task data to send:', taskData);
  
    if (this.selectedFiles.length > 0) {
      const filePromises = this.selectedFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            resolve(e.target.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
  
      Promise.all(filePromises)
        .then(base64Files => {
          taskData.pictures = [...(taskData.pictures || []), ...base64Files];
          this.createOrUpdateTask(taskData);
        })
        .catch(error => {
          console.error('Error converting files to base64:', error);
          this.error = 'Erreur lors de la conversion des fichiers';
          this.loading = false;
        });
    } else {
      this.createOrUpdateTask(taskData);
    }
  }

  private createOrUpdateTask(taskData: CreateTaskRequest): void {
    if (this.isEditMode && this.currentTask.id) {
      this.updateExistingTask(taskData);
    } else {
      this.projectBudgetService.createTask(taskData)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Tâche créée avec succès:', response);
            this.successMessage = 'Tâche créée avec succès';
            this.loadTasks();
            this.closeModal();
          },
          error: (error) => {
            console.error('Erreur lors de la création de la tâche:', error);
            this.error = 'Erreur lors de la création de la tâche';
            this.errorMessage = error.message || error;
          }
        });
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  isUserSelected(userId: number): boolean {
    return this.currentTask.executors.some((exec: any) => exec.id === userId);
  }

  toggleUserSelection(userId: number): void {
    const index = this.currentTask.executors.findIndex((exec: any) => exec.id === userId);
    if (index > -1) {
      this.currentTask.executors.splice(index, 1);
    } else {
      this.currentTask.executors.push({ id: userId });
    }
  }

  private updateExistingTask(taskData: any): void {
    setTimeout(() => {
      this.loading = false;
      this.successMessage = 'Tâche mise à jour avec succès';
      this.loadTasks();
      this.closeModal();
    }, 1000);
  }
}