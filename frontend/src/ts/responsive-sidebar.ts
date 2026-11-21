// Fixes responsive sidebar startup and keeps its open state accessible.
function initializeResponsiveSidebar(): void {
    const sidebar = document.getElementById('sidebar-navigation');
    const mainContent = document.querySelector<HTMLElement>('.main-content');
    const mobileMenuButton = document.getElementById('mobile-menu-btn');
    if (!sidebar) return;

    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
    const setExpanded = (expanded: boolean) => {
        sidebar.classList.toggle('collapsed', !expanded);
        mobileMenuButton?.setAttribute('aria-expanded', String(expanded));
        if (isMobile()) mainContent?.classList.remove('expanded');
    };

    // CSS hides the sidebar on small screens; mark that state explicitly so the
    // first tap opens it rather than toggling it into the already-hidden state.
    if (isMobile()) setExpanded(false);

    mobileMenuButton?.addEventListener('click', () => {
        window.setTimeout(() => {
            mobileMenuButton.setAttribute('aria-expanded', String(!sidebar.classList.contains('collapsed')));
        }, 0);
    });

    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (isMobile() && target?.closest('#sidebar-navigation .menu-item')) setExpanded(false);
    });

    window.addEventListener('resize', () => {
        if (!isMobile()) {
            sidebar.classList.remove('collapsed');
            mobileMenuButton?.setAttribute('aria-expanded', 'false');
        } else if (mobileMenuButton?.getAttribute('aria-expanded') !== 'true') {
            setExpanded(false);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResponsiveSidebar, { once: true });
} else {
    initializeResponsiveSidebar();
}
