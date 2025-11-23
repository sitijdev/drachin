// functions/api/data.js

// --- 1. KONFIGURASI KUNCI RSA (Wajib ada untuk signing) ---
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

// --- 2. MANUAL TOKEN (OPSIONAL) ---
// Jika API Vercel mati ("Gagal ambil token"), isi token & deviceId dari hasil sniff HP Anda di sini.
// Jika dibiarkan kosong (""), script akan mencoba mengambil otomatis.
const MANUAL_TOKEN = ""; 
const MANUAL_DEVICE_ID = ""; // Contoh: "ffffffff-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const bookId = url.searchParams.get("bookId");

    // --- A. LIST DRAMA ---
    if (type === "list") {
      // KEMBALI KE ENDPOINT NODE.JS agar cocok dengan frontend (columnVoList)
      // Tapi requestnya tetap kita SIGN pakai Private Key PHP biar lebih valid.
      const payload = {
        isNeedRank: 1,
        index: 0,
        type: 0,
        channelId: 175
      };
      
      const data = await fetchFromDramaBox("/drama-box/he001/theater", payload, env);
      return jsonResponse(data);
    }

    // --- B. DETAIL CHAPTER (Tiered Storage) ---
    if (type === "chapter" && bookId) {
      const cacheKey = `chapter_list_${bookId}`;

      // 1. Cek KV (Cache)
      if (env.DRAMABOX_CACHE) {
        const cachedKV = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cachedKV) return jsonResponse(JSON.parse(cachedKV), "KV-Cache");
      }

      // 2. Cek DB (D1)
      if (env.DB) {
        const dbResult = await env.DB.prepare(
            "SELECT * FROM chapters WHERE book_id = ? ORDER BY episode_number ASC"
        ).bind(bookId).all();

        if (dbResult.results && dbResult.results.length > 0) {
          const formattedData = { 
            data: { chapterList: dbResult.results.map(row => ({
                chapterId: row.chapter_id, chapterName: row.title,
                cdnList: [{ videoPathList: [{ videoPath: row.video_url, isDefault: 1 }] }]
            }))} 
          };
          if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(formattedData), { expirationTtl: 14400 }));
          return jsonResponse(formattedData, "D1-Database");
        }
      }

      // 3. Fetch API (Signed)
      const payload = {
          boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
          currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
          currencyPlaySourceName: "", preLoad: false, rid: "",
          pullCid: "", loadDirection: 0, startUpKey: "", bookId
      };

      const apiData = await fetchFromDramaBox("/drama-box/chapterv2/batch/load", payload, env);

      if (apiData?.data?.chapterList) {
        if (env.DB) context.waitUntil(saveToD1(env.DB, bookId, apiData));
        if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(apiData), { expirationTtl: 14400 }));
      }

      return jsonResponse(apiData, "Upstream-API-Signed");
    }

    return new Response("Invalid Parameters", { status: 400 });

  } catch (err) {
    // Tampilkan error JSON yang rapi
    return new Response(JSON.stringify({ 
        error: "Internal Server Error", 
        message: err.message, 
        stack: err.stack 
    }, null, 2), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// --- HELPER FUNCTIONS ---

// 1. Logic Request ke API Utama dengan Signing
async function fetchFromDramaBox(endpoint, payload, env) {
  // Ambil token (Otomatis atau Manual)
  const { token, deviceId } = await getTokenAndDevice(env);
  
  // Buat Signature Lokal (PHP Logic ported to JS)
  const signature = await createSignature(payload, token, deviceId);
  
  const headers = {
    "Host": "sapi.dramaboxdb.com",
    "Tn": `Bearer ${token}`,
    "Version": "451", // Versi app terbaru
    "Package-Name": "com.storymatrix.drama",
    "Device-Id": deviceId,
    "Userid": "289167621",
    "Android-Id": "ANDROID", 
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
    "sn": signature, // Signature buatan sendiri
    "Language": "in",
    "Current-Language": "in"
  };

  const url = `https://sapi.dramaboxdb.com${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Dramabox API Error: ${res.status} - ${txt}`);
  }
  return await res.json();
}

// 2. Logic Ambil Token (Prioritas: Manual -> Cache -> Vercel API)
async function getTokenAndDevice(env) {
    // A. Cek jika user mengisi Manual Token di atas
    if (MANUAL_TOKEN && MANUAL_DEVICE_ID) {
        return { token: MANUAL_TOKEN, deviceId: MANUAL_DEVICE_ID };
    }

    // B. Cek Cache KV
    if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get("app_token", { type: "json" });
        if (cached) return cached;
    }

    // C. Cek External API (Vercel)
    try {
        const res = await fetch("https://dramabox-api.vercel.app/api/token", {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        
        if (!res.ok) throw new Error(`Vercel API Down: ${res.status}`);
        
        const json = await res.json();
        if (!json.data || !json.data.token) throw new Error("Format Token Vercel Invalid");

        const data = { token: json.data.token, deviceId: json.data.deviceId };
        
        // Simpan Cache
        if (env.DRAMABOX_CACHE) {
            await env.DRAMABOX_CACHE.put("app_token", JSON.stringify(data), { expirationTtl: 3000 });
        }
        return data;

    } catch (e) {
        // Jika gagal, lempar error agar user tau harus isi manual
        throw new Error(`Gagal ambil token otomatis (Coba isi MANUAL_TOKEN di script): ${e.message}`);
    }
}

// 3. Logic Signature (RSA Signing)
async function createSignature(payload, token, deviceId) {
    const androidId = "ANDROID";
    const bodyJson = JSON.stringify(payload); 
    const toSignString = bodyJson + deviceId + androidId + "Bearer " + token;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(toSignString);
    const key = await importPrivateKey(PRIVATE_KEY_PEM);
    
    const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

function importPrivateKey(pem) {
  const binaryDerString = atob(pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\n/g, "").replace(/\s/g, ""));
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// 4. Logic Save DB
async function saveToD1(db, bookId, data) {
    const chapters = data.data.chapterList;
    const now = Date.now();
    await db.prepare(`INSERT OR REPLACE INTO books (book_id, updated_at) VALUES (?, ?)`).bind(bookId, now).run();
    const stmt = db.prepare(`INSERT OR IGNORE INTO chapters (chapter_id, book_id, title, video_url, episode_number, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    const batch = [];
    chapters.forEach((ch, index) => {
        const vidUrl = ch.cdnList?.[0]?.videoPathList?.[0]?.videoPath || "";
        if(vidUrl) batch.push(stmt.bind(ch.chapterId, bookId, ch.chapterName, vidUrl, index + 1, now));
    });
    if(batch.length > 0) await db.batch(batch);
}

function jsonResponse(data, source = "Unknown") {
  return new Response(JSON.stringify({ ...data, _source: source }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
