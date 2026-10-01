var map = L.map('map', {
    center: [44.97449, -93.23514],
    zoom: 16,
    zoomControl: false,
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

map.on('click', (e)=>{
    const coord = e.latlng;
    
    createPostPopup(e);  // fix later
    // if (res == true) {
    //     var marker = L.marker([coord.lat, coord.lng]).addTo(map);
    //     marker.on('click', viewPost);
    // }
});

let createPopup = document.getElementById("createPopup");
createPopup.addEventListener('click', () => {
    createPopup.hidden = true;
})

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

function createPostPopup(e) {
    createPopup.hidden = false;
}

function viewPost(e) {
    console.log('viewed');
}
