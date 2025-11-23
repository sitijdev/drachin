(function(){
  // loader untuk menangani /player/* pages: inject safe, restore footer, render related
  const API = '/api/data';

  async function init() {
    if (!location.pathname.startsWith('/player/')) return;

    // Simpan footer (sticky nav) & header yang ingin dipertahankan jika ada
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

      // copy head non-script resources (avoid re-adding tailwind CDN)
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
        // clone naively; most projects don't have colliding meta tags that matter here
        document.head.appendChild(el.cloneNode(true));
      });

      // replace body content
      document.body.innerHTML = doc.body.innerHTML;

      // re-attach preserved header/footer so sticky UI tetap ada
      if (header && !document.querySelector('.glass-nav')) {
        document.body.insertBefore(header, document.body.firstChild);
      }
      if (footer && !document.querySelector('.glass-bottom')) {
        document.body.appendChild(footer);
      }

      // helper: execute scripts found in fetched doc
      const runScripts = (container) => {
        Array.from(container.querySelectorAll('script')).forEach(s => {
          if (s.src && s.src.includes('cdn.tailwindcss.com')) return; // skip tailwind cdn duplicates
          if (s.src) {
            const newS = document.createElement('script');
            newS.src = s.src;
            if (s.hasAttribute('async')) newS.async = true;
            document.body.appendChild(newS);
          } else {
            // inline script: execute as module to avoid global var collisions
            const inline = document.createElement('script');
            inline.type = 'module';
            inline.textContent = s.textContent || '';
            document.body.appendChild(inline);
          }
        });
      };

      if (doc.head) runScripts(doc.head);
      if (doc.body) runScripts(doc.body);

      // Setelah player terpasang: coba render related videos (fallback)
      renderRelatedFallback();

    } catch (err) {
      console.warn('player-loader: gagal inject player', err);
    }
  }

  // Fallback renderer untuk related videos: ambil daftar dari API type=list, pilih beberapa item
  async function renderRelatedFallback() {
    try {
      // ambil bookId dari url /player/BOOKID-EP
      const slug = location.pathname.replace(/\/+$/, '').split('/').pop() || '';
      const sep = slug.lastIndexOf('-');
      const bookId = sep !== -1 ? slug.substring(0, sep) : slug;

      // tempelkan container related setelah #desc jika ada
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

      // Ambil daftar (fallback: type=list)
      const res = await fetch(`${API}?type=list`);
      if (!res.ok) return;
      const json = await res.json();
      const sections = json.sections || [];
      // flatten books
      let books = sections.flatMap(s => s.books || []);
      // remove current book and duplicates
      books = books.filter(b => b && String(b.id) !== String(bookId));
      // take up to 12
      books = books.slice(0, 12);

      // simple card renderer (mirip createCard dari SPA)
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

  // tunggu DOM siap agar kita bisa mengambil footer/header yang ada
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
