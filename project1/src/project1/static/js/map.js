var map = L.map('map', {
    center: [44.97449, -93.23514],
    zoom: 16,
    zoomControl: false,
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// adding footer so it lays on top of the map
const footer = L.Control.extend({
    options: {
        position: 'bottomleft'
    },
    onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-control-footer');
        const link = L.DomUtil.create('a', '', container);

        link.setAttribute('href', '/aboutus');
        link.textContent = 'About Us';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
    }
});
map.addControl(new footer());

map.on('click', (e)=>{
    const coord = e.latlng;
    
    const res = createPost(e);
    if (res == true) {
        var marker = L.marker([coord.lat, coord.lng]).addTo(map);
        marker.on('click', viewPost);
    }
});

function createPost(e) {
    console.log('created');
    return true;
}

function viewPost(e) {
    console.log('viewed');
}
