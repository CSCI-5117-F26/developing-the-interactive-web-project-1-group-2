
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('editForm');
    if (!form) return;
    const $ = (id) => document.getElementById(id);
 
    [['title', 'titleCount', 100], ['description', 'descCount', 500]].forEach(([inputId, counterId, max]) => {
        const input = $(inputId);
        const counter = $(counterId);
        const update = () => { counter.textContent = `${input.value.length}/${max}`; };
        input.addEventListener('input', update);
        update();
    });
 
    const imageInput = $('image');
    const imagePreview = $('imagePreview');
    const removeInput = $('removeImage');
    const actions = $('imageActions');
    const status = $('imageStatus');
    const originalSrc = imagePreview.getAttribute('src');
 
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            imagePreview.src = URL.createObjectURL(file);
            imagePreview.hidden = false;
            removeInput.value = 'no';
            actions.hidden = false;
            status.textContent = 'New image selected · it will replace the current one';
        }
    });
 
    $('removeImageBtn').addEventListener('click', () => {
        imageInput.value = '';
        imagePreview.removeAttribute('src');
        imagePreview.hidden = true;
        removeInput.value = 'yes';
        actions.hidden = true;
    });
 
    const iconOptions = form.querySelectorAll('.icon-option');
    const iconInput = $('icon');
    const customRow = $('customIconRow');
    iconOptions.forEach((option) => {
        option.addEventListener('click', () => {
            iconOptions.forEach((currentOption) => {
                const on = currentOption === option;
                currentOption.classList.toggle('is-selected', on);
                currentOption.setAttribute('aria-pressed', on);
            });
            iconInput.value = option.dataset.icon;
            customRow.hidden = option.dataset.icon !== 'custom';
            if (customRow.hidden) $('customIcon').value = '';
        });
    });
 
    // Location validation
    const locationError = $('locationError');
    const searchInput = $('locationSearch');
    form.addEventListener('submit', (e) => {
        if (!$('lat').value || !$('long').value) {
            e.preventDefault();
            if (locationError) locationError.hidden = false;
            searchInput.focus();
        }
    });
 
    // Location picker map
    const mapEl = $('locationMap');
    if (!mapEl || !window.L) return;
 
    let marker = null;
    let buildings = [];
    const startLat = parseFloat($('lat').value);
    const startLng = parseFloat($('long').value);
    const hasStart = !isNaN(startLat) && !isNaN(startLng);
 
    const pickerMap = L.map(mapEl, {
        center: hasStart ? [startLat, startLng] : [44.97449, -93.23514],
        zoom: hasStart ? 17 : 15,
        doubleClickZoom: false
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(pickerMap);
 
    function setLocation(latlng, name) {
        $('lat').value = latlng.lat;
        $('long').value = latlng.lng;
        $('locationName').value = name || '';
        searchInput.value = name || '';
        if (locationError) locationError.hidden = true;
        if (marker) {
            marker.setLatLng(latlng);
        } else {
            marker = L.marker(latlng).addTo(pickerMap);
        }
    }
 
    if (hasStart) marker = L.marker([startLat, startLng]).addTo(pickerMap);
 
    pickerMap.on('click', (e) => setLocation(e.latlng, ''));
 
    fetch(REGIONS_URL)
        .then((res) => res.json())
        .then((data) => {
            buildings = data.features.filter((f) => f.properties && f.properties.BLDG_NAME_);
 
            const list = $('buildingList');
            [...new Set(buildings.map((f) => f.properties.BLDG_NAME_))].sort().forEach((name) => {
                const opt = document.createElement('option');
                opt.value = name;
                list.appendChild(opt);
            });
 
            L.geoJson(data.features, {
                style: () => ({ opacity: 0, fillOpacity: 0 }),
                bubblingMouseEvents: false
            }).on('click', (e) => {
                setLocation(e.latlng, e.layer.feature.properties.BLDG_NAME_);
            }).addTo(pickerMap);
        });
 
    searchInput.addEventListener('change', () => {
        const feature = buildings.find((f) => f.properties.BLDG_NAME_ === searchInput.value);
        if (!feature) return;
        const center = L.geoJson(feature).getBounds().getCenter();
        setLocation(center, feature.properties.BLDG_NAME_);
        pickerMap.setView(center, 17);
    });
 
    setTimeout(() => pickerMap.invalidateSize(), 0);
});