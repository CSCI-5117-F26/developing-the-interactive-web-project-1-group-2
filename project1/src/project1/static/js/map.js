let createPopupBackground;
let createButton = document.getElementById('createButton');
let popups = document.getElementsByClassName('popup');

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
    changePopup(false, 'createForm');
    document.getElementById('lat').value = e.latlng.lat;
    document.getElementById('long').value = e.latlng.lng;
});

createPopupBackground.addEventListener('click', (e) => {
    if (e.target === createPopupBackground) {
        changePopup(true);
    }
});

window.addEventListener('load', () => {
    loadMarkers()
});

async function loadMarkers() {
    const res = await getPosts();
    const posts = await res.json();

    for (const post of posts) {
        var marker = L.marker([post['lat'], post['long']], {
            postId: post['post_id']
        }).addTo(map);
        marker.on('click', viewPost);
    }
}

async function getPosts() {
    url = '/api/getAll';
    const res = await fetch(url, {
        method: 'GET'
    });
    return res
}

function changePopup(hide, id=null) {
    createPopupBackground.hidden = hide;

    if (hide == true) {
        for (let popup of popups) {
            popup.hidden = hide;
        }
    } else if (id != null) {
        let post = document.getElementById(id);
        post.hidden = hide;
    }
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

async function viewPost(e) {
    id = e.target.options.postId.toString();
    url = '/post/'+id;

    const res = await fetch(url, {
        method: 'GET'
    });
    const data = await res.json();
    console.log(data);
    
    showPost(data, id);
    changePopup(false, 'post');
}

function showPost(post, id) {
    let title = document.getElementById('postTitle');
    title.innerText = post['title'];

    let author = document.getElementById('postAuthor');
    if (post['anon'] == true) {
        author.innerText = `Author: anonymous`;
    } else {
        author.innerText = `Author: <username>`;
    }

    let description = document.getElementById('postDescription');
    description.innerText = `Description: ${post['description']}`;
    
    let location = document.getElementById('postLocation');
    location.innerText = `Location: ${post['location']['name']}`;

    let date = document.getElementById('postDate');
    date.innerText = `Date: ${post['time']}`;

    let docId = document.getElementById('post_id');
    docId.innerText = `${docId.innerText} ${id}`;
}
