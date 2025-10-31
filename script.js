// --- NUEVA FUNCIÓN AUXILIAR 1: Normalizar Años ---
/**
 * Convierte un string de año (ej. '95' o '2015') a un número de 4 dígitos.
 * Asume que '30' es el corte: '29' -> 2029, '30' -> 1930
 */
const normalizeYear = (yearStr) => {
    if (!yearStr) return NaN;
    // Convertir a String primero, por si el dato es numérico (ej. 1998)
    const num = parseInt(String(yearStr).trim());
    if (isNaN(num)) return NaN;
    
    const strNum = String(num); // Usar el string limpio
    
    // Manejar años de 2 dígitos
    if (strNum.length <= 2 && num >= 0 && num <= 99) {
        if (num < 30) { // 0-29 -> 2000-2029 (ej. '15' -> 2015)
            return 2000 + num;
        } else { // 30-99 -> 1930-1999 (ej. '95' -> 1995)
            return 1900 + num;
        }
    }
    // Manejar años de 4 dígitos
    if (strNum.length === 4) {
        return num;
    }
    return num; // Fallback
};

// --- NUEVA FUNCIÓN AUXILIAR 2: Interpretar Filtro de Año ---
/**
 * Convierte el input del filtro (ej. '95-15' o '2005') 
 * en un objeto de rango { start: 1995, end: 2015 }.
 */
const parseYearFilter = (filterString) => {
    if (!filterString) return null; // No hay filtro
    
    const trimmedString = filterString.trim();
    
    // Buscar un rango (ej. '1995-2015' o '95-15')
    if (trimmedString.includes('-')) {
        const parts = trimmedString.split('-').map(s => s.trim());
        // Asegurarse de que hay dos partes (ej. '2005-') no es válido
        if (parts.length === 2 && parts[0] && parts[1]) {
            const start = normalizeYear(parts[0]);
            const end = normalizeYear(parts[1]);
            
            if (!isNaN(start) && !isNaN(end)) {
                // Devolver { start: 1995, end: 2015 }
                return { start: Math.min(start, end), end: Math.max(start, end) };
            }
        }
    }
    
    // Si no es un rango válido, tratar como año único (ej. '2005' o '98')
    const singleYear = normalizeYear(trimmedString);
    if (!isNaN(singleYear)) {
        return { start: singleYear, end: singleYear }; // Devuelve { start: 1998, end: 1998 }
    }
    
    return null; // El filtro no es un año ni un rango válido
};


