// Configuration de l'application - METTEZ VOTRE URL APPS SCRIPT ICI !
const CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzDa0WONITev7GJhplsixNzIFfDBxsRwGWxO4d--9w94bxpNDgC0amGEHTuAOOnK92LUw/exec'
};

// Variables globales
let colisData = [];
let dataTableInstance = null;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Application initialisée');
    console.log('URL Apps Script:', CONFIG.APPS_SCRIPT_URL);
    
    initApp();
});

// Initialiser l'application
function initApp() {
    // Tester la connexion à Apps Script
    testConnexion();
    
    // Charger les colis
    chargerColis();
    
    // Configurer la navigation
    configurerNavigation();
    
    // Afficher l'état de connexion
    updateConnectionStatus();
}

// Tester la connexion à Apps Script
function testConnexion() {
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=test')
        .then(response => response.text())
        .then(data => {
            console.log('Connexion Apps Script OK:', data);
            showConnectionStatus(true);
        })
        .catch(error => {
            console.error('Erreur de connexion:', error);
            showConnectionStatus(false);
        });
}

// Afficher l'état de connexion
function showConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-circle text-success me-1"></i> Connecté à Google Sheets';
            statusElement.className = 'navbar-text text-light ms-auto d-none d-lg-block';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle text-warning me-1"></i> Mode local';
            statusElement.className = 'navbar-text text-warning ms-auto d-none d-lg-block';
        }
    }
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

// ===========================
// FONCTIONS PRINCIPALES
// ===========================

