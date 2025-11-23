// Cloudflare Worker - data API with obfuscated-like backup (Worker compatible)
// Hardcoded development credentials included (move to secrets for production)
// Exported: onRequest(context)
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08Hr
nbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEK
bXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq
88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28XhPuC8m15u+dectsrJl+ALGcTDX3
Lv3FURuwV/dN7WMEkgcseIKVMdJxzUB0PeSqCNftfxmdBV/U4yXFRxPhnSFSXCrk
j6uJjickiYq1pQ1aZfrQe1eLD3MB2hKq7crhMcA3kpggQlnmy1wRR4BAttmSU4fP
b/yF8D3hAgMBAAECggEBAJdru6p5RLZ3h/GLF2rud8bqv4piF51e/RWQyPFnMAGB
rkByiYT7bFI3cnvJMhYpLHRigqjWfUofV3thRDDym54lVLtTRZ91khRMxgwVwdRu
k8Fw7JNFenOwCJxbgdlq6iuAMuQclwll7qWUrm8DgMvzH93xf8o6X171cp4Sh0og
1Ra7E9GZ37dzBlX2aJBK8VBfctZntuDPx52e71nafqfbjXxZuEtpu92oJd6A9mWb
d0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY
9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBh
SUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0
cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV
/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yu
HdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQ
Fd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp
9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPdW25gdluokG/R
zNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAif
uVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2f
objwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58
I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKf
oMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ct
TEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnr
A/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9J
NAarxO/qPW6Gi0xWaF7il7Or
-----END PRIVATE KEY-----`;

const MANUAL_TOKEN = "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnlaV2RwYzNSbGNsUjVjR1VpT2lKVVJVMVFJaXdpZFhObGNrbGtJam96TXpZd09EUXdOVFo5LkFLMWw0d01Ud00xVndOTHBOeUlOcmtHN3dmb0czaGROMEgxNWVPZV9KaHc=";
const MANUAL_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const MANUAL_ANDROID_ID = "ffffffff9b5bfe16000000000";
const MANUAL_USER_ID = "336084056";
const FAKE_APP_VERSION = "451";
const FAKE_VN_VERSION = "4.5.1";

// language map
const LANG_MAP = {
  id: { webfic: 'in', drama: 'in' },
  en: { webfic: 'en', drama: 'en' },
  ms: { webfic: 'ms', drama: 'ms' },
  zh: { webfic: 'zh', drama: 'zh' },
  es: { webfic: 'es', drama: 'es' }
};

// in-memory backup cache for worker-run (per process)
const backupCache = new Map();
const BACKUP_CACHE_TTL = 1000 * 60 * 5;

/* -------------------- Helpers (Worker-compatible) -------------------- */

// normalize language from query or Accept-Language
function normalizeRequestedLang(reqLang, acceptLangHeader) {
  if (reqLang && typeof reqLang === 'string') {
    const l = reqLang.toLowerCase().split(/[_-]/)[0];
    if (LANG_MAP[l]) return l;
  }
  if (acceptLangHeader) {
    const first = acceptLangHeader.split(',')[0].split(';')[0].trim().toLowerCase();
    const l = first.split(/[_-]/)[0];
    if (LANG_MAP[l]) return l;
  }
  return 'id';
}

// import private key PEM -> CryptoKey for RSASSA-PKCS1-v1_5 SHA-256
async function importPrivateKey(pem) {
  // strip headers
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
  return await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

// create signature used by Dramabox API (same algorithm as other worker code)
async function createSignature(payload) {
  const bodyJson = JSON.stringify(payload);
  const toSignString = bodyJson + MANUAL_DEVICE_ID + MANUAL_ANDROID_ID + "Bearer " + MANUAL_TOKEN;
  const encoder = new TextEncoder();
  const data = encoder.encode(toSignString);
  const key = await importPrivateKey(PRIVATE_KEY_PEM);
  const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

// wrapper fetch to Dramabox with signature header
async function fetchFromDramaBox(endpoint, payload, language = 'in') {
  const signature = await createSignature(payload);
  const headers = {
    "Host": "sapi.dramaboxdb.com",
    "Tn": `Bearer ${MANUAL_TOKEN}`,
    "Version": FAKE_APP_VERSION,
    "Vn": FAKE_VN_VERSION,
    "Package-Name": "com.storymatrix.drama",
    "Device-Id": MANUAL_DEVICE_ID,
    "Userid": MANUAL_USER_ID,
    "Android-Id": MANUAL_ANDROID_ID,
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
    "sn": signature,
    "Language": language,
    "Current-Language": language,
    "Time-Zone": "+0700"
  };
  const res = await fetch(`https://sapi.dramaboxdb.com${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) return {};
  return await res.json();
}

/* -------------------- fetchAllDramaDataWorker (obfuscated-like) --------------------
   Behavior:
   - fetch webfic detail to get chapter list (localized)
   - batch-request unlock data for chapter ids via /drama-box/chapterv2/batchDownload
   - merge cdnList/videoPathList into chapter entries and return same shape as obfuscated function:
     { bookName, bookCover, introduction, playCount, chapterList, chapterCount }
------------------------------------------------------------------ */
async function fetchAllDramaDataWorker(bookId, language = 'id') {
  // 1. Webfic detail
  const webficLang = (LANG_MAP[language] && LANG_MAP[language].webfic) || 'in';
  const webficRes = await fetch(`https://www.webfic.com/webfic/book/detail/v2?id=${encodeURIComponent(bookId)}&tlanguage=${encodeURIComponent(webficLang)}`);
  if (!webficRes.ok) throw new Error('Gagal mengambil metadata dari Webfic');
  const webficJson = await webficRes.json();
  const liveData = webficJson.data || {};
  const liveChapterList = liveData.chapterList || [];

  // If no chapters, return minimal info
  if (!Array.isArray(liveChapterList) || liveChapterList.length === 0) {
    return {
      bookName: liveData.book?.bookName || liveData.book?.title || '',
      bookCover: liveData.book?.cover || '',
      introduction: liveData.book?.introduction || '',
      playCount: liveData.book?.viewCount || 0,
      chapterList: [],
      chapterCount: 0
    };
  }

  // 2. Batch download unlock info in chunks (avoid too large payload)
  const chapterIds = liveChapterList.map(c => c.id).filter(Boolean);
  const CHUNK_SIZE = 60; // safe chunk size
  const cdnMap = new Map(); // chapterId -> unlock entry (with cdnList etc.)

  for (let i = 0; i < chapterIds.length; i += CHUNK_SIZE) {
    const chunk = chapterIds.slice(i, i + CHUNK_SIZE);
    try {
      const payload = { bookId: bookId, chapterIdList: chunk };
      const unlock = await fetchFromDramaBox('/drama-box/chapterv2/batchDownload', payload, (LANG_MAP[language] && LANG_MAP[language].drama) || 'in');
      if (unlock && unlock.data && Array.isArray(unlock.data.chapterVoList)) {
        for (const entry of unlock.data.chapterVoList) {
          const k = String(entry.chapterId || entry.id || entry.chapter_id);
          cdnMap.set(k, entry);
        }
      }
    } catch (e) {
      // ignore chunk error - we'll still try to fallback via other means
      // don't throw; continue to next chunk
    }
  }

  // 3. Merge: produce chapterList with cdnList & videoPathList where available
  const mergedChapters = liveChapterList.map(c => {
    const key = String(c.id || c.chapterId || c.chapter_id);
    const unlockEntry = cdnMap.get(key);
    const cdnList = (unlockEntry && unlockEntry.cdnList) ? unlockEntry.cdnList : [];
    // Normalize cdnList entries so they include videoPathList array if present
    return {
      chapterId: c.id || c.chapterId || c.chapter_id,
      index: c.index,
      name: c.name || c.chapterName || `Episode ${c.index}`,
      cdnList,
      mp4: c.mp4 || null
    };
  });

  return {
    bookName: liveData.book?.bookName || liveData.book?.title || '',
    bookCover: liveData.book?.cover || '',
    introduction: liveData.book?.introduction || '',
    playCount: liveData.book?.viewCount || 0,
    chapterList: mergedChapters,
    chapterCount: mergedChapters.length
  };
}

/* -------------------- fetchBackupFromObfuscatedWorker --------------------
   Use fetchAllDramaDataWorker(bookId) as the backup scraper source, return candidate sources for a chapter.
------------------------------------------------------------------ */
async function fetchBackupFromObfuscatedWorker(bookId, chapterId, desiredQuality = null, lang = 'id') {
  const cacheKey = `${bookId}:${chapterId}:${lang}`;
  const now = Date.now();
  const cached = backupCache.get(cacheKey);
  if (cached && (now - cached.ts) < BACKUP_CACHE_TTL) return cached.sources;

  const full = await fetchAllDramaDataWorker(bookId, lang);
  if (!full || !Array.isArray(full.chapterList)) return null;

  // find chapter
  let ch = full.chapterList.find(x => String(x.chapterId) === String(chapterId));
if (!ch) {
  // fallback: coba cari berdasarkan index (beberapa dataset pakai index saja)
  const maybe = full.chapterList.find(x => String(x.index) === String(chapterId));
  if (maybe) ch = maybe;
    else return null;
  }

  // collect candidates from cdnList -> videoPathList
  const candidates = [];
  if (Array.isArray(ch.cdnList)) {
    for (const cdn of ch.cdnList) {
      const vlist = cdn.videoPathList || cdn.videoPath || cdn.videoList || [];
      if (Array.isArray(vlist) && vlist.length) {
        for (const v of vlist) {
          const url = v.videoPath || v.url || v.path || v.src;
          const q = v.quality || v.q || 0;
          if (url) candidates.push({ q, url, cdnDomain: cdn.cdnDomain || cdn.domain || null });
        }
      }
    }
  }

  // fallback to mp4
  if (candidates.length === 0 && ch.mp4) candidates.push({ q: 480, url: ch.mp4 });

  // filter by desiredQuality if provided
  let filtered = candidates;
  if (desiredQuality) {
    const match = candidates.filter(c => String(c.q) === String(desiredQuality));
    if (match.length) filtered = match;
  }

  filtered.sort((a,b) => (b.q||0)-(a.q||0));
  backupCache.set(cacheKey, { ts: Date.now(), sources: filtered });
  return filtered.length ? filtered : null;
}

/* -------------------- Worker onRequest handler (export) -------------------- */
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const bookId = url.searchParams.get("bookId");
    const keyword = url.searchParams.get("keyword");
    const reqLang = url.searchParams.get("lang");
    const acceptLang = request.headers.get('Accept-Language') || '';
    const lang = normalizeRequestedLang(reqLang, acceptLang);

    // simple routes: search, list, chapter (same as prior worker)
    if (type === 'search' && keyword) {
      const SERIES_JSON_URL = `${url.origin}/series.json`;
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const localResults = localData.filter(b => b.title.toLowerCase().includes(keyword.toLowerCase())).map(mapLocalBook);
      // call dramabox search via fetchFromDramaBox
      const payload = { searchSource: "搜索按钮", pageNo: 1, pageSize: 20, from: "search_sug", keyword };
      const raw = await fetchFromDramaBox('/drama-box/search/search', payload, (LANG_MAP[lang] && LANG_MAP[lang].drama) || 'in');
      const apiResults = (raw.data?.searchList || []).map(item => ({
        id: item.bookId || item.id,
        title: item.bookName || item.title,
        cover: item.cover || item.bookCover,
        episodes: item.chapterCount || "?",
        desc: item.introduction || "Hasil pencarian",
        tags: item.tags || []
      }));
      const combined = [...localResults, ...apiResults];
      const unique = combined.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
      return jsonResponse({ sections: [{ title: `Hasil: "${keyword}"`, books: unique }] }, "SEARCH");
    }

    if (type === 'list') {
      const SERIES_JSON_URL = `${url.origin}/series.json`;
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const combinedSections = [];
      if (localData.length > 0) {
        combinedSections.push({ title: "🔥 Pilihan Editor", books: localData.slice(0, 15).map(mapLocalBook) });
        if(localData.length > 15) combinedSections.push({ title: "📺 Rekomendasi Spesial", books: localData.slice(15, 35).map(mapLocalBook) });
        if(localData.length > 35) combinedSections.push({ title: "✨ Koleksi Populer", books: localData.slice(35, 100).map(mapLocalBook) });
      }
      return jsonResponse({ sections: combinedSections }, "LIST");
    }

    if (type === 'chapter' && bookId) {
      // main chapter logic: webfic detail + batch unlock (like earlier) + obfuscated backup when chapter.sources empty
      const cacheKey = `unlock_worker_${bookId}_lang_${lang}`;
      if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cached) return new Response(cached, { headers: { "Content-Type": "application/json" } });
      }

      // Webfic metadata
      const webficLang = (LANG_MAP[lang] && LANG_MAP[lang].webfic) || 'in';
      const webficRes = await fetch(`https://www.webfic.com/webfic/book/detail/v2?id=${encodeURIComponent(bookId)}&tlanguage=${encodeURIComponent(webficLang)}`);
      if (!webficRes.ok) return jsonResponse({ error: 'Gagal mengambil data drama' }, 'ERR');
      const webficJson = await webficRes.json();
      const liveData = webficJson.data || {};
      const liveChapterList = liveData.chapterList || [];
      if (!Array.isArray(liveChapterList) || liveChapterList.length === 0) return jsonResponse({ error: 'Chapter tidak ditemukan' }, 'ERR');

      // batch unlock
      const allChapterIds = liveChapterList.map(ch => ch.id);
      let unlockData = {};
      try {
        unlockData = await fetchFromDramaBox('/drama-box/chapterv2/batchDownload', { bookId, chapterIdList: allChapterIds }, (LANG_MAP[lang] && LANG_MAP[lang].drama) || 'in');
      } catch (e) {
        // continue: we will use obfuscated backup where needed
        unlockData = {};
      }

      // build videoMap from unlockData
      const videoMap = {};
      if (unlockData?.data?.chapterVoList) {
        for (const ch of unlockData.data.chapterVoList) {
          const keys = [];
          if (ch.chapterId !== undefined && ch.chapterId !== null) keys.push(ch.chapterId);
          if (ch.chapter_id !== undefined && ch.chapter_id !== null) keys.push(ch.chapter_id);
          if (ch.id !== undefined && ch.id !== null) keys.push(ch.id);
          const cdn = ch.cdnList?.find(c => c.isDefault === 1) || ch.cdnList?.[0];
          let sourcesArr = [];
          if (cdn && Array.isArray(cdn.videoPathList) && cdn.videoPathList.length) {
            sourcesArr = cdn.videoPathList.map(v => ({ q: v.quality || (v.q ? Number(v.q) : 0), url: v.videoPath || v.url || v.path || v.src })).filter(s => s.url).sort((a,b)=> (b.q||0)-(a.q||0));
          }
          if (keys.length) {
            for (const k of keys) {
              if (k === undefined || k === null) continue;
              videoMap[String(k)] = { sources: sourcesArr || [], subtitles: [], audioTracks: [] };
            }
          }
        }
      }

      // build finalChapters, fallback to obfuscated backup if needed
      const finalChapters = [];
      for (const ch of liveChapterList) {
        const keyCandidates = [ch.id, ch.chapterId, ch.chapter_id].map(k => (k === undefined || k === null) ? null : String(k));
        let mapped = null;
        for (const k of keyCandidates) { if (!k) continue; if (videoMap[k]) { mapped = videoMap[k]; break; } }

        const chapterObj = { index: ch.index, title: ch.name || ch.chapterName || `Episode ${ch.index}`, sources: [], subtitles: [], audioTracks: [] };

        if (mapped) {
          if (Array.isArray(mapped.sources) && mapped.sources.length) chapterObj.sources = mapped.sources;
          if (Array.isArray(mapped.subtitles) && mapped.subtitles.length) chapterObj.subtitles = mapped.subtitles;
          if (Array.isArray(mapped.audioTracks) && mapped.audioTracks.length) chapterObj.audioTracks = mapped.audioTracks;
        }

        if ((!chapterObj.sources || chapterObj.sources.length === 0) && ch.mp4) chapterObj.sources = [{ q: 480, url: ch.mp4 }];

        if ((!chapterObj.sources || chapterObj.sources.length === 0)) {
          try {
            const obf = await fetchBackupFromObfuscatedWorker(bookId, ch.id || ch.chapterId || ch.chapter_id, null, lang);
            if (obf && obf.length) chapterObj.sources = obf.map(s => ({ q: s.q || 0, url: s.url }));
          } catch (e) {
            // ignore
          }
        }

        finalChapters.push(chapterObj);
      }

      const result = {
        info: {
          id: liveData.book?.bookId,
          title: liveData.book?.bookName,
          cover: liveData.book?.cover,
          desc: liveData.book?.introduction,
          tags: liveData.book?.tags || [],
          author: liveData.book?.authorName || "Dramabox",
          views: liveData.book?.viewCount,
          totalEps: finalChapters.length,
          lang
        },
        chapters: finalChapters,
        related: (liveData.recommends || []).map(b => ({ id: b.bookId, title: b.bookName, cover: b.cover, episodes: b.chapterCount }))
      };

      const body = JSON.stringify(result);
      if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, body, { expirationTtl: 1800 }));
      return new Response(body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    return new Response("Invalid Request", { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

/* --------------- small helpers used above --------------- */
async function fetchSeriesDB(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) return await res.json();
    return [];
  } catch { return []; }
}
function mapLocalBook(b) {
  return {
    id: b.source_id || b.id,
    title: b.title,
    cover: b.cover_path,
    episodes: "Full",
    desc: b.description,
    tags: ["Series"]
  };
}
function jsonResponse(data, source) {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