document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ESTADO CENTRALIZADO ---
    const appState = {
        data: [],      // Reemplaza a brakePadsData
        filtered: [],  // Reemplaza a filteredDataCache
        currentPage: 1 // Reemplaza a currentPage
    };

    const itemsPerPage = 24; // Constante, puede quedar fuera del estado
    let brandColorMap = {};

    const els = {
        body: document.body, headerX: document.querySelector('.header-x'), darkBtn: document.getElementById('darkBtn'),
        sunIcon: document.querySelector('.lp-icon-sun'), moonIcon: document.querySelector('.lp-icon-moon'),
        orbitalBtn: document.getElementById('orbitalBtn'),
        upBtn: document.getElementById('upBtn'),
        menuBtn: document.getElementById('menuBtn'),
        sideMenu: document.getElementById('side-menu'),
        sideMenuOverlay: document.getElementById('side-menu-overlay'),
        menuCloseBtn: document.getElementById('menuCloseBtn'),
        openGuideLink: document.getElementById('open-guide-link'),
        busqueda: document.getElementById('busquedaRapida'), marca: document.getElementById('filtroMarca'),
        modelo: document.getElementById('filtroModelo'), anio: document.getElementById('filtroAnio'),
        oem: document.getElementById('filtroOem'), fmsi: document.getElementById('filtroFmsi'),
        medidasAncho: document.getElementById('medidasAncho'), medidasAlto: document.getElementById('medidasAlto'),
        posDel: document.getElementById('positionDelantera'), posTras: document.getElementById('positionTrasera'),
        clearBtn: document.getElementById('clearFiltersBtn'),
        datalistMarca: document.getElementById('marcas'), datalistModelo: document.getElementById('modelos'),
        datalistAnio: document.getElementById('anios'), datalistOem: document.getElementById('oemList'),
        datalistFmsi: document.getElementById('fmsiList'),
        results: document.getElementById('results-container'),
        viewGridBtn: document.getElementById('viewGridBtn'),
        viewListBtn: document.getElementById('viewListBtn'),
        countContainer: document.getElementById('result-count-container'),
        paginationContainer: document.getElementById('pagination-container'),
        resultsHeaderCard: document.getElementById('results-header-card'),
        brandTagsContainer: document.getElementById('brand-tags-container'),
        footer: document.getElementById('footerBanner'),
        modal: document.getElementById('card-modal'),
        modalContent: document.querySelector('#card-modal .modal-content'),
        modalCloseBtn: document.querySelector('#card-modal .modal-close-btn'),
        modalCarousel: document.querySelector('#card-modal .modal-image-carousel'),
        modalRef: document.querySelector('#card-modal .modal-ref'), // Este es el H2 para el header
        modalPosition: document.querySelector('#card-modal .modal-position'),
        searchContainer: document.getElementById('searchContainer'),
        modalAppsSpecs: document.querySelector('#card-modal .modal-apps-specs'),
        modalDetailsWrapper: document.getElementById('modalDetailsWrapper'),
        modalDetailsContent: document.getElementById('modalDetailsContent'),
        modalCounterWrapper: document.getElementById('modalCounterWrapper'),
        guideModal: document.getElementById('guide-modal'),
        guideModalContent: document.querySelector('#guide-modal .modal-content'),
        guideModalCloseBtn: document.querySelector('#guide-modal .modal-close-btn')
    };

    // --- FUNCIONES COMPLETAS ---
    const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; };
    const fillDatalist = (datalist, values) => { datalist.innerHTML = values.map(v => `<option value="${v}">`).join(''); };
    const getPositionFilter = () => { const activePositions = []; if (els.posDel.classList.contains('active')) activePositions.push('Delantera'); if (els.posTras.classList.contains('active')) activePositions.push('Trasera'); return activePositions; };
    const hasVehicleFilters = () => { return els.busqueda.value.trim() !== '' || els.marca.value.trim() !== '' || els.modelo.value.trim() !== '' || els.anio.value.trim() !== '' || getPositionFilter().length > 0 || els.oem.value.trim() !== '' || els.fmsi.value.trim() !== '' || els.medidasAncho.value.trim() !== '' || els.medidasAlto.value.trim() !== ''; };

    // --- Función para obtener la clase CSS de la referencia ---
    const getRefBadgeClass = (ref) => {
        if (typeof ref !== 'string') {
            return 'ref-default';
        }
        const upperRef = ref.toUpperCase();
        if (upperRef.endsWith('INC')) return 'ref-inc';
        if (upperRef.endsWith('BP')) return 'ref-bp';
        if (upperRef.startsWith('K')) return 'ref-k';
        if (upperRef.endsWith('BEX')) return 'ref-bex';
        return 'ref-default'; // Verde menta
    };

    const filterData = () => {
        // --- 2. USANDO EL ESTADO ---
        if (!appState.data.length) return;
        
        const fbusq = (val) => val.toLowerCase().trim(); 
        const activePos = getPositionFilter();

        // --- MODIFICACIÓN 1: Parsear el filtro de año ---
        // 'yearRange' es el FILTRO DEL USUARIO (ej. { start: 1995, end: 1995 })
        const yearRange = parseYearFilter(els.anio.value); 
        // --- FIN MODIFICACIÓN 1 ---

        const filters = { 
            busqueda: fbusq(els.busqueda.value), 
            marca: fbusq(els.marca.value), 
            modelo: fbusq(els.modelo.value), 
            oem: fbusq(els.oem.value), 
            fmsi: fbusq(els.fmsi.value), 
            ancho: parseFloat(els.medidasAncho.value), 
            alto: parseFloat(els.medidasAlto.value), 
            pos: activePos 
        };

        const filtered = appState.data.filter(item => {
            const itemVehicles = item.aplicaciones.map(app => `${app.marca} ${app.serie} ${app.litros} ${app.año} ${app.especificacion}`).join(' ').toLowerCase();
            const itemPosicion = item.posición;

            const busqMatch = !filters.busqueda ||
                (Array.isArray(item.ref) && item.ref.some(rString => typeof rString === 'string' && rString.toLowerCase().includes(filters.busqueda))) ||
                (Array.isArray(item.oem) && item.oem.some(o => typeof o === 'string' && o.toLowerCase().includes(filters.busqueda))) ||
                (Array.isArray(item.fmsi) && item.fmsi.some(f => typeof f === 'string' && f.toLowerCase().includes(filters.busqueda))) ||
                itemVehicles.includes(filters.busqueda);

            
            // --- MODIFICACIÓN 2: Lógica de appMatch con rango de año ---
            const yearFilterActive = !!yearRange; // ¿Hay un filtro de año válido?

            const appMatch = (!filters.marca && !filters.modelo && !yearFilterActive) || // true si no hay filtros de app
                             item.aplicaciones.some(app => {
                                 const marcaMatch = !filters.marca || (app.marca && app.marca.toLowerCase().includes(filters.marca));
                                 const modeloMatch = !filters.modelo || (app.serie && app.serie.toLowerCase().includes(filters.modelo));
                                 
                                 // Lógica de AÑO (¡CORREGIDA!)
                                 let anioMatch = true; // Asumir true si no hay filtro de año
                                 if (yearFilterActive) {
                                     // Parsear el RANGO DE AÑO DEL DATO (ej. '1992-2015')
                                     // 'appYearRange' es el DATO de la pastilla (ej. { start: 1992, end: 2015 })
                                     const appYearRange = parseYearFilter(app.año); 
                                     
                                     if (!appYearRange) { // Si app.año es "N/A" o inválido, appYearRange será null
                                         anioMatch = false; // El dato no tiene año válido
                                     } else {
                                         // Comprobar si los rangos se solapan (overlap)
                                         // [app.start, app.end] overlaps [filter.start, filter.end]
                                         // Condición de solapamiento: app.start <= filter.end && app.end >= filter.start
                                         anioMatch = appYearRange.start <= yearRange.end && appYearRange.end >= yearRange.start;
                                     }
                                 }
                                 
                                 return marcaMatch && modeloMatch && anioMatch;
                             });
            // --- FIN MODIFICACIÓN 2 ---

            const oemMatch = !filters.oem || (Array.isArray(item.oem) && item.oem.some(o => typeof o === 'string' && o.toLowerCase().includes(filters.oem)));
            const fmsiMatch = !filters.fmsi || (Array.isArray(item.fmsi) && item.fmsi.some(f => typeof f === 'string' && f.toLowerCase().includes(filters.fmsi)));
            let posMatch = true; if (filters.pos.length > 0) { posMatch = filters.pos.includes(itemPosicion); }
            const TOLERANCIA = 1.0;
            const anchoMatchTolerancia = !filters.ancho || (item.anchoNum >= (filters.ancho - TOLERANCIA) && item.anchoNum <= (filters.ancho + TOLERANCIA));
            const altoMatchTolerancia = !filters.alto || (item.altoNum >= (filters.alto - TOLERANCIA) && item.altoNum <= (filters.alto + TOLERANCIA));
            return busqMatch && appMatch && oemMatch && fmsiMatch && posMatch && anchoMatchTolerancia && altoMatchTolerancia;
        });

        // --- 2. ACTUALIZANDO EL ESTADO ---
        appState.filtered = filtered;
        appState.currentPage = 1; // Resetea la página en cada filtro
        
        renderCurrentPage();
        updateURLWithFilters();
    };

    function navigateCarousel(carouselContainer, direction) {
        const track = carouselContainer.querySelector('.image-track');
        const images = carouselContainer.querySelectorAll('.result-image');
        const counter = els.modalCounterWrapper.querySelector('.carousel-counter');
        if (!track || images.length <= 1) return;
        let currentIndex = parseInt(track.dataset.currentIndex) || 0;
        const totalImages = images.length;
        let newIndex = currentIndex + direction;
        if (newIndex >= totalImages) { newIndex = 0; } else if (newIndex < 0) { newIndex = totalImages - 1; }
        track.style.transform = `translateX(-${newIndex * 100}%)`;
        track.dataset.currentIndex = newIndex;
        if (counter) counter.textContent = `${newIndex + 1}/${totalImages}`;
    }

    const renderApplicationsList = (aplicaciones) => { const groupedApps = aplicaciones.reduce((acc, app) => { const marca = app.marca || 'N/A'; if (!acc[marca]) { acc[marca] = []; } acc[marca].push(app); return acc; }, {}); Object.keys(groupedApps).forEach(marca => { groupedApps[marca].sort((a, b) => { const serieA = a.serie || ''; const serieB = b.serie || ''; if (serieA < serieB) return -1; if (serieA > serieB) return 1; const anioA = a.año || ''; const anioB = b.año || ''; if (anioA < anioB) return -1; if (anioA > anioB) return 1; return 0; }); }); let appListHTML = ''; for (const marca in groupedApps) { appListHTML += `<div class="app-brand-header">${marca.toUpperCase()}</div>`; groupedApps[marca].forEach(app => { appListHTML += `<div class="app-detail-row"><div>${app.serie || ''}</div><div>${app.litros || ''}</div><div>${app.año || ''}</div></div>`; }); } return appListHTML; };

    // --- Función renderSpecs ACTUALIZADA (Maneja "Sin información") ---
    const renderSpecs = (item) => {
        let specsHTML = `<div class="app-brand-header">ESPECIFICACIONES</div>`; // Encabezado de sección
        specsHTML += `<div class="spec-details-grid">`;

        const refsSpecsHTML = (Array.isArray(item.ref) && item.ref.length > 0)
            ? item.ref.flatMap(refString => String(refString).split(' '))
                .map(part => `<span class="ref-badge spec-ref-badge ${getRefBadgeClass(part)}">${part}</span>`)
                .join('')
            : '<span class="ref-badge ref-badge-na spec-ref-badge">N/A</span>';

        specsHTML += `<div class="spec-label"><strong>Referencias</strong></div>
                        <div class="spec-value modal-ref-container">${refsSpecsHTML}</div>`;

        const oemText = (Array.isArray(item.oem) && item.oem.length > 0 ? item.oem.join(', ') : 'N/A');
        specsHTML += `<div class="spec-label"><strong>OEM</strong></div><div class="spec-value">${oemText}</div>`;

        const fmsiText = (Array.isArray(item.fmsi) && item.fmsi.length > 0 ? item.fmsi.join(', ') : 'N/A');
        specsHTML += `<div class="spec-label"><strong>Platina FMSI</strong></div><div class="spec-value">${fmsiText}</div>`;

        // --- INICIO DE LA MODIFICACIÓN (Medidas Múltiples y "Sin información") ---
        
        let medidasHTML = '';
        
        // Comprueba si item.medidas es un array y tiene elementos
        if (Array.isArray(item.medidas) && item.medidas.length > 0) {
            
            // Mapea cada string de medida (ej: "183.8 X 64.4") a su propio <div>
            medidasHTML = item.medidas.map(medidaStr => {
                // Separa el string por 'x' (ignorando mayúsculas/minúsculas)
                const partes = medidaStr.split(/x/i).map(s => s.trim());
                const ancho = partes[0] || 'N/A';
                const alto = partes[1] || 'N/A';
                
                // Devuelve una línea de HTML por cada medida
                return `<div>Ancho: ${ancho} x Alto: ${alto}</div>`;
            }).join(''); // Une todas las líneas de HTML

        } else {
            // Código de fallback (si no es un array o está vacío, usa anchoNum/altoNum)
            // Usar !isNaN() para verificar si son números válidos (incluyendo 0)
            const anchoVal = !isNaN(item.anchoNum) ? item.anchoNum : null;
            const altoVal = !isNaN(item.altoNum) ? item.altoNum : null;

            if (anchoVal === null && altoVal === null) {
                // Si ambos son null (porque eran NaN), muestra "Sin información"
                medidasHTML = '<div>Sin información</div>';
            } else {
                // Si al menos uno tiene valor, mostrarlo. Usar 'N/A' para el que falte.
                const anchoDisplay = anchoVal !== null ? anchoVal : 'N/A';
                const altoDisplay = altoVal !== null ? altoVal : 'N/A';
                medidasHTML = `<div>Ancho: ${anchoDisplay} x Alto: ${altoDisplay}</div>`;
            }
        }

        // Añade el bloque completo al HTML
        specsHTML += `<div class="spec-label"><strong>Medidas (mm)</strong></div>
                          <div class="spec-value">${medidasHTML}</div>`;
        
        // --- FIN DE LA MODIFICACIÓN ---
        
        specsHTML += `</div>`; // Cierre de spec-details-grid
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

        // --- 2. USANDO EL ESTADO ---
        let paginationHTML = '';
        paginationHTML += `<button class="page-btn" data-page="${appState.currentPage - 1}" ${appState.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
        
        const maxPagesToShow = 5; const halfPages = Math.floor(maxPagesToShow / 2); let startPage, endPage;
        if (totalPages <= maxPagesToShow) { startPage = 1; endPage = totalPages; } 
        else if (appState.currentPage <= halfPages + 1) { startPage = 1; endPage = maxPagesToShow; } 
        else if (appState.currentPage >= totalPages - halfPages) { startPage = totalPages - maxPagesToShow + 1; endPage = totalPages; } 
        else { startPage = appState.currentPage - halfPages; endPage = appState.currentPage + halfPages; }
        
        if (startPage > 1) { paginationHTML += `<button class="page-btn" data-page="1">1</button>`; if (startPage > 2) { paginationHTML += `<button class="page-btn" disabled>...</button>`; } }
        for (let i = startPage; i <= endPage; i++) { paginationHTML += `<button class="page-btn ${i === appState.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`; }
        if (endPage < totalPages) { if (endPage < totalPages - 1) { paginationHTML += `<button class="page-btn" disabled>...</button>`; } paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`; }
        
        paginationHTML += `<button class="page-btn" data-page="${appState.currentPage + 1}" ${appState.currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
        els.paginationContainer.innerHTML = paginationHTML;
    }

    // --- Función renderCurrentPage ACTUALIZADA ---
    const renderCurrentPage = () => {
        // --- 2. LEYENDO DEL ESTADO ---
        const totalResults = appState.filtered.length;
        const startIndex = (appState.currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = appState.filtered.slice(startIndex, endIndex);

        const startNum = totalResults === 0 ? 0 : startIndex + 1;
        const endNum = Math.min(endIndex, totalResults);
        els.countContainer.innerHTML = `Mostrando <strong>${startNum}–${endNum}</strong> de <strong>${totalResults}</strong> resultados`;

        if (totalResults === 0) {
            els.results.innerHTML = `<div class="no-results-container"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"></path><path d="M21 21L16.65 16.65"></path><path d="M11 8V11L13 13"></path></svg><p>No se encontraron pastillas</p><span>Intenta ajustar tus filtros de búsqueda.</span></div>`;
            els.paginationContainer.innerHTML = '';
            return;
        }

        els.results.innerHTML = paginatedData.map((item, index) => {
            const posBadgeClass = item.posición === 'Delantera' ? 'delantera' : 'trasera';
            const posBadge = `<span class="position-badge ${posBadgeClass}">${item.posición}</span>`;

            const refsHTML = (Array.isArray(item.ref) && item.ref.length > 0)
                ? item.ref.flatMap(refString => String(refString).split(' '))
                    .map(part => `<span class="ref-badge ${getRefBadgeClass(part)}">${part}</span>`)
                    .join('')
                : '<span class="ref-badge ref-badge-na">N/A</span>';

            let firstImageSrc = 'https://via.placeholder.com/300x200.png?text=No+Img';
            if (item.imagenes && item.imagenes.length > 0) {
                firstImageSrc = item.imagenes[0];
            } else if (item.imagen) {
                firstImageSrc = item.imagen.replace("text=", `text=Vista+1+`);
            }

            const appSummaryItems = item.aplicaciones.slice(0, 3).map(app => `${app.marca} ${app.serie}`).filter((value, index, self) => self.indexOf(value) === index);
            let appSummaryHTML = '';
            if (appSummaryItems.length > 0) {
                appSummaryHTML = `<div class="card-app-summary">${appSummaryItems.join(', ')}${item.aplicaciones.length > 3 ? ', ...' : ''}</div>`;
            }

            const primaryRefForData = (Array.isArray(item.ref) && item.ref.length > 0) ? String(item.ref[0]).split(' ')[0] : 'N/A';

            return `
                <div class="result-card" data-id="${item._appId}" style="animation-delay: ${index * 50}ms" tabindex="0" role="button" aria-haspopup="dialog">
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
        
        setupPagination(totalResults);
    };

    // --- Función handleCardClick ACTUALIZADA ---
    function handleCardClick(event) {
        const card = event.target.closest('.result-card');
        if (card) {
            const itemId = card.dataset.id;
            
            // --- 2. LEYENDO DEL ESTADO ---
            const itemData = appState.data.find(item => item._appId == itemId);

            if (itemData) {
                openModal(itemData);
            } else {
                console.warn("No item data found for id:", itemId);
            }
        }
    }

    const updateScrollIndicator = () => { const wrapper = els.modalDetailsWrapper; const content = els.modalDetailsContent; if (wrapper && content) { const isScrollable = content.scrollHeight > content.clientHeight; const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 5; if (isScrollable && !isAtBottom) { wrapper.classList.add('scrollable'); } else { wrapper.classList.remove('scrollable'); } } };

    // --- Función openModal ACTUALIZADA ---
    function openModal(item) {
        const refsHeaderHTML = (Array.isArray(item.ref) && item.ref.length > 0)
            ? item.ref.flatMap(refString => String(refString).split(' '))
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
        els.modalCarousel.querySelectorAll('.carousel-nav-btn').forEach(btn => { btn.onclick = (e) => { e.stopPropagation(); const direction = parseInt(e.currentTarget.dataset.direction); navigateCarousel(els.modalCarousel, direction); }; });
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) { setupSwipe(els.modalCarousel); }
        if (imageCount > 1) { els.modalCounterWrapper.innerHTML = `<span class="carousel-counter">1/${imageCount}</span>`; } else { els.modalCounterWrapper.innerHTML = ''; }

        els.modalAppsSpecs.innerHTML = `<div class="applications-list-container">${renderApplicationsList(item.aplicaciones)}${renderSpecs(item)}</div>`;

        els.modalContent.classList.remove('closing');
        els.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => { setTimeout(() => { updateScrollIndicator(); els.modalDetailsContent.addEventListener('scroll', updateScrollIndicator); }, 100); });
    }


    function closeModal() { els.modalContent.classList.add('closing'); els.modalDetailsContent.removeEventListener('scroll', updateScrollIndicator); els.modalDetailsWrapper.classList.remove('scrollable'); setTimeout(() => { els.modal.style.display = 'none'; document.body.style.overflow = ''; els.modalCarousel.innerHTML = ''; els.modalRef.innerHTML = ''; els.modalPosition.innerHTML = ''; els.modalAppsSpecs.innerHTML = ''; els.modalCounterWrapper.innerHTML = ''; els.modalContent.classList.remove('closing'); }, 220); }
    function openGuideModal() { els.guideModalContent.classList.remove('closing'); els.guideModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    function closeGuideModal() { els.guideModalContent.classList.add('closing'); setTimeout(() => { els.guideModal.style.display = 'none'; document.body.style.overflow = ''; els.guideModalContent.classList.remove('closing'); }, 220); }
    function openSideMenu() { els.sideMenu.classList.add('open'); els.sideMenu.setAttribute('aria-hidden', 'false'); els.sideMenuOverlay.style.display = 'block'; requestAnimationFrame(() => { els.sideMenuOverlay.classList.add('visible'); }); els.menuBtn.setAttribute('aria-expanded', 'true'); els.menuCloseBtn.focus(); }
    function closeSideMenu() { els.sideMenu.classList.remove('open'); els.sideMenu.setAttribute('aria-hidden', 'true'); els.sideMenuOverlay.classList.remove('visible'); els.menuBtn.setAttribute('aria-expanded', 'false'); els.menuBtn.focus(); els.sideMenuOverlay.addEventListener('transitionend', () => { if (!els.sideMenuOverlay.classList.contains('visible')) { els.sideMenuOverlay.style.display = 'none'; } }, { once: true }); }
    function setupSwipe(carouselElement) { let startX, startY, endX, endY; const threshold = 50; carouselElement.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true }); carouselElement.addEventListener('touchmove', (e) => { if (Math.abs(e.touches[0].clientX - startX) > Math.abs(e.touches[0].clientY - startY)) { e.preventDefault(); } }, { passive: false }); carouselElement.addEventListener('touchend', (e) => { endX = e.changedTouches[0].clientX; endY = e.changedTouches[0].clientY; const diffX = endX - startX; const diffY = endY - startY; if (Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) { if (diffX > 0) { navigateCarousel(carouselElement, -1); } else { navigateCarousel(carouselElement, 1); } } }); }
    const clearAllFilters = () => { const inputsToClear = [els.busqueda, els.marca, els.modelo, els.anio, els.oem, els.fmsi, els.medidasAncho, els.medidasAlto]; inputsToClear.forEach(input => input.value = ''); els.posDel.classList.remove('active'); els.posTras.classList.remove('active'); if (els.brandTagsContainer) { els.brandTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => { activeTag.classList.remove('active'); }); } filterData(); };
    const createRippleEffect = (event) => { const button = event.currentTarget; const circle = document.createElement('span'); const diameter = Math.max(button.clientWidth, button.clientHeight); const radius = diameter / 2; const rect = button.getBoundingClientRect(); circle.style.width = circle.style.height = `${diameter}px`; circle.style.left = `${event.clientX - (rect.left + radius)}px`; circle.style.top = `${event.clientY - (rect.top + radius)}px`; circle.classList.add('ripple'); const ripple = button.getElementsByClassName('ripple')[0]; if (ripple) { ripple.remove(); } button.appendChild(circle); };
    const updateURLWithFilters = () => { const params = new URLSearchParams(); const filters = { busqueda: els.busqueda.value.trim(), marca: els.marca.value.trim(), modelo: els.modelo.value.trim(), anio: els.anio.value.trim(), oem: els.oem.value.trim(), fmsi: els.fmsi.value.trim(), ancho: els.medidasAncho.value.trim(), alto: els.medidasAlto.value.trim(), }; for (const key in filters) { if (filters[key]) { params.set(key, filters[key]); } } const activePositions = getPositionFilter(); if (activePositions.length > 0) { params.set('pos', activePositions.join(',')); } const newUrl = `${window.location.pathname}?${params.toString()}`; history.pushState({}, '', newUrl); };
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
        if (els.brandTagsContainer) {
            els.brandTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => {
                activeTag.classList.remove('active');
            });
        }
        if (brandFromURL && els.brandTagsContainer) {
            const tagToActivate = els.brandTagsContainer.querySelector(`.brand-tag[data-brand="${brandFromURL}"]`);
            if (tagToActivate) {
                tagToActivate.classList.add('active');
            }
        }
    };

    // --- SETUP EVENT LISTENERS (CON LÓGICA DE 3 TEMAS: Claro, AMOLED Dark, Orbital) ---
    function setupEventListeners() {
        // Aplicar ripple a todos los botones aplicables
        [els.darkBtn, els.upBtn, els.menuBtn, els.orbitalBtn, els.clearBtn].forEach(btn => btn?.addEventListener('click', createRippleEffect));

        // --- Lógica Animación Iconos Sol/Luna ---
        const iconAnimation = (iconToShow, iconToHide) => {
            if (!iconToShow) return;
            const showKeyframes = [ { opacity: 0, transform: 'translate(-50%, -50%) scale(0.6) rotate(-90deg)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(0deg)' } ];
            const hideKeyframes = [ { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(0deg)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(0.6) rotate(90deg)' } ];
            const options = { duration: 400, fill: 'forwards', easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' };
            iconToShow.animate(showKeyframes, options);
            if (iconToHide) { iconToHide.animate(hideKeyframes, options); }
        };

        // --- Funciones para Aplicar Temas ---
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
            console.log("Applied Light Theme");
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
            console.log("Applied AMOLED Dark Theme (lp-dark)");
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
            console.log("Applied Orbital Theme");
        };

        // --- Event Listener Botón Sol/Luna (Ciclo simple Claro <-> AMOLED) ---
        els.darkBtn.addEventListener('click', () => {
            els.headerX.style.animation = 'bounceHeader 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)';
            setTimeout(() => { els.headerX.style.animation = ''; }, 600);

            if (els.body.classList.contains('modo-orbital') || els.body.classList.contains('lp-dark')) {
                applyLightTheme();
            } else {
                applyAmoledDarkTheme();
            }
        });

        // --- Event Listener Botón Orbital ---
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
                    applyLightTheme(); // Desactivar Orbital va a Claro
                } else {
                    applyOrbitalTheme(); // Activar Orbital
                }
            });
        }

        // --- Aplicar Tema Guardado al Cargar ---
        const savedTheme = localStorage.getItem('themePreference');
        console.log("Saved theme:", savedTheme);
        switch (savedTheme) {
            case 'orbital':
                if (els.orbitalBtn) applyOrbitalTheme();
                else applyLightTheme(); // Fallback
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

        // --- Resto de Event Listeners ---
        els.upBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => { els.upBtn.classList.toggle('show', window.scrollY > 300); });
        els.menuBtn.addEventListener('click', openSideMenu);
        els.menuCloseBtn.addEventListener('click', closeSideMenu);
        els.sideMenuOverlay.addEventListener('click', closeSideMenu);
        els.openGuideLink.addEventListener('click', () => { closeSideMenu(); setTimeout(openGuideModal, 50); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.sideMenu.classList.contains('open')) { closeSideMenu(); } });

        // --- 3. REFACTORIZACIÓN: Asignar el listener de clic de tarjeta UNA SOLA VEZ ---
        els.results.addEventListener('click', handleCardClick);

        const debouncedFilter = debounce(filterData, 300);

        const savedView = localStorage.getItem('viewMode');
        if (savedView === 'list') {
            els.results.classList.add('list-view');
            els.viewGridBtn.classList.remove('active'); els.viewGridBtn.setAttribute('aria-checked', 'false');
            els.viewListBtn.classList.add('active'); els.viewListBtn.setAttribute('aria-checked', 'true');
        } else {
            els.results.classList.remove('list-view');
            els.viewGridBtn.classList.add('active'); els.viewGridBtn.setAttribute('aria-checked', 'true');
            els.viewListBtn.classList.remove('active'); els.viewListBtn.setAttribute('aria-checked', 'false');
        }

        els.viewGridBtn.addEventListener('click', () => {
            if (els.results.classList.contains('list-view')) {
                els.results.classList.remove('list-view');
                els.viewGridBtn.classList.add('active'); els.viewGridBtn.setAttribute('aria-checked', 'true');
                els.viewListBtn.classList.remove('active'); els.viewListBtn.setAttribute('aria-checked', 'false');
                localStorage.setItem('viewMode', 'grid');
            }
        });
        els.viewListBtn.addEventListener('click', () => {
            if (!els.results.classList.contains('list-view')) {
                els.results.classList.add('list-view');
                els.viewGridBtn.classList.remove('active'); els.viewGridBtn.setAttribute('aria-checked', 'false');
                els.viewListBtn.classList.add('active'); els.viewListBtn.setAttribute('aria-checked', 'true');
                localStorage.setItem('viewMode', 'list');
            }
        });

        const restartSearchIconAnimation = () => {
            const oldIcon = els.searchContainer.querySelector('.search-icon');
            if (oldIcon) {
                const newIcon = oldIcon.cloneNode(true);
                oldIcon.parentNode.replaceChild(newIcon, oldIcon);
                if (els.busqueda.value.trim() !== '') {
                    newIcon.style.animation = 'none'; void newIcon.offsetWidth; newIcon.style.animation = '';
                }
            }
        };

        els.busqueda.addEventListener('input', (e) => { if (e.target.value.trim() !== '') { els.searchContainer.classList.add('active'); restartSearchIconAnimation(); } else { els.searchContainer.classList.remove('active'); } debouncedFilter(); });
        els.busqueda.addEventListener('blur', () => { if (els.busqueda.value.trim() === '') { els.searchContainer.classList.remove('active'); } });
        els.busqueda.addEventListener('focus', () => { if (els.busqueda.value.trim() !== '') { els.searchContainer.classList.add('active'); restartSearchIconAnimation(); } });

        const otherFilterInputs = [els.marca, els.modelo, els.anio, els.oem, els.fmsi, els.medidasAncho, els.medidasAlto];
        otherFilterInputs.forEach(input => input.addEventListener('input', debouncedFilter));

        [els.posDel, els.posTras].forEach(btn => btn.addEventListener('click', (e) => { e.currentTarget.classList.toggle('active'); filterData(); }));

        const trashLid = els.clearBtn.querySelector('.trash-lid'); const trashBody = els.clearBtn.querySelector('.trash-body'); const NUM_SPARKS = 10; const SPARK_COLORS = ['#00ffff', '#ff00ff', '#00ff7f', '#ffc700', '#ff5722'];
        function createSparks(button) { for (let i = 0; i < NUM_SPARKS; i++) { const spark = document.createElement('div'); spark.classList.add('spark'); const size = Math.random() * 4 + 3; spark.style.width = `${size}px`; spark.style.height = `${size}px`; spark.style.backgroundColor = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]; spark.style.left = `calc(50% + ${Math.random() * 20 - 10}px)`; spark.style.top = `calc(50% + ${Math.random() * 20 - 10}px)`; const angle = Math.random() * Math.PI * 2; const distance = Math.random() * 25 + 20; const sparkX = Math.cos(angle) * distance; const sparkY = Math.sin(angle) * distance; spark.style.setProperty('--spark-x', `${sparkX}px`); spark.style.setProperty('--spark-y', `${sparkY}px`); button.appendChild(spark); spark.addEventListener('animationend', () => spark.remove(), { once: true }); } }

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

                els.brandTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => {
                    if (activeTag !== tag) {
                        activeTag.classList.remove('active');
                    }
                });

                if (isActive) {
                    tag.classList.remove('active');
                    els.marca.value = '';
                } else {
                    tag.classList.add('active');
                    els.marca.value = brand;
                }
                filterData();
            });
        }

        // --- Listener de Paginación ACTUALIZADO ---
        els.paginationContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn || btn.disabled || btn.classList.contains('active')) {
                return;
            }
            const newPage = parseInt(btn.dataset.page);
            if (newPage) {
                // --- 2. ACTUALIZANDO EL ESTADO ---
                appState.currentPage = newPage;
                renderCurrentPage(); // Vuelve a renderizar con la nueva página
                els.resultsHeaderCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        els.modalCloseBtn.addEventListener('click', closeModal);
        els.modal.addEventListener('click', (event) => { if (event.target === els.modal) { closeModal(); } });
        els.guideModalCloseBtn.addEventListener('click', closeGuideModal);
        els.guideModal.addEventListener('click', (event) => { if (event.target === els.guideModal) { closeGuideModal(); } });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.guideModal.style.display === 'flex') { closeGuideModal(); } });

    } // --- Fin de setupEventListeners ---

    async function inicializarApp() {
        showSkeletonLoader();

        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Error HTTP! estado: ${response.status}`);
            }
            let data = await response.json();

            data = data.map((item, index) => {
                if (item.imagen && (!item.imagenes || item.imagenes.length === 0)) {
                    item.imagenes = [
                        item.imagen.replace("text=", `text=Vista+1+`),
                        item.imagen.replace("text=", `text=Vista+2+`),
                        item.imagen.replace("text=", `text=Vista+3+`)
                    ];
                }

                // --- CORRECCIÓN PARA 'medidas' (usa NaN por defecto) ---
                
                // 1. Aseguramos que 'medidaString' sea un string o null
                let medidaString = null;
                if (Array.isArray(item.medidas) && item.medidas.length > 0) {
                    // Si es un array (como en "728AINC"), toma el primer elemento
                    medidaString = item.medidas[0]; 
                } else if (typeof item.medidas === 'string') {
                    // Si es un string (como en "001INC"), úsalo
                    medidaString = item.medidas;
                }

                // 2. Ahora 'partes' se calcula de forma segura
                // Se usa /x/i para que funcione con 'x' (minúscula) o 'X' (mayúscula)
                // ¡CAMBIO CLAVE: [NaN, NaN] en lugar de [0, 0] como valor por defecto!
                const partes = medidaString ? medidaString.split(/x/i).map(s => parseFloat(s.trim())) : [NaN, NaN];
                
                // --- FIN DE LA CORRECCIÓN ---


                const safeRefs = Array.isArray(item.ref) ? item.ref.map(String) : [];
                const safeOems = Array.isArray(item.oem) ? item.oem.map(String) : [];
                const safeFmsis = Array.isArray(item.fmsi) ? item.fmsi.map(String) : [];

                return { ...item,
                        _appId: index, // ID único
                        ref: safeRefs,
                        oem: safeOems,
                        fmsi: safeFmsis,
                        anchoNum: partes[0], // Asigna el valor parseado (será NaN si no existe)
                        altoNum: partes[1] }; // Asigna el valor parseado (será NaN si no existe)
            });

            // --- 2. ACTUALIZANDO EL ESTADO ---
            appState.data = data; // Guarda los datos en el estado central

            // --- 2. LEYENDO DEL ESTADO ---
            const getAllApplicationValues = (key) => { const allValues = new Set(); appState.data.forEach(item => { item.aplicaciones.forEach(app => { const prop = (key === 'modelo') ? 'serie' : key; if (app[prop]) allValues.add(String(app[prop])); }); }); return [...allValues].sort(); };
            
            fillDatalist(els.datalistMarca, getAllApplicationValues('marca'));
            fillDatalist(els.datalistModelo, getAllApplicationValues('modelo'));
            fillDatalist(els.datalistAnio, getAllApplicationValues('año'));
            
            const allOems = [...new Set(appState.data.flatMap(i => i.oem || []))].filter(Boolean).sort();
            
            // --- CORRECCIÓN DEL TYPO DE LA ÚLTIMA VEZ ---
            const allFmsis = [...new Set(appState.data.flatMap(i => i.fmsi || []))].filter(Boolean).sort();
            // --- FIN DE LA CORRECCIÓN DEL TYPO ---

            fillDatalist(els.datalistOem, allOems);
            fillDatalist(els.datalistFmsi, allFmsis);
            
            const allBrandsList = appState.data.flatMap(item => item.aplicaciones.map(app => app.marca)).filter(Boolean);
            const brandFrequencies = allBrandsList.reduce((counts, brand) => { counts[brand] = (counts[brand] || 0) + 1; return counts; }, {});
            const sortedBrands = Object.entries(brandFrequencies).sort(([, countA], [, countB]) => countB - countA).slice(0, 10).map(([brand]) => brand);
            const brandColors = [ '--brand-color-1', '--brand-color-2', '--brand-color-3', '--brand-color-4', '--brand-color-5', '--brand-color-6', '--brand-color-7', '--brand-color-8', '--brand-color-9', '--brand-color-10' ];
            
            brandColorMap = {};
            sortedBrands.forEach((brand, index) => { brandColorMap[brand] = brandColors[index % brandColors.length]; });

            if (els.brandTagsContainer) {
                els.brandTagsContainer.innerHTML = sortedBrands.map(brand => {
                    const colorVar = brandColorMap[brand];
                    const brandColorValue = colorVar ? getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() : 'currentColor';
                    return `<button class="brand-tag" data-brand="${brand}" style="--tag-brand-color: ${brandColorValue};">${brand}</button>`;
                }).join('');
            }

            applyFiltersFromURL();
            filterData(); // Filtrar después de aplicar tema y filtros URL
        
        } catch (error) {
            console.error("Error al cargar los datos:", error);
            els.results.innerHTML = `<div class="no-results-container"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line><line x1="12" y1="22" x2="12" y2="22"></line></svg><p>Error al cargar datos</p><span>No se pudo conectar con la base de datos (data.json). Asegúrate que el archivo exista.</span></div>`;
            els.countContainer.innerHTML = "Error";
            els.paginationContainer.innerHTML = '';
        }
    }

    // Inicializar listeners PRIMERO
    setupEventListeners();
    // Luego cargar datos y renderizar
    inicializarApp();

}); // Fin DOMContentLoaded