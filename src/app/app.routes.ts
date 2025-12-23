
// app.routes.ts (version sécurisée)
import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';

import { ProjectDetailHeaderComponent } from './features/project-detail-header/project-detail-header.component';
import { LayoutComponent } from './layout/layout/layout.component';

import { UnitComponent } from './features/components/settings/unit/unit.component';
import { DocumentComponent } from './features/components/settings/document/document.component';
import { MaterialCategoryComponent } from './features/components/settings/material-category/material-category.component';
import { PropertyTypeComponent } from './features/components/settings/property-type/property-type.component';
import { NewProjectComponent } from './features/components/project/new-project/new-project.component';

// import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';

// import { PortailComponent } from './features/portail/portail/portail.component';
// import { CompteComponent } from './features/compte/compte.component';

import { AbonnementsComponent } from './features/abonnements/abonnements.component';
import { DetailsReclamationComponent } from './features/details-reclamation/details-reclamation.component';
import { DetailsUtilisateurComponent } from './features/details-utilisateur/details-utilisateur.component';
import { DetailsAbonnementComponent } from './features/details-abonnement/details-abonnement.component';
import { CompteComponent } from './features/compte/compte.component';
// import { ResetpasswordComponent } from './features/auth/resetpassword/resetpassword.component';
// import { TaskBoardComponent } from './features/task-board/task-board.component';

export const routes: Routes = [
  // Redirection par défaut vers la page de connexion
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Routes d'authentification (sans layout)
  {
    path: 'login',
    component: LoginComponent,
    data: { authRequired: false }
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: { authRequired: false }
  },
  // {
  //   path: 'resetpassword',
  //   component: ResetpasswordComponent,
  //   data: { authRequired: false }
  // },

  // {
  //   path: 'portail',
  //   component: PortailComponent,
  //   data: { authRequired: false }
  // },

  // Routes protégées avec layout (nécessitent une authentification)
  {
    path: '',
    component: LayoutComponent,
    children: [
  
  
      {
        path: 'projects',
        loadChildren: () => import('./features/projects/projects.routes')
          .then(m => m.PROJECTS_ROUTES),
        data: {
        },
        canActivate: [RoleGuard]
      },
      {
        path: 'detailprojet/:id',
        component: ProjectDetailHeaderComponent,
        data: { breadcrumb: 'Détail Projet' }

      },
      {
        path: 'nouveau-projet',
        component: NewProjectComponent,
        data: {
          breadcrumb: 'Nouveau Projet',
        },
        canActivate: [RoleGuard]
      },
      {
        path: 'communication',
        loadChildren: () => import('./features/communication/communication.routes')
          .then(m => m.COMMUNICATION_ROUTES)
      },
    
      {
        path: 'parametres/unite-mesure',
        component: UnitComponent,
        data: {
          breadcrumb: 'Unités de Mesure',
        },
        canActivate: [RoleGuard]
      },
      {
        path: 'parametres/documents',
        component: DocumentComponent,
        data: {
          breadcrumb: 'Documents',
        },
        canActivate: [RoleGuard]
      },
      {
        path: 'parametres/categories',
        component: MaterialCategoryComponent,
        data: {
          breadcrumb: 'Catégories de Matériaux',
        },
        canActivate: [RoleGuard]
      },
      {
        path: 'parametres/typebien',
        component: PropertyTypeComponent,
        data: {
          breadcrumb: 'Types de Bien',
        },
        canActivate: [RoleGuard]
      },
     

      // Dans votre routing module
      //  { path: 'property/:id/tasks', 
      //   component: TaskBoardComponent },

      // {
      //   path: 'details-abonnement/:id',
      //   component: DetailsAbonnementComponent,
      //   data: {
      //     breadcrumb: 'details-abonnement',
      //   },
      // },
      
      {
        path: 'details-reclamation/:id',
        component: DetailsReclamationComponent,
        data: {
          breadcrumb: 'details-reclamation',
        },
        canActivate: [RoleGuard]
      },
      {
        path: 'details-utilisateur/:id',
        component: DetailsUtilisateurComponent,
        data: {
          breadcrumb: 'details-utilisateur',
        },
        canActivate: [RoleGuard]
      },
 
      
      {
        path: 'abonnements',
        component: AbonnementsComponent,
        data: {
          breadcrumb: 'abonnements',
        },
        canActivate: [RoleGuard]
      },
      
      {
        path: 'mon-compte',
        component: CompteComponent,
        data: {
          breadcrumb: 'mon-compte',
        },
        canActivate: [RoleGuard]
      }
    ]
  },

  // Route catch-all - redirige vers login pour toute route non trouvée
  { path: '**', redirectTo: '/login' }
];