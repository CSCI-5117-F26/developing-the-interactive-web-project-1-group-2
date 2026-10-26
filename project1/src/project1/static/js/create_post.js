function showLocationSummary() {
    const el = document.getElementById('locationSummary');
    if (!el) return;
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('long').value);
    const name = document.getElementById('locationName').value;
    if (isNaN(lat) || isNaN(lng)) return;
    el.textContent = `${name || 'Dropped pin'} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createForm');
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
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            imagePreview.src = URL.createObjectURL(file);
            imagePreview.hidden = false;
        } else {
            imagePreview.removeAttribute('src');
            imagePreview.hidden = true;
        }
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

    [$('closePopup'), $('cancelPost')].forEach((btn) => {
        if (btn) btn.addEventListener('click', () => changePopup(true));
    });

    const locationError = $('locationError');
    form.addEventListener('submit', (e) => {
        if (!$('lat').value || !$('long').value) {
            e.preventDefault();
            if (locationError) locationError.hidden = false;
            const search = $('locationSearch');
            if (search) search.focus();
        }
    });

    const mapEl = $('locationMap');
    const newPostBtn = $('newPostBtn');
    if (!mapEl || !newPostBtn || !window.L) return;

    let pickerMap = null;
    let marker = null;
    let buildings = [];
    const searchInput = $('locationSearch');

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

    function initPicker() {
        if (pickerMap) {
            setTimeout(() => pickerMap.invalidateSize(), 0);
            return;
        }
        pickerMap = L.map(mapEl, {
            center: [44.97449, -93.23514],
            zoom: 15,
            doubleClickZoom: false
        });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(pickerMap);

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

        setTimeout(() => pickerMap.invalidateSize(), 0);
    }

    searchInput.addEventListener('change', () => {
        const feature = buildings.find((f) => f.properties.BLDG_NAME_ === searchInput.value);
        if (!feature) return;
        const center = L.geoJson(feature).getBounds().getCenter();
        setLocation(center, feature.properties.BLDG_NAME_);
        pickerMap.setView(center, 17);
    });

    newPostBtn.addEventListener('click', () => {
        changePopup(false, 'createForm');
        initPicker();
    });
});