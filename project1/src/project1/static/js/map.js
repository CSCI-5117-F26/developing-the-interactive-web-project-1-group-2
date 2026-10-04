let clickedLocation;
let createPopupBackground;
let createButton = document.getElementById('createButton');

var map = L.map('map', {
    center: [44.97449, -93.23514],
    zoom: 16,
    zoomControl: false,
    doubleClickZoom: false
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const sidebarButton = L.Control.extend({
    options: {
        position: 'topleft'
    },
    onAdd: function () {
        const container = L.DomUtil.create('div');
        const button = L.DomUtil.create('button', 'pure-button', container);
        
        container.setAttribute('id', 'sidebarContainer');
        button.setAttribute('id', 'sidebarButton');
        button.setAttribute('onclick', 'adjustSideBar()');
        button.textContent = 'Expand';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
    }
});
map.addControl(new sidebarButton());

createPopupBackground = document.getElementById("createPopupBackground");
map.on('click', (e)=>{
    createPopupBackground.hidden = false;
    clickedLocation = e.latlng;
    console.log(clickedLocation);
});

createPopupBackground.addEventListener('click', (e) => {
    if (e.target === createPopupBackground) {
        hidePopup();
    }
});

// TODO: upon reload, get data to re add markers to the map
// window.addEventListener('load', () => {
// });

function hidePopup() {
    createPopupBackground.hidden = true;
}

function adjustSideBar() {
    const sidebar = document.getElementById('sidebar');
    const mapContainer = document.getElementById('mapContainer');
    const sidebarButton = document.getElementById('sidebarButton');

    if (sidebar.hidden == true) {
        sidebar.hidden = false;
        sidebarButton.textContent = 'Collapse';
        mapContainer.classList.replace('pure-u-1', 'pure-u-2-3');
    } else {
        sidebar.hidden = true;
        sidebarButton.textContent = 'Expand';
        mapContainer.classList.replace('pure-u-2-3', 'pure-u-1');
    }
}

async function create() {
    const title_form = document.getElementById('title').value;
    const description_form = document.getElementById('description').value;
    const image_form = document.getElementById('image').value;
    const location_form = clickedLocation;
    const anonOption = document.getElementsByName('anonOption');
    const anon_form = isAnon(anonOption);      // Anonymous flag  

    url = '/api/create';
    const res = await fetch (url, {
        method: "POST",
        body: JSON.stringify({
            title: title_form,
            description: description_form,
            image: image_form,
            anon: anon_form,
            location: location_form
        }),
        headers: {"Content-Type": "application/json"}
    });

    if (res.status == 201) {
        document.getElementById('title').value = '';
        document.getElementById('description').value = '';
        document.getElementById('image').value = '';
        document.getElementsByName('anonOption')[0]['checked'] = false;
        document.getElementsByName('anonOption')[1]['checked'] = false;
    }

    return res;
}

async function createPost() {
    const res = await create();

    console.log(res);

    if (res.status == 400) {
        // TODO: show alert - zoe
        return;
    }

    if (res.status == 201) {
        data = await res.json();

        var marker = L.marker([clickedLocation.lat, clickedLocation.lng], {
            postId: data.id
        }).addTo(map);
        marker.on('click', viewPost);
        hidePopup();
    }

    // TODO: show different alert - zoe
    return;
}

document.getElementById('createButton').addEventListener('click', () => {
    createPost();
});

function isAnon(options) {
    for (const option of options) {        
        const isChecked = option['checked'];

        if (isChecked == true) {
            return option.value;
        }
    }
    return null;
}

function viewPost(e) {
    console.log('viewed');
    console.log(e.target.options.postId);
}
