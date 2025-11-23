// functions/api/data.js

// --- KONFIGURASI KUNCI RSA (Dari Repositori PHP) ---
// Isi file private_key.pem
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

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const bookId = url.searchParams.get("bookId");

    // 1. LIST DRAMA
    if (type === "list") {
      // Menggunakan Endpoint Home Classify dari repo PHP (test.php)
      // Karena repo PHP sign request, kita juga akan sign.
      const payload = {
          pageSize: 15,
          typeList: [
            { type: 1, value: "" }, { type: 2, value: "" }, 
            { type: 4, value: "" }, { type: 5, value: "2" }
          ],
          pageNo: 1,
          showLabels: false
      };
      
      const data = await fetchFromDramaBox("/drama-box/home/classify", payload, env);
      return jsonResponse(data);
    }

    // 2. DETAIL CHAPTER (Tiered Storage: KV -> D1 -> API)
    if (type === "chapter" && bookId) {
      const cacheKey = `chapter_list_${bookId}`;

      // Cek KV
      if (env.DRAMABOX_CACHE) {
        const cachedKV = await env.DRAMABOX_CACHE.get(cacheKey);
        if (cachedKV) return jsonResponse(JSON.parse(cachedKV), "KV-Cache");
      }

      // Cek D1
      if (env.DB) {
        const dbResult = await env.DB.prepare("SELECT * FROM chapters WHERE book_id = ? ORDER BY episode_number ASC").bind(bookId).all();
        if (dbResult.results && dbResult.results.length > 0) {
          const formattedData = { 
            data: { chapterList: dbResult.results.map(row => ({
                chapterId: row.chapter_id, chapterName: row.title,
                cdnList: [{ videoPathList: [{ videoPath: row.video_url, isDefault: 1 }] }]
            }))} 
          };
          // Refresh KV
          if (env.DRAMABOX_CACHE) context.waitUntil(env.DRAMABOX_CACHE.put(cacheKey, JSON.stringify(formattedData), { expirationTtl: 14400 }));
          return jsonResponse(formattedData, "D1-Database");
        }
      }

      // Fetch API (Dengan Signature Lokal)
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
    return new Response(JSON.stringify({ error: "Error", message: err.message, stack: err.stack }, null, 2), { status: 500 });
  }
}

// --- HELPER SIGNATURE (PORTING DARI PHP) ---

// 1. Convert PEM string to Binary Key
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

// 2. Create Signature (Logika DramaboxApp.php)
async function createSignature(payload, token, deviceId) {
    const androidId = "ANDROID"; // Default static value dari repo PHP
    // Rumus dari PHP: $toSign = $bodyJson . DRBX_DEVICE . DRBX_ANDROID . DRBX_BEARER;
    // JS JSON.stringify hampir selalu sama dengan json_encode PHP (no escape slashes)
    const bodyJson = JSON.stringify(payload); 
    const toSignString = bodyJson + deviceId + androidId + "Bearer " + token;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(toSignString);
    const key = await importPrivateKey(PRIVATE_KEY_PEM);
    
    const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
    
    // Convert buffer to Base64
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

// --- REQUEST HANDLER ---

async function fetchFromDramaBox(endpoint, payload, env) {
  // 1. Dapatkan Token & DeviceID (Masih pinjam dari helper Vercel agar dinamis, atau bisa hardcode jika mau)
  const { token, deviceId } = await getTokenAndDevice(env);
  
  // 2. Generate Signature Sendiri (INI BAGIAN BARUNYA)
  const signature = await createSignature(payload, token, deviceId);
  
  // 3. Susun Headers (Gabungan PHP & Node.js Repo)
  const headers = {
    "Host": "sapi.dramaboxdb.com",
    "Tn": `Bearer ${token}`, // Dari PHP DRBX_BEARER
    "Version": "451",        // Update ke 451 sesuai repo PHP
    "Package-Name": "com.storymatrix.drama",
    "Device-Id": deviceId,
    "Userid": "289167621",
    "Android-Id": "ANDROID", // Header tambahan dari PHP
    "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "okhttp/4.10.0",
    "sn": signature,         // Header Signature hasil generate sendiri!
    "Language": "in",
    "Current-Language": "in"
  };

  const url = `https://sapi.dramaboxdb.com${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return await res.json();
}

async function getTokenAndDevice(env) {
    // Coba cache dulu
    if (env.DRAMABOX_CACHE) {
        const cached = await env.DRAMABOX_CACHE.get("app_token", { type: "json" });
        if (cached) return cached;
    }

    // Fallback: Ambil dari Vercel helper (Gugun09), tapi kita Sign sendiri nanti
    const res = await fetch("https://dramabox-api.vercel.app/api/token");
    const json = await res.json();
    if (!json.data) throw new Error("Gagal ambil token");

    const data = { token: json.data.token, deviceId: json.data.deviceId };
    
    if (env.DRAMABOX_CACHE) {
        await env.DRAMABOX_CACHE.put("app_token", JSON.stringify(data), { expirationTtl: 3000 });
    }
    return data;
}

// --- DB HELPER (Sama seperti sebelumnya) ---
async function saveToD1(db, bookId, data) {
    // ... (Logika simpan DB sama persis dengan sebelumnya) ...
    // Copy function saveToD1 dari jawaban sebelumnya ke sini
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
