// Configuration de l'application
const CONFIG = {
    // URL de votre script Apps Script (à remplacer par votre URL)
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwfzpw-4DYB_ZfrR3ULBcbH1Yk8k6QNhONeFbFR5CXtIJL39cwlVa1wskYHwscMN_uHFw/exec'
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
    
    // Pour le développement, utiliser des données simulées
    // En production, remplacer par un appel à Apps Script
    simulerChargementColis();
    
    // En production, décommenter ceci:
    /*
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=getAll')
        .then(response => response.json())
        .then(data => {
            colisData = data;
            afficherTableauColis(data);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des colis:', error);
            showErrorTable('Erreur lors du chargement des données');
        });
    */
}

// Afficher les colis dans le tableau
function afficherTableauColis(data) {
    const tableBody = document.getElementById('colisTableBody');
    
    if (data.length === 0) {
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
        const dateEnregistrement = colis.dateEnregistrement || 'Non définie';
        const dateSortie = colis.dateSortie || 'Non définie';
        const personneRetrait = colis.personneRetrait || '-';
        const isRetire = colis.retire === 'Oui';
        
        html += `
            <tr>
                <td>${colis.id || '-'}</td>
                <td>${colis.proprietaire}</td>
                <td>${colis.description || '-'}</td>
                <td><span class="badge bg-secondary">${colis.codeBarre}</span></td>
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
                        ? `<button class="btn btn-sm btn-warning" onclick="ouvrirModalRetirer('${colis.id}', '${colis.proprietaire}')">
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
    
    // Simuler l'enregistrement
    const newColis = {
        id: generateId(),
        proprietaire: proprietaire,
        codeBarre: codeBarre,
        description: description,
        dateEnregistrement: new Date().toLocaleDateString('fr-FR'),
        retire: 'Non',
        personneRetrait: '',
        dateSortie: ''
    };
    
    // Pour le développement, ajouter aux données locales
    colisData.unshift(newColis);
    afficherTableauColis(colisData);
    
    // En production, décommenter ceci:
    /*
    const data = {
        action: 'create',
        proprietaire: proprietaire,
        codeBarre: codeBarre,
        description: description
    };
    
    fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showAlert('Colis enregistré avec succès!', 'success');
            document.getElementById('formEnregistrer').reset();
            bootstrap.Modal.getInstance(document.getElementById('modalEnregistrer')).hide();
            chargerColis();
        } else {
            showAlert('Erreur lors de l\'enregistrement: ' + result.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur lors de l\'enregistrement', 'danger');
    });
    */
    
    showAlert('Colis enregistré avec succès!', 'success');
    document.getElementById('formEnregistrer').reset();
    bootstrap.Modal.getInstance(document.getElementById('modalEnregistrer')).hide();
}

// Rechercher par propriétaire
function rechercherParProprietaire() {
    const searchTerm = document.getElementById('searchProprietaire').value.trim().toLowerCase();
    
    if (!searchTerm) {
        showAlert('Veuillez entrer un nom de propriétaire', 'warning');
        return;
    }
    
    // Pour le développement, filtrer les données locales
    const results = colisData.filter(colis => 
        colis.proprietaire.toLowerCase().includes(searchTerm) && 
        colis.retire === 'Non'
    ).slice(0, 10); // Limiter à 10 résultats
    
    afficherResultatsProprietaire(results);
    
    // En production, décommenter ceci:
    /*
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=searchByProprietaire&term=' + encodeURIComponent(searchTerm))
        .then(response => response.json())
        .then(data => {
            afficherResultatsProprietaire(data);
        })
        .catch(error => {
            console.error('Erreur lors de la recherche:', error);
            showAlert('Erreur lors de la recherche', 'danger');
        });
    */
}

// Afficher les résultats de recherche par propriétaire
function afficherResultatsProprietaire(results) {
    const container = document.getElementById('resultsProprietaire');
    
    if (results.length === 0) {
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
        html += `
            <div class="col-md-6 mb-3">
                <div class="card search-result-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${colis.proprietaire}</h5>
                        <p class="card-text"><strong>Description:</strong> ${colis.description || 'Non spécifiée'}</p>
                        <p class="card-text"><strong>Code barre:</strong> <span class="badge bg-secondary">${colis.codeBarre}</span></p>
                        <p class="card-text"><strong>Date enregistrement:</strong> ${colis.dateEnregistrement || 'Non définie'}</p>
                        <button class="btn btn-sm btn-warning" onclick="ouvrirModalRetirer('${colis.id}', '${colis.proprietaire}')">
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
    
    // Pour le développement, filtrer les données locales
    const result = colisData.find(colis => colis.codeBarre === searchTerm);
    
    if (result) {
        afficherResultatCodeBarre(result);
    } else {
        afficherResultatCodeBarre(null);
    }
    
    // En production, décommenter ceci:
    /*
    fetch(CONFIG.APPS_SCRIPT_URL + '?action=searchByBarcode&term=' + encodeURIComponent(searchTerm))
        .then(response => response.json())
        .then(data => {
            afficherResultatCodeBarre(data);
        })
        .catch(error => {
            console.error('Erreur lors de la recherche:', error);
            showAlert('Erreur lors de la recherche', 'danger');
        });
    */
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
    
    const isRetire = result.retire === 'Oui';
    
    const html = `
        <div class="card">
            <div class="card-header bg-info text-white">
                <h5 class="mb-0">Résultat de recherche</h5>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <tr>
                        <th style="width: 30%">Propriétaire</th>
                        <td>${result.proprietaire}</td>
                    </tr>
                    <tr>
                        <th>Description</th>
                        <td>${result.description || 'Non spécifiée'}</td>
                    </tr>
                    <tr>
                        <th>Code barre</th>
                        <td><span class="badge bg-secondary">${result.codeBarre}</span></td>
                    </tr>
                    <tr>
                        <th>Date enregistrement</th>
                        <td>${result.dateEnregistrement || 'Non définie'}</td>
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
                        <td>${result.personneRetrait || 'Non spécifiée'}</td>
                    </tr>
                    <tr>
                        <th>Date de sortie</th>
                        <td>${result.dateSortie || 'Non définie'}</td>
                    </tr>
                    ` : ''}
                </table>
                
                ${!isRetire ? `
                <div class="text-center mt-3">
                    <button class="btn btn-warning" onclick="ouvrirModalRetirer('${result.id}', '${result.proprietaire}')">
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
    
    // Pour le développement, mettre à jour les données locales
    const colisIndex = colisData.findIndex(colis => colis.id === colisId);
    if (colisIndex !== -1) {
        colisData[colisIndex].retire = 'Oui';
        colisData[colisIndex].personneRetrait = personneRetrait;
        colisData[colisIndex].dateSortie = new Date().toLocaleDateString('fr-FR');
        
        afficherTableauColis(colisData);
        
        // Mettre à jour les résultats de recherche si nécessaire
        const searchTermProprietaire = document.getElementById('searchProprietaire').value.trim();
        if (searchTermProprietaire) {
            rechercherParProprietaire();
        }
        
        const searchTermBarcode = document.getElementById('searchBarcode').value.trim();
        if (searchTermBarcode) {
            rechercherParCodeBarre();
        }
    }
    
    // En production, décommenter ceci:
    /*
    const data = {
        action: 'markAsRetired',
        id: colisId,
        personneRetrait: personneRetrait
    };
    
    fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showAlert('Colis marqué comme retiré avec succès!', 'success');
            document.getElementById('formRetirer').reset();
            bootstrap.Modal.getInstance(document.getElementById('modalRetirer')).hide();
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
        } else {
            showAlert('Erreur: ' + result.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        showAlert('Erreur lors de la mise à jour', 'danger');
    });
    */
    
    showAlert('Colis marqué comme retiré avec succès!', 'success');
    document.getElementById('formRetirer').reset();
    bootstrap.Modal.getInstance(document.getElementById('modalRetirer')).hide();
}

// Fonctions utilitaires
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
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
                </div>
            </td>
        </tr>
    `;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Simulation de données pour le développement
function simulerChargementColis() {
    // Données simulées pour le développement
    const simulatedData = [
        {
            id: 'colis-001',
            proprietaire: 'Jean Dupont',
            description: 'Livre sur la programmation',
            codeBarre: '9782212676092',
            dateEnregistrement: '15/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        },
        {
            id: 'colis-002',
            proprietaire: 'Marie Martin',
            description: 'Téléphone portable',
            codeBarre: '8801642578013',
            dateEnregistrement: '16/05/2023',
            retire: 'Oui',
            personneRetrait: 'Marie Martin',
            dateSortie: '18/05/2023'
        },
        {
            id: 'colis-003',
            proprietaire: 'Pierre Durand',
            description: 'Vêtements',
            codeBarre: '1234567890123',
            dateEnregistrement: '17/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        },
        {
            id: 'colis-004',
            proprietaire: 'Sophie Bernard',
            description: 'Carte mère d\'ordinateur',
            codeBarre: '4567891230456',
            dateEnregistrement: '18/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        },
        {
            id: 'colis-005',
            proprietaire: 'Jean Dupont',
            description: 'Câble USB-C',
            codeBarre: '7890123456789',
            dateEnregistrement: '19/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        },
        {
            id: 'colis-006',
            proprietaire: 'Lucas Petit',
            description: 'Chargeur de portable',
            codeBarre: '2345678901234',
            dateEnregistrement: '20/05/2023',
            retire: 'Oui',
            personneRetrait: 'Lucas Petit',
            dateSortie: '21/05/2023'
        },
        {
            id: 'colis-007',
            proprietaire: 'Emma Roux',
            description: 'Enceinte Bluetooth',
            codeBarre: '3456789012345',
            dateEnregistrement: '21/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        },
        {
            id: 'colis-008',
            proprietaire: 'Thomas Moreau',
            description: 'Clavier mécanique',
            codeBarre: '5678901234567',
            dateEnregistrement: '22/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        },
        {
            id: 'colis-009',
            proprietaire: 'Jean Dupont',
            description: 'Souris gaming',
            codeBarre: '6789012345678',
            dateEnregistrement: '23/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        },
        {
            id: 'colis-010',
            proprietaire: 'Chloé Simon',
            description: 'Disque dur externe 1TB',
            codeBarre: '8901234567890',
            dateEnregistrement: '24/05/2023',
            retire: 'Non',
            personneRetrait: '',
            dateSortie: ''
        }
    ];
    
    colisData = simulatedData;
    setTimeout(() => {
        afficherTableauColis(colisData);
    }, 500); // Simuler un délai de chargement
}