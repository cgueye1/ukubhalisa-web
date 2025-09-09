import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { 
  CreateTaskRequest,
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
  workers: Worker[] = []; // Liste des workers disponibles
  
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
    this.loadWorkers(); // Charger les workers quand la propriété change
  }

  initializeWithProperty(propertyId: number): void {
    this.currentPropertyId = propertyId;
    this.currentTask.realEstateProperty = { id: propertyId };
    this.initializeUsers();
    this.loadWorkers(); // Charger les workers
    this.loadTasks();
  }

  ngOnInit(): void {
    this.initializeUsers();
    this.resetCurrentTask();
    
    if (this.currentPropertyId) {
      this.loadWorkers(); // Charger les workers au démarrage
      this.loadTasks();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeUsers(): void {
    // Initialiser avec des utilisateurs vides, seront remplacés par les workers
    this.users = [];
  }

  private loadWorkers(): void {
    this.utilisateurService.listUsers(0, 100) // Charger jusqu'à 100 workers
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: WorkersResponse) => {
          this.workers = response.content;
          this.users = this.mapWorkersToUsers(this.workers);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des workers:', error);
          // Garder les utilisateurs mockés en cas d'erreur
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
    console.log('Worker photo:', worker.photo); // Debug
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
      // Trouver le worker correspondant ou utiliser un utilisateur par défaut
      const worker = this.workers.find(w => w.id === executor.id);
      if (worker) {
        return {
          id: worker.id,
          avatarUrl: worker.photo || this.getDefaultAvatar(worker.id),
          name: `${worker.prenom} ${worker.nom}`
        };
      }
      
      // Fallback si le worker n'est pas trouvé
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
    
    // Trouver le worker correspondant
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

  // Drag and drop
  onDragStart(event: DragEvent, task: TaskDisplay): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', task.id!.toString());
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, targetStatus: string): void {
    event.preventDefault();
    
    if (event.dataTransfer) {
      const taskId = parseInt(event.dataTransfer.getData('text/plain'));
      const task = this.findTaskById(taskId);
      
      if (task && task.status !== targetStatus) {
        this.updateTaskStatus(task, targetStatus);
      }
    }
  }

  private findTaskById(taskId: number): TaskDisplay | undefined {
    for (const column of this.columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }

  private updateTaskStatus(task: TaskDisplay, newStatus: string): void {
    task.status = newStatus as any;
    this.loadTasks();
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