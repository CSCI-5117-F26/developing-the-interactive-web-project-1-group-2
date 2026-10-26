let createPopupBackground;
let createButton = document.getElementById('createButton');
let popups = document.getElementsByClassName('popup');

let openPostIds = new Set();

var map = L.map('map', {
    center: [44.97449, -93.23514],
    zoom: 16,
    zoomControl: false,
    doubleClickZoom: false
});

var CustomIcon = L.Icon.extend({
    options: {
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -40]
    }
})

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

L.control.zoom({ position: 'topright' }).addTo(map);

// help with AI to access geojson file
fetch(REGIONS_URL)
    .then(response => response.json())
    .then(data => {
        const features = data['features'];

        L.geoJson(features, {
            style: function (features) {
                return {
                    opacity: 0,
                    fillOpacity: 0
                };
            }
        }).on('click', (e) => {
            document.getElementById('locationName').value = e.layer.feature.properties.BLDG_NAME_;
            document.getElementById('lat').value = e.latlng.lat;
            document.getElementById('long').value = e.latlng.lng;
            showLocationSummary();
            changePopup(false, 'createForm');
        }).addTo(map);
    });

createPopupBackground = document.getElementById("createPopupBackground");
map.on('click', (e) => {
    document.getElementById('locationName').value = '';
    document.getElementById('lat').value = e.latlng.lat;
    document.getElementById('long').value = e.latlng.lng;
    showLocationSummary();
    changePopup(false, 'createForm');
});

createPopupBackground.addEventListener('click', (e) => {
    if (e.target === createPopupBackground) {
        changePopup(true);
    }
});

document.getElementById('closePopup').addEventListener('click', () => {
    changePopup(true);
});

document.getElementById('closePostPopup').addEventListener('click', () => {
    changePopup(true);
});

const filterToggle = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');
filterToggle.addEventListener('click', () => {
    filterPanel.hidden = !filterPanel.hidden;
    filterToggle.setAttribute('aria-expanded', !filterPanel.hidden);
});

const mapSearchForm = document.getElementById('mapSearchForm');
const searchParams = new URLSearchParams(window.location.search);
for (const [name, value] of searchParams) {
    if (mapSearchForm.elements[name]) {
        mapSearchForm.elements[name].value = value;
    }
}
if (searchParams.get('location') || searchParams.get('user') ||
    (searchParams.get('date-range') || 'any') !== 'any') {
    filterPanel.hidden = false;
    filterToggle.setAttribute('aria-expanded', true);
}

const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('imagePreview');
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

let removedPostIds = [];
window.addEventListener('load', async () => {
    await loadMarkers()

    const postIds = document.getElementsByClassName('post_ids');
    if (postIds != null && postIds.length > 0) {
        let idsList = []
        for (id of postIds) {
            idsList.push(Number(id['id']));
        }

        removedPostIds = [];
        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker &&
                !idsList.includes(layer['options']['postId'])) {
                layer.remove();
                removedPostIds.push(layer['options']['postId']);
            }
        });
    }
    if (window.location.search !== '') {
        adjustSideBar();
    }
});

async function loadMarkers() {
    const res = await getPosts();
    const posts = await res.json();

    if (posts.length > 0) {
        for (const post of posts) {
            let postMarker = { postId: post['post_id'] };
            if (post.icon_option === 'custom' && post.icon_id != null) {
                postMarker.icon = new CustomIcon({ iconUrl: `/icon/${post['icon_id']}` });
            }
            else if (post.icon_option === 'emoji') {
                let emoji = String(post.icon);
                let escapeEmoji = emoji.replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;', '>': '&gt;',
                    '"': '&quot;', "'": '&#39;'
                })[char]);
                postMarker.icon = L.divIcon({
                    html: `<span class="emoji-marker">${escapeEmoji}</span>`,
                    className: 'emoji-marker-container',
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                    popupAnchor: [0, -18]
                })
            }
            else {
                let defaultPins = ['black_pin.png', 'black_boardpin.png','black_needlepin.png'];
                let defaultPin;
                if (defaultPins.includes(post.default_pin)) {
                    defaultPin = post.default_pin
                } else { defaultPin = 'black_pin.png'; }
                postMarker.icon = new CustomIcon({ iconUrl: `/static/images/${defaultPin}` });
            }
            var marker = L.marker([post['lat'], post['long']], postMarker).addTo(map);
            marker.on('click', viewPost);
        }
    }
}

async function getPosts() {
    let url = '/api/getAll';
    const res = await fetch(url, {
        method: 'GET'
    });
    return res
}

function changePopup(hide, id = null) {
    createPopupBackground.hidden = hide;

    if (hide == true) {
        for (let popup of popups) {
            popup.hidden = hide;
        }
    } else if (id != null) {
        let post = document.getElementById(id);
        post.hidden = hide;

        let userLoggedIn = document.getElementById('map_page').dataset.userLoggedIn === 'true';
        let anonSection = document.getElementById('anonRow');
        if (userLoggedIn == true) {
            anonSection.hidden = false;
        }
        else {
            anonSection.hidden = true;
        }
    }
}

