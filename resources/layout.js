/**
 * FantasyCity - Unified Header & Footer Layout Loader
 * Loads header.html, footer.html and layout.css from resources/ directory with local fallback.
 */
(function() {
    // 自动引入公共页眉页脚样式
    function ensureLayoutCss() {
        if (!document.querySelector('link[href*="layout.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'resources/layout.css';
            document.head.appendChild(link);
        }
    }
    ensureLayoutCss();

    const DEFAULT_HEADER_HTML = `
<nav class="navbar">
    <div class="container">
        <a href="index.html" class="nav-brand">
            <i class="fas fa-book-open"></i> 幻想城
        </a>
        <div class="nav-links">
            <a href="index.html" data-nav="index"><i class="fas fa-home"></i> 首页</a>
            <a href="novel.html" data-nav="novel"><i class="fas fa-feather-alt"></i> 小说</a>
            <a href="games.html" data-nav="games"><i class="fas fa-gamepad"></i> 游戏</a>
            <a href="lore.html" data-nav="lore"><i class="fas fa-scroll"></i> 设定</a>
            <a href="view.html" data-nav="view" class="icon-only" title="全局视图"><i class="fas fa-compass"></i></a>
        </div>
    </div>
</nav>
`.trim();

    const DEFAULT_FOOTER_HTML = `
<footer class="footer">
    <div class="container">
        <p><strong>FantasyCity 幻想城</strong> · 小说与游戏体验门户</p>
        <div class="footer-links">
            <a href="index.html">门户首页</a>
            <span>·</span>
            <a href="novel.html">小说连载</a>
            <span>·</span>
            <a href="games.html">游戏体验</a>
            <span>·</span>
            <a href="lore.html">设定档案</a>
            <span>·</span>
            <a href="view.html">全站导览</a>
            <span>·</span>
            <a href="resources/Fantasy City Lost.html" target="_blank">游戏源文件</a>
            <span>·</span>
            <a href="https://github.com/XRJprogram/FantasyCity" target="_blank"><i class="fab fa-github"></i> GitHub 仓库</a>
        </div>
        <p style="font-size:0.78rem; color:#9C8C7E; margin-top:8px;">
            © <span id="currentYear">2026</span> FantasyCity. All Rights Reserved.
        </p>
    </div>
</footer>
`.trim();

    // Determine active page identifier
    function getCurrentPageKey() {
        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('novel.html')) return 'novel';
        if (path.endsWith('games.html') || path.endsWith('cards.html')) return 'games';
        if (path.endsWith('lore.html') || path.endsWith('settings.html')) return 'lore';
        if (path.endsWith('view.html') || path.endsWith('fantasycity.html')) return 'view';
        if (path.endsWith('index.html') || path.endsWith('/') || path === '') return 'index';
        return '';
    }

    // Set active link class in header
    function updateActiveNav(container) {
        const currentKey = getCurrentPageKey();
        const navLinks = container.querySelectorAll('.nav-links a[data-nav]');
        navLinks.forEach(link => {
            if (link.getAttribute('data-nav') === currentKey) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Update copyright year
    function updateYear(container) {
        const yearEl = container.querySelector('#currentYear');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }

    // Fetch or fallback loader
    async function loadComponent(url, fallbackHtml, targetEl, onRendered) {
        if (!targetEl) return;
        let content = fallbackHtml;
        try {
            if (window.location.protocol !== 'file:') {
                const res = await fetch(url);
                if (res.ok) {
                    content = await res.text();
                }
            }
        } catch (e) {
            console.warn(`[Layout] Failed to fetch ${url}, using fallback template.`, e);
        }
        targetEl.innerHTML = content;
        if (typeof onRendered === 'function') {
            onRendered(targetEl);
        }
    }

    async function initLayout() {
        ensureLayoutCss();

        // 1. Render Header
        let headerPlaceholder = document.getElementById('site-header');
        if (!headerPlaceholder) {
            headerPlaceholder = document.createElement('div');
            headerPlaceholder.id = 'site-header';
            document.body.insertBefore(headerPlaceholder, document.body.firstChild);
        }
        await loadComponent('resources/header.html', DEFAULT_HEADER_HTML, headerPlaceholder, updateActiveNav);

        // 2. Render Footer
        let footerPlaceholder = document.getElementById('site-footer');
        if (!footerPlaceholder) {
            footerPlaceholder = document.createElement('div');
            footerPlaceholder.id = 'site-footer';
            document.body.appendChild(footerPlaceholder);
        }
        await loadComponent('resources/footer.html', DEFAULT_FOOTER_HTML, footerPlaceholder, updateYear);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLayout);
    } else {
        initLayout();
    }
})();
