import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

interface Reclamation {
  id: number;
  utilisateur: {
    nom: string;
    email: string;
    avatar: string;
    pointStatut: 'green' | 'red' | 'yellow';
  };
  sujet: string;
  categorie: string;
  statut: 'En cours' | 'Résolue' | 'En attente';
  date: string;
}

@Component({
  selector: 'app-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reclamations.component.html',
  styleUrls: ['./reclamations.component.css']
})
export class ReclamationsComponent implements OnInit {
  searchTerm: string = '';
  currentPage: number = 1;
  totalPages: number = 2;
  totalResults: number = 15;

  reclamations: Reclamation[] = [
    {
      id: 1,
      utilisateur: {
        nom: 'Alpha Dieye',
        email: 'ad1@gmail.com',
        avatar: '👨🏾‍💼',
        pointStatut: 'green'
      },
      sujet: 'Problème de paiement',
      categorie: 'Paiement',
      statut: 'En cours',
      date: '11/10/2025'
    },
    {
      id: 2,
      utilisateur: {
        nom: 'Maguette Ndiaye',
        email: 'mb@gmail.com',
        avatar: '👨🏾‍💼',
        pointStatut: 'red'
      },
      sujet: 'Erreur de connexion',
      categorie: 'Connexion',
      statut: 'Résolue',
      date: '10/10/2025'
    },
    {
      id: 3,
      utilisateur: {
        nom: 'Amine Sene',
        email: 'as@gmail.com',
        avatar: '👨🏾‍💼',
        pointStatut: 'yellow'
      },
      sujet: 'Problème technique',
      categorie: 'Bug',
      statut: 'En attente',
      date: '05/09/2025'
    },
    {
      id: 4,
      utilisateur: {
        nom: 'Aziz Diop',
        email: 'ad@gmail.com',
        avatar: '👨🏾‍💼',
        pointStatut: 'green'
      },
      sujet: "Bug dans l'interface",
      categorie: 'Bug',
      statut: 'Résolue',
      date: '01/05/2025'
    },
    {
      id: 5,
      utilisateur: {
        nom: 'Youssoupha Dieme',
        email: 'yd@gmail.com',
        avatar: '👨🏾‍💼',
        pointStatut: 'green'
      },
      sujet: "Question sur l'abonnement",
      categorie: 'Abonnement',
      statut: 'Résolue',
      date: '01/05/2025'
    }
  ];

  filteredReclamations: Reclamation[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.filteredReclamations = [...this.reclamations];
  }

  searchReclamations(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredReclamations = [...this.reclamations];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredReclamations = this.reclamations.filter(rec =>
        rec.utilisateur.nom.toLowerCase().includes(term) ||
        rec.sujet.toLowerCase().includes(term) ||
        rec.categorie.toLowerCase().includes(term)
      );
    }
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'En cours':
        return 'bg-blue-100 text-blue-700';
      case 'Résolue':
        return 'bg-green-100 text-green-700';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getPointColor(color: string): string {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  viewReclamation(reclamation: Reclamation): void {
    this.router.navigate(['/details-reclamation', reclamation.id]);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}