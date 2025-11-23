// ============================================================================
// data.js (Cloudflare Worker) - with direct backup scraper fallback (no PHP)
// ============================================================================
//
// This full file:
// - supports language param
// - maps unlock API results (sources, subtitles, audioTracks)
// - when sources are empty, attempts a direct backup scrape via BACKUP_URL (iddant.site/restAPI/)
//   including necessary headers (Authorization + X-License-Key) so you don't need a PHP proxy
// - uses async for..of to await backup calls per chapter when needed
// - caches final result per bookId+lang in KV if available (DRAMABOX_CACHE)
// - IMPORTANT: This file contains tokens/keys that were provided earlier in the conversation.
//   Keep them secret in production; prefer storing sensitive values in environment variables.
//
// Deploy this as your Cloudflare Pages Function / Worker handler (exported onRequest).
// ============================================================================

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

// This token/header pair comes from your provided PHP snippet (used by the iddant.site wrapper)
const BACKUP_AUTH = "3203fccb29d361eac970918731d68255abc9c7907fba4b54f432743f754f62f3";
const BACKUP_LICENSE = "public";

// Map frontend/lang codes to webfic/dramabox codes (best-effort)
const LANG_MAP = {
  id: { webfic: 'in', drama: 'in' },
  en: { webfic: 'en', drama: 'en' },
  ms: { webfic: 'ms', drama: 'ms' },
  zh: { webfic: 'zh', drama: 'zh' },
  es: { webfic: 'es', drama: 'es' }
};

// Direct backup endpoint (call iddant.site/restAPI/ directly)
// If you later host your own PHP wrapper, change this to your proxy URL.
const BACKUP_URL = 'https://iddant.site/restAPI/';

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
    const webficLang = (LANG_MAP[lang] && LANG_MAP[lang].webfic) || 'in';
    const dramaLang = (LANG_MAP[lang] && LANG_MAP[lang].drama) || 'in';

    const SERIES_JSON_URL = `${url.origin}/series.json`;

    // --- A. SEARCH ---
    if (type === "search" && keyword) {
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const localResults = localData.filter(b =>
        b.title.toLowerCase().includes(keyword.toLowerCase())
      ).map(mapLocalBook);

      const payload = {
        searchSource: "搜索按钮", pageNo: 1, pageSize: 20, from: "search_sug", keyword: keyword
      };
      const rawData = await fetchFromDramaBox("/drama-box/search/search", payload, dramaLang);
      const apiResults = (rawData.data?.searchList || []).map(item => ({
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

    // --- B. LIST (HOME) ---
    if (type === "list") {
      const localData = await fetchSeriesDB(SERIES_JSON_URL);
      const combinedSections = [];

      if (localData.length > 0) {
          combinedSections.push({ title: "🔥 Pilihan Editor", books: localData.slice(0, 15).map(mapLocalBook) });
          if(localData.length > 15) combinedSections.push({ title: "📺 Rekomendasi Spesial", books: localData.slice(15, 35).map(mapLocalBook) });
          if(localData.length > 35) combinedSections.push({ title: "✨ Koleksi Populer", books: localData.slice(35, 100).map(mapLocalBook) });
      }
      return jsonResponse({ sections: combinedSections }, "LIST");
    }

    // --- C. DETAIL & CHAPTER (UNLOCKER V3) ---
    if (type === "chapter" && bookId) {
      const cacheKey = `unlock_v10_${bookId}_lang_${lang}`;
      if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cached) return jsonResponse(JSON.parse(cached), "CACHE");
      }

      // 1. metadata from webfic with tlanguage
      const webficRes = await fetch(`https://www.webfic.com/webfic/book/detail/v2?id=${encodeURIComponent(bookId)}&tlanguage=${encodeURIComponent(webficLang)}`);
      if (!webficRes.ok) return jsonResponse({ error: "Gagal mengambil data drama" }, "ERR");
      const webficJson = await webficRes.json();
      const liveData = webficJson.data;
      const liveChapterList = liveData?.chapterList || [];
      if (liveChapterList.length === 0) return jsonResponse({ error: "Chapter tidak ditemukan" }, "ERR");

      // 2. unlock (batch)
      const allChapterIds = liveChapterList.map(ch => ch.id);
      const unlockData = await fetchFromDramaBox("/drama-box/chapterv2/batchDownload", {
          bookId: bookId,
          chapterIdList: allChapterIds
      }, dramaLang);

      // 3. mapping from unlockData
      const videoMap = {};
      if (unlockData?.data?.chapterVoList) {
          unlockData.data.chapterVoList.forEach(ch => {
              const keys = [];
              if (ch.chapterId !== undefined && ch.chapterId !== null) keys.push(ch.chapterId);
              if (ch.chapter_id !== undefined && ch.chapter_id !== null) keys.push(ch.chapter_id);
              if (ch.id !== undefined && ch.id !== null) keys.push(ch.id);

              const cdn = ch.cdnList?.find(c => c.isDefault === 1) || ch.cdnList?.[0];

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
              const candidateSubLists = [ cdn?.subtitleList, cdn?.srtList, ch?.subtitleList, ch?.subtitles, ch?.srtList, ch?.sub ];
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
              const candidateAudioLists = [ cdn?.audioPathList, ch?.audioList, ch?.audios, cdn?.audioList ];
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
                  keys.forEach(k => {
                      if (k === undefined || k === null) return;
                      videoMap[String(k)] = {
                          sources: sourcesArr || [],
                          subtitles: subtitles || [],
                          audioTracks: audioTracks || []
                      };
                  });
              }
          });
      }

      // -- 4. build finalChapters (async to allow backup calls) --
      const finalChapters = [];
      for (const ch of liveChapterList) {
          const keyCandidates = [ch.id, ch.chapterId, ch.chapter_id].map(k => (k === undefined || k === null) ? null : String(k));
          let mapped = null;
          for (const k of keyCandidates) {
              if (!k) continue;
              if (videoMap[k]) { mapped = videoMap[k]; break; }
          }

          const chapterObj = {
              index: ch.index,
              title: ch.name || ch.chapterName || `Episode ${ch.index}`,
              sources: [],
              subtitles: [],
              audioTracks: []
          };

          if (mapped) {
              if (Array.isArray(mapped.sources) && mapped.sources.length) chapterObj.sources = mapped.sources;
              if (Array.isArray(mapped.subtitles) && mapped.subtitles.length) chapterObj.subtitles = mapped.subtitles;
              if (Array.isArray(mapped.audioTracks) && mapped.audioTracks.length) chapterObj.audioTracks = mapped.audioTracks;
          }

          // fallback to ch.mp4 if present
          if ((!chapterObj.sources || chapterObj.sources.length === 0) && ch.mp4) {
              chapterObj.sources = [{ q: 480, url: ch.mp4 }];
          }

          // If still empty, try backup scrape (only for empty sources)
          if ((!chapterObj.sources || chapterObj.sources.length === 0)) {
              try {
                  const tryId = ch.id || ch.chapterId || ch.chapter_id || bookId;
                  if (tryId) {
                      const backupResult = await fetchFromBackup(tryId, lang);
                      if (backupResult && (Array.isArray(backupResult.sources) && backupResult.sources.length)) {
                          chapterObj.sources = backupResult.sources;
                      }
                      if (backupResult && Array.isArray(backupResult.subtitles) && backupResult.subtitles.length) {
                          chapterObj.subtitles = backupResult.subtitles;
                      }
                      if (backupResult && Array.isArray(backupResult.audioTracks) && backupResult.audioTracks.length) {
                          chapterObj.audioTracks = backupResult.audioTracks;
                      }
                  }
              } catch (e) {
                  // ignore backup errors per chapter
              }
          }

          finalChapters.push(chapterObj);
      }

      if (finalChapters.length === 0) return jsonResponse({ error: "Video tidak tersedia." }, "ERR");

      const localizedTitle = liveData.book?.bookName || liveData.book?.title || liveData.book?.bookName;
      const localizedDesc = liveData.book?.introduction || liveData.book?.description || '';

      const result = {
          info: {
              id: liveData.book.bookId,
              title: localizedTitle,
              cover: liveData.book.cover,
              desc: localizedDesc,
              tags: liveData.book.tags || [],
              author: liveData.book.authorName || "Dramabox",
              views: liveData.book.viewCount,
              totalEps: finalChapters.length,
              lang: lang
          },
          chapters: finalChapters,
          related: (liveData.recommends || []).map(b => ({
              id: b.bookId, title: b.bookName, cover: b.cover, episodes: b.chapterCount
          }))
      };

      if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 }));

      return jsonResponse(result, "SUCCESS");
    }

    return new Response("Invalid Request", { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// ------------------ Backup fetch helper (direct call to iddant.site/restAPI/) ------------------
// Tries to call BACKUP_URL with { type: 'video', requestID: <id> }
// and maps many possible response shapes into { sources: [{q,url}], subtitles: [{lang,url}], audioTracks: [{lang,url}] }
async function fetchFromBackup(requestId, lang = 'id') {
  if (!BACKUP_URL) return null;

  const payload = { type: 'video', requestID: String(requestId) };

  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'User-Agent': 'Cloudflare-Worker',
    // include same headers used in your PHP wrapper so iddant.site accepts the request
    'Authorization': `Bearer ${BACKUP_AUTH}`,
    'X-License-Key': BACKUP_LICENSE
  };

  try {
    const resp = await fetch(BACKUP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!resp.ok) return null;

    const body = await resp.json().catch(() => null);
    if (!body) return null;

    // Candidate extraction helpers
    const tryExtractFromDramaBoxShape = (obj) => {
      const out = { sources: [], subtitles: [], audioTracks: [] };
      const chapList = obj?.data?.chapterVoList || obj?.data?.chapterVo;
      if (Array.isArray(chapList) && chapList.length) {
        const entry = chapList.find(c => String(c.chapterId || c.id || c.chapter_id) === String(requestId)) || chapList[0];
        if (entry) {
          const cdn = entry.cdnList?.find(c => c.isDefault === 1) || entry.cdnList?.[0];
          if (cdn && Array.isArray(cdn.videoPathList)) {
            out.sources = cdn.videoPathList.map(v => ({ q: v.quality || v.q || 0, url: v.videoPath || v.url || v.path || v.src })).filter(s => s.url);
          } else if (entry.mp4) {
            out.sources = [{ q: 480, url: entry.mp4 }];
          }
          const candSubs = cdn?.subtitleList || cdn?.srtList || entry?.subtitleList || entry?.subtitles || entry?.srtList;
          if (Array.isArray(candSubs)) {
            out.subtitles = candSubs.map(s => (typeof s === 'string' ? { lang: 'und', url: s } : { lang: s.lang || s.language || 'und', url: s.url || s.path || s.srt || s.subtitlePath }));
          }
          const candAudio = cdn?.audioPathList || entry?.audioList || entry?.audios;
          if (Array.isArray(candAudio)) {
            out.audioTracks = candAudio.map(a => (typeof a === 'string' ? { lang: 'und', url: a } : { lang: a.lang || a.language || 'und', url: a.url || a.path || a.audioPath }));
          }
        }
        return out;
      }
      return null;
    };

    // 1) Try drama-box-like structure
    let mapped = tryExtractFromDramaBoxShape(body);
    if (mapped && (mapped.sources.length || mapped.subtitles.length || mapped.audioTracks.length)) return mapped;

    // 2) try nested shapes
    mapped = tryExtractFromDramaBoxShape(body.json || body.result || body.data || {});
    if (mapped && (mapped.sources.length || mapped.subtitles.length || mapped.audioTracks.length)) return mapped;

    // 3) common shapes
    if (body.url && typeof body.url === 'string') {
      return { sources: [{ q: 480, url: body.url }], subtitles: [], audioTracks: [] };
    }
    if (Array.isArray(body.urls) && body.urls.length) {
      return { sources: body.urls.map(u => ({ q: 480, url: u })), subtitles: [], audioTracks: [] };
    }
    if (body.video) {
      if (Array.isArray(body.video.sources)) {
        const srcs = body.video.sources.map(s => ({ q: s.q || s.quality || 0, url: s.url || s.path || s.src })).filter(s => s.url);
        return { sources: srcs, subtitles: body.video.subtitles || [], audioTracks: body.video.audioTracks || [] };
      }
      if (body.video.url) return { sources: [{ q: 480, url: body.video.url }], subtitles: [], audioTracks: [] };
    }

    // 4) collect any nested http(s) urls (last resort)
    const collectUrls = (obj, acc = []) => {
      if (!obj || typeof obj !== 'object') return acc;
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) acc.push(v);
        else if (Array.isArray(v)) v.forEach(i => { if (typeof i === 'string' && (i.startsWith('http://')||i.startsWith('https://'))) acc.push(i); else if (typeof i === 'object') collectUrls(i,acc); });
        else if (typeof v === 'object') collectUrls(v, acc);
      }
      return acc;
    };
    const urls = collectUrls(body, []);
    if (urls.length) {
      const uniq = Array.from(new Set(urls));
      return { sources: uniq.map(u => ({ q: 480, url: u })), subtitles: [], audioTracks: [] };
    }

    return null;
  } catch (e) {
    return null;
  }
}

// ------------------ Helper functions & fetchFromDramaBox ------------------

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
    method: "POST", headers, body: JSON.stringify(payload)
  });
  if (!res.ok) return {};
  return await res.json();
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

function importPrivateKey(pem) {
  const binaryDerString = atob(pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\n/g, "").replace(/\s/g, ""));
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) { binaryDer[i] = binaryDerString.charCodeAt(i); }
  return crypto.subtle.importKey("pkcs8", binaryDer.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
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
