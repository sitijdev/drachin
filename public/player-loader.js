(function(){
  // loader untuk /player/*: inject aman, restore header/footer, fix onclick handlers, expose toggleFav
  const API = '/api/data';

  async function init() {
    if (!location.pathname.startsWith('/player/')) return;

    // Simpan footer & header yg ingin dipertahankan (sticky nav)
    const footer = document.querySelector('.glass-bottom');
    const header = document.querySelector('.glass-nav');

    try {
      const resp = await fetch('/player/index.html', { cache: 'no-store' });
      if (!resp.ok) throw new Error('Gagal mengambil player page');
      const html = await resp.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // update title
      if (doc.title) document.title = doc.title;

      // copy head non-script (hindari mengulang tailwind CDN)
      Array.from(doc.head.children).forEach(el => {
        if (el.tagName === 'SCRIPT') return;
        if (el.tagName === 'LINK') {
          const href = el.getAttribute('href') || '';
          if (!href) return;
          if (href.includes('cdn.tailwindcss.com')) return; // skip tailwind CDN duplicate
          if (!document.head.querySelector(`link[href="${href}"]`)) {
            document.head.appendChild(el.cloneNode(true));
          }
          return;
        }
        // STYLE, META, TITLE etc.
        // clone naively; OK untuk kebanyakan kasus
        document.head.appendChild(el.cloneNode(true));
      });

      // replace body content with player body
      document.body.innerHTML = doc.body.innerHTML;

      // re-attach preserved header/footer agar sticky UI tetap muncul
      if (header && !document.querySelector('.glass-nav')) {
        document.body.insertBefore(header, document.body.firstChild);
      }
      if (footer && !document.querySelector('.glass-bottom')) {
        document.body.appendChild(footer);
      }

      // Setelah footer dipasang, override onclick pada nav-bottom supaya tidak memanggil SPA switchTab
      sanitizeFooterNav();

      // helper: execute scripts found in fetched doc
      const runScripts = (container) => {
        Array.from(container.querySelectorAll('script')).forEach(s => {
          // skip tailwind CDN duplicates
          if (s.src && s.src.includes('cdn.tailwindcss.com')) return;

          if (s.src) {
            // external script: append as-is
            const newS = document.createElement('script');
            newS.src = s.src;
            if (s.hasAttribute('async')) newS.async = true;
            document.body.appendChild(newS);
          } else {
            // inline script: wrap in IIFE to avoid global collisions,
            // then expose known-needed functions (toggleFav, updateFavBtn) to window if defined.
            const wrapped = `
              (function(){
                try {
                  ${s.textContent}
                } catch(e) {
                  console.error('player inline script error', e);
                }
                try {
                  if (typeof toggleFav !== 'undefined') window.toggleFav = toggleFav;
                } catch(e) {}
                try {
                  if (typeof updateFavBtn !== 'undefined') window.updateFavBtn = updateFavBtn;
                } catch(e) {}
                try {
                  if (typeof saveHistory !== 'undefined') {
                    // expose saveHistory only if it's safe (not overwriting)
                    window.saveHistory = saveHistory;
                  }
                } catch(e) {}
              })();
            `;
            const newInline = document.createElement('script');
            newInline.type = 'text/javascript';
            newInline.textContent = wrapped;
            document.body.appendChild(newInline);
          }
        });
      };

      if (doc.head) runScripts(doc.head);
      if (doc.body) runScripts(doc.body);

      // render related fallback if needed (existing logic)
      renderRelatedFallback();
    } catch (err) {
      console.warn('player-loader: gagal inject player', err);
    }
  }

  function sanitizeFooterNav() {
    try {
      const footer = document.querySelector('.glass-bottom');
      if (!footer) return;
      // cari tombol nav (menggunakan class .nav-btn / id tab-*)
      const navButtons = footer.querySelectorAll('.nav-btn');
      navButtons.forEach(btn => {
        // ambil id tab-xxx
        const id = btn.id || '';
        // Remove inline onclick attribute to prevent calling SPA switchTab which expects #app
        if (btn.hasAttribute('onclick')) btn.removeAttribute('onclick');

        // Set fallback behaviour:
        // - home => navigate to root
        // - favorites/history/account => navigate to root with hash so SPA can pick (optional)
        if (id === 'tab-home') {
          btn.addEventListener('click', (e) => { e.preventDefault(); location.href = '/'; });
        } else if (id === 'tab-favorites') {
          btn.addEventListener('click', (e) => { e.preventDefault(); location.href = '/#favorites'; });
        } else if (id === 'tab-history') {
          btn.addEventListener('click', (e) => { e.preventDefault(); location.href = '/#history'; });
        } else if (id === 'tab-account') {
          btn.addEventListener('click', (e) => { e.preventDefault(); location.href = '/#account'; });
        } else {
          // default to root
          btn.addEventListener('click', (e) => { e.preventDefault(); location.href = '/'; });
        }
      });
    } catch (e) {
      console.warn('sanitizeFooterNav error', e);
    }
  }

  // Fallback related renderer (sama seperti sebelumnya)
  async function renderRelatedFallback() {
    try {
      const slug = location.pathname.replace(/\/+$/, '').split('/').pop() || '';
      const sep = slug.lastIndexOf('-');
      const bookId = sep !== -1 ? slug.substring(0, sep) : slug;

      let container = document.getElementById('related-videos');
      const descEl = document.getElementById('desc');

      if (!container) {
        container = document.createElement('div');
        container.id = 'related-videos';
        container.className = 'mt-6';
        container.innerHTML = `<h3 class="text-xs uppercase text-gray-500 font-bold mb-3">Related</h3><div id="related-grid" class="grid grid-cols-3 sm:grid-cols-4 gap-3"></div>`;
        if (descEl && descEl.parentNode) descEl.parentNode.insertBefore(container, descEl.nextSibling);
        else document.body.appendChild(container);
      }

      const grid = document.getElementById('related-grid');
      if (!grid) return;

      const res = await fetch(`${API}?type=list`);
      if (!res.ok) return;
      const json = await res.json();
      const sections = json.sections || [];
      let books = sections.flatMap(s => s.books || []);
      books = books.filter(b => b && String(b.id) !== String(bookId));
      books = books.slice(0, 12);

      const cardHTML = (b) => {
        const targetEp = b.lastEpisode || 1;
        const url = `/player/${b.id}-${targetEp}`;
        return `
          <a href="${url}" class="block group relative transition transform active:scale-95">
            <div class="aspect-poster rounded-lg overflow-hidden bg-zinc-800 mb-2 relative border border-white/5 group-hover:border-red-600 transition">
              <img src="${b.cover}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300'">
              <div class="absolute top-1 right-1 bg-black/80 backdrop-blur text-[9px] px-1.5 py-0.5 rounded text-white font-bold shadow">${b.episodes||'?'} Eps</div>
            </div>
            <h3 class="text-xs font-medium text-gray-300 line-clamp-2 group-hover:text-white leading-tight">${(b.title||'Untitled')}</h3>
          </a>`;
      };

      grid.innerHTML = books.map(cardHTML).join('');
    } catch (e) {
      console.warn('renderRelatedFallback error', e);
    }
  }

  // start when DOM ready to capture header/footer from original page
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