// Charger tous les colis depuis Google Sheets
function chargerColis() {
    showLoadingTable();
    
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=getAll')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur HTTP: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Colis chargés:', data);
            colisData = data;
            afficherTableauColis(data);
            showConnectionStatus(true);
        })
        .catch(error => {
            console.error('Erreur lors du chargement:', error);
            showErrorTable('Impossible de charger depuis Google Sheets. Mode local activé.');
            showConnectionStatus(false);
            
            // Charger depuis le stockage local
            chargerColisLocal();
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
        const id = colis.ID || colis.id || '-';
        const proprietaire = colis.Propriétaire || colis.proprietaire || '-';
        const description = colis.Description || colis.description || '-';
        const codeBarre = colis['Code Barre'] || colis.codeBarre || '-';
        const dateEnregistrement = colis['Date Enregistrement'] || colis.dateEnregistrement || '-';
        const retire = colis.Retiré || colis.retire || 'Non';
        const personneRetrait = colis['Personne Retrait'] || colis.personneRetrait || '-';
        const dateSortie = colis['Date Sortie'] || colis.dateSortie || '-';
        
        const isRetire = retire === 'Oui';
        
        html += `
            <tr>
                <td>${id}</td>
                <td>${proprietaire}</td>
                <td>${description}</td>
                <td><span class="badge bg-secondary">${codeBarre}</span></td>
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
                        ? `<button class="btn btn-sm btn-warning" onclick="ouvrirModalRetirer('${id}', '${proprietaire.replace(/'/g, "\\'")}')">
                              <i class="fas fa-sign-out-alt me-1"></i>Sortir
                           </button>` 
                        : '<span class="text-muted">Déjà retiré</span>'
                    }
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Initialiser/rafraîchir DataTables
    if (!dataTableInstance) {
        dataTableInstance = $('#colisTable').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/fr-FR.json'
            },
            pageLength: 10,
            order: [[4, 'desc']]
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

// ===========================
// ENREGISTREMENT D'UN COLIS
// ===========================

function enregistrerColis(e) {
    e.preventDefault();
    
    // Récupérer les valeurs du formulaire
    const proprietaire = document.getElementById('proprietaire').value.trim();
    const codeBarre = document.getElementById('codeBarre').value.trim();
    const description = document.getElementById('description').value.trim();
    
    // Validation
    if (!proprietaire || !codeBarre) {
        showAlert('⚠️ Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }
    
    // Désactiver le bouton pour éviter les doubles clics
    const submitBtn = document.getElementById('btnSubmitEnregistrer');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';
    submitBtn.disabled = true;
    
    // Préparer les données
    const colisData = {
        action: 'create',
        proprietaire: proprietaire,
        codeBarre: codeBarre,
        description: description
    };
    
    console.log('Envoi des données:', colisData);
    
    // Envoyer à Google Sheets via Apps Script
    fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(colisData)
    })
    .then(response => {
        console.log('Réponse reçue, status:', response.status);
        if (!response.ok) {
            throw new Error('Erreur HTTP: ' + response.status);
        }
        return response.json();
    })
    .then(result => {
        console.log('Résultat:', result);
        
        if (result.success) {
            // Succès
            showAlert('✅ Colis enregistré avec succès! ID: ' + result.id, 'success');
            
            // Réinitialiser le formulaire
            document.getElementById('formEnregistrer').reset();
            
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEnregistrer'));
            if (modal) modal.hide();
            
            // Recharger les données après un délai
            setTimeout(() => {
                chargerColis();
            }, 1000);
            
        } else {
            // Erreur du serveur
            showAlert('❌ Erreur: ' + (result.error || 'Erreur inconnue'), 'danger');
        }
    })
    .catch(error => {
        console.error('Erreur d\'envoi:', error);
        
        // Enregistrer localement en fallback
        enregistrerColisLocal(proprietaire, codeBarre, description);
        
        showAlert('⚠️ Enregistré localement (problème de connexion)', 'warning');
        
        // Fermer le modal quand même
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEnregistrer'));
        if (modal) modal.hide();
    })
    .finally(() => {
        // Réactiver le bouton
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// ===========================
// RECHERCHE DE COLIS
// ===========================

function rechercherParProprietaire() {
    const searchTerm = document.getElementById('searchProprietaire').value.trim();
    
    if (!searchTerm) {
        showAlert('Veuillez entrer un nom de propriétaire', 'warning');
        return;
    }
    
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=searchByProprietaire&term=' + encodeURIComponent(searchTerm))
        .then(response => response.json())
        .then(data => {
            afficherResultatsProprietaire(data);
        })
        .catch(error => {
            console.error('Erreur recherche:', error);
            rechercherParProprietaireLocal(searchTerm);
        });
}

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

function rechercherParCodeBarre() {
    const searchTerm = document.getElementById('searchBarcode').value.trim();
    
    if (!searchTerm) {
        showAlert('Veuillez entrer un code barre', 'warning');
        return;
    }
    
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=searchByBarcode&term=' + encodeURIComponent(searchTerm))
        .then(response => response.json())
        .then(data => {
            afficherResultatCodeBarre(data);
        })
        .catch(error => {
            console.error('Erreur recherche:', error);
            rechercherParCodeBarreLocal(searchTerm);
        });
}

function afficherResultatCodeBarre(result) {
    const container = document.getElementById('resultsBarcode');
    
    if (!result || Object.keys(result).length === 0) {
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

// ===========================
// GESTION DES SORTIES
// ===========================

function ouvrirModalRetirer(colisId, proprietaire) {
    document.getElementById('colisIdRetirer').value = colisId;
    document.getElementById('modalRetirerLabel').innerHTML = `
        <i class="fas fa-sign-out-alt me-2"></i>Marquer le colis de ${proprietaire} comme retiré
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('modalRetirer'));
    modal.show();
}

function marquerCommeRetire(e) {
    e.preventDefault();
    
    const colisId = document.getElementById('colisIdRetirer').value;
    const personneRetrait = document.getElementById('personneRetrait').value.trim();
    
    if (!personneRetrait) {
        showAlert('Veuillez entrer le nom de la personne qui retire le colis', 'warning');
        return;
    }
    
    // Désactiver le bouton
    const submitBtn = document.getElementById('btnSubmitRetirer');
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
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
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
        showAlert('⚠️ Mise à jour locale (problème de connexion)', 'warning');
        marquerCommeRetireLocal(colisId, personneRetrait);
        
        // Fermer le modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalRetirer'));
        if (modal) modal.hide();
    })
    .finally(() => {
        // Réactiver le bouton
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// ===========================
// FONCTIONS UTILITAIRES
// ===========================

function showAlert(message, type) {
    // Supprimer les alertes existantes
    document.querySelectorAll('.alert-fixed').forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-fixed`;
    alertDiv.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1050; min-width: 300px; max-width: 500px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
           
