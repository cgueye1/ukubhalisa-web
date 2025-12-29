import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { EntrepriseService } from './../../../services/entreprise.service';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { ProjectPresentationComponent } from '../components/project/project-presentation/project-presentation.component';
import { ProjectAlertComponent } from "../components/project/project-alert/project-alert.component";
import { TeamListComponent } from '../team-list/team-list.component';
import { TaskBoardComponent } from '../task-board/task-board.component';
import QRCode from 'qrcode';

@Component({
  selector: 'app-project-detail-header',
  standalone: true,
  imports: [
    CommonModule,
    TeamListComponent,
    TaskBoardComponent,
    ProjectPresentationComponent,
    ProjectAlertComponent,
  ],
  templateUrl: './project-detail-header.component.html',
  styleUrl: './project-detail-header.component.css'
})
export class ProjectDetailHeaderComponent implements OnInit {
  activeTab: string = 'presentation';
  projectId: number | null = null;

  // Données du projet
  projectDetails: any = null;
  isLoadingProject = false;
  projectError: string | null = null;

  // QR Code
  showQrModal: boolean = false;
  qrCodeDataUrl: SafeUrl | null = null;
  isGeneratingQr: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private entrepriseService: EntrepriseService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.projectId = +id;
      this.loadProjectDetails();
      this.breadcrumbService.setBreadcrumbs([
        { label: 'Projets', path: '/projects' },
        { label: `Détail projet `, path: `/projects/${this.projectId}` }
      ]);
    }
  }

  loadProjectDetails(): void {
    if (!this.projectId) return;

    this.isLoadingProject = true;
    this.projectError = null;

    this.entrepriseService.getEntrepriseDetails(this.projectId).subscribe({
      next: (response) => {
        console.log('📋 Réponse complète du serveur:', response);
        
        // Extraire realEstateProperty de la réponse
        if (response && response.realEstateProperty) {
          this.projectDetails = response.realEstateProperty;
          console.log('✅ Données du projet extraites:', this.projectDetails);
          console.log('📌 Nom du projet:', this.projectDetails.name);
          console.log('📌 QR Code brut:', this.projectDetails.qrcode);
        } else {
          this.projectDetails = response;
        }
        
        this.isLoadingProject = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du projet:', error);
        this.projectError = 'Erreur lors du chargement des détails du projet';
        this.isLoadingProject = false;
      }
    });
  }

  /**
   * Génère un QR code à partir des données du projet
   */
  private generateQrCode(): void {
    if (!this.projectDetails) return;
    
    this.isGeneratingQr = true;
    
    // Créer les données à encoder dans le QR code
    const qrData = {
      projectId: this.projectId,
      projectName: this.projectDetails.name,
      projectNumber: this.projectDetails.number,
      qrCodeHash: this.projectDetails.qrcode,
      timestamp: new Date().toISOString()
    };
    
    // Convertir en chaîne JSON
    const qrDataString = JSON.stringify(qrData);
    
    // Options correctes pour QRCode.toDataURL
    const options: QRCode.QRCodeToDataURLOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    };
    
    try {
      // Utiliser la signature correcte : (text, options, callback)
      QRCode.toDataURL(qrDataString, options, (err: Error | null | undefined, url: string) => {
        this.isGeneratingQr = false;
        if (err) {
          console.error('❌ Erreur lors de la génération du QR code:', err);
          return;
        }
        this.qrCodeDataUrl = this.sanitizer.bypassSecurityTrustUrl(url);
        console.log('✅ QR Code généré avec succès');
      });
    } catch (error) {
      this.isGeneratingQr = false;
      console.error('❌ Erreur lors de la génération du QR code:', error);
    }
  }

  /**
   * Alternative: Si vous voulez créer une URL spécifique qui peut être scannée
   */
  private generateQrCodeWithUrl(): void {
    if (!this.projectDetails || !this.projectId) return;
    
    this.isGeneratingQr = true;
    
    // Créer une URL unique pour ce projet
    const baseUrl = window.location.origin;
    const projectUrl = `${baseUrl}/projects/${this.projectId}`;
    
    // Options correctes
    const options: QRCode.QRCodeToDataURLOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#1F375D',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'Q'
    };
    
    try {
      QRCode.toDataURL(projectUrl, options, (err: Error | null | undefined, url: string) => {
        this.isGeneratingQr = false;
        if (err) {
          console.error('❌ Erreur lors de la génération du QR code:', err);
          return;
        }
        this.qrCodeDataUrl = this.sanitizer.bypassSecurityTrustUrl(url);
        console.log('✅ QR Code généré avec succès pour l\'URL:', projectUrl);
      });
    } catch (error) {
      this.isGeneratingQr = false;
      console.error('❌ Erreur lors de la génération du QR code:', error);
    }
  }

  /**
   * Version avec async/await (alternative)
   */
  private async generateQrCodeAsync(): Promise<void> {
    if (!this.projectDetails) return;
    
    this.isGeneratingQr = true;
    
    try {
      const baseUrl = window.location.origin;
      const projectUrl = `${baseUrl}/projects/${this.projectId}`;
      
      const options: QRCode.QRCodeToDataURLOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: '#1F375D',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'Q'
      };
      
      const url = await QRCode.toDataURL(projectUrl, options);
      this.qrCodeDataUrl = this.sanitizer.bypassSecurityTrustUrl(url);
      console.log('✅ QR Code généré avec succès (async)');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du QR code (async):', error);
    } finally {
      this.isGeneratingQr = false;
    }
  }

  getConstructionStatus(): { label: string; class: string } {
    if (!this.projectDetails?.status) {
      return { label: 'Non défini', class: 'bg-gray-100 text-gray-700' };
    }

    const statusMap: { [key: string]: { label: string; class: string } } = {
      'IN_PROGRESS': { label: 'En cours', class: 'bg-yellow-100 text-yellow-700' },
      'EN_COURS': { label: 'En cours', class: 'bg-yellow-100 text-yellow-700' },
      'COMPLETED': { label: 'Terminé', class: 'bg-green-100 text-green-700' },
      'TERMINE': { label: 'Terminé', class: 'bg-green-100 text-green-700' },
      'NOT_STARTED': { label: 'Non démarré', class: 'bg-gray-100 text-gray-700' },
      'NON_DEMARRE': { label: 'Non démarré', class: 'bg-gray-100 text-gray-700' },
      'PENDING': { label: 'En attente', class: 'bg-blue-100 text-blue-700' },
      'EN_ATTENTE': { label: 'En attente', class: 'bg-blue-100 text-blue-700' },
      'SUSPENDED': { label: 'Suspendu', class: 'bg-red-100 text-red-700' },
      'SUSPENDU': { label: 'Suspendu', class: 'bg-red-100 text-red-700' },
      'AVAILABLE': { label: 'Disponible', class: 'bg-green-100 text-green-700' },
      'DISPONIBLE': { label: 'Disponible', class: 'bg-green-100 text-green-700' }
    };

    const status = this.projectDetails.status.toUpperCase();
    return statusMap[status] || { label: this.projectDetails.status, class: 'bg-gray-100 text-gray-700' };
  }

  getLastUpdateDate(): string {
    return new Date().toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openQrModal(): void {
    if (!this.projectDetails) {
      console.warn('⚠️ Impossible d\'ouvrir le modal : pas de données projet disponibles');
      return;
    }
    
    this.showQrModal = true;
    
    // Choisissez l'une des méthodes suivantes :
    this.generateQrCodeWithUrl(); // Méthode recommandée
    // this.generateQrCode(); // Alternative avec données JSON
    // this.generateQrCodeAsync(); // Version async
  }

  closeQrModal(): void {
    this.showQrModal = false;
  }

  downloadQrCode(): void {
    if (!this.qrCodeDataUrl || !this.projectDetails) return;

    try {
      const qrCodeString = (this.qrCodeDataUrl as any).changingThisBreaksApplicationSecurity || this.qrCodeDataUrl.toString();

      const link = document.createElement('a');
      link.href = qrCodeString;
      link.download = `qrcode-${this.projectDetails.name || 'projet'}-${this.projectId}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Téléchargement du QR code lancé');
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement du QR code:', error);
    }
  }

  printQrCode(): void {
    if (!this.qrCodeDataUrl) return;

    try {
      const qrCodeString = (this.qrCodeDataUrl as any).changingThisBreaksApplicationSecurity || this.qrCodeDataUrl.toString();

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('❌ Impossible d\'ouvrir la fenêtre d\'impression');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${this.projectDetails?.name || 'Projet'}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                background: white;
                padding: 20px;
                border: 2px solid #f0f0f0;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              img {
                width: 300px;
                height: 300px;
                margin-bottom: 20px;
              }
              .info {
                text-align: center;
                margin-bottom: 30px;
              }
              h2 {
                margin: 10px 0;
                color: #333;
              }
              p {
                color: #666;
                margin: 5px 0;
              }
              @media print {
                body {
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="info">
              <h2>${this.projectDetails?.name || 'Projet'}</h2>
              <p><strong>Numéro:</strong> ${this.projectDetails?.number || 'N/A'}</p>
              <p><strong>Date:</strong> ${this.getLastUpdateDate()}</p>
              ${this.projectDetails?.address ? `<p><strong>Adresse:</strong> ${this.projectDetails.address}</p>` : ''}
            </div>
            <div class="qr-container">
              <img src="${qrCodeString}" alt="QR Code du projet" />
            </div>
            <p><em>Scannez ce QR code pour accéder aux détails du projet</em></p>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  setTimeout(() => window.close(), 100);
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      console.log('✅ Impression du QR code lancée');
    } catch (error) {
     
    }
  }
}