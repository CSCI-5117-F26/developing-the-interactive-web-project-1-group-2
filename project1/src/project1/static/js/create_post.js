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

    //add default pin options
    let pinOptions = document.querySelectorAll('.pin-option');

    pinOptions.forEach((pin) => {
        function selectPin() {
            $('defaultPin').value = pin.dataset.pin;
            $('iconOptions').value = 'pin';
            $('icon').value = '';

            pinOptions.forEach((option) => {
                option.classList.toggle('is-selected', option === pin);
                option.setAttribute('aria-pressed', String(option === pin));
            });

            $('emojiIconOptions').hidden = true;
            $('customIconRow').hidden = true;

            $('emojiIconButton').classList.remove('is-selected');
            $('customIconButton').classList.remove('is-selected');

            $('emojiIconButton').setAttribute('aria-pressed', 'false');
            $('customIconButton').setAttribute('aria-pressed', 'false');
        }

        pin.addEventListener('click', selectPin);

        pin.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectPin();
            }
        });
    });

    // add emoji icons
    let pickerContainer = $('emojiPicker');
    if (pickerContainer && window.EmojiMart?.Picker) {
        let emojiPicker = new EmojiMart.Picker({
            onEmojiSelect: (emoji) => {
                $('icon').value = emoji.native;
                let selectedEmoji = $('selectedEmoji');
                if (selectedEmoji) {
                    selectedEmoji.replaceWith(Object.assign(document.createElement('span'), { id: 'selectedEmoji', textContent: emoji.native }))
                }
            },
            previewPosition: 'none',
            theme: 'light',
            maxFrequentRows: 2
        });

        pickerContainer.appendChild(emojiPicker);
    }

    let emojiButton = $('emojiIconButton');
    let customButton = $('customIconButton');
    let emojiIconOptions = $('emojiIconOptions');
    let customRow = $('customIconRow');
    let customInput = $('customIcon');
    let iconOptionsInput = $('iconOptions');

    function setIconOptions(option) {
        iconOptionsInput.value = option;
        emojiIconOptions.hidden = option !== 'emoji';
        customRow.hidden = option !== 'custom';
        emojiButton.classList.toggle('is-selected', option === 'emoji');
        customButton.classList.toggle('is-selected', option === 'custom');
        emojiButton.setAttribute('aria-pressed', String(option === 'emoji'));
        customButton.setAttribute('aria-pressed', String(option === 'custom'));
        
        pinOptions.forEach((pin) => {
            pin.classList.remove('is-selected');
            pin.setAttribute('aria-pressed', 'false');
        });

        if (option === 'emoji') {
            customInput.value = '';
            let preview = $('customIconPreview');
            if (preview) {
                preview.replaceChildren();
            }
        }
        if (option === 'custom') {
            $('icon').value = '';
        }
    }

    emojiButton.addEventListener('click', () => setIconOptions('emoji'));
    customButton.addEventListener('click', () => setIconOptions('custom'));

    customInput.addEventListener('change', () => {
        let file = customInput.files[0];

        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
            alert('Please upload a PNG, JPG, or GIF image.');
            customInput.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('The custom icon must be 5 MB or smaller.');
            customInput.value = '';
            return;
        }

        let preview = $('customIconPreview');

        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'customIconPreview';
            customRow.appendChild(preview);
        }

        preview.replaceChildren();

        let iconImg = document.createElement('img');
        iconImg.alt = 'Custom map icon preview';
        iconImg.style.width = '48px';
        iconImg.style.height = '48px';
        iconImg.style.objectFit = 'contain';
        iconImg.src = URL.createObjectURL(file);

        preview.appendChild(iconImg);
    });
    
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

