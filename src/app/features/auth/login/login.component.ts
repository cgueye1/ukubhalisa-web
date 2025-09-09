import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, profil, UserProfile } from '../../../features/auth/services/auth.service';

interface AlertMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  show: boolean;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], 
})
export class LoginComponent implements OnInit {
  // Signals pour l'état du composant
  activeTab = signal<'connexion' | 'inscription'>('connexion');
  showPassword = signal(false);
  isLoading = signal(false);
  
  // Signal pour les alertes
  alert = signal<AlertMessage>({
    type: 'error',
    message: '',
    show: false
  });

  // Regex pour validation
  private readonly phoneRegex = /^7[05678]\d{7}$/;
  private readonly passwordRegex = /^.{6,}$/;

  // Formulaires réactifs
  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Formulaire de connexion
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(this.phoneRegex)
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(this.passwordRegex)
      ]]
    });

    // Formulaire d'inscription (pour la cohérence)
    this.registerForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(this.phoneRegex)
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(this.passwordRegex)
      ]]
    });
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est déjà connecté
    if (this.authService.isAuthenticated()) {
      this.redirectToDashboard();
    }
  }

  // Computed signals pour les messages d'erreur
  get emailErrorMessage(): string {
    const form = this.getCurrentForm();
    const emailControl = form.get('email');
    
    if (!emailControl?.touched) return '';
    
    if (emailControl.hasError('required')) {
      return 'Le numéro de téléphone est requis';
    }
    if (emailControl.hasError('pattern')) {
      return 'Format invalide. Utilisez le format: 7XXXXXXXX (ex: 771234567)';
    }
    return '';
  }

  get passwordErrorMessage(): string {
    const form = this.getCurrentForm();
    const passwordControl = form.get('password');
    
    if (!passwordControl?.touched) return '';
    
    if (passwordControl.hasError('required')) {
      return 'Le mot de passe est requis';
    }
    if (passwordControl.hasError('pattern')) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return '';
  }

  // Helper pour obtenir le formulaire actuel
  private getCurrentForm(): FormGroup {
    return this.activeTab() === 'connexion' ? this.loginForm : this.registerForm;
  }

  navigateToRegister(): void {
    this.router.navigateByUrl('/register');
  }

  setActiveTab(tab: 'connexion' | 'inscription'): void {
    this.activeTab.set(tab);
    this.hideAlert();
    
    // Réinitialiser les formulaires quand on change d'onglet
    this.loginForm.reset();
    this.registerForm.reset();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(current => !current);
  }

  showAlert(type: 'success' | 'error' | 'warning', message: string): void {
    this.alert.set({
      type,
      message,
      show: true
    });

    // Auto-hide après 5 secondes
    setTimeout(() => {
      this.hideAlert();
    }, 5000);
  }

  hideAlert(): void {
    this.alert.update(current => ({ ...current, show: false }));
  }

  onSubmit(): void {
    const currentForm = this.getCurrentForm();
    
    // Marquer tous les champs comme touchés pour afficher les erreurs
    currentForm.markAllAsTouched();

    if (!currentForm.valid) {
      this.showAlert('error', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (this.activeTab() === 'connexion') {
      this.handleLogin();
    } else {
      this.navigateToRegister();
    }
  }

  private handleLogin(): void {
    this.isLoading.set(true);
    this.hideAlert();
  
    const credentials = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };

  
    this.authService.login(credentials).subscribe({
      next: (response) => {
        
        // Attendre un délai pour s'assurer que toutes les données sont sauvegardées
        setTimeout(() => {
          this.processLoginSuccess(response);
        }, 200);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('❌ Erreur connexion:', err);
        this.handleLoginError(err);
      }
    });
  }
  

  private processLoginSuccess(response: any): void {
    try {
      
      // Méthode principale: lire le profil directement depuis le token JWT
      let isBET = false;
      
      try {
        // Décoder le payload JWT
        const payload = JSON.parse(atob(response.token.split('.')[1]));
        
        // Vérifier le profil dans différentes propriétés possibles
        const profile = payload.profil || payload.profile || payload.role;
        isBET = profile === 'BET';
        
        
      } catch (tokenError) {
        
        // Fallback: utiliser le service auth après un court délai
        setTimeout(() => {
          const isBETFallback = this.authService.isBETProfile();
          this.isLoading.set(false);
          this.redirectToDashboard(isBETFallback);
        }, 300);
        return;
      }
      
      // Redirection immédiate avec la valeur détectée
      this.isLoading.set(false);
      this.redirectToDashboard(isBET);
      
    } catch (error) {
      this.isLoading.set(false);
      this.redirectToDashboard(false);
    }
  }


  private redirectToDashboard(isBET?: boolean): void {
    // Si isBET n'est pas spécifié, le détecter
    if (isBET === undefined) {
      isBET = this.authService.isBETProfile();
    }


    if (isBET) {
      this.router.navigate(['/dashboard-etude']).then(success => {
        if (success) {
          this.showAlert('success', 'Connexion réussie ! Bienvenue sur votre espace BET.');
        } else {
          // Fallback vers le dashboard standard si la redirection échoue
          this.router.navigate(['/dashboard']).then(() => {
            this.showAlert('success', 'Connexion réussie ! Bienvenue sur votre espace.');
          });
        }
      });
    } else {
      this.router.navigate(['/dashboard']).then(success => {
        if (success) {
          this.showAlert('success', 'Connexion réussie ! Bienvenue sur votre espace.');
        }
      });
    }
  }

  private handleLoginError(err: any): void {
    let errorMessage = 'Erreur de connexion';
    
    if (err.status === 401) {
      errorMessage = 'Numéro de téléphone ou mot de passe incorrect';
    } else if (err.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    } else if (err.status === 403) {
      errorMessage = 'Accès refusé. Votre compte pourrait être suspendu.';
    } else if (err.status === 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (err.error?.message) {
      errorMessage = err.error.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    this.showAlert('error', errorMessage);
  }

  // Getters pour utilisation dans le template
  get currentAlert() {
    return this.alert();
  }

  get currentActiveTab() {
    return this.activeTab();
  }

  get currentShowPassword() {
    return this.showPassword();
  }

  get currentIsLoading() {
    return this.isLoading();
  }

  get currentEmailError() {
    return this.emailErrorMessage;
  }

  get currentPasswordError() {
    return this.passwordErrorMessage;
  }

  get currentLoginForm() {
    return this.loginForm;
  }

  get currentRegisterForm() {
    return this.registerForm;
  }
}