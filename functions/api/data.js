// Cloudflare Worker - data API (single source: Dramabox + Webfic)
// Exports: onRequest(context)
// NOTE: Hardcoded credentials for development. Move to secrets for production.

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

const MANUAL_TOKEN = "UmYxRVlxSHJrTnE4Y05SeGdqZDYrYXhzdjFTL3QxZ3FDQ2ljSy9COUlUL0tEUThobW91N21yanloWSt4WWtlSng4V2I3bFlONXU4bkc2c3dwNFAxbzJDemFyZE10WlNCczVsc0pDdDh6VTZ6SVdKY1B3dVhNUGZweitYK3NwcUci";
const MANUAL_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const MANUAL_ANDROID_ID = "ffffffff9b5bfe16000000000";
const MANUAL_USER_ID = "336084056";
const FAKE_APP_VERSION = "451";
const FAKE_VN_VERSION = "4.5.1";

const LANG_MAP = {
  id: { webfic: 'in', drama: 'in' },
  en: { webfic: 'en', drama: 'en' },
  ms: { webfic: 'ms', drama: 'ms' },
  zh: { webfic: 'zh', drama: 'zh' },
  es: { webfic: 'es', drama: 'es' }
};

// Cache config
const CACHE_MAX_AGE_MS = 1000 * 60 * 30; // 30 minutes
const CHUNK_SIZE = 60; // for batchDownload per request

/* -------------------- Worker helpers -------------------- */

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

async function importPrivateKey(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function createSignature(payload) {
  const bodyJson = JSON.stringify(payload);
  const toSignString = bodyJson + MANUAL_DEVICE_ID + MANUAL_ANDROID_ID + "Bearer " + MANUAL_TOKEN;
  const encoder = new TextEncoder();
  const data = encoder.encode(toSignString);
  const key = await importPrivateKey(PRIVATE_KEY_PEM);
  const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

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
  const resp = await fetch(`https://sapi.dramaboxdb.com${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    console.log('fetchFromDramaBox failed', resp.status, await resp.text().catch(()=>null));
    return {};
  }
  return await resp.json();
}

function jsonResponse(data, source) {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

async function fetchSeriesDB(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
    return [];
  } catch (e) {
    return [];
  }
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

/* -------------------- Main Worker handler -------------------- */

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const bookId = url.searchParams.get('bookId');
    const keyword = url.searchParams.get('keyword');
    const reqLang = url.searchParams.get('lang');
    const acceptLang = request.headers.get('Accept-Language') || '';
    const lang = normalizeRequestedLang(reqLang, acceptLang);
    const webficLang = (LANG_MAP[lang] && LANG_MAP[lang].webfic) || 'in';
    const dramaLang = (LANG_MAP[lang] && LANG_MAP[lang].drama) || 'in';
    const noCache = url.searchParams.get('nocache') === '1';

    // --- SEARCH ---
    if (type === 'search' && keyword) {
      const SERIES_JSON_URL = `${url.origin}/series.json`;
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const localResults = localData.filter(b => b.title.toLowerCase().includes(keyword.toLowerCase())).map(mapLocalBook);

      const payload = { searchSource: "搜索按钮", pageNo: 1, pageSize: 20, from: "search_sug", keyword };
      const rawData = await fetchFromDramaBox('/drama-box/search/search', payload, dramaLang);
      const apiResults = (rawData.data?.searchList || []).map(item => ({
        id: item.bookId || item.id,
        title: item.bookName || item.title,
        cover: item.cover || item.bookCover,
        episodes: item.chapterCount || '?',
        desc: item.introduction || 'Hasil pencarian',
        tags: item.tags || []
      }));

      const combined = [...localResults, ...apiResults];
      const unique = combined.filter((v,i,a) => a.findIndex(t => (t.id === v.id)) === i);
      return jsonResponse({ sections: [{ title: `Hasil: "${keyword}"`, books: unique }] }, 'SEARCH');
    }

    // --- LIST ---
    if (type === 'list') {
      const SERIES_JSON_URL = `${url.origin}/series.json`;
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const combinedSections = [];
      if (localData.length > 0) {
        combinedSections.push({ title: "🔥 Pilihan Editor", books: localData.slice(0,15).map(mapLocalBook) });
        if (localData.length > 15) combinedSections.push({ title: "📺 Rekomendasi Spesial", books: localData.slice(15,35).map(mapLocalBook) });
        if (localData.length > 35) combinedSections.push({ title: "✨ Koleksi Populer", books: localData.slice(35,100).map(mapLocalBook) });
      }
      return jsonResponse({ sections: combinedSections }, 'LIST');
    }

    // --- CHAPTER / DETAIL (MAIN) ---
    if (type === 'chapter' && bookId) {
      const cacheKey = `unlock_v10_${bookId}_lang_${lang}`;

      // KV cache read with age check and nocache support.
      // IMPORTANT: if cached exists but any chapter has empty sources [], force fetch fresh.
      let useCache = false;
      if (env.DRAMABOX_CACHE && !noCache) {
        try {
          const cachedRaw = await env.DRAMABOX_CACHE.get(cacheKey);
          if (cachedRaw) {
            const cachedObj = JSON.parse(cachedRaw);
            const cachedAt = cachedObj._cachedAt || 0;
            const age = Date.now() - cachedAt;
            // detect any empty sources in cached chapters
            const chapters = Array.isArray(cachedObj.chapters) ? cachedObj.chapters : [];
            const hasEmptySources = chapters.some(ch => !Array.isArray(ch.sources) || ch.sources.length === 0);
            if (hasEmptySources) {
              console.log(`Cache contains empty sources for ${cacheKey}; forcing refresh from server.`);
            } else if (age < CACHE_MAX_AGE_MS) {
              console.log(`Returning KV cache for ${cacheKey}, age=${Math.round(age/1000)}s`);
              return new Response(JSON.stringify({ ...cachedObj, _source: 'CACHE' }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
            } else {
              console.log(`Cache expired for ${cacheKey}, age=${Math.round(age/1000)}s; fetching fresh.`);
            }
          }
        } catch (e) {
          console.log('KV cache read/parse error', e);
        }
      }

      // 1. metadata from webfic
      const webficRes = await fetch(`https://www.webfic.com/webfic/book/detail/v2?id=${encodeURIComponent(bookId)}&tlanguage=${encodeURIComponent(webficLang)}`);
      if (!webficRes.ok) {
        console.log('Webfic fetch failed', webficRes.status);
        return jsonResponse({ error: 'Gagal mengambil data drama' }, 'ERR');
      }
      const webficJson = await webficRes.json();
      const liveData = webficJson.data || {};
      const liveChapterList = liveData.chapterList || [];
      if (!Array.isArray(liveChapterList) || liveChapterList.length === 0) {
        return jsonResponse({ error: 'Chapter tidak ditemukan' }, 'ERR');
      }

      // 2. Unlock (batch) - chunked
      const chapterIds = liveChapterList.map(c => c.id).filter(Boolean);
      const videoMap = {}; // key -> { sources, subtitles, audioTracks }

      for (let i = 0; i < chapterIds.length; i += CHUNK_SIZE) {
        const chunk = chapterIds.slice(i, i + CHUNK_SIZE);
        try {
          const payload = { bookId: bookId, chapterIdList: chunk };
          const unlock = await fetchFromDramaBox('/drama-box/chapterv2/batchDownload', payload, dramaLang);
          if (unlock && unlock.data && Array.isArray(unlock.data.chapterVoList)) {
            for (const entry of unlock.data.chapterVoList) {
              const keys = [];
              if (entry.chapterId !== undefined && entry.chapterId !== null) keys.push(entry.chapterId);
              if (entry.chapter_id !== undefined && entry.chapter_id !== null) keys.push(entry.chapter_id);
              if (entry.id !== undefined && entry.id !== null) keys.push(entry.id);

              const cdn = entry.cdnList?.find(c => c.isDefault === 1) || entry.cdnList?.[0];
              let sourcesArr = [];
              if (cdn && Array.isArray(cdn.videoPathList) && cdn.videoPathList.length) {
                sourcesArr = cdn.videoPathList.map(v => ({
                  q: v.quality || (v.q ? Number(v.q) : 0),
                  url: v.videoPath || v.url || v.path || v.src,
                  lang: v.language || v.lang || null,
                  type: v.type || null
                })).filter(s => s.url).sort((a,b) => (b.q||0)-(a.q||0));
              }
              let subtitles = [];
              const candidateSubLists = [ cdn?.subtitleList, cdn?.srtList, entry?.subtitleList, entry?.subtitles, entry?.srtList, entry?.sub ];
              for (const s of candidateSubLists) {
                if (!s) continue;
                if (Array.isArray(s) && s.length) {
                  s.forEach(it => {
                    if (!it) return;
                    if (typeof it === 'string') subtitles.push({ lang: 'und', url: it });
                    else {
                      const urlCandidate = it.url || it.path || it.srt || it.subtitlePath || it.uri;
                      const langCandidate = it.lang || it.language || it.code || it.label || 'und';
                      if (urlCandidate) subtitles.push({ lang: langCandidate, url: urlCandidate });
                    }
                  });
                  break;
                }
              }
              let audioTracks = [];
              const candidateAudioLists = [ cdn?.audioPathList, entry?.audioList, entry?.audios, cdn?.audioList ];
              for (const a of candidateAudioLists) {
                if (!a) continue;
                if (Array.isArray(a) && a.length) {
                  a.forEach(it => {
                    if (!it) return;
                    if (typeof it === 'string') audioTracks.push({ lang: 'und', url: it });
                    else {
                      const urlCandidate = it.url || it.path || it.audioPath || it.uri;
                      const langCandidate = it.lang || it.language || it.code || it.label || 'und';
                      if (urlCandidate) audioTracks.push({ lang: langCandidate, url: urlCandidate });
                    }
                  });
                  break;
                }
              }

              if (keys.length) {
                for (const k of keys) {
                  if (k === undefined || k === null) continue;
                  videoMap[String(k)] = { sources: sourcesArr || [], subtitles: subtitles || [], audioTracks: audioTracks || [] };
                }
              }
            }
          }
        } catch (e) {
          console.log('batchDownload chunk failed', e?.message || e);
          // continue with other chunks
        }
      }

      // 3. build finalChapters
      const finalChapters = [];
      for (const chItem of liveChapterList) {
        const keyCandidates = [chItem.id, chItem.chapterId, chItem.chapter_id].map(k => (k === undefined || k === null) ? null : String(k));
        let mapped = null;
        for (const k of keyCandidates) { if (!k) continue; if (videoMap[k]) { mapped = videoMap[k]; break; } }

        const chapterObj = {
          index: chItem.index,
          title: chItem.name || chItem.chapterName || `Episode ${chItem.index}`,
          sources: [],
          subtitles: [],
          audioTracks: []
        };

        if (mapped) {
          if (Array.isArray(mapped.sources) && mapped.sources.length) chapterObj.sources = mapped.sources;
          if (Array.isArray(mapped.subtitles) && mapped.subtitles.length) chapterObj.subtitles = mapped.subtitles;
          if (Array.isArray(mapped.audioTracks) && mapped.audioTracks.length) chapterObj.audioTracks = mapped.audioTracks;
        }

        // fallback to ch.mp4
        if ((!chapterObj.sources || chapterObj.sources.length === 0) && chItem.mp4) {
          chapterObj.sources = [{ q: 480, url: chItem.mp4 }];
        }

        finalChapters.push(chapterObj);
      }

      if (finalChapters.length === 0) return jsonResponse({ error: 'Video tidak tersedia.' }, 'ERR');

      const result = {
        info: {
          id: liveData.book?.bookId,
          title: liveData.book?.bookName,
          cover: liveData.book?.cover,
          desc: liveData.book?.introduction,
          tags: liveData.book?.tags || [],
          author: liveData.book?.authorName || 'Dramabox',
          views: liveData.book?.viewCount,
          totalEps: finalChapters.length,
          lang
        },
        chapters: finalChapters,
        related: (liveData.recommends || []).map(b => ({ id: b.bookId, title: b.bookName, cover: b.cover, episodes: b.chapterCount }))
      };

      // store to KV with timestamp for age-based invalidation
      if (env.DRAMABOX_CACHE) {
        try {
          const payloadToStore = { ...result, _cachedAt: Date.now() };
          context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(payloadToStore), { expirationTtl: 1800 }));
        } catch (e) {
          console.log('KV put failed', e);
        }
      }

      return jsonResponse(result, 'SUCCESS');
    }

    return new Response('Invalid Request', { status: 400 });
  } catch (err) {
    console.log('Unhandled error in onRequest', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
