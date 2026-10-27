var CustomIcon = L.Icon.extend({
    options: {
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -40]
    }
})

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

            updateIcon({defaultPin: pin.dataset.pin});
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
                updateIcon({emojiIcon: emoji.native});
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

        updateIcon({customIconUrl: iconImg.src});
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
    
    function updateIcon({customIconUrl=null, emojiIcon=null, defaultPin=null} = {}){
        if (marker){
            let icon;
            if (customIconUrl) {
                icon = new CustomIcon({ iconUrl: customIconUrl });
            }
            else if (emojiIcon) {
                let escapeEmoji = emojiIcon.replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;', '>': '&gt;',
                    '"': '&quot;', "'": '&#39;'
                })[char]);
                icon = L.divIcon({
                    html: `<span class="emoji-marker">${escapeEmoji}</span>`,
                    className: 'emoji-marker-container',
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                    popupAnchor: [0, -18]
                })
            }
            else {
                let defaultPins = ['black_pin.png', 'black_boardpin.png','black_needlepin.png'];
                let chosenPin;
                if (defaultPins.includes(defaultPin)) {
                    chosenPin = defaultPin
                } else { chosenPin = 'black_pin.png'; }
                icon = new CustomIcon({ iconUrl: `/static/images/${chosenPin}` });
            }
            marker.setIcon(icon);
        }
    }
});