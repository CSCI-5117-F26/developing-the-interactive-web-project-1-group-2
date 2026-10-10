document.addEventListener('DOMContentLoaded', () => {
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