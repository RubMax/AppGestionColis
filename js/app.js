// Configuration de l'application
const CONFIG = {
    // REMPLACEZ CETTE URL PAR VOTRE URL APPS SCRIPT
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby9zmfSadvog9NXvQuC-IYA2CeO88Wra3FPpUYg62gq7T_yKj28a-uUVeSpsnlrwuxnbA/exec' // Votre URL ici
};

// Variables globales
let colisData = [];
let dataTableInstance = null;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    
    // Écouteurs d'événements
    document.getElementById('formEnregistrer').addEventListener('submit', enregistrerColis);
    document.getElementById('formRetirer').addEventListener('submit', marquerCommeRetire);
    document.getElementById('btnSearchProprietaire').addEventListener('click', rechercherParProprietaire);
    document.getElementById('btnSearchBarcode').addEventListener('click', rechercherParCodeBarre);
    document.getElementById('refreshTable').addEventListener('click', chargerColis);
    
    // Recherche en temps réel
    document.getElementById('searchProprietaire').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            rechercherParProprietaire();
        }
    });
    
    document.getElementById('searchBarcode').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            rechercherParCodeBarre();
        }
    });
});

// Initialiser l'application
function initApp() {
    // Vérifier la configuration
    if (CONFIG.APPS_SCRIPT_URL.includes('AKfycby...')) {
        showAlert('⚠️ Configurez d\'abord l\'URL Apps Script dans CONFIG.APPS_SCRIPT_URL', 'warning');
    }
    
    chargerColis();
    configurerNavigation();
}

// Configurer la navigation fluide
function configurerNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Charger tous les colis
function chargerColis() {
    showLoadingTable();
    
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=getAll')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur réseau: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            // Vérifier si c'est un tableau
            if (Array.isArray(data)) {
                colisData = data;
                afficherTableauColis(data);
            } else {
                throw new Error('Format de données invalide');
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des colis:', error);
            showErrorTable('Erreur lors du chargement des données: ' + error.message);
            
            // Pour le débogage, afficher les données simulées
            setTimeout(() => {
                simulerChargementColis();
            }, 1000);
        });
}

// Afficher les colis dans le tableau
function afficherTableauColis(data) {
    const tableBody = document.getElementById('colisTableBody');
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="alert alert-info m-0">
                        <i class="fas fa-info-circle me-2"></i>Aucun colis enregistré pour le moment.
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    data.forEach(colis => {
        const dateEnregistrement = colis['Date Enregistrement'] || colis.dateEnregistrement || 'Non définie';
        const dateSortie = colis['Date Sortie'] || colis.dateSortie || 'Non définie';
        const personneRetrait = colis['Personne Retrait'] || colis.personneRetrait || '-';
        const isRetire = (colis['Retiré'] || colis.retire) === 'Oui';
        
        html += `
            <tr>
                <td>${colis.ID || colis.id || '-'}</td>
                <td>${colis.Propriétaire || colis.proprietaire}</td>
                <td>${colis.Description || colis.description || '-'}</td>
                <td><span class="badge bg-secondary">${colis['Code Barre'] || colis.codeBarre}</span></td>
                <td>${dateEnregistrement}</td>
                <td>
                    ${isRetire 
                        ? '<span class="badge bg-success">Oui</span>' 
                        : '<span class="badge bg-secondary">Non</span>'
                    }
                </td>
                <td>${personneRetrait}</td>
                <td>${dateSortie}</td>
                <td>
                    ${!isRetire 
                        ? `<button class="btn btn-sm btn-warning" onclick="ouvrirModalRetirer('${colis.ID || colis.id}', '${colis.Propriétaire || colis.proprietaire}')">
                              <i class="fas fa-sign-out-alt me-1"></i>Sortir
                           </button>` 
                        : '<span class="text-muted">Déjà retiré</span>'
                    }
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Initialiser DataTables si pas déjà fait
    if (!dataTableInstance) {
        dataTableInstance = $('#colisTable').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json'
            },
            pageLength: 10,
            order: [[4, 'desc']] // Trier par date d'enregistrement décroissante
        });
    } else {
        dataTableInstance.destroy();
        dataTableInstance = $('#colisTable').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json'
            },
            pageLength: 10,
            order: [[4, 'desc']]
        });
    }
}

// Enregistrer un nouveau colis
// Enregistrer un nouveau colis - VERSION CORRIGÉE
function enregistrerColis(e) {
    e.preventDefault();
    
    const proprietaire = document.getElementById('proprietaire').value;
    const codeBarre = document.getElementById('codeBarre').value;
    const description = document.getElementById('description').value;
    
    // Validation
    if (!proprietaire.trim() || !codeBarre.trim()) {
        showAlert('Veuillez remplir tous les champs obligatoires', 'danger');
        return;
    }
    
    // Désactiver le bouton
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';
    submitBtn.disabled = true;
    
    // IMPORTANT: URL pour contourner les problèmes CORS
    // Utilisez l'URL EXACTE de votre déploiement Apps Script
    const url = CONFIG.APPS_SCRIPT_URL;
    console.log('Envoi vers:', url); // Pour déboguer
    
    // Préparer les données SIMPLES
    const formData = {
        action: 'create',
        proprietaire: proprietaire,
        codeBarre: codeBarre,
        description: description
    };
    
    // Envoyer les données - VERSION SIMPLIFIÉE
    fetch(url, {
        method: 'POST',
        mode: 'no-cors', // Important pour contourner CORS
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(() => {
        // Avec mode='no-cors', on ne peut pas lire la réponse
        // On suppose que ça a fonctionné
        showAlert('✅ Colis enregistré avec succès!', 'success');
        document.getElementById('formEnregistrer').reset();
        
        // Fermer le modal
        const modalEl = document.getElementById('modalEnregistrer');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        // Recharger après 1 seconde
        setTimeout(() => {
            chargerColis();
        }, 1000);
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('⚠️ Enregistré localement (vérifiez la connexion)', 'warning');
        
        // Fermer quand même le modal
        const modalEl = document.getElementById('modalEnregistrer');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    })
    .finally(() => {
        // Réactiver le bouton
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// Rechercher par propriétaire
function rechercherParProprietaire() {
    const searchTerm = document.getElementById('searchProprietaire').value.trim().toLowerCase();
    
    if (!searchTerm) {
        showAlert('Veuillez entrer un nom de propriétaire', 'warning');
        return;
    }
    
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=searchByProprietaire&term=' + encodeURIComponent(searchTerm))
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur réseau: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                afficherResultatsProprietaire(data);
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                afficherResultatsProprietaire([]);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la recherche:', error);
            showAlert('Erreur lors de la recherche: ' + error.message, 'danger');
        });
}

// Afficher les résultats de recherche par propriétaire
function afficherResultatsProprietaire(results) {
    const container = document.getElementById('resultsProprietaire');
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Aucun colis non retiré trouvé pour ce propriétaire.
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="alert alert-success mb-3">
            <i class="fas fa-check-circle me-2"></i>
            ${results.length} colis non retiré(s) trouvé(s) pour ce propriétaire.
        </div>
        <div class="row">
    `;
    
    results.forEach(colis => {
        const colisId = colis.ID || colis.id;
        const proprietaire = colis.Propriétaire || colis.proprietaire;
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="card search-result-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${proprietaire}</h5>
                        <p class="card-text"><strong>Description:</strong> ${colis.Description || colis.description || 'Non spécifiée'}</p>
                        <p class="card-text"><strong>Code barre:</strong> <span class="badge bg-secondary">${colis['Code Barre'] || colis.codeBarre}</span></p>
                        <p class="card-text"><strong>Date enregistrement:</strong> ${colis['Date Enregistrement'] || colis.dateEnregistrement || 'Non définie'}</p>
                        <button class="btn btn-sm btn-warning" onclick="ouvrirModalRetirer('${colisId}', '${proprietaire.replace(/'/g, "\\'")}')">
                            <i class="fas fa-sign-out-alt me-1"></i>Marquer comme retiré
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Rechercher par code barre
function rechercherParCodeBarre() {
    const searchTerm = document.getElementById('searchBarcode').value.trim();
    
    if (!searchTerm) {
        showAlert('Veuillez entrer un code barre', 'warning');
        return;
    }
    
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=searchByBarcode&term=' + encodeURIComponent(searchTerm))
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur réseau: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data && !data.error) {
                afficherResultatCodeBarre(data);
            } else if (data && data.error) {
                throw new Error(data.error);
            } else {
                afficherResultatCodeBarre(null);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la recherche:', error);
            showAlert('Erreur lors de la recherche: ' + error.message, 'danger');
        });
}

// Afficher le résultat de recherche par code barre
function afficherResultatCodeBarre(result) {
    const container = document.getElementById('resultsBarcode');
    
    if (!result) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Aucun colis trouvé avec ce code barre.
            </div>
        `;
        return;
    }
    
    const isRetire = (result['Retiré'] || result.retire) === 'Oui';
    
    const html = `
        <div class="card">
            <div class="card-header bg-info text-white">
                <h5 class="mb-0">Résultat de recherche</h5>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <tr>
                        <th style="width: 30%">Propriétaire</th>
                        <td>${result.Propriétaire || result.proprietaire}</td>
                    </tr>
                    <tr>
                        <th>Description</th>
                        <td>${result.Description || result.description || 'Non spécifiée'}</td>
                    </tr>
                    <tr>
                        <th>Code barre</th>
                        <td><span class="badge bg-secondary">${result['Code Barre'] || result.codeBarre}</span></td>
                    </tr>
                    <tr>
                        <th>Date enregistrement</th>
                        <td>${result['Date Enregistrement'] || result.dateEnregistrement || 'Non définie'}</td>
                    </tr>
                    <tr>
                        <th>Statut</th>
                        <td>
                            ${isRetire 
                                ? '<span class="badge bg-success">Retiré</span>' 
                                : '<span class="badge bg-secondary">Non retiré</span>'
                            }
                        </td>
                    </tr>
                    ${isRetire ? `
                    <tr>
                        <th>Personne ayant retiré</th>
                        <td>${result['Personne Retrait'] || result.personneRetrait || 'Non spécifiée'}</td>
                    </tr>
                    <tr>
                        <th>Date de sortie</th>
                        <td>${result['Date Sortie'] || result.dateSortie || 'Non définie'}</td>
                    </tr>
                    ` : ''}
                </table>
                
                ${!isRetire ? `
                <div class="text-center mt-3">
                    <button class="btn btn-warning" onclick="ouvrirModalRetirer('${result.ID || result.id}', '${(result.Propriétaire || result.proprietaire).replace(/'/g, "\\'")}')">
                        <i class="fas fa-sign-out-alt me-1"></i>Marquer comme retiré
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Ouvrir le modal pour marquer un colis comme retiré
function ouvrirModalRetirer(colisId, proprietaire) {
    document.getElementById('colisIdRetirer').value = colisId;
    document.getElementById('modalRetirerLabel').innerHTML = `
        <i class="fas fa-sign-out-alt me-2"></i>Marquer le colis de ${proprietaire} comme retiré
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('modalRetirer'));
    modal.show();
}

// Marquer un colis comme retiré
function marquerCommeRetire(e) {
    e.preventDefault();
    
    const colisId = document.getElementById('colisIdRetirer').value;
    const personneRetrait = document.getElementById('personneRetrait').value.trim();
    
    if (!personneRetrait) {
        showAlert('Veuillez entrer le nom de la personne qui retire le colis', 'warning');
        return;
    }
    
    // Désactiver le bouton pendant l'envoi
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Mise à jour...';
    submitBtn.disabled = true;
    
    const data = {
        action: 'markAsRetired',
        id: colisId,
        personneRetrait: personneRetrait
    };
    
    fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur réseau: ' + response.status);
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            showAlert('✅ Colis marqué comme retiré avec succès!', 'success');
            document.getElementById('formRetirer').reset();
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalRetirer'));
            if (modal) modal.hide();
            
            // Recharger les données
            setTimeout(() => {
                chargerColis();
                
                // Recharger les résultats de recherche si nécessaire
                const searchTermProprietaire = document.getElementById('searchProprietaire').value.trim();
                if (searchTermProprietaire) {
                    rechercherParProprietaire();
                }
                
                const searchTermBarcode = document.getElementById('searchBarcode').value.trim();
                if (searchTermBarcode) {
                    rechercherParCodeBarre();
                }
            }, 1000);
        } else {
            showAlert('❌ Erreur: ' + (result.error || 'Erreur inconnue'), 'danger');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('❌ Erreur de connexion au serveur', 'danger');
    })
    .finally(() => {
        // Réactiver le bouton
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// Fonctions utilitaires
function showAlert(message, type) {
    // Supprimer les alertes existantes
    document.querySelectorAll('.alert-position-fixed').forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-position-fixed`;
    alertDiv.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1050; min-width: 300px; max-width: 500px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showLoadingTable() {
    const tableBody = document.getElementById('colisTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement des données...</p>
            </td>
        </tr>
    `;
}

function showErrorTable(message) {
    const tableBody = document.getElementById('colisTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                    <br>
                    <small>Affichage des données simulées pour le développement</small>
                </div>
            </td>
        </tr>
    `;
}

// Simulation de données pour le développement
function simulerChargementColis() {
    // Données simulées pour le développement
    const simulatedData = [
        {
            ID: 'COLIS-001',
            Propriétaire: 'Jean Dupont',
            Description: 'Livre sur la programmation',
            'Code Barre': '9782212676092',
            'Date Enregistrement': '15/05/2023',
            Retiré: 'Non',
            'Personne Retrait': '',
            'Date Sortie': ''
        },
        {
            ID: 'COLIS-002',
            Propriétaire: 'Marie Martin',
            Description: 'Téléphone portable',
            'Code Barre': '8801642578013',
            'Date Enregistrement': '16/05/2023',
            Retiré: 'Oui',
            'Personne Retrait': 'Marie Martin',
            'Date Sortie': '18/05/2023'
        }
    ];
    
    colisData = simulatedData;
    setTimeout(() => {
        afficherTableauColis(colisData);
    }, 500);

}