function adjustSideBar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.hidden = !sidebar.hidden;

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebar.hidden) {
        sidebarToggle.style.left = `${-sidebarToggle.offsetWidth / 2}px`;
        sidebarToggle.innerHTML = '<i class="fa fa-angle-right"></i>';
    }
    else {
        sidebarToggle.style.left = `${-sidebarToggle.offsetWidth / 2 + sidebar.offsetWidth}px`;
        updatePostsInView();
        sidebarToggle.innerHTML = '<i class="fa fa-angle-left"></i>';
    }

}

async function viewPost(e) {
    let id = e.target.options.postId.toString();
    let url = `/post/${id}?format=json`;

    const res = await fetch(url, {
        method: 'GET'
    });
    const data = await res.json();

    showPost(data, id);
    changePopup(false, 'post');
}

function showPost(post, id) {
    document.getElementById('postTitle').innerText = post['title'];

    const image = document.getElementById('postImage');
    if (post['image'] != null) {
        image.src = post['image'];
        image.alt = post['title'];
        image.hidden = false;
    } else {
        image.removeAttribute('src');
        image.hidden = true;
    }

    const date = new Date(post['time']).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    let meta = `${date} \u00b7 by ${post['author']}`;
    if (post['location']) meta += ` \u00b7 @ ${post['location']}`;
    document.getElementById('postMeta').innerText = meta;

    document.getElementById('postDescription').innerText = post['description'];

    document.getElementById('postActions').hidden = !post['can_edit'];
    document.getElementById('deleteForm').action = '/delete/' + id;
    document.getElementById('editLink').href = '/edit/' + id;
    document.getElementById('viewCommentsButton').href = `/post/${id}`;
}

window.addEventListener('load', () => {
    updatePostsInView();
});

map.on('moveend', updatePostsInView);

async function updatePostsInView() {
    const bounds = map.getBounds();

    const url = new URL('/api/getNearby', window.location.origin);

    url.searchParams.set('minLat', bounds.getSouth());
    url.searchParams.set('maxLat', bounds.getNorth());
    url.searchParams.set('minLong', bounds.getWest());
    url.searchParams.set('maxLong', bounds.getEast());

    const response = await fetch(url);
    const posts = await response.json();

    updateSidebar(posts);
}

function updateSidebar(posts) {
    const container = document.getElementById('sideBarPosts');
    container.replaceChildren();    // Resets the children to start from scratch

    const visibleCount = posts.filter(post => !removedPostIds.includes(post.post_id)).length;
    document.getElementById('postCount').textContent =
        `${visibleCount} ${visibleCount === 1 ? 'post' : 'posts'} in view`;

    if (posts.length === 0) {
        const noPosts = document.createElement('p');
        noPosts.textContent = 'No Nearby Posts!';
        container.appendChild(noPosts);
        return;
    }

    // Effectively recreate the HTML structure of the collapsable blog post view
    let postFlag = false;
    for (const post of posts) {
        if (removedPostIds.includes(post.post_id)) {
            continue;
        }

        postFlag = true;
        
        const details = document.createElement('details');
        details.className = 'post-row';
        details.open = openPostIds.has(post.post_id);

        let restoring = details.open;
        details.addEventListener('toggle', () =>{       // Help from AI to identify bug and think of possible solutions

            if (restoring) {
                openPostIds.add(post.post_id);
            } else {
                openPostIds.delete(post.post_id);
            }
        });

        const summary = document.createElement('summary');
        const title = document.createElement('h3');
        title.textContent = post.title;
        summary.appendChild(title);
        details.appendChild(summary);

        const body = document.createElement('div');
        body.className = 'post-row-body';

        const time = document.createElement('p');
        time.className = 'post-meta';
        time.textContent = new Date(post.time).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        body.appendChild(time);

        const desc = document.createElement('p');
        desc.className = 'post-desc';
        desc.textContent = post.description;
        body.appendChild(desc);

        const footer = document.createElement('div');
        footer.className = 'post-footer';

        const readMore = document.createElement('a');
        readMore.href = `/post/${post.post_id}`;
        readMore.textContent = 'Read more & comments';
        footer.appendChild(readMore);

        const viewOnMap = document.createElement('button');
        viewOnMap.type = 'button';
        viewOnMap.className = 'link-button';
        viewOnMap.textContent = 'View on map';
        viewOnMap.addEventListener('click', () => {
            map.panTo([post.lat, post.long]);
            viewPost({ target: { options: { postId: post.post_id } } });
        });
        footer.appendChild(viewOnMap);

        body.appendChild(footer);
        details.appendChild(body);
        container.appendChild(details);
    }

    if (postFlag == false) {
        const noPosts = document.createElement('p');
        noPosts.textContent = 'No Nearby Posts!';
        container.appendChild(noPosts);
    }
}

// update user char input count
document.addEventListener('DOMContentLoaded', () => {
    const textareas = document.querySelectorAll('textarea[maxlength]');

    textareas.forEach(textarea => {
        const counter = textarea.nextElementSibling;
        const max = textarea.getAttribute('maxlength');
        if (counter && counter.classList.contains('char-limit-footnote')) {
            const updateCounter = () => {
                counter.textContent = `${textarea.value.length}/${max}`;
            };

            updateCounter();
            textarea.addEventListener('input', updateCounter);
        }
    });
});
