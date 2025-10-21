document.addEventListener('DOMContentLoaded', () => {
    
    // Variables globales
    let brakePadsData = []; // Todos los datos cargados desde data.json
    let currentPage = 1;
    const itemsPerPage = 24;
    let filteredDataCache = []; 
    let brandColorMap = {};

    // Elementos del DOM
    const els = {
        body: document.body, headerX: document.querySelector('.header-x'), darkBtn: document.getElementById('darkBtn'), 
        sunIcon: document.querySelector('.lp-icon-sun'), moonIcon: document.querySelector('.lp-icon-moon'), 
        upBtn: document.getElementById('upBtn'), menuBtn: document.getElementById('menuBtn'),                 
        sideMenu: document.getElementById('side-menu'), sideMenuOverlay: document.getElementById('side-menu-overlay'), 
        menuCloseBtn: document.getElementById('menuCloseBtn'), openGuideLink: document.getElementById('open-guide-link'), 
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
        viewGridBtn: document.getElementById('viewGridBtn'), viewListBtn: document.getElementById('viewListBtn'),
        countContainer: document.getElementById('result-count-container'),
        paginationContainer: document.getElementById('pagination-container'),
        resultsHeaderCard: document.getElementById('results-header-card'),
        brandTagsContainer: document.getElementById('brand-tags-container'),
        modal: document.getElementById('card-modal'), modalContent: document.querySelector('#card-modal .modal-content'), 
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
        guideModalCloseBtn: document.querySelector('#guide-modal .modal-close-btn') 
    };
        
    // --- FUNCIONES UTILITARIAS ---
    const debounce = (func, delay) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; };
    const fillDatalist = (dl, v) => { dl.innerHTML = v.map(i => `<option value="${i}">`).join(''); };
    const getPositionFilter = () => { let p = []; if (els.posDel.classList.contains('active')) p.push('Delantera'); if (els.posTras.classList.contains('active')) p.push('Trasera'); return p; };
    
    // --- LÓGICA DE FILTRADO ---
    const filterData = () => {
        if (!brakePadsData.length) return;
        const fbusq = (val) => (val || '').toLowerCase().trim(); const activePos = getPositionFilter();
        const filters = { 
            busqueda: fbusq(els.busqueda.value), marca: fbusq(els.marca.value), 
            modelo: fbusq(els.modelo.value), anio: fbusq(els.anio.value), 
            oem: fbusq(els.oem.value), fmsi: fbusq(els.fmsi.value), 
            ancho: parseFloat(els.medidasAncho.value) || 0, alto: parseFloat(els.medidasAlto.value) || 0, 
            pos: activePos 
        };
        const TOLERANCIA = 1.0;
        
        filteredDataCache = brakePadsData.filter(item => {
            const itemVehicles = (item.aplicaciones || []).map(app => `${app.marca} ${app.serie} ${app.litros} ${app.año} ${app.especificacion}`).join(' ').toLowerCase();
            const busqMatch = !filters.busqueda ||
                (item.ref || []).some(r => fbusq(r).includes(filters.busqueda)) || 
                (item.oem || []).some(o => fbusq(o).includes(filters.busqueda)) || 
                (item.fmsi || []).some(f => fbusq(f).includes(filters.busqueda)) || 
                itemVehicles.includes(filters.busqueda);

            const appMatch = !filters.marca && !filters.modelo && !filters.anio || 
                (item.aplicaciones || []).some(app => 
                    (!filters.marca || fbusq(app.marca).includes(filters.marca)) && 
                    (!filters.modelo || fbusq(app.serie).includes(filters.modelo)) && 
                    (!filters.anio || fbusq(app.año).includes(filters.anio))
                );

            const oemMatch = !filters.oem || (item.oem || []).some(o => fbusq(o).includes(filters.oem));
            const fmsiMatch = !filters.fmsi || (item.fmsi || []).some(f => fbusq(f).includes(filters.fmsi));
            const posMatch = filters.pos.length === 0 || filters.pos.includes(item.posición);
            const anchoMatch = !filters.ancho || Math.abs(item.anchoNum - filters.ancho) <= TOLERANCIA;
            const altoMatch = !filters.alto || Math.abs(item.altoNum - filters.alto) <= TOLERANCIA;

            return busqMatch && appMatch && oemMatch && fmsiMatch && posMatch && anchoMatch && altoMatch;
        });

        currentPage = 1;
        renderCurrentPage();
        updateURLWithFilters();
    };
    
    // --- RENDERIZADO DE RESULTADOS Y PAGINACIÓN ---
    const showSkeletonLoader = (count = 12) => { 
        els.results.innerHTML = Array(count).fill('<div class="skeleton-card"><div class="skeleton-line long"></div><div class="skeleton-line short"></div><div class="skeleton-box"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>').join(''); 
        els.paginationContainer.innerHTML = '';
    };

    function setupPagination(totalItems) { /* (Código idéntico al anterior) */ }

    const renderCurrentPage = () => {
        const totalResults = filteredDataCache.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredDataCache.slice(startIndex, endIndex);

        const startNum = totalResults === 0 ? 0 : startIndex + 1;
        const endNum = Math.min(endIndex, totalResults);
        els.countContainer.innerHTML = `Mostrando <strong>${startNum}–${endNum}</strong> de <strong>${totalResults}</strong> resultados`;

        if (totalResults === 0) { 
            els.results.innerHTML = `<div class="no-results-container"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"/><path d="M21 21L16.65 16.65"/><path d="M11 8V11L13 13"/></svg><p>No se encontraron pastillas</p><span>Intenta ajustar tus filtros.</span></div>`;
            els.paginationContainer.innerHTML = ''; return; 
        }

        els.results.innerHTML = paginatedData.map((item, index) => {
            const posBadgeClass = item.posición === 'Delantera' ? 'delantera' : 'trasera';
            const posBadge = `<span class="position-badge ${posBadgeClass}">${item.posición}</span>`;
            const primaryRef = (item.ref && item.ref.length > 0) ? item.ref[0] : 'N/A'; 
            
            // *** CAMBIO: Usar la primera imagen del array 'imagenes' ***
            const firstImageSrc = (item.imagenes && item.imagenes.length > 0) ? item.imagenes[0] : 'https://via.placeholder.com/300x200.png?text=Sin+Imagen'; 

            const appSummaryItems = (item.aplicaciones || []).slice(0, 3).map(app => `${app.marca} ${app.serie}`).filter((v, i, s) => s.indexOf(v) === i); 
            let appSummaryHTML = appSummaryItems.length > 0 ? `<div class="card-app-summary">${appSummaryItems.join(', ')}${(item.aplicaciones || []).length > 3 ? ', ...' : ''}</div>` : '';
            
            return `<div class="result-card" data-ref="${primaryRef}" style="animation-delay: ${index * 50}ms" tabindex="0" role="button" aria-haspopup="dialog"> 
                        <div class="card-thumbnail"><img src="${firstImageSrc}" alt="Referencia ${primaryRef}" class="result-image" loading="lazy"></div>
                        <div class="card-content-wrapper"><div class="card-details"><div class="card-ref">${primaryRef}</div>${posBadge}</div>${appSummaryHTML}</div> 
                    </div>`; 
        }).join('');
        
        // Remover listener antiguo y añadir nuevo para evitar duplicados
        els.results.removeEventListener('click', handleCardClick); 
        els.results.addEventListener('click', handleCardClick); 
        setupPagination(totalResults);
    };

    // --- LÓGICA DEL MODAL ---
    function handleCardClick(event) {
        const card = event.target.closest('.result-card');
        if (!card) return;
        const primaryRef = card.dataset.ref; 
        const itemData = brakePadsData.find(item => item.ref && item.ref[0] === primaryRef); 
        if (itemData) openModal(itemData); 
    }
    
    const updateScrollIndicator = () => { /* (Código idéntico al anterior) */ };
    
    function navigateCarousel(carouselContainer, direction) { /* (Código idéntico al anterior) */ }

    function openModal(item) {
        const primaryRef = (item.ref && item.ref.length > 0) ? item.ref[0] : 'N/A';
        els.modalRef.textContent = primaryRef; 

        const posBadgeClass = item.posición === 'Delantera' ? 'delantera' : 'trasera';
        els.modalPosition.innerHTML = `<span class="position-badge ${posBadgeClass}">${item.posición}</span>`;
        
        // *** CAMBIO: Crear carrusel desde el array 'imagenes' ***
        const images = (item.imagenes && item.imagenes.length > 0) ? item.imagenes : ['https://via.placeholder.com/300x200.png?text=Sin+Imagen'];
        const imageCount = images.length;
        let imageTrackHTML = images.map((imgUrl, i) => 
            `<img src="${imgUrl}" alt="Ref ${primaryRef} Vista ${i + 1}" class="result-image">`
        ).join('');
            
        els.modalCarousel.innerHTML = `
            <div class="image-track" style="display:flex; width: ${imageCount * 100}%;" data-current-index="0">${imageTrackHTML}</div> 
            ${imageCount > 1 ? `
                <button class="carousel-nav-btn" data-direction="-1" aria-label="Anterior">‹</button>
                <button class="carousel-nav-btn" data-direction="1" aria-label="Siguiente">›</button>
            ` : ''}`;
        
        // Re-asignar listeners a los botones del carrusel
        els.modalCarousel.querySelectorAll('.carousel-nav-btn').forEach(btn => { 
            btn.onclick = (e) => { e.stopPropagation(); navigateCarousel(els.modalCarousel, parseInt(e.currentTarget.dataset.direction)); }; 
        });

        // Configurar swipe si es táctil
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) { setupSwipe(els.modalCarousel); }

        // Actualizar contador
        els.modalCounterWrapper.innerHTML = imageCount > 1 ? `<span class="carousel-counter">1/${imageCount}</span>` : '';

        // Renderizar aplicaciones y especificaciones
        els.modalAppsSpecs.innerHTML = `<div class="applications-list-container">${renderApplicationsList(item.aplicaciones || [])}${renderSpecs(item)}</div>`;
        
        els.modalContent.classList.remove('closing'); 
        els.modal.style.display = 'flex'; 
        document.body.style.overflow = 'hidden'; 
        
        // Actualizar indicador de scroll después de un pequeño delay
        requestAnimationFrame(() => setTimeout(updateScrollIndicator, 100));
        els.modalDetailsContent.addEventListener('scroll', updateScrollIndicator);
    }

    function closeModal() { /* (Código idéntico al anterior) */ }
    function openGuideModal() { /* (Código idéntico al anterior) */ }
    function closeGuideModal() { /* (Código idéntico al anterior) */ }
    function openSideMenu() { /* (Código idéntico al anterior) */ }
    function closeSideMenu() { /* (Código idéntico al anterior) */ }
    function setupSwipe(carouselElement) { /* (Código idéntico al anterior) */ }

    // --- MANEJO DE ESTADO (URL, RIPPLE, CLEAR) ---
    const clearAllFilters = () => { /* (Código idéntico al anterior) */ };
    const createRippleEffect = (event) => { /* (Código idéntico al anterior) */ };
    const updateURLWithFilters = () => { /* (Código idéntico al anterior) */ };
    const applyFiltersFromURL = () => { /* (Código idéntico al anterior, pero ajustado para brandColorMap) */ 
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

        // Actualizar tags de marca desde URL
        if (els.brandTagsContainer) { 
             els.brandTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => {
                 activeTag.classList.remove('active');
                 activeTag.style.borderColor = ''; activeTag.style.color = '';       
             });
             if (brandFromURL) { 
                  const tagToActivate = els.brandTagsContainer.querySelector(`.brand-tag[data-brand="${brandFromURL}"]`);
                  if (tagToActivate) {
                      tagToActivate.classList.add('active');
                      const colorVar = brandColorMap[brandFromURL]; 
                      if (colorVar) {
                          const activeColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
                          tagToActivate.style.borderColor = activeColor; tagToActivate.style.color = activeColor;       
                      }
                  }
             } 
        } 
    };

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Botones flotantes, scroll, menú lateral (idénticos)
        [els.darkBtn, els.upBtn, els.menuBtn].forEach(btn => btn?.addEventListener('click', createRippleEffect)); 
        els.darkBtn?.addEventListener('click', () => { /* ... código dark mode ... */ });
        els.upBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => { els.upBtn?.classList.toggle('show', window.scrollY > 300); });
        els.menuBtn?.addEventListener('click', openSideMenu);
        els.menuCloseBtn?.addEventListener('click', closeSideMenu);
        els.sideMenuOverlay?.addEventListener('click', closeSideMenu);
        els.openGuideLink?.addEventListener('click', () => { closeSideMenu(); setTimeout(openGuideModal, 50); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.sideMenu?.classList.contains('open')) closeSideMenu(); });
        
        // Filtros (idénticos)
        const debouncedFilter = debounce(filterData, 350); // Ligeramente más delay
        const restartSearchIconAnimation = () => { /* ... código animación ... */ };
        els.busqueda?.addEventListener('input', (e) => { /* ... código búsqueda ... */ debouncedFilter(); });
        els.busqueda?.addEventListener('blur', () => { /* ... código búsqueda ... */ });
        els.busqueda?.addEventListener('focus', () => { /* ... código búsqueda ... */ });
        [els.marca, els.modelo, els.anio, els.oem, els.fmsi, els.medidasAncho, els.medidasAlto].forEach(input => input?.addEventListener('input', debouncedFilter));
        [els.posDel, els.posTras].forEach(btn => btn?.addEventListener('click', (e) => { e.currentTarget.classList.toggle('active'); filterData(); }));
        
        // Botón Limpiar Filtros (idéntico)
        const trashLid = els.clearBtn?.querySelector('.trash-lid'); const trashBody = els.clearBtn?.querySelector('.trash-body'); 
        const NUM_SPARKS = 10; const SPARK_COLORS = ['#00ffff', '#ff00ff', '#00ff7f', '#ffc700', '#ff5722'];
        function createSparks(button) { /* ... código sparks ... */ }
        els.clearBtn?.addEventListener('click', (e) => { /* ... código limpiar filtros ... */ });

        // Tags de Marca (idéntico)
        els.brandTagsContainer?.addEventListener('click', (e) => { /* ... código tags ... */ });

        // Paginación (idéntico)
        els.paginationContainer?.addEventListener('click', (e) => { /* ... código paginación ... */ });

        // Modales (idénticos)
        els.modalCloseBtn?.addEventListener('click', closeModal);
        els.modal?.addEventListener('click', (e) => { if (e.target === els.modal) closeModal(); });
        els.guideModalCloseBtn?.addEventListener('click', closeGuideModal);
        els.guideModal?.addEventListener('click', (e) => { if (e.target === els.guideModal) closeGuideModal(); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.guideModal?.style.display === 'flex') closeGuideModal(); });
        
        // Botones de cambio de vista (Grid/Lista)
        const switchView = (view) => {
             if (view === 'grid' && els.results?.classList.contains('list-view')) {
                 els.results.classList.remove('list-view');
                 els.viewGridBtn?.classList.add('active'); els.viewGridBtn?.setAttribute('aria-checked', 'true');
                 els.viewListBtn?.classList.remove('active'); els.viewListBtn?.setAttribute('aria-checked', 'false');
                 localStorage.setItem('viewMode', 'grid');
             } else if (view === 'list' && !els.results?.classList.contains('list-view')) {
                 els.results.classList.add('list-view');
                 els.viewGridBtn?.classList.remove('active'); els.viewGridBtn?.setAttribute('aria-checked', 'false');
                 els.viewListBtn?.classList.add('active'); els.viewListBtn?.setAttribute('aria-checked', 'true');
                 localStorage.setItem('viewMode', 'list');
             }
        };
        els.viewGridBtn?.addEventListener('click', () => switchView('grid'));
        els.viewListBtn?.addEventListener('click', () => switchView('list'));
        // Aplicar vista guardada al inicio
        const savedView = localStorage.getItem('viewMode');
        switchView(savedView === 'list' ? 'list' : 'grid');
    }

    // --- INICIALIZACIÓN ---
    async function inicializarApp() {
        showSkeletonLoader();
        
        let rawData;
        try {
            // *** CAMBIO: Cargar datos desde data.json ***
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            rawData = await response.json();

        } catch (error) {
            console.error("Error al cargar o parsear data.json:", error);
            els.results.innerHTML = `<div class="no-results-container"><p>Error al cargar datos</p><span>${error.message}</span></div>`;
            return; // Detener si no se pueden cargar los datos
        }

        // Procesar datos (añadir anchoNum, altoNum)
        brakePadsData = rawData.map(item => { 
            const medidas = (item.medidas || '').split('x').map(s => parseFloat(s.trim())); 
            return { 
                ...item, 
                anchoNum: medidas[0] || 0, 
                altoNum: medidas[1] || 0 
            }; 
        });
        
        // Rellenar Datalists
        const getAllValues = (key, isApp = false) => {
            const values = new Set();
            brakePadsData.forEach(item => {
                if (isApp) {
                    (item.aplicaciones || []).forEach(app => { if (app[key]) values.add(app[key]); });
                } else {
                    if (Array.isArray(item[key])) { item[key].forEach(v => { if(v) values.add(v); }); } 
                    else if (item[key]) { values.add(item[key]); }
                }
            });
            return [...values].sort();
        };
        fillDatalist(els.datalistMarca, getAllValues('marca', true)); 
        fillDatalist(els.datalistModelo, getAllValues('serie', true)); 
        fillDatalist(els.datalistAnio, getAllValues('año', true));
        fillDatalist(els.datalistOem, getAllValues('oem'));
        fillDatalist(els.datalistFmsi, getAllValues('fmsi'));

        // Generar Tags de Marca Populares
        const brandFrequencies = brakePadsData.flatMap(item => item.aplicaciones?.map(app => app.marca) || []).filter(Boolean)
            .reduce((counts, brand) => { counts[brand] = (counts[brand] || 0) + 1; return counts; }, {});
        const sortedBrands = Object.entries(brandFrequencies).sort(([, a], [, b]) => b - a).slice(0, 10).map(([b]) => b); 
        const brandColors = ['--brand-color-1','--brand-color-2','--brand-color-3','--brand-color-4','--brand-color-5','--brand-color-6','--brand-color-7','--brand-color-8','--brand-color-9','--brand-color-10'];
        brandColorMap = sortedBrands.reduce((map, brand, i) => { map[brand] = brandColors[i % brandColors.length]; return map; }, {});
        if (els.brandTagsContainer) els.brandTagsContainer.innerHTML = sortedBrands.map(brand => `<button class="brand-tag" data-brand="${brand}">${brand}</button>`).join('');

        // Aplicar filtros iniciales (de URL) y renderizar
        applyFiltersFromURL(); 
        filterData(); // Esto llamará a renderCurrentPage
    }

    // Iniciar la aplicación
    setupEventListeners(); 
    inicializarApp();
});
