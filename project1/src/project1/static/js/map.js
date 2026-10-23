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
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker &&
                !idsList.includes(layer['options']['postId'])) {
                layer.remove();
                removedPostIds.push(layer['options']['postId']);
            }
        });
    }
});

async function loadMarkers() {
    const res = await getPosts();
    const posts = await res.json();

    if (posts.length > 0) {
        for (const post of posts) {
            var marker = L.marker([post['lat'], post['long']], {
                postId: post['post_id']
            }).addTo(map);
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

        // TODO: check if user is logged in. if not, the anonymous button should not show up
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
        updatePostsInView();
    } else {
        sidebar.hidden = true;
        sidebarButton.textContent = 'Expand';
        mapContainer.classList.replace('pure-u-2-3', 'pure-u-1');
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
        author.innerText = `Author: anonymous`;
    } else {
        author.innerText = `Author: ${post['username']}`;
    }

    let description = document.getElementById('postDescription');
    description.innerText = `Description: ${post['description']}`;

    let location = document.getElementById('postLocation');
    location.innerText = `Location: (${post['location']['lat']}, ${post['location']['long']})`;
    if (post['location']['name']) {
        location.innerText = `Location: ${post['location']['name']}`;
    }

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

    // Add post comments
    let commentForm = document.getElementById('commentForm');
    commentForm.action = `/post/${id}/comments`;

    let comments = document.getElementById('commentList');
    let noComment = document.getElementById('noComment');
    comments.replaceChildren(); // remove other post comments to diaply curr post cmt

    if (post['comments'].length > 0) {
        for (let comment of post['comments']) {
            noComment.hidden = true;

            let author = document.createElement('p');
            author.innerText = `Author: ${comment['author']}`;
            comments.appendChild(author);

            let time = document.createElement('p');
            time.innerText = `Time: ${comment['time']}`;
            comments.appendChild(time);

            let commentText = document.createElement('p');
            commentText.innerText = `Comment: ${comment['comment']}`;
            comments.appendChild(commentText);
        }
    }
    else {
        noComment.hidden = false;
    }
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
        const dropdown = document.createElement('div');
        dropdown.className = 'post-dropdown';

        const details = document.createElement('details');

        const summary = document.createElement('summary');
        summary.className = 'clickable-post';
        summary.textContent = post.title;
        details.appendChild(summary);
        
        // Clicking on a post makes the map pan to it and opens the post popup
        summary.addEventListener('click', (e) => {
            map.panTo([post.lat, post.long]);
            viewPost({target:{options:{postId:post.post_id}}});
        });

        const time = document.createElement('p');
        time.textContent = post.time;
        details.appendChild(time);

        const desc = document.createElement('p');
        desc.textContent = post.description;
        details.appendChild(desc);

        dropdown.appendChild(details);
        container.appendChild(dropdown);
    }

    if (postFlag == false) {
        const noPosts = document.createElement('p');
        noPosts.textContent = 'No Nearby Posts!';
        container.appendChild(noPosts);
        return;
    }
}
