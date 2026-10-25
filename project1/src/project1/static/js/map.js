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
            feature = e['layer']['feature'];
            document.getElementById('locationName').value = feature['properties']['BLDG_NAME_'];
        }).addTo(map);
    });

createPopupBackground = document.getElementById("createPopupBackground");
map.on('click', (e) => {
    changePopup(false, 'createForm');
    document.getElementById('lat').value = e.latlng.lat;
    document.getElementById('long').value = e.latlng.lng;
});

createPopupBackground.addEventListener('click', (e) => {
    if (e.target === createPopupBackground) {
        changePopup(true);
    }
});

document.getElementById('closePopup').addEventListener('click', () => {
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
            // Add a custom icon for post
            if (post['icon_id'] != null) {
                postMarker.icon = new CustomIcon({ iconUrl: `/icon/${post['icon_id']}` });
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
    }
    else {
        sidebarToggle.style.left = `${-sidebarToggle.offsetWidth / 2 + sidebar.offsetWidth}px`;
        updatePostsInView();
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
    let title = document.getElementById('postTitle');
    title.innerText = post['title'];

    let author = document.getElementById('postAuthor');
    if (post['anon'] == true) {
        author.innerText = `Author: Anonymous`;
        if (post['username']) {
            author.innerText += ` (${post['username']})`;
        }
    } else {
        author.innerText = `Author: ${post['username']}`;
    }

    let description = document.getElementById('postDescription');
    description.innerText = `Description: ${post['description']}`;

    let location = document.getElementById('postLocation');
    location.innerText = `Location: ${post['location']}`;

    let image = document.getElementById('postImage');
    if (post['image'] != null) {
        image.hidden = false;
        image.setAttribute('src', post['image']);
    } else {
        image.hidden = true;
    }

    let date = document.getElementById('postDate');
    date.innerText = `Date: ${post['time']}`;

    document.getElementById('postActions').hidden = !post['can_edit'];
    document.getElementById('deleteForm').action = '/delete/' + id;

    document.getElementById('editLink').href = '/edit/' + id;

    let docId = document.getElementById('post_id');
    docId.innerText = `${docId.innerText} ${id}`;

    // Add view comments for post button
    let viewCommentsButton = document.getElementById('viewCommentsButton');
    viewCommentsButton.addEventListener('click', function () {
        window.location.href = `/post/${id}`;
    });
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
