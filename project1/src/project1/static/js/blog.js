document.addEventListener('DOMContentLoaded', () => {
    const viewSelector = document.getElementById('view');
    const gridView = document.getElementById('gridView');
    const collapsedView = document.getElementById('collapsedView');

    viewSelector.addEventListener('change', (event) => {
        if (event.target.value === 'grid') {
            gridView.style.display = 'grid';
            collapsedView.style.display = 'none';
        } else if (event.target.value === 'collapsed') {
            gridView.style.display = 'none';
            collapsedView.style.display = 'block';
        }
    });

    // filter
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    if (filterToggleBtn) {
        filterToggleBtn.addEventListener('click', adjustSideBar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', adjustSideBar);
    }
});

function adjustSideBar() {
    const sidebar = document.getElementById('sidebar');
    const blogContainer = document.getElementById('blogContainer');
    const sidebarButton = document.getElementById('filterToggleBtn');

    if (sidebar.hidden == true) {
        sidebar.hidden = false;
        sidebarButton.textContent = 'Collapse';
        blogContainer.classList.replace('pure-u-1', 'pure-u-2-3');
    } else {
        sidebar.hidden = true;
        sidebarButton.textContent = 'Filter';
        blogContainer.classList.replace('pure-u-2-3', 'pure-u-1');
    }
}

// popups
const createPopupBackground = document.getElementById("createPopupBackground");
const popups = document.getElementsByClassName('popup');
const closePopupBtn = document.getElementById("closePopupBtn");

function changePopup(hide, id = null) {
    if (createPopupBackground) {
        createPopupBackground.hidden = hide;
    }

    if (hide == true) {
        for (let popup of popups) {
            popup.hidden = hide;
        }
    } else if (id != null) {
        let postWindow = document.getElementById(id);
        if (postWindow) {
            postWindow.hidden = hide;
        }
    }
}

async function viewPost(id) {
    const url = '/post/' + id;

    try {
        const res = await fetch(url, {
            method: 'GET'
        });
        const data = await res.json();

        showPost(data, id);
        changePopup(false, 'post');
    } catch (err) {
        console.error("Error fetching post:", err);
    }
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
    location.innerText = `Location: ${post['location']['name']}`;

    let image = document.getElementById('postImage');
    if (post['image'] != null && post['image'] !== "") {
        image.hidden = false;
        image.setAttribute('src', post['image']);
    } else {
        image.hidden = true;
    }

    let date = document.getElementById('postDate');
    date.innerText = `Date: ${post['time']}`;

    let postActions = document.getElementById('postActions');
    if (postActions) {
        postActions.hidden = !post['can_edit'];
    }

    let deleteForm = document.getElementById('deleteForm');
    if (deleteForm) {
        deleteForm.action = '/delete/' + id;
    }

    let editLink = document.getElementById('editLink');
    if (editLink) {
        editLink.href = '/edit/' + id;
    }

    let docId = document.getElementById('post_id');
    if (docId) {
        docId.innerText = id;
    }
}

if (createPopupBackground) {
    createPopupBackground.addEventListener('click', (e) => {
        if (e.target === createPopupBackground) {
            changePopup(true);
        }
    });
}

if (closePopupBtn) {
    closePopupBtn.addEventListener('click', () => {
        changePopup(true);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const clickablePosts = document.querySelectorAll('.clickable-post');

    clickablePosts.forEach(postElement => {
        postElement.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'button') {
                return;
            }

            if (postElement.tagName.toLowerCase() === 'summary') {
                e.preventDefault();
            }

            const postId = postElement.dataset.id;
            if (postId) {
                viewPost(postId);
            }
        });
    });
});