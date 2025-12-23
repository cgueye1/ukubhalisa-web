import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

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
  showPassword = signal(false);
  isLoading = signal(false);
  
  alert = signal<AlertMessage>({
    type: 'error',
    message: '',
    show: false
  });

  // Regex pour validation
  private readonly phoneRegex = /^7[05678]\d{7}$/;
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly passwordRegex = /^.{6,}$/;

  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      identifier: ['', [
        Validators.required,
        this.emailOrPhoneValidator.bind(this)
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(this.passwordRegex)
      ]]
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      console.log('✅ Utilisateur déjà connecté, redirection vers /projects');
      this.router.navigate(['/projects']);
    }
  }

  private emailOrPhoneValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const value = control.value.toString().trim();
    const isValidEmail = this.emailRegex.test(value);
    const isValidPhone = this.phoneRegex.test(value);
    
    if (!isValidEmail && !isValidPhone) {
      return { invalidFormat: true };
    }
    
    return null;
  }

  get identifierErrorMessage(): string {
    const identifierControl = this.loginForm.get('identifier');
    
    if (!identifierControl?.touched) return '';
    
    if (identifierControl.hasError('required')) {
      return 'L\'email ou le numéro de téléphone est requis';
    }
    if (identifierControl.hasError('invalidFormat')) {
      return 'Format invalide. Utilisez un email valide ou un numéro au format 7XXXXXXXX (ex: 771234567)';
    }
    return '';
  }

  get passwordErrorMessage(): string {
    const passwordControl = this.loginForm.get('password');
    
    if (!passwordControl?.touched) return '';
    
    if (passwordControl.hasError('required')) {
      return 'Le mot de passe est requis';
    }
    if (passwordControl.hasError('pattern')) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return '';
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
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

    setTimeout(() => {
      this.hideAlert();
    }, 5000);
  }

  hideAlert(): void {
    this.alert.update(current => ({ ...current, show: false }));
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();

    if (!this.loginForm.valid) {
      console.log('❌ Formulaire invalide');
      this.showAlert('error', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    this.handleLogin();
  }

  private handleLogin(): void {
    this.isLoading.set(true);
    this.hideAlert();

    const identifierValue = this.loginForm.get('identifier')?.value;
    const passwordValue = this.loginForm.get('password')?.value;

    const credentials = {
      email: identifierValue,
      password: passwordValue
    };

    console.log('🚀 Tentative de connexion:', credentials.email);

    // ÉTAPE 1: Login (récupère les tokens)
    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('✅ Login réussi - Tokens reçus');
        
        // ÉTAPE 2: Récupérer l'utilisateur avec getCurrentUser
        this.authService.getCurrentUser().subscribe({
          next: (user) => {
            if (!user) {
              console.error('❌ Utilisateur non récupéré');
              this.isLoading.set(false);
              this.showAlert('error', 'Impossible de récupérer vos informations.');
              this.authService.logout();
              return;
            }

            console.log('✅ Utilisateur récupéré:', {
              id: user.id,
              email: user.email,
              profil: user.profil,
              activated: user.activated
            });

            // ÉTAPE 3: Redirection vers /projects
            console.log('🎯 Redirection vers /projects');
            this.isLoading.set(false);
            
            this.router.navigate(['/projects']).then(success => {
              if (success) {
                console.log('✅ Redirection réussie');
                this.showAlert('success', 'Connexion réussie ! Bienvenue.');
              } else {
                console.error('❌ Échec redirection');
                this.showAlert('error', 'Erreur de redirection.');
              }
            });
          },
          error: (userError) => {
            console.error('❌ Erreur getCurrentUser:', userError);
            this.isLoading.set(false);
            this.handleUserError(userError);
          }
        });
      },
      error: (loginError) => {
        console.error('❌ Erreur login:', loginError);
        this.isLoading.set(false);
        this.handleLoginError(loginError);
      }
    });
  }

  private handleUserError(error: any): void {
    let errorMsg = 'Impossible de récupérer vos informations.';
    
    if (error.status === 401) {
      errorMsg = 'Session expirée. Reconnectez-vous.';
    } else if (error.status === 403) {
      errorMsg = 'Accès refusé. Votre compte est peut-être suspendu.';
    } else if (error.status === 404) {
      errorMsg = 'Utilisateur non trouvé.';
    } else if (error.status === 0) {
      errorMsg = 'Erreur réseau. Vérifiez votre connexion.';
    }
    
    this.showAlert('error', errorMsg);
    this.authService.logout();
  }

  private handleLoginError(error: any): void {
    let errorMsg = 'Erreur de connexion';
    
    if (error.status === 401) {
      errorMsg = 'Email/téléphone ou mot de passe incorrect';
    } else if (error.status === 0) {
      errorMsg = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    } else if (error.status === 403) {
      errorMsg = 'Accès refusé. Votre compte est peut-être suspendu.';
    } else if (error.status === 500) {
      errorMsg = 'Erreur serveur. Réessayez plus tard.';
    } else if (error.error?.message) {
      errorMsg = error.error.message;
    }
    
    this.showAlert('error', errorMsg);
  }

  // Getters pour le template
  get currentAlert() {
    return this.alert();
  }

  get currentShowPassword() {
    return this.showPassword();
  }

  get currentIsLoading() {
    return this.isLoading();
  }

  get currentLoginForm() {
    return this.loginForm;
  }
}