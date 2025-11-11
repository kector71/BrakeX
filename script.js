document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyCha4S_wLxI_CZY1Tc9FOJNA3cUTggISpU",
        authDomain: "brakexadmin.firebaseapp.com",
        projectId: "brakexadmin",
        storageBucket: "brakexadmin.firebasestorage.app",
        messagingSenderId: "799264562947",
        appId: "1:799264562947:web:52d860ae41a5c4b8f75336"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const appState = {
        data: [],
        filtered: [],
        currentPage: 1,
        favorites: new Set(),
        isFavoritesMode: false,
        activeManufacturer: null
    };
    const itemsPerPage = 24;
    const MAX_HISTORY = 5;
    let brandColorMap = {};
    const els = {
        body: document.body,
        headerX: document.querySelector('.header-x'),
        darkBtn: document.getElementById('darkBtn'),
        sunIcon: document.querySelector('.lp-icon-sun'),
        moonIcon: document.querySelector('.lp-icon-moon'),
        orbitalBtn: document.getElementById('orbitalBtn'),
        upBtn: document.getElementById('upBtn'),
        menuBtn: document.getElementById('menuBtn'),
        sideMenu: document.getElementById('side-menu'),
        sideMenuOverlay: document.getElementById('side-menu-overlay'),
        menuCloseBtn: document.getElementById('menuCloseBtn'),
        openGuideLink: document.getElementById('open-guide-link'),
        busqueda: document.getElementById('busquedaRapida'),
        marca: document.getElementById('filtroMarca'),
        modelo: document.getElementById('filtroModelo'),
        anio: document.getElementById('filtroAnio'),
        oem: document.getElementById('filtroOem'),
        fmsi: document.getElementById('filtroFmsi'),
        medidasAncho: document.getElementById('medidasAncho'),
        medidasAlto: document.getElementById('medidasAlto'),
        posDel: document.getElementById('positionDelantera'),
        posTras: document.getElementById('positionTrasera'),
        clearBtn: document.getElementById('clearFiltersBtn'),
        datalistMarca: document.getElementById('marcas'),
        datalistModelo: document.getElementById('modelos'),
        datalistAnio: document.getElementById('anios'),
        datalistOem: document.getElementById('oemList'),
        datalistFmsi: document.getElementById('fmsiList'),
        results: document.getElementById('results-container'),
        countContainer: document.getElementById('result-count-container'),
        paginationContainer: document.getElementById('pagination-container'),
        resultsHeaderCard: document.getElementById('results-header-card'),
        brandTagsContainer: document.getElementById('brand-tags-container'),
        footer: document.getElementById('footerBanner'),
        modal: document.getElementById('card-modal'),
        modalContent: document.querySelector('#card-modal .modal-content'),
        modalCloseBtn: document.querySelector('#card-modal .modal-close-btn'),
        modalCarousel: document.querySelector('#card-modal .modal-image-carousel'),
        modalRef: document.querySelector('#card-modal .modal-ref'),
        modalPosition: document.querySelector('#card-modal .modal-position'),
        searchContainer: document.getElementById('searchContainer'),
        modalAppsSpecs: document.querySelector('#card-modal .modal-apps-specs'),
        modalDetailsWrapper: document.getElementById('modalDetailsWrapper'),
        modalDetailsContent: document.getElementById('modalDetailsContent'),
        modalCounterWrapper: document.getElementById('modalCounterWrapper'),
        guideModal: document.getElementById('guide-modal'),
        guideModalContent: document.querySelector('#guide-modal .modal-content'),
        guideModalCloseBtn: document.querySelector('#guide-modal .modal-close-btn'),
        filtroFavoritosBtn: document.getElementById('filtroFavoritosBtn'),
        historialBtn: document.getElementById('historialBtn'),
        searchHistoryContainer: document.getElementById('searchHistoryContainer'),
        searchHistoryCard: document.getElementById('searchHistoryCard'),
        manufacturerTagsContainer: document.getElementById('manufacturer-tags-container'),
        qrLargeModal: document.getElementById('qr-large-modal'),
        qrLargeModalContent: document.querySelector('#qr-large-modal .modal-content'),
        qrLargeModalCloseBtn: document.querySelector('#qr-large-modal .modal-close-btn'),
        qrLargeTitle: document.getElementById('qr-large-title'),
        qrLargeCanvasContainer: document.getElementById('qr-large-canvas-container'),
    };

    function addToSearchHistory(query) {
        if (!query.trim()) return;
        let history = JSON.parse(localStorage.getItem('brakeXSearchHistory') || '[]');
        history = history.filter(q => q !== query);
        history.unshift(query);
        history = history.slice(0, MAX_HISTORY);
        localStorage.setItem('brakeXSearchHistory', JSON.stringify(history));
        renderSearchHistory();
    }

    function deleteFromSearchHistory(query) {
        if (!query.trim()) return;
        let history = JSON.parse(localStorage.getItem('brakeXSearchHistory') || '[]');
        history = history.filter(q => q !== query);
        localStorage.setItem('brakeXSearchHistory', JSON.stringify(history));
        renderSearchHistory();
    }

    function renderSearchHistory() {
        const history = JSON.parse(localStorage.getItem('brakeXSearchHistory') || '[]');
        const container = els.searchHistoryContainer;
        if (!container) return;
        
        container.innerHTML = history.map(q =>
            `<button class="search-history-item" data-query="${q}">
                ${q}
                <span class="delete-history-item" data-query-delete="${q}" role="button" aria-label="Eliminar ${q}">&times;</span>
            </button>`
        ).join('');
    }

    const loadFavorites = () => {
        try {
            const favs = localStorage.getItem('brakeXFavorites');
            if (favs) {
                appState.favorites = new Set(JSON.parse(favs).map(Number));
            }
        } catch (e) {
            console.error("Error al cargar favoritos:", e);
            appState.favorites = new Set();
        }
    };

    const saveFavorites = () => {
        try {
            localStorage.setItem('brakeXFavorites', JSON.stringify([...appState.favorites]));
        } catch (e) {
            console.error("Error al guardar favoritos:", e);
        }
    };

    const toggleFavorite = (e) => {
        e.stopPropagation();
        const button = e.currentTarget;
        const card = button.closest('.result-card');
        if (!card) return;
        const itemId = parseInt(card.dataset.id);
        if (isNaN(itemId)) return;
        if (appState.favorites.has(itemId)) {
            appState.favorites.delete(itemId);
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        } else {
            appState.favorites.add(itemId);
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
        }
        saveFavorites();
        if (appState.isFavoritesMode) {
            filterData();
        }
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const fillDatalist = (datalist, values) => {
        datalist.innerHTML = values.map(v => `<option value="${v}">`).join('');
    };

    const getPositionFilter = () => {
        const activePositions = [];
        if (els.posDel.classList.contains('active')) activePositions.push('Delantera');
        if (els.posTras.classList.contains('active')) activePositions.push('Trasera');
        return activePositions;
    };

    const getRefBadgeClass = (ref) => {
        if (typeof ref !== 'string') return 'ref-default';
        const upperRef = ref.toUpperCase();
        if (upperRef.endsWith('INC')) return 'ref-inc';
        if (upperRef.endsWith('BP')) return 'ref-bp';
        if (upperRef.startsWith('K')) return 'ref-k';
        if (upperRef.endsWith('BEX')) return 'ref-bex';
        return 'ref-default';
    };

    const getSortableRefNumber = (refArray) => {
        if (!Array.isArray(refArray) || refArray.length === 0) return Infinity;
        let primaryRef = refArray.find(ref => typeof ref === 'string' && ref.toUpperCase().startsWith('K-'));
        if (!primaryRef) primaryRef = refArray[0];
        const match = String(primaryRef).match(/(\d+)/);
        if (match && match[0]) return parseInt(match[0], 10);
        return Infinity;
    };

    const filterData = () => {
        if (!appState.data.length) return;
        const fbusq = (val) => val.toLowerCase().trim();
        const activePos = getPositionFilter();

        const filters = {
            busqueda: fbusq(els.busqueda.value),
            marca: fbusq(els.marca.value),
            modelo: fbusq(els.modelo.value),
            anio: fbusq(els.anio.value),
            oem: fbusq(els.oem.value),
            fmsi: fbusq(els.fmsi.value),
            ancho: parseFloat(els.medidasAncho.value),
            alto: parseFloat(els.medidasAlto.value),
            pos: activePos
        };

        const manufacturerFilter = appState.activeManufacturer;

        let preFilteredData = appState.data;
        if (appState.isFavoritesMode) {
            preFilteredData = appState.data.filter(item => appState.favorites.has(item._appId));
        }

        const filtered = preFilteredData.filter(item => {
            const safeAplicaciones = Array.isArray(item.aplicaciones) ? item.aplicaciones : [];
            const itemVehicles = safeAplicaciones.map(app => `${app.marca} ${app.serie} ${app.litros} ${app.año} ${app.especificacion}`).join(' ').toLowerCase();
            const itemPosicion = item.posición;
            const busqMatch = !filters.busqueda ||
                (Array.isArray(item.ref) && item.ref.some(r => typeof r === 'string' && r.toLowerCase().includes(filters.busqueda))) ||
                (Array.isArray(item.oem) && item.oem.some(o => typeof o === 'string' && o.toLowerCase().includes(filters.busqueda))) ||
                (Array.isArray(item.fmsi) && item.fmsi.some(f => typeof f === 'string' && f.toLowerCase().includes(filters.busqueda))) ||
                itemVehicles.includes(filters.busqueda);
            const appMatch = !filters.marca && !filters.modelo && !filters.anio ||
                safeAplicaciones.some(app =>
                    (!filters.marca || (app.marca && app.marca.toLowerCase().includes(filters.marca))) &&
                    (!filters.modelo || (app.serie && app.serie.toLowerCase().includes(filters.modelo))) &&
                    (!filters.anio || (app.año && String(app.año).toLowerCase().includes(filters.anio)))
                );
            const oemMatch = !filters.oem || (Array.isArray(item.oem) && item.oem.some(o => typeof o === 'string' && o.toLowerCase().includes(filters.oem)));
            const fmsiMatch = !filters.fmsi || (Array.isArray(item.fmsi) && item.fmsi.some(f => typeof f === 'string' && f.toLowerCase().includes(filters.fmsi)));
            let posMatch = true;
            if (filters.pos.length > 0) {
                posMatch = filters.pos.includes(itemPosicion);
            }
            const TOLERANCIA = 1.0;
            const anchoMatch = !filters.ancho || (item.anchoNum >= filters.ancho - TOLERANCIA && item.anchoNum <= filters.ancho + TOLERANCIA);
            const altoMatch = !filters.alto || (item.altoNum >= filters.alto - TOLERANCIA && item.altoNum <= filters.alto + TOLERANCIA);

            let manufacturerMatch = true;
            if (manufacturerFilter) {
                const allRefParts = (item.ref || []).flatMap(refStr => String(refStr).toUpperCase().split(' '));
                
                manufacturerMatch = allRefParts.some(refPart => {
                    if (manufacturerFilter === 'K') {
                        return refPart.startsWith('K');
                    }
                    if (manufacturerFilter === 'INC') {
                        return refPart.endsWith('INC');
                    }
                    if (manufacturerFilter === 'BP') {
                        return refPart.endsWith('BP');
                    }
                    if (manufacturerFilter === 'B') { 
                        return refPart.endsWith('BEX');
                    }
                    return false;
                });
            }

            return busqMatch && appMatch && oemMatch && fmsiMatch && posMatch && anchoMatch && altoMatch && manufacturerMatch;
        });

        const isFiltered = filters.busqueda || filters.marca || filters.modelo || filters.anio || filters.oem || filters.fmsi || !isNaN(filters.ancho) || !isNaN(filters.alto) || filters.pos.length > 0 || appState.isFavoritesMode || appState.activeManufacturer;

        appState.filtered = filtered;
        appState.currentPage = 1;
        renderCurrentPage();
        updateURLWithFilters();
        renderDynamicBrandTags(appState.filtered, isFiltered);
    };

    function navigateCarousel(carouselContainer, direction) {
        const track = carouselContainer.querySelector('.image-track');
        const images = carouselContainer.querySelectorAll('.result-image');
        const counter = els.modalCounterWrapper.querySelector('.carousel-counter');
        if (!track || images.length <= 1) return;
        let currentIndex = parseInt(track.dataset.currentIndex) || 0;
        const totalImages = images.length;
        let newIndex = currentIndex + direction;
        if (newIndex >= totalImages) newIndex = 0;
        else if (newIndex < 0) newIndex = totalImages - 1;
        track.style.transform = `translateX(-${newIndex * 100}%)`;
        track.dataset.currentIndex = newIndex;
        if (counter) counter.textContent = `${newIndex + 1}/${totalImages}`;
    }

    const renderApplicationsList = (aplicaciones) => {
        const safeAplicaciones = Array.isArray(aplicaciones) ? aplicaciones : [];
        const groupedApps = safeAplicaciones.reduce((acc, app) => {
            const marca = app.marca || 'N/A';
            if (!acc[marca]) acc[marca] = [];
            acc[marca].push(app);
            return acc;
        }, {});

        Object.keys(groupedApps).forEach(marca => {
            groupedApps[marca].sort((a, b) => {
                const serieA = a.serie || '';
                const serieB = b.serie || '';
                if (serieA < serieB) return -1;
                if (serieA > serieB) return 1;
                const anioA = a.año || '';
                const anioB = b.año || '';
                if (anioA < anioB) return -1;
                if (anioA > anioB) return 1;
                return 0;
            });
        });

        let appListHTML = '';
        for (const marca in groupedApps) {
            appListHTML += `<div class="app-brand-header">${marca.toUpperCase()}</div>`;
            groupedApps[marca].forEach(app => {
                appListHTML += `<div class="app-detail-row"><div>${app.serie || ''}</div><div>${app.litros || ''}</div><div>${app.año || ''}</div></div>`;
            });
        }
        return appListHTML;
    };

    const renderSpecs = (item) => {
        let specsHTML = `<div class="app-brand-header">ESPECIFICACIONES</div>`;
        specsHTML += `<div class="spec-details-grid">`;
        const refsSpecsHTML = (Array.isArray(item.ref) && item.ref.length > 0)
            ? item.ref.flatMap(ref => String(ref).split(' '))
                .map(part => `<span class="ref-badge spec-ref-badge ${getRefBadgeClass(part)}">${part}</span>`)
                .join('')
            : '<span class="ref-badge ref-badge-na spec-ref-badge">N/A</span>';
        specsHTML += `<div class="spec-label"><strong>Referencias</strong></div><div class="spec-value modal-ref-container">${refsSpecsHTML}</div>`;
        const oemText = (Array.isArray(item.oem) && item.oem.length > 0 ? item.oem.join(', ') : 'N/A');
        specsHTML += `<div class="spec-label"><strong>OEM</strong></div><div class="spec-value">${oemText}</div>`;
        const fmsiText = (Array.isArray(item.fmsi) && item.fmsi.length > 0 ? item.fmsi.join(', ') : 'N/A');
        specsHTML += `<div class="spec-label"><strong>Platina FMSI</strong></div><div class="spec-value">${fmsiText}</div>`;
        let medidasHTML = '';
        if (Array.isArray(item.medidas) && item.medidas.length > 0) {
            medidasHTML = item.medidas.map(medida => {
                const partes = String(medida).split(/x/i).map(s => s.trim());
                const ancho = partes[0] || 'N/A';
                const alto = partes[1] || 'N/A';
                return `<div>Ancho: ${ancho} x Alto: ${alto}</div>`;
            }).join('');
        } else {
            const anchoVal = item.anchoNum || 'N/A';
            const altoVal = item.altoNum || 'N/A';
            medidasHTML = `<div>Ancho: ${anchoVal} x Alto: ${altoVal}</div>`;
        }
        specsHTML += `<div class="spec-label"><strong>Medidas (mm)</strong></div><div class="spec-value">${medidasHTML}</div>`;
        specsHTML += `</div>`;
        return specsHTML;
    };

    const showSkeletonLoader = (count = 6) => {
        let skeletonHTML = '';
        for (let i = 0; i < count; i++) {
            skeletonHTML += `<div class="skeleton-card"><div class="skeleton-line long"></div><div class="skeleton-line short"></div><div class="skeleton-box"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>`;
        }
        els.results.innerHTML = skeletonHTML;
        els.paginationContainer.innerHTML = '';
    };

    function setupPagination(totalItems) {
        els.paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return;

        let paginationHTML = '';
        paginationHTML += `<button class="page-btn" data-page="${appState.currentPage - 1}" ${appState.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;

        const maxPagesToShow = 5;
        const halfPages = Math.floor(maxPagesToShow / 2);
        let startPage, endPage;

        if (totalPages <= maxPagesToShow) {
            startPage = 1;
            endPage = totalPages;
        } else if (appState.currentPage <= halfPages + 1) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (appState.currentPage >= totalPages - halfPages) {
            startPage = totalPages - maxPagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = appState.currentPage - halfPages;
            endPage = appState.currentPage + halfPages;
        }

        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<button class="page-btn" disabled>...</button>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<button class="page-btn ${i === appState.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<button class="page-btn" disabled>...</button>`;
            }
            paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        paginationHTML += `<button class="page-btn" data-page="${appState.currentPage + 1}" ${appState.currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
        els.paginationContainer.innerHTML = paginationHTML;
    };

    const renderCurrentPage = () => {
        const totalResults = appState.filtered.length;
        const startIndex = (appState.currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = appState.filtered.slice(startIndex, endIndex);

        const startNum = totalResults === 0 ? 0 : startIndex + 1;
        const endNum = Math.min(endIndex, totalResults);
        els.countContainer.innerHTML = `Mostrando <strong>${startNum}–${endNum}</strong> de <strong>${totalResults}</strong> resultados`;

        if (totalResults === 0) {
            const message = appState.isFavoritesMode
                ? 'No tienes favoritos guardados'
                : 'No se encontraron pastillas';
            const subMessage = appState.isFavoritesMode
                ? 'Haz clic en el corazón de una pastilla para guardarla.'
                : 'Intenta ajustar tus filtros de búsqueda.';
            els.results.innerHTML = `<div class="no-results-container"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"></path><path d="M21 21L16.65 16.65"></path><path d="M11 8V11L13 13"></path></svg><p>${message}</p><span>${subMessage}</span></div>`;
            els.paginationContainer.innerHTML = '';
            return;
        }

        els.results.innerHTML = paginatedData.map((item, index) => {
            const posBadgeClass = item.posición === 'Delantera' ? 'delantera' : 'trasera';
            const posBadge = `<span class="position-badge ${posBadgeClass}">${item.posición}</span>`;
            const refsHTML = (Array.isArray(item.ref) && item.ref.length > 0)
                ? item.ref.flatMap(ref => String(ref).split(' '))
                    .map(part => `<span class="ref-badge ${getRefBadgeClass(part)}">${part}</span>`)
                    .join('')
                : '<span class="ref-badge ref-badge-na">N/A</span>';

            let firstImageSrc = 'https://via.placeholder.com/300x200.png?text=No+Img';
            if (item.imagenes && item.imagenes.length > 0) {
                firstImageSrc = item.imagenes[0];
            } else if (item.imagen) {
                firstImageSrc = item.imagen.replace("text=", `text=Vista+1+`);
            }

            const safeAplicaciones = Array.isArray(item.aplicaciones) ? item.aplicaciones : [];
            const appSummaryItems = safeAplicaciones.slice(0, 3).map(app => `${app.marca} ${app.serie}`).filter((value, index, self) => self.indexOf(value) === index);
            let appSummaryHTML = '';
            if (appSummaryItems.length > 0) {
                appSummaryHTML = `<div class="card-app-summary">${appSummaryItems.join(', ')}${safeAplicaciones.length > 3 ? ', ...' : ''}</div>`;
            }

            const primaryRefForData = (Array.isArray(item.ref) && item.ref.length > 0) ? String(item.ref[0]).split(' ')[0] : 'N/A';
            const isFavorite = appState.favorites.has(item._appId);

            const favoriteBtnHTML = `
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${item._appId}" aria-label="Marcar como favorito" aria-pressed="${isFavorite}">
                    <svg class="heart-icon" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
            `;

            return `
                <div class="result-card" data-id="${item._appId}" style="animation-delay: ${index * 50}ms" tabindex="0" role="button" aria-haspopup="dialog">
                    ${favoriteBtnHTML}
                    <div class="card-thumbnail"><img src="${firstImageSrc}" alt="Referencia ${primaryRefForData}" class="result-image" loading="lazy"></div>
                    <div class="card-content-wrapper">
                        <div class="card-details">
                            <div class="card-ref-container">${refsHTML}</div>
                            ${posBadge}
                        </div>
                        ${appSummaryHTML}
                    </div>
                </div>`;
        }).join('');

        els.results.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', toggleFavorite);
        });

        setupPagination(totalResults);
    };

    function renderDynamicBrandTags(data, isFiltered) {
        if (!els.brandTagsContainer) return;

        const allBrandsList = data.flatMap(item => 
            (item.aplicaciones || []).map(app => app.marca)
        ).filter(Boolean);

        const brandFrequencies = allBrandsList.reduce((counts, brand) => {
            counts[brand] = (counts[brand] || 0) + 1;
            return counts;
        }, {});

        let brandsToShow = [];

        if (isFiltered) {
            brandsToShow = Object.entries(brandFrequencies)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 10)
                .map(([brand]) => brand);
        } else {
            const allUniqueBrands = Object.keys(brandFrequencies);
            const shuffleArray = (array) => {
                let newArr = [...array];
                for (let i = newArr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
                }
                return newArr;
            };
            brandsToShow = shuffleArray(allUniqueBrands).slice(0, 10);
        }

        const activeBrandFilter = els.marca.value.trim().toLowerCase();

        els.brandTagsContainer.innerHTML = brandsToShow.map(brand => {
            const colorVar = brandColorMap[brand] || '--brand-color-10'; 
            const isActive = brand.toLowerCase() === activeBrandFilter;
            
            return `<button 
                        class="brand-tag ${isActive ? 'active' : ''}" 
                        data-brand="${brand}" 
                        style="--tag-brand-color: var(${colorVar});"
                    >${brand}</button>`;
        }).join('');

        if (brandsToShow.length === 0) {
            els.brandTagsContainer.style.display = 'none';
        } else {
            els.brandTagsContainer.style.display = 'flex';
        }
    }

    function handleCardClick(event) {
        if (event.target.closest('.favorite-btn')) return;
        const card = event.target.closest('.result-card');
        if (card) {
            const itemId = card.dataset.id;
            const itemData = appState.data.find(item => item._appId == itemId);
            if (itemData) {
                openModal(itemData);
            }
        }
    }

    const updateScrollIndicator = () => {
        const wrapper = els.modalDetailsWrapper;
        const content = els.modalDetailsContent;
        if (wrapper && content) {
            const isScrollable = content.scrollHeight > content.clientHeight;
            const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 5;
            if (isScrollable && !isAtBottom) {
                wrapper.classList.add('scrollable');
            } else {
                wrapper.classList.remove('scrollable');
            }
        }
    };

    async function openModal(item) {
        const refsHeaderHTML = (Array.isArray(item.ref) && item.ref.length > 0)
            ? item.ref.flatMap(ref => String(ref).split(' '))
                .map(part => `<span class="ref-badge header-ref-badge ${getRefBadgeClass(part)}">${part}</span>`)
                .join('')
            : '<span class="ref-badge ref-badge-na header-ref-badge">N/A</span>';
        els.modalRef.innerHTML = `<div class="modal-header-ref-container">${refsHeaderHTML}</div>`;

        const posBadgeClass = item.posición === 'Delantera' ? 'delantera' : 'trasera';
        els.modalPosition.innerHTML = `<span class="position-badge ${posBadgeClass}">${item.posición}</span>`;

        let images = [];
        if (item.imagenes && item.imagenes.length > 0) {
            images = item.imagenes;
        } else if (item.imagen) {
            images = [
                item.imagen.replace("text=", `text=Vista+1+`),
                item.imagen.replace("text=", `text=Vista+2+`),
                item.imagen.replace("text=", `text=Vista+3+`)
            ];
        } else {
            images = ['https://via.placeholder.com/300x200.png?text=No+Img'];
        }

        const imageCount = images.length;
        let imageTrackHTML = '';
        const altRef = (Array.isArray(item.ref) && item.ref.length > 0) ? String(item.ref[0]).split(' ')[0] : 'N/A';
        images.forEach((imgSrc, i) => {
            imageTrackHTML += `<img src="${imgSrc}" alt="Referencia ${altRef} Vista ${i + 1}" class="result-image">`;
        });
        els.modalCarousel.innerHTML = `<div class="image-track" style="display:flex;" data-current-index="0">${imageTrackHTML}</div> ${imageCount > 1 ? `<button class="carousel-nav-btn" data-direction="-1" aria-label="Imagen anterior">‹</button><button class="carousel-nav-btn" data-direction="1" aria-label="Siguiente imagen">›</button>` : ''}`;

        els.modalCarousel.querySelectorAll('.carousel-nav-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const direction = parseInt(e.currentTarget.dataset.direction);
                navigateCarousel(els.modalCarousel, direction);
            };
        });

        if (imageCount > 1) {
            els.modalCounterWrapper.innerHTML = `<span class="carousel-counter">1/${imageCount}</span>`;
        } else {
            els.modalCounterWrapper.innerHTML = '';
        }

        els.modalAppsSpecs.innerHTML = `<div class="applications-list-container">${renderApplicationsList(item.aplicaciones)}${renderSpecs(item)}</div>`;
        
        const primaryRefForData = (Array.isArray(item.ref) && item.ref.length > 0) ? String(item.ref[0]).split(' ')[0] : 'N/A';
        const qrUrl = `${window.location.origin}${window.location.pathname}?busqueda=${encodeURIComponent(primaryRefForData)}`;
        
        const qrPlaceholderHTML = `
            <div class="app-brand-header" style="margin-top: 1.25rem;">COMPARTIR</div>
            <div id="small-qr-placeholder" class="small-qr-code" role="button" tabindex="0" aria-label="Haz clic para ampliar el QR">
                </div>
        `;
        els.modalAppsSpecs.innerHTML += qrPlaceholderHTML;

        await new Promise(resolve => requestAnimationFrame(resolve));

        // ==============================================================
        // 🟢 INICIA BLOQUE CORREGIDO: Se busca el QR dentro del modal
        // ==============================================================
        const qrPlaceholder = els.modalContent.querySelector('#small-qr-placeholder');
        // ==============================================================
        // 🔴 FIN BLOQUE CORREGIDO
        // ==============================================================
        
        if (qrPlaceholder) {
            try {
                const canvas = document.createElement('canvas');
                await QRCode.toCanvas(canvas, qrUrl, { 
                    margin: 1, 
                    color: {
                        dark: "#000000",
                        light: "#FFFFFF"
                    }
                });
                qrPlaceholder.innerHTML = '';
                qrPlaceholder.appendChild(canvas);
                
                qrPlaceholder.addEventListener('click', () => {
                    openLargeQrModal(qrUrl, primaryRefForData);
                });
            } catch (err) {
                console.error("Error al generar QR pequeño:", err);
                qrPlaceholder.innerText = "Error QR";
            }
        }

        els.modalContent.classList.remove('closing');
        els.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            setTimeout(() => {
                updateScrollIndicator();
                els.modalDetailsContent.addEventListener('scroll', updateScrollIndicator);
            }, 100);
        });
    }

    function closeModal() {
        els.modalContent.classList.add('closing');
        els.modalDetailsContent.removeEventListener('scroll', updateScrollIndicator);
        els.modalDetailsWrapper.classList.remove('scrollable');
        setTimeout(() => {
            els.modal.style.display = 'none';
            document.body.style.overflow = '';
            els.modalCarousel.innerHTML = '';
            els.modalRef.innerHTML = '';
            els.modalPosition.innerHTML = '';
            els.modalAppsSpecs.innerHTML = '';
            els.modalCounterWrapper.innerHTML = '';
            els.modalContent.classList.remove('closing');
        }, 220);
    }
    
    async function openLargeQrModal(url, ref) {
        els.qrLargeTitle.innerText = `Compartir: ${ref}`;
        els.qrLargeCanvasContainer.innerHTML = '';
        
        try {
            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, url, { 
                width: 280,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF"
                }
            });
            els.qrLargeCanvasContainer.appendChild(canvas);
        } catch (err) {
            console.error("Error al generar QR grande:", err);
            els.qrLargeCanvasContainer.innerText = "Error al generar QR.";
        }
        
        els.qrLargeModalContent.classList.remove('closing');
        els.qrLargeModal.style.display = 'flex';
    }

    function closeLargeQrModal() {
        els.qrLargeModalContent.classList.add('closing');
        setTimeout(() => {
            els.qrLargeModal.style.display = 'none';
            els.qrLargeModalContent.classList.remove('closing');
            els.qrLargeCanvasContainer.innerHTML = '';
        }, 220);
    }

    function openGuideModal() {
        els.guideModalContent.classList.remove('closing');
        els.guideModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeGuideModal() {
        els.guideModalContent.classList.add('closing');
        setTimeout(() => {
            els.guideModal.style.display = 'none';
            document.body.style.overflow = '';
            els.guideModalContent.classList.remove('closing');
        }, 220);
    }

    function openSideMenu() {
        els.sideMenu.classList.add('open');
        els.sideMenu.setAttribute('aria-hidden', 'false');
        els.sideMenuOverlay.style.display = 'block';
        requestAnimationFrame(() => {
            els.sideMenuOverlay.classList.add('visible');
        });
        els.menuBtn.setAttribute('aria-expanded', 'true');
        els.menuCloseBtn.focus();
    }

    function closeSideMenu() {
        els.sideMenu.classList.remove('open');
        els.sideMenu.setAttribute('aria-hidden', 'true');
        els.sideMenuOverlay.classList.remove('visible');
        els.menuBtn.setAttribute('aria-expanded', 'false');
        els.menuBtn.focus();
        els.sideMenuOverlay.addEventListener('transitionend', () => {
            if (!els.sideMenuOverlay.classList.contains('visible')) {
                els.sideMenuOverlay.style.display = 'none';
            }
        }, { once: true });
    }

    const clearAllFilters = () => {
        const inputsToClear = [els.busqueda, els.marca, els.modelo, els.anio, els.oem, els.fmsi, els.medidasAncho, els.medidasAlto];
        inputsToClear.forEach(input => input.value = '');
        els.posDel.classList.remove('active');
        els.posTras.classList.remove('active');
        
        if (els.manufacturerTagsContainer) {
            els.manufacturerTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => {
                activeTag.classList.remove('active');
            });
        }
        appState.activeManufacturer = null;

        appState.isFavoritesMode = false;
        els.filtroFavoritosBtn.classList.remove('active');
        els.filtroFavoritosBtn.setAttribute('aria-pressed', 'false');
        els.historialBtn.classList.remove('active');
        els.historialBtn.setAttribute('aria-pressed', 'false');
        els.searchHistoryCard.style.display = 'none';
        
        filterData();
    };

    const createRippleEffect = (event) => {
        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        const rect = button.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - (rect.left + radius)}px`;
        circle.style.top = `${event.clientY - (rect.top + radius)}px`;
        circle.classList.add('ripple');
        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) ripple.remove();
        button.appendChild(circle);
    };

    const updateURLWithFilters = () => {
        const params = new URLSearchParams();
        const filters = {
            busqueda: els.busqueda.value.trim(),
            marca: els.marca.value.trim(),
            modelo: els.modelo.value.trim(),
            anio: els.anio.value.trim(),
            oem: els.oem.value.trim(),
            fmsi: els.fmsi.value.trim(),
            ancho: els.medidasAncho.value.trim(),
            alto: els.medidasAlto.value.trim(),
        };
        for (const key in filters) { if (filters[key]) { params.set(key, filters[key]); } }
        const activePositions = getPositionFilter();
        if (activePositions.length > 0) { params.set('pos', activePositions.join(',')); }
        if (appState.isFavoritesMode) { params.set('favorites', 'true'); }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        history.pushState({}, '', newUrl);
    };

    const applyFiltersFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        els.busqueda.value = params.get('busqueda') || '';
        const brandFromURL = params.get('marca');
        els.marca.value = brandFromURL || '';
        els.modelo.value = params.get('modelo') || '';
        els.anio.value = params.get('anio') || '';
        els.oem.value = params.get('oem') || '';
        els.fmsi.value = params.get('fmsi') || '';
        els.medidasAncho.value = params.get('ancho') || '';
        els.medidasAlto.value = params.get('alto') || '';
        const posParam = params.get('pos');
        if (posParam) {
            if (posParam.includes('Delantera')) els.posDel.classList.add('active');
            if (posParam.includes('Trasera')) els.posTras.classList.add('active');
        }
        if (params.get('favorites') === 'true') {
            appState.isFavoritesMode = true;
            els.filtroFavoritosBtn.classList.add('active');
            els.filtroFavoritosBtn.setAttribute('aria-pressed', 'true');
        } else {
            appState.isFavoritesMode = false;
            els.filtroFavoritosBtn.classList.remove('active');
            els.filtroFavoritosBtn.setAttribute('aria-pressed', 'false');
        }
    };

    function setupEventListeners() {
        [els.darkBtn, els.upBtn, els.menuBtn, els.orbitalBtn, els.clearBtn].forEach(btn => btn?.addEventListener('click', createRippleEffect));

        const iconAnimation = (iconToShow, iconToHide) => {
            if (!iconToShow) return;
            const showKeyframes = [
                { opacity: 0, transform: 'translate(-50%, -50%) scale(0.6) rotate(-90deg)' },
                { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(0deg)' }
            ];
            const hideKeyframes = [
                { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(0deg)' },
                { opacity: 0, transform: 'translate(-50%, -50%) scale(0.6) rotate(90deg)' }
            ];
            const options = { duration: 400, fill: 'forwards', easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' };
            iconToShow.animate(showKeyframes, options);
            if (iconToHide) {
                iconToHide.animate(hideKeyframes, options);
            }
        };

        const applyLightTheme = () => {
            els.body.classList.remove('lp-dark', 'modo-orbital');
            iconAnimation(els.sunIcon, els.moonIcon);
            els.darkBtn.setAttribute('aria-pressed', 'false');
            els.darkBtn.setAttribute('aria-label', 'Activar modo oscuro');
            if (els.orbitalBtn) {
                els.orbitalBtn.classList.remove('active');
                els.orbitalBtn.setAttribute('aria-pressed', 'false');
            }
            localStorage.setItem('themePreference', 'light');
        };

        const applyAmoledDarkTheme = () => {
            els.body.classList.remove('modo-orbital');
            els.body.classList.add('lp-dark');
            iconAnimation(els.moonIcon, els.sunIcon);
            els.darkBtn.setAttribute('aria-pressed', 'true');
            els.darkBtn.setAttribute('aria-label', 'Activar modo claro');
            if (els.orbitalBtn) {
                els.orbitalBtn.classList.remove('active');
                els.orbitalBtn.setAttribute('aria-pressed', 'false');
            }
            localStorage.setItem('themePreference', 'dark');
        };

        const applyOrbitalTheme = () => {
            els.body.classList.remove('lp-dark');
            els.body.classList.add('modo-orbital');
            if (els.orbitalBtn) {
                els.orbitalBtn.classList.add('active');
                els.orbitalBtn.setAttribute('aria-pressed', 'true');
            }
            iconAnimation(els.sunIcon, els.moonIcon);
            els.darkBtn.setAttribute('aria-pressed', 'false');
            els.darkBtn.setAttribute('aria-label', 'Activar modo claro');
            localStorage.setItem('themePreference', 'orbital');
        };

        els.darkBtn.addEventListener('click', () => {
            els.headerX.style.animation = 'bounceHeader 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)';
            setTimeout(() => { els.headerX.style.animation = ''; }, 600);
            if (els.body.classList.contains('modo-orbital') || els.body.classList.contains('lp-dark')) {
                applyLightTheme();
            } else {
                applyAmoledDarkTheme();
            }
        });

        if (els.orbitalBtn) {
            els.orbitalBtn.addEventListener('click', () => {
                els.headerX.style.animation = 'bounceHeader 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)';
                setTimeout(() => { els.headerX.style.animation = ''; }, 600);
                const themeIcon = els.orbitalBtn.querySelector('.lp-icon-palette');
                if (themeIcon) {
                    themeIcon.animate([
                        { transform: 'translate(-50%, -50%) scale(0.8) rotate(0deg)', opacity: 0.7 },
                        { transform: 'translate(-50%, -50%) scale(1.2) rotate(30deg)', opacity: 1 },
                        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 }
                    ], { duration: 400, easing: 'ease-out' });
                }
                if (els.body.classList.contains('modo-orbital')) {
                    applyLightTheme();
                } else {
                    applyOrbitalTheme();
                }
            });
        }

        const savedTheme = localStorage.getItem('themePreference');
        switch (savedTheme) {
            case 'orbital':
                if (els.orbitalBtn) applyOrbitalTheme();
                else applyLightTheme();
                break;
            case 'dark':
                applyAmoledDarkTheme();
                break;
            case 'light':
                applyLightTheme();
                break;
            default:
                applyLightTheme();
                break;
        }

        els.upBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => { els.upBtn.classList.toggle('show', window.scrollY > 300); });
        els.menuBtn.addEventListener('click', openSideMenu);
        els.menuCloseBtn.addEventListener('click', closeSideMenu);
        els.sideMenuOverlay.addEventListener('click', closeSideMenu);
        els.openGuideLink.addEventListener('click', () => {
            closeSideMenu();
            setTimeout(openGuideModal, 50);
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && els.sideMenu.classList.contains('open')) {
                closeSideMenu();
            }
        });

        els.results.addEventListener('click', handleCardClick);

        const debouncedFilter = debounce(filterData, 300);
        els.filtroFavoritosBtn.addEventListener('click', () => {
            appState.isFavoritesMode = !appState.isFavoritesMode;
            if (appState.isFavoritesMode) {
                els.filtroFavoritosBtn.classList.add('active');
                els.filtroFavoritosBtn.setAttribute('aria-pressed', 'true');
            } else {
                els.filtroFavoritosBtn.classList.remove('active');
                els.filtroFavoritosBtn.setAttribute('aria-pressed', 'false');
            }
            filterData();
        });

        els.historialBtn?.addEventListener('click', () => {
            const isHistoryActive = els.historialBtn.getAttribute('aria-pressed') === 'true';
            if (isHistoryActive) {
                els.historialBtn.classList.remove('active');
                els.historialBtn.setAttribute('aria-pressed', 'false');
                els.searchHistoryCard.style.display = 'none';
            } else {
                els.historialBtn.classList.add('active');
                els.historialBtn.setAttribute('aria-pressed', 'true');
                els.searchHistoryCard.style.display = 'block';
                els.searchHistoryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        els.busqueda.addEventListener('input', (e) => {
            if (e.target.value.trim() !== '') {
                els.searchContainer.classList.add('active');
            } else {
                els.searchContainer.classList.remove('active');
            }
            addToSearchHistory(e.target.value);
            debouncedFilter();
        });

        const otherFilterInputs = [els.marca, els.modelo, els.anio, els.oem, els.fmsi, els.medidasAncho, els.medidasAlto];
        otherFilterInputs.forEach(input => input.addEventListener('input', debouncedFilter));

        [els.posDel, els.posTras].forEach(btn => btn.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('active');
            filterData();
        }));

        const trashLid = els.clearBtn.querySelector('.trash-lid');
        const trashBody = els.clearBtn.querySelector('.trash-body');
        const NUM_SPARKS = 10;
        const SPARK_COLORS = ['#00ffff', '#ff00ff', '#00ff7f', '#ffc700', '#ff5722'];

        function createSparks(button) {
            for (let i = 0; i < NUM_SPARKS; i++) {
                const spark = document.createElement('div');
                spark.classList.add('spark');
                const size = Math.random() * 4 + 3;
                spark.style.width = `${size}px`;
                spark.style.height = `${size}px`;
                spark.style.backgroundColor = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
                spark.style.left = `calc(50% + ${Math.random() * 20 - 10}px)`;
                spark.style.top = `calc(50% + ${Math.random() * 20 - 10}px)`;
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 25 + 20;
                const sparkX = Math.cos(angle) * distance;
                const sparkY = Math.sin(angle) * distance;
                spark.style.setProperty('--spark-x', `${sparkX}px`);
                spark.style.setProperty('--spark-y', `${sparkY}px`);
                button.appendChild(spark);
                spark.addEventListener('animationend', () => spark.remove(), { once: true });
            }
        }

        els.clearBtn.addEventListener('click', (e) => {
            if (els.clearBtn.disabled) return;
            els.clearBtn.disabled = true;
            if (trashLid) trashLid.classList.add('animate-lid');
            if (trashBody) trashBody.classList.add('animate-body');
            createSparks(els.clearBtn);
            clearAllFilters();
            setTimeout(() => {
                if (trashLid) trashLid.classList.remove('animate-lid');
                if (trashBody) trashBody.classList.remove('animate-body');
                els.clearBtn.disabled = false;
            }, 900);
        });

        if (els.brandTagsContainer) {
            els.brandTagsContainer.addEventListener('click', (e) => {
                const tag = e.target.closest('.brand-tag');
                if (!tag) return;
                const brand = tag.dataset.brand;
                const isActive = tag.classList.contains('active');

                if (isActive) {
                    els.marca.value = '';
                } else {
                    els.marca.value = brand;
                }
                filterData();
            });
        }

        if (els.manufacturerTagsContainer) {
            els.manufacturerTagsContainer.addEventListener('click', (e) => {
                const tag = e.target.closest('.brand-tag');
                if (!tag) return;
                
                const manufacturer = tag.dataset.manufacturer;
                const isActive = tag.classList.contains('active');

                els.manufacturerTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => {
                    if (activeTag !== tag) {
                        activeTag.classList.remove('active');
                    }
                });

                if (isActive) {
                    tag.classList.remove('active');
                    appState.activeManufacturer = null;
                } else {
                    tag.classList.add('active');
                    appState.activeManufacturer = manufacturer;
                }
                
                filterData();
            });
        }

        els.paginationContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.disabled || btn.classList.contains('active')) return;
            const newPage = parseInt(btn.dataset.page);
            if (newPage) {
                appState.currentPage = newPage;
                renderCurrentPage();
                els.resultsHeaderCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        document.addEventListener('click', (e) => {
            const historyItem = e.target.closest('.search-history-item');
            const deleteBtn = e.target.closest('.delete-history-item');

            if (deleteBtn) {
                e.stopPropagation(); 
                const queryToDelete = deleteBtn.dataset.queryDelete;
                deleteFromSearchHistory(queryToDelete);
            
            } else if (historyItem) {
                els.busqueda.value = historyItem.dataset.query;
                filterData();
                els.busqueda.focus();
            }
        });

        
        els.qrLargeModalCloseBtn.addEventListener('click', closeLargeQrModal);
        els.qrLargeModal.addEventListener('click', (event) => { 
            if (event.target === els.qrLargeModal) closeLargeQrModal(); 
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && els.qrLargeModal.style.display === 'flex') {
                closeLargeQrModal();
            }
        });

        els.modalCloseBtn.addEventListener('click', closeModal);
        els.modal.addEventListener('click', (event) => { if (event.target === els.modal) closeModal(); });
        els.guideModalCloseBtn.addEventListener('click', closeGuideModal);
        els.guideModal.addEventListener('click', (event) => { if (event.target === els.guideModal) closeGuideModal(); });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && els.guideModal.style.display === 'flex') {
                closeGuideModal();
            }
        });
    }

    async function inicializarApp() {
        showSkeletonLoader();
        loadFavorites();
        renderSearchHistory();
        els.searchHistoryCard.style.display = 'none';
        try {
            const collectionRef = db.collection('pastillas');
            const snapshot = await collectionRef.get();
            if (snapshot.empty) {
                throw new Error("No se encontraron documentos en la colección 'pastillas'.");
            }
            let data = [];
            snapshot.forEach(doc => {
                const docData = doc.data();
                data.push(docData);
            });
            data = data.map((item, index) => {
                if (item.imagen && (!item.imagenes || item.imagenes.length === 0)) {
                    item.imagenes = [
                        item.imagen.replace("text=", `text=Vista+1+`),
                        item.imagen.replace("text=", `text=Vista+2+`),
                        item.imagen.replace("text=", `text=Vista+3+`)
                    ];
                }
                let medidaString = null;
                if (Array.isArray(item.medidas) && item.medidas.length > 0) {
                    medidaString = String(item.medidas[0]);
                } else if (typeof item.medidas === 'string') {
                    medidaString = item.medidas;
                }
                const partes = medidaString ? medidaString.split(/x/i).map(s => parseFloat(s.trim())) : [0, 0];
                const safeRefs = Array.isArray(item.ref) ? item.ref.map(String) : [];
                const safeOems = Array.isArray(item.oem) ? item.oem.map(String) : [];
                const safeFmsis = Array.isArray(item.fmsi) ? item.fmsi.map(String) : [];
                const aplicaciones = Array.isArray(item.aplicaciones) ? item.aplicaciones : [];
                return {
                    ...item,
                    aplicaciones: aplicaciones,
                    _appId: index,
                    ref: safeRefs,
                    oem: safeOems,
                    fmsi: safeFmsis,
                    anchoNum: partes[0] || 0,
                    altoNum: partes[1] || 0
                };
            });
            data.sort((a, b) => {
                const refA = getSortableRefNumber(a.ref);
                const refB = getSortableRefNumber(b.ref);
                return refA - refB;
            });
            appState.data = data;

            const getAllApplicationValues = (key) => {
                const allValues = new Set();
                appState.data.forEach(item => {
                    item.aplicaciones.forEach(app => {
                        const prop = (key === 'modelo') ? 'serie' : key;
                        if (app[prop]) allValues.add(String(app[prop]));
                    });
                });
                return [...allValues].sort();
            };

            fillDatalist(els.datalistMarca, getAllApplicationValues('marca'));
            fillDatalist(els.datalistModelo, getAllApplicationValues('modelo'));
            fillDatalist(els.datalistAnio, getAllApplicationValues('año'));

            const allOems = [...new Set(appState.data.flatMap(i => i.oem || []))].filter(Boolean).sort();
            const allFmsis = [...new Set(appState.data.flatMap(i => i.fmsi || []))].filter(Boolean).sort();
            fillDatalist(els.datalistOem, allOems);
            fillDatalist(els.datalistFmsi, allFmsis);

            const allBrandsList = appState.data.flatMap(item => item.aplicaciones.map(app => app.marca)).filter(Boolean);
            const brandFrequencies = allBrandsList.reduce((counts, brand) => {
                counts[brand] = (counts[brand] || 0) + 1;
                return counts;
            }, {});

            const allUniqueBrandsSorted = Object.keys(brandFrequencies).sort();
            
            const brandColors = [
                '--brand-color-1', '--brand-color-2', '--brand-color-3', '--brand-color-4',
                '--brand-color-5', '--brand-color-6', '--brand-color-7', '--brand-color-8',
                '--brand-color-9', '--brand-color-10',
                '--brand-color-11', '--brand-color-12', '--brand-color-13', '--brand-color-14',
                '--brand-color-15', '--brand-color-16', '--brand-color-17', '--brand-color-18',
                '--brand-color-19', '--brand-color-20'
            ];
            
            brandColorMap = {};
            
            allUniqueBrandsSorted.forEach((brand, index) => {
                brandColorMap[brand] = brandColors[index % brandColors.length];
            });

            applyFiltersFromURL();
            filterData();
            setupEventListeners();
        } catch (error) {
            console.error("Error al inicializar la app:", error);
            els.results.innerHTML = `<div class="no-results-container"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><path d="M12 9v4l-1.5 1.5"></path><path d="M12 3v1"></path><path d="M21 12h-1"></path><path d="M3 12H2"></path><path d="m18.36 17.36-.7.7"></path><path d="m6.34 6.34-.7-.7"></path></svg><p>Error al cargar datos</p><span>Por favor, revisa la consola para más detalles.</span></div>`;
        }
    }

    inicializarApp();
});