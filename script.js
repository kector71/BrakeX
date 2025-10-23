document.addEventListener('DOMContentLoaded', () => {

    let brakePadsData = [];
    let currentPage = 1;
    const itemsPerPage = 24;
    let filteredDataCache = [];
    let brandColorMap = {};

    const els = {
        body: document.body, headerX: document.querySelector('.header-x'), darkBtn: document.getElementById('darkBtn'),
        sunIcon: document.querySelector('.lp-icon-sun'), moonIcon: document.querySelector('.lp-icon-moon'),
        netlifyBtn: document.getElementById('netlifyBtn'),
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

    // --- FUNCIONES COMPLETAS ---
    const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; };
    const fillDatalist = (datalist, values) => { datalist.innerHTML = values.map(v => `<option value="${v}">`).join(''); };
    const getPositionFilter = () => { const activePositions = []; if (els.posDel.classList.contains('active')) activePositions.push('Delantera'); if (els.posTras.classList.contains('active')) activePositions.push('Trasera'); return activePositions; };
    const hasVehicleFilters = () => { return els.busqueda.value.trim() !== '' || els.marca.value.trim() !== '' || els.modelo.value.trim() !== '' || els.anio.value.trim() !== '' || getPositionFilter().length > 0 || els.oem.value.trim() !== '' || els.fmsi.value.trim() !== '' || els.medidasAncho.value.trim() !== '' || els.medidasAlto.value.trim() !== ''; };

    const filterData = () => {
        if (!brakePadsData.length) return;
        const fbusq = (val) => val.toLowerCase().trim(); const activePos = getPositionFilter();
        const filters = { busqueda: fbusq(els.busqueda.value), marca: fbusq(els.marca.value), modelo: fbusq(els.modelo.value), anio: fbusq(els.anio.value), oem: fbusq(els.oem.value), fmsi: fbusq(els.fmsi.value), ancho: parseFloat(els.medidasAncho.value), alto: parseFloat(els.medidasAlto.value), pos: activePos };

        const filtered = brakePadsData.filter(item => {
            const itemVehicles = item.aplicaciones.map(app => `${app.marca} ${app.serie} ${app.litros} ${app.año} ${app.especificacion}`).join(' ').toLowerCase();
            const itemPosicion = item.posición;
            const busqMatch = !filters.busqueda ||
                item.ref?.some(r => r.toLowerCase().includes(filters.busqueda)) ||
                item.oem?.some(o => o.toLowerCase().includes(filters.busqueda)) ||
                item.fmsi?.some(f => f.toLowerCase().includes(filters.busqueda)) ||
                itemVehicles.includes(filters.busqueda);
            const appMatch = !filters.marca && !filters.modelo && !filters.anio || item.aplicaciones.some(app => (!filters.marca || app.marca.toLowerCase().includes(filters.marca)) && (!filters.modelo || app.serie.toLowerCase().includes(filters.modelo)) && (!filters.anio || app.año.toLowerCase().includes(filters.anio)));
            const oemMatch = !filters.oem || (item.oem && item.oem.some(o => o.toLowerCase().includes(filters.oem)));
            const fmsiMatch = !filters.fmsi || (item.fmsi && item.fmsi.some(f => f.toLowerCase().includes(filters.fmsi)));
            let posMatch = true; if (filters.pos.length > 0) { posMatch = filters.pos.includes(itemPosicion); }
            const TOLERANCIA = 1.0;
            const anchoMatchTolerancia = !filters.ancho || (item.anchoNum >= (filters.ancho - TOLERANCIA) && item.anchoNum <= (filters.ancho + TOLERANCIA));
            const altoMatchTolerancia = !filters.alto || (item.altoNum >= (filters.alto - TOLERANCIA) && item.altoNum <= (filters.alto + TOLERANCIA));
            return busqMatch && appMatch && oemMatch && fmsiMatch && posMatch && anchoMatchTolerancia && altoMatchTolerancia;
        });

        filteredDataCache = filtered;
        currentPage = 1;
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

    const renderSpecs = (item) => {
        let specsHTML = `<div class="app-brand-header">ESPECIFICACIONES</div>`;
        const refText = (item.ref && item.ref.length > 0 ? item.ref.join(', ') : 'N/A');
        specsHTML += `<div class="app-detail-row"><div><strong>Referencias</strong></div><div></div><div>${refText}</div></div>`;
        const oemText = (item.oem && item.oem.length > 0 ? item.oem.join(', ') : 'N/A');
        specsHTML += `<div class="app-detail-row"><div><strong>OEM</strong></div><div></div><div>${oemText}</div></div>`;
        const fmsiText = (item.fmsi && item.fmsi.length > 0 ? item.fmsi.join(', ') : 'N/A');
        specsHTML += `<div class="app-detail-row"><div><strong>Platina FMSI</strong></div><div></div><div>${fmsiText}</div></div>`;
        specsHTML += `<div class="app-detail-row"><div><strong>Ancho</strong></div><div></div><div>${item.anchoNum || 'N/A'} mm</div></div>`;
        specsHTML += `<div class="app-detail-row"><div><strong>Alto</strong></div><div></div><div>${item.altoNum || 'N/A'} mm</div></div>`;
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
        paginationHTML += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
        const maxPagesToShow = 5; const halfPages = Math.floor(maxPagesToShow / 2); let startPage, endPage;
        if (totalPages <= maxPagesToShow) { startPage = 1; endPage = totalPages; } else if (currentPage <= halfPages + 1) { startPage = 1; endPage = maxPagesToShow; } else if (currentPage >= totalPages - halfPages) { startPage = totalPages - maxPagesToShow + 1; endPage = totalPages; } else { startPage = currentPage - halfPages; endPage = currentPage + halfPages; }
        if (startPage > 1) { paginationHTML += `<button class="page-btn" data-page="1">1</button>`; if (startPage > 2) { paginationHTML += `<button class="page-btn" disabled>...</button>`; } }
        for (let i = startPage; i <= endPage; i++) { paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`; }
        if (endPage < totalPages) { if (endPage < totalPages - 1) { paginationHTML += `<button class="page-btn" disabled>...</button>`; } paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`; }
        paginationHTML += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>`;
        els.paginationContainer.innerHTML = paginationHTML;
    }

    const renderCurrentPage = () => {
        const totalResults = filteredDataCache.length; const startIndex = (currentPage - 1) * itemsPerPage; const endIndex = startIndex + itemsPerPage; const paginatedData = filteredDataCache.slice(startIndex, endIndex);
        const startNum = totalResults === 0 ? 0 : startIndex + 1; const endNum = Math.min(endIndex, totalResults); els.countContainer.innerHTML = `Mostrando <strong>${startNum}–${endNum}</strong> de <strong>${totalResults}</strong> resultados`;
        if (totalResults === 0) { els.results.innerHTML = `<div class="no-results-container"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"></path><path d="M21 21L16.65 16.65"></path><path d="M11 8V11L13 13"></path></svg><p>No se encontraron pastillas</p><span>Intenta ajustar tus filtros de búsqueda.</span></div>`; els.paginationContainer.innerHTML = ''; return; }
        
        els.results.innerHTML = paginatedData.map((item, index) => {
            const posBadgeClass = item.posición === 'Delantera' ? 'delantera' : 'trasera';
            const posBadge = `<span class="position-badge ${posBadgeClass}">${item.posición}</span>`;
            const primaryRef = item.ref && item.ref.length > 0 ? item.ref[0] : 'N/A';
            
            let firstImageSrc = 'https://via.placeholder.com/300x200.png?text=No+Img'; // Fallback
            if (item.imagenes && item.imagenes.length > 0) {
                firstImageSrc = item.imagenes[0];
            } else if (item.imagen) { // Fallback para el formato de 'imagen' string
                firstImageSrc = item.imagen.replace("text=", `text=Vista+1+`);
            }

            const appSummaryItems = item.aplicaciones.slice(0, 3).map(app => `${app.marca} ${app.serie}`).filter((value, index, self) => self.indexOf(value) === index);
            let appSummaryHTML = '';
            if (appSummaryItems.length > 0) {
                appSummaryHTML = `<div class="card-app-summary">${appSummaryItems.join(', ')}${item.aplicaciones.length > 3 ? ', ...' : ''}</div>`;
            }

            return `
                <div class="result-card" data-ref="${primaryRef}" style="animation-delay: ${index * 50}ms" tabindex="0" role="button" aria-haspopup="dialog">
                    <div class="card-thumbnail"><img src="${firstImageSrc}" alt="Referencia ${primaryRef}" class="result-image" loading="lazy"></div>
                    <div class="card-content-wrapper">
                        <div class="card-details">
                            <div class="card-ref">${primaryRef}</div>
                            ${posBadge}
                        </div>
                        ${appSummaryHTML}
                    </div>
                </div>`;
        }).join('');

        els.results.removeEventListener('click', handleCardClick);
        els.results.addEventListener('click', handleCardClick);
        setupPagination(totalResults);
    };

    function handleCardClick(event) { const card = event.target.closest('.result-card'); if (card) { const primaryRef = card.dataset.ref; const itemData = brakePadsData.find(item => item.ref && item.ref.length > 0 && item.ref[0] === primaryRef); if (itemData) { openModal(itemData); } } }
    const updateScrollIndicator = () => { const wrapper = els.modalDetailsWrapper; const content = els.modalDetailsContent; if (wrapper && content) { const isScrollable = content.scrollHeight > content.clientHeight; const isAtBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 5; if (isScrollable && !isAtBottom) { wrapper.classList.add('scrollable'); } else { wrapper.classList.remove('scrollable'); } } };
    
    function openModal(item) {
        const primaryRef = item.ref && item.ref.length > 0 ? item.ref[0] : 'N/A';
        els.modalRef.textContent = primaryRef;
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
        images.forEach((imgSrc, i) => {
            imageTrackHTML += `<img src="${imgSrc}" alt="Referencia ${primaryRef} Vista ${i + 1}" class="result-image">`;
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

    function closeModal() { els.modalContent.classList.add('closing'); els.modalDetailsContent.removeEventListener('scroll', updateScrollIndicator); els.modalDetailsWrapper.classList.remove('scrollable'); setTimeout(() => { els.modal.style.display = 'none'; document.body.style.overflow = ''; els.modalCarousel.innerHTML = ''; els.modalRef.textContent = ''; els.modalPosition.innerHTML = ''; els.modalAppsSpecs.innerHTML = ''; els.modalCounterWrapper.innerHTML = ''; els.modalContent.classList.remove('closing'); }, 220); }
    function openGuideModal() { els.guideModalContent.classList.remove('closing'); els.guideModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    function closeGuideModal() { els.guideModalContent.classList.add('closing'); setTimeout(() => { els.guideModal.style.display = 'none'; document.body.style.overflow = ''; els.guideModalContent.classList.remove('closing'); }, 220); }
    function openSideMenu() { els.sideMenu.classList.add('open'); els.sideMenu.setAttribute('aria-hidden', 'false'); els.sideMenuOverlay.style.display = 'block'; requestAnimationFrame(() => { els.sideMenuOverlay.classList.add('visible'); }); els.menuBtn.setAttribute('aria-expanded', 'true'); els.menuCloseBtn.focus(); }
    function closeSideMenu() { els.sideMenu.classList.remove('open'); els.sideMenu.setAttribute('aria-hidden', 'true'); els.sideMenuOverlay.classList.remove('visible'); els.menuBtn.setAttribute('aria-expanded', 'false'); els.menuBtn.focus(); els.sideMenuOverlay.addEventListener('transitionend', () => { if (!els.sideMenuOverlay.classList.contains('visible')) { els.sideMenuOverlay.style.display = 'none'; } }, { once: true }); }
    function setupSwipe(carouselElement) { let startX, startY, endX, endY; const threshold = 50; carouselElement.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true }); carouselElement.addEventListener('touchmove', (e) => { if (Math.abs(e.touches[0].clientX - startX) > Math.abs(e.touches[0].clientY - startY)) { e.preventDefault(); } }, { passive: false }); carouselElement.addEventListener('touchend', (e) => { endX = e.changedTouches[0].clientX; endY = e.changedTouches[0].clientY; const diffX = endX - startX; const diffY = endY - startY; if (Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) { if (diffX > 0) { navigateCarousel(carouselElement, -1); } else { navigateCarousel(carouselElement, 1); } } }); }
    const clearAllFilters = () => { const inputsToClear = [els.busqueda, els.marca, els.modelo, els.anio, els.oem, els.fmsi, els.medidasAncho, els.medidasAlto]; inputsToClear.forEach(input => input.value = ''); els.posDel.classList.remove('active'); els.posTras.classList.remove('active'); if (els.brandTagsContainer) { els.brandTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => { activeTag.classList.remove('active'); activeTag.style.borderColor = ''; activeTag.style.color = ''; }); } filterData(); };
    const createRippleEffect = (event) => { const button = event.currentTarget; const circle = document.createElement('span'); const diameter = Math.max(button.clientWidth, button.clientHeight); const radius = diameter / 2; const rect = button.getBoundingClientRect(); circle.style.width = circle.style.height = `${diameter}px`; circle.style.left = `${event.clientX - (rect.left + radius)}px`; circle.style.top = `${event.clientY - (rect.top + radius)}px`; circle.classList.add('ripple'); const ripple = button.getElementsByClassName('ripple')[0]; if (ripple) { ripple.remove(); } button.appendChild(circle); };
    const updateURLWithFilters = () => { const params = new URLSearchParams(); const filters = { busqueda: els.busqueda.value.trim(), marca: els.marca.value.trim(), modelo: els.modelo.value.trim(), anio: els.anio.value.trim(), oem: els.oem.value.trim(), fmsi: els.fmsi.value.trim(), ancho: els.medidasAncho.value.trim(), alto: els.medidasAlto.value.trim(), }; for (const key in filters) { if (filters[key]) { params.set(key, filters[key]); } } const activePositions = getPositionFilter(); if (activePositions.length > 0) { params.set('pos', activePositions.join(',')); } const newUrl = `${window.location.pathname}?${params.toString()}`; history.pushState({}, '', newUrl); };
    const applyFiltersFromURL = () => { const params = new URLSearchParams(window.location.search); els.busqueda.value = params.get('busqueda') || ''; const brandFromURL = params.get('marca'); els.marca.value = brandFromURL || ''; els.modelo.value = params.get('modelo') || ''; els.anio.value = params.get('anio') || ''; els.oem.value = params.get('oem') || ''; els.fmsi.value = params.get('fmsi') || ''; els.medidasAncho.value = params.get('ancho') || ''; els.medidasAlto.value = params.get('alto') || ''; const posParam = params.get('pos'); if (posParam) { if (posParam.includes('Delantera')) els.posDel.classList.add('active'); if (posParam.includes('Trasera')) els.posTras.classList.add('active'); } if (els.brandTagsContainer) { els.brandTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => { activeTag.classList.remove('active'); activeTag.style.borderColor = ''; activeTag.style.color = ''; }); } if (brandFromURL && els.brandTagsContainer) { const tagToActivate = els.brandTagsContainer.querySelector(`.brand-tag[data-brand="${brandFromURL}"]`); if (tagToActivate) { tagToActivate.classList.add('active'); const colorVar = brandColorMap[brandFromURL]; if (colorVar) { const activeColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim(); tagToActivate.style.borderColor = activeColor; tagToActivate.style.color = activeColor; } } } };

    // --- SETUP EVENT LISTENERS (CON LÓGICA DE 3 TEMAS RESTAURADA) ---
    function setupEventListeners() {
        // Aplicar ripple a todos los botones
        [els.darkBtn, els.upBtn, els.menuBtn, els.netlifyBtn].forEach(btn => btn?.addEventListener('click', createRippleEffect));

        // --- Lógica Botón Sol/Luna (Claro/AMOLED) ---
        const iconAnimation = (iconToShow, iconToHide) => {
            if (!iconToShow) return;
            
            // Corrección clave: Añadir 'translate(-50%, -50%)' para mantener el centrado
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


        const applyOriginalTheme = (theme) => {
            els.body.classList.remove('lp-dark', 'netlify-dark');
            if (theme === 'dark') {
                els.body.classList.add('lp-dark');
                iconAnimation(els.moonIcon, els.sunIcon);
                els.darkBtn.setAttribute('aria-pressed', 'true');
                els.darkBtn.setAttribute('aria-label', 'Cambiar a modo claro');
            } else {
                iconAnimation(els.sunIcon, els.moonIcon);
                els.darkBtn.setAttribute('aria-pressed', 'false');
                els.darkBtn.setAttribute('aria-label', 'Cambiar a modo oscuro');
            }
            if(els.netlifyBtn) {
                els.netlifyBtn.classList.remove('active');
                els.netlifyBtn.setAttribute('aria-pressed', 'false');
            }
            localStorage.setItem('themePreference', theme);
        };

        els.darkBtn.addEventListener('click', () => {
            const isCurrentlyDark = els.body.classList.contains('lp-dark');
            applyOriginalTheme(isCurrentlyDark ? 'light' : 'dark');
            
            els.headerX.style.animation = 'bounceHeader 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)';
            setTimeout(() => { els.headerX.style.animation = ''; }, 600);
        });

        // --- Lógica Botón Netlify ---
        const applyNetlifyTheme = () => {
            els.body.classList.remove('lp-dark');
            els.body.classList.add('netlify-dark');
            els.netlifyBtn.classList.add('active');
            els.netlifyBtn.setAttribute('aria-pressed', 'true');
            iconAnimation(els.sunIcon, els.moonIcon); 
            els.darkBtn.setAttribute('aria-pressed', 'false');
            localStorage.setItem('themePreference', 'netlify');
        };

        // ===== INICIO DE LA MODIFICACIÓN (ANIMACIÓN) =====
        if(els.netlifyBtn) {
            els.netlifyBtn.addEventListener('click', () => {
                // Lógica de tema original
                const isCurrentlyNetlify = els.body.classList.contains('netlify-dark');
                if (isCurrentlyNetlify) {
                    applyOriginalTheme('light');
                } else {
                    applyNetlifyTheme();
                }
                
                // Animación del header original
                 els.headerX.style.animation = 'bounceHeader 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)';
                 setTimeout(() => { els.headerX.style.animation = ''; }, 600);
                 
                // Nueva Animación para el icono de la paleta
                const themeIcon = els.netlifyBtn.querySelector('.lp-icon-palette');
                if (themeIcon) {
                    themeIcon.animate([
                        // Usamos translate(-50%, -50%) para mantenerlo centrado
                        { transform: 'translate(-50%, -50%) scale(0.8) rotate(0deg)', opacity: 0.7 },
                        { transform: 'translate(-50%, -50%) scale(1.2) rotate(30deg)', opacity: 1 },
                        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 }
                    ], {
                        duration: 400,
                        easing: 'ease-out'
                    });
                }
            });
        }
        // ===== FIN DE LA MODIFICACIÓN =====


        // --- Aplicar Tema Guardado al Cargar ---
        const savedTheme = localStorage.getItem('themePreference');
        if (savedTheme === 'netlify' && els.netlifyBtn) {
            applyNetlifyTheme();
            iconAnimation(els.sunIcon, null); // Solo mostrar sol
        } else if (savedTheme === 'dark') {
            applyOriginalTheme('dark');
        } else {
            applyOriginalTheme('light'); // Default
        }
        // --- FIN LÓGICA DE TEMAS ---


        // --- Resto de Event Listeners ---
        els.upBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => { els.upBtn.classList.toggle('show', window.scrollY > 300); });
        els.menuBtn.addEventListener('click', openSideMenu);
        els.menuCloseBtn.addEventListener('click', closeSideMenu);
        els.sideMenuOverlay.addEventListener('click', closeSideMenu);
        els.openGuideLink.addEventListener('click', () => { closeSideMenu(); setTimeout(openGuideModal, 50); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.sideMenu.classList.contains('open')) { closeSideMenu(); } });
        
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
            const rect = e.currentTarget.getBoundingClientRect(); 
            createRippleEffect({ currentTarget: e.currentTarget, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, target: e.currentTarget, preventDefault: () => {} }); 
            els.clearBtn.classList.add('animate-button'); 
            if (trashLid) trashLid.classList.add('animate-lid'); 
            if (trashBody) trashBody.classList.add('animate-body'); 
            createSparks(els.clearBtn); 
            clearAllFilters(); 
            setTimeout(() => { 
                els.clearBtn.classList.remove('animate-button'); 
                if (trashLid) trashLid.classList.remove('animate-lid'); 
                if (trashBody) trashBody.classList.remove('animate-body'); 
                els.clearBtn.disabled = false; 
            }, 900); 
        });
        
        if (els.brandTagsContainer) { els.brandTagsContainer.addEventListener('click', (e) => { const tag = e.target.closest('.brand-tag'); if (!tag) return; const brand = tag.dataset.brand; const isActive = tag.classList.contains('active'); els.brandTagsContainer.querySelectorAll('.brand-tag.active').forEach(activeTag => { if (activeTag !== tag) { activeTag.classList.remove('active'); activeTag.style.borderColor = ''; activeTag.style.color = ''; } }); if (isActive) { tag.classList.remove('active'); tag.style.borderColor = ''; tag.style.color = ''; els.marca.value = ''; } else { tag.classList.add('active'); const colorVar = brandColorMap[brand]; if (colorVar) { const activeColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim(); tag.style.borderColor = activeColor; tag.style.color = activeColor; } els.marca.value = brand; } filterData(); }); }
        
        els.paginationContainer.addEventListener('click', (e) => { const btn = e.target.closest('.page-btn'); if (!btn || btn.disabled || btn.classList.contains('active')) { return; } const newPage = parseInt(btn.dataset.page); if (newPage) { currentPage = newPage; renderCurrentPage(); els.resultsHeaderCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
        
        els.modalCloseBtn.addEventListener('click', closeModal); 
        els.modal.addEventListener('click', (event) => { if (event.target === els.modal) { closeModal(); } });
        
        els.guideModalCloseBtn.addEventListener('click', closeGuideModal); 
        els.guideModal.addEventListener('click', (event) => { if (event.target === els.guideModal) { closeGuideModal(); } }); 
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && els.guideModal.style.display === 'flex') { closeGuideModal(); } });

    }

    async function inicializarApp() {
        showSkeletonLoader();
        
        try {
            const response = await fetch('data.json'); 
            if (!response.ok) {
                throw new Error(`Error HTTP! estado: ${response.status}`);
            }
            let data = await response.json();
            
            data = data.map(item => {
                if (item.imagen && (!item.imagenes || item.imagenes.length === 0)) {
                    item.imagenes = [
                        item.imagen.replace("text=", `text=Vista+1+`),
                        item.imagen.replace("text=", `text=Vista+2+`),
                        item.imagen.replace("text=", `text=Vista+3+`)
                    ];
                }
                const partes = item.medidas ? item.medidas.split('x').map(s => parseFloat(s.trim())) : [0,0];
                return { ...item, anchoNum: partes[0] || 0, altoNum: partes[1] || 0 };
            });

            brakePadsData = data;
            
            const getAllApplicationValues = (key) => { const allValues = new Set(); brakePadsData.forEach(item => { item.aplicaciones.forEach(app => { const prop = (key === 'modelo') ? 'serie' : key; if (app[prop]) allValues.add(app[prop]); }); }); return [...allValues].sort(); };
            fillDatalist(els.datalistMarca, getAllApplicationValues('marca'));
            fillDatalist(els.datalistModelo, getAllApplicationValues('modelo'));
            fillDatalist(els.datalistAnio, getAllApplicationValues('año'));
            const allOems = [...new Set(brakePadsData.flatMap(i => i.oem || []))].filter(Boolean).sort();
            const allFmsis = [...new Set(brakePadsData.flatMap(i => i.fmsi || []))].filter(Boolean).sort();
            fillDatalist(els.datalistOem, allOems);
            fillDatalist(els.datalistFmsi, allFmsis);
            const allBrandsList = brakePadsData.flatMap(item => item.aplicaciones.map(app => app.marca)).filter(Boolean);
            const brandFrequencies = allBrandsList.reduce((counts, brand) => { counts[brand] = (counts[brand] || 0) + 1; return counts; }, {});
            const sortedBrands = Object.entries(brandFrequencies).sort(([, countA], [, countB]) => countB - countA).slice(0, 10).map(([brand]) => brand);
            const brandColors = [ '--brand-color-1', '--brand-color-2', '--brand-color-3', '--brand-color-4', '--brand-color-5', '--brand-color-6', '--brand-color-7', '--brand-color-8', '--brand-color-9', '--brand-color-10' ];
            brandColorMap = {};
            sortedBrands.forEach((brand, index) => { brandColorMap[brand] = brandColors[index % brandColors.length]; });
            if (els.brandTagsContainer) { els.brandTagsContainer.innerHTML = sortedBrands.map(brand => `<button class="brand-tag" data-brand="${brand}">${brand}</button>`).join(''); }
            applyFiltersFromURL();
            filterData();
        } catch (error) {
            console.error("Error al cargar los datos:", error);
            els.results.innerHTML = `<div class="no-results-container"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line><line x1="12" y1="22" x2="12" y2="22"></line></svg><p>Error al cargar datos</p><span>No se pudo conectar con la base de datos (data.json). Asegúrate que el archivo exista.</span></div>`;
            els.countContainer.innerHTML = "Error";
            els.paginationContainer.innerHTML = '';
        }
    }

    setupEventListeners();
    inicializarApp();
});
