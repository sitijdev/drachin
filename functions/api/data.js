// Cloudflare Worker - Dramabox API with Auto-Refresh Token & KV Session
// Requires KV namespaces: DRAMABOX_CACHE, SESSIONS

/* eslint-env serviceworker */

// --- KONFIGURASI STATIS (Device ID Tetap agar terlihat seperti HP yang sama) ---
const CONST_DEVICE_ID = "ee9d23ac-0596-4f3e-8279-b652c9c2b7f0";
const CONST_ANDROID_ID = "ffffffff9b5bfe16000000000";
const CONST_PACKAGE = "com.storymatrix.drama";
const CONST_APP_VER = "451";
const CONST_VN_VER = "4.5.1";

// Private Key untuk RSA Signature (Jangan diubah jika masih match dengan APK)
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

const LANG_MAP = {
  id: { webfic: 'in', drama: 'in' },
  en: { webfic: 'en', drama: 'en' },
  ms: { webfic: 'ms', drama: 'ms' },
  zh: { webfic: 'zh', drama: 'zh' },
  es: { webfic: 'es', drama: 'es' }
};

const CACHE_MAX_AGE_MS = 1000 * 60 * 30; // 30 mins
const CHUNK_SIZE = 60; 
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; 

// --- TOKEN MANAGEMENT ---

/**
 * Mengambil token aktif dari KV. Jika tidak ada, panggil bootstrap.
 */
async function getActiveToken(env) {
    if (!env.DRAMABOX_CACHE) {
        // Fallback jika KV tidak terikat (untuk dev)
        return await fetchBootstrapToken(); 
    }
    
    // Coba baca dari KV
    let tokenData = await env.DRAMABOX_CACHE.get("SYSTEM_TOKEN", { type: "json" });
    if (tokenData && tokenData.token) {
        return tokenData.token;
    }

    // Jika kosong, generate baru
    return await refreshAndStoreToken(env);
}

/**
 * Hit Endpoint Bootstrap untuk dapat token baru
 */
async function fetchBootstrapToken() {
    const url = "https://sapi.dramaboxdb.com/drama-box/ap001/bootstrap?timestamp=" + Date.now();
    const payload = { 'distinctId': "cc85be1f8166bd67" }; // Bisa dirandomize jika perlu
    
    const headers = {
        'Host': "sapi.dramaboxdb.com",
        'Version': CONST_APP_VER,
        'Cid': "DAUAG1050213",
        'Package-Name': CONST_PACKAGE,
        'Apn': '2',
        'Device-Id': CONST_DEVICE_ID,
        'Android-Id': CONST_ANDROID_ID,
        'Language': 'en',
        'Content-Type': "application/json; charset=UTF-8",
        'User-Agent': "okhttp/4.10.0"
    };

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        const json = await resp.json();
        if (json.data && json.data.user && json.data.user.token) {
            console.log("New Token Generated:", json.data.user.token.substring(0, 10) + "...");
            return json.data.user.token;
        }
        throw new Error("Bootstrap response missing token");
    } catch (e) {
        console.error("Bootstrap failed:", e);
        throw e;
    }
}

/**
 * Generate token baru dan simpan di KV
 */
async function refreshAndStoreToken(env) {
    const newToken = await fetchBootstrapToken();
    if (env.DRAMABOX_CACHE && newToken) {
        await env.DRAMABOX_CACHE.put("SYSTEM_TOKEN", JSON.stringify({ 
            token: newToken, 
            updatedAt: Date.now() 
        }), { expirationTtl: 86400 }); // Cache 24 jam
    }
    return newToken;
}

// --- CRYPTO & SIGNATURE ---

async function importPrivateKey(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

// Signature sekarang butuh Token sebagai parameter!
async function createSignature(payload, token) {
  const bodyJson = JSON.stringify(payload);
  const toSignString = bodyJson + CONST_DEVICE_ID + CONST_ANDROID_ID + "Bearer " + token;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(toSignString);
  const key = await importPrivateKey(PRIVATE_KEY_PEM);
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  
  let binary = '';
  const bytes = new Uint8Array(signatureBuffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// --- FETCH WRAPPER WITH RETRY ---

async function fetchFromDramaBox(env, endpoint, payload, language = 'in') {
    // 1. Ambil token (dari KV atau generate baru)
    let token = await getActiveToken(env);
    
    // Fungsi internal untuk melakukan request
    const doFetch = async (currentToken) => {
        const signature = await createSignature(payload, currentToken);
        const headers = {
            'Host': 'sapi.dramaboxdb.com',
            'Tn': `Bearer ${currentToken}`,
            'Version': CONST_APP_VER,
            'Vn': CONST_VN_VER,
            'Package-Name': CONST_PACKAGE,
            'Device-Id': CONST_DEVICE_ID,
            // Userid bisa dinamis dari bootstrap jika perlu, tapi seringkali opsional untuk baca
            'Userid': "0", 
            'Android-Id': CONST_ANDROID_ID,
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': 'okhttp/4.10.0',
            'sn': signature,
            'Language': language
        };

        return await fetch(`https://sapi.dramaboxdb.com${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
    };

    // 2. Coba Request Pertama
    let resp = await doFetch(token);

    // 3. Cek Error 401/403 (Token Expired/Invalid)
    if (resp.status === 401 || resp.status === 403) {
        console.warn("Token expired/invalid (401/403). Refreshing token...");
        
        // 4. Paksa Refresh Token
        token = await refreshAndStoreToken(env);
        
        // 5. Retry Request dengan Token Baru
        resp = await doFetch(token);
    }

    if (!resp.ok) {
        console.log(`Fetch DB Failed [${endpoint}]:`, resp.status);
        return {}; // Return kosong agar tidak crash
    }

    return await resp.json();
}

// --- SESSION HELPERS ---

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach(pair => {
    const [k, ...v] = pair.split('=');
    if (!k) return;
    out[k.trim()] = decodeURIComponent((v || []).join('=').trim());
  });
  return out;
}

function makeSetCookieHeader(sessionId) {
  return `session_id=${encodeURIComponent(sessionId)}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

async function loadSession(env, cookieHeader) {
  const cookies = parseCookies(cookieHeader);
  let sessionId = cookies['session_id'];
  
  const createNew = async () => {
    const newId = crypto.randomUUID();
    const newSession = { createdAt: Date.now(), updatedAt: Date.now() };
    if (env.SESSIONS) {
      await env.SESSIONS.put(`s:${newId}`, JSON.stringify(newSession), { expirationTtl: SESSION_TTL_SECONDS });
    }
    return { id: newId, data: newSession, setCookie: makeSetCookieHeader(newId) };
  };

  if (!sessionId) return await createNew();
  
  if (!env.SESSIONS) return { id: sessionId, data: {}, setCookie: null };
  
  const raw = await env.SESSIONS.get(`s:${sessionId}`);
  if (!raw) return await createNew();
  
  try {
      return { id: sessionId, data: JSON.parse(raw), setCookie: null };
  } catch { return await createNew(); }
}

async function storeSession(env, sessionId, sessionData) {
  if (!env.SESSIONS) return;
  sessionData.updatedAt = Date.now();
  await env.SESSIONS.put(`s:${sessionId}`, JSON.stringify(sessionData), { expirationTtl: SESSION_TTL_SECONDS });
}

// --- API HELPERS ---

async function fetchSeriesDB(url) {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

function mapLocalBook(b) {
  return {
    id: b.source_id || b.id,
    title: b.title,
    cover: b.cover_path || b.cover,
    episodes: b.total_episodes || 'Full',
    desc: b.description,
    tags: b.tags || ['Series']
  };
}

function jsonResponseWithHeaders(data, source, extraHeaders = {}) {
  const headers = { 
    'Content-Type': 'application/json', 
    'Access-Control-Allow-Origin': '*', 
    'X-Cache-Status': source, 
    ...extraHeaders 
  };
  return new Response(JSON.stringify({ ...data, _source: source }), { headers });
}

// --- MAIN HANDLER ---

export async function onRequest(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const bookId = url.searchParams.get('bookId');
    const keyword = url.searchParams.get('keyword');
    const reqLang = url.searchParams.get('lang') || 'id';
    
    // Simple lang normalizer
    const langKey = reqLang.toLowerCase().startsWith('en') ? 'en' : 'id';
    const webficLang = LANG_MAP[langKey].webfic;
    const dramaLang = LANG_MAP[langKey].drama;
    const noCache = url.searchParams.get('nocache') === '1';

    // Session Load
    const cookieHeader = request.headers.get('Cookie') || '';
    const session = await loadSession(env, cookieHeader);

    // 1. SEARCH
    if (type === 'search' && keyword) {
      const payload = { searchSource: '搜索按钮', pageNo: 1, pageSize: 20, from: 'search_sug', keyword };
      // Panggil fetch wrapper baru (passing 'env')
      const rawData = await fetchFromDramaBox(env, '/drama-box/search/search', payload, dramaLang);
      
      const apiResults = (rawData.data?.searchList || []).map(item => ({
        id: item.bookId || item.id,
        title: item.bookName || item.title,
        cover: item.cover || item.bookCover,
        episodes: item.chapterCount
      }));

      return jsonResponseWithHeaders({ results: apiResults }, 'MISS', session.setCookie ? { 'Set-Cookie': session.setCookie } : {});
    }

    // 2. LIST
    if (type === 'list') {
      const localData = await fetchSeriesDB(`${url.origin}/series.json`);
      return jsonResponseWithHeaders({ 
          sections: [{ title: 'Popular', books: localData.slice(0,20).map(mapLocalBook) }] 
      }, 'MISS', session.setCookie ? { 'Set-Cookie': session.setCookie } : {});
    }

    // 3. CHAPTER / DETAIL
    if (type === 'chapter' && bookId) {
      const cacheKey = `v11_${bookId}_${langKey}`;
      
      // Cache Logic (Read)
      if (env.DRAMABOX_CACHE && !noCache) {
          const cachedRaw = await env.DRAMABOX_CACHE.get(cacheKey);
          if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              const hasEmpty = parsed.chapters.some(c => !c.sources || !c.sources.length);
              if (!hasEmpty) {
                  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache-Status': 'HIT' };
                  if (session.setCookie) headers['Set-Cookie'] = session.setCookie;
                  return new Response(JSON.stringify(parsed), { headers });
              }
          }
      }

      // Webfic Metadata
      const webficRes = await fetch(`https://www.webfic.com/webfic/book/detail/v2?id=${bookId}&tlanguage=${webficLang}`);
      const webficJson = await webficRes.ok ? await webficRes.json() : {};
      const liveChapterList = webficJson.data?.chapterList || [];

      if (!liveChapterList.length) {
          return jsonResponseWithHeaders({ error: 'Not Found' }, 'ERR');
      }

      // Batch Download Logic
      const chapterIds = liveChapterList.map(c => c.id).filter(Boolean);
      const videoMap = {};

      for (let i = 0; i < chapterIds.length; i += CHUNK_SIZE) {
        const chunk = chapterIds.slice(i, i + CHUNK_SIZE);
        try {
          const payload = { bookId: bookId, chapterIdList: chunk };
          // Panggil fetch wrapper baru (passing 'env') untuk auto-refresh token
          const unlock = await fetchFromDramaBox(env, '/drama-box/chapterv2/batchDownload', payload, dramaLang);

          if (unlock?.data?.chapterVoList) {
             unlock.data.chapterVoList.forEach(entry => {
                const cdn = entry.cdnList?.find(c => c.isDefault === 1) || entry.cdnList?.[0];
                if (cdn?.videoPathList) {
                    const sources = cdn.videoPathList
                        .map(v => ({ q: Number(v.q || 0), url: v.videoPath || v.url }))
                        .sort((a,b) => b.q - a.q);
                    
                    if (entry.chapterId) videoMap[String(entry.chapterId)] = sources;
                    if (entry.id) videoMap[String(entry.id)] = sources;
                }
             });
          }
        } catch (e) { console.error("Chunk Error", e); }
      }

      // Merge
      const finalChapters = liveChapterList.map(ch => ({
          index: ch.index,
          title: ch.name,
          sources: videoMap[String(ch.id)] || (ch.mp4 ? [{q:480, url:ch.mp4}] : [])
      }));

      const result = {
          info: { 
              id: webficJson.data?.book?.bookId, 
              title: webficJson.data?.book?.bookName,
              cover: webficJson.data?.book?.cover,
              totalEps: finalChapters.length
          },
          chapters: finalChapters
      };

      // Cache Save (Write)
      if (env.DRAMABOX_CACHE && finalChapters.length > 0) {
          context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 }));
      }

      return jsonResponseWithHeaders(result, 'MISS', session.setCookie ? { 'Set-Cookie': session.setCookie } : {});
    }

    return new Response('Bad Request', { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
