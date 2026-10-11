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
    const filterSidebar = document.getElementById('filterSidebar');
    const blogPage = document.getElementById('blog_page');

    // open sidebar
    filterToggleBtn.addEventListener('click', () => {
        filterSidebar.classList.add('open');
        blogPage.classList.add('shifted');
    });

    // close sidebar
    closeSidebarBtn.addEventListener('click', () => {
        filterSidebar.classList.remove('open');
        blogPage.classList.remove('shifted');
    });
});