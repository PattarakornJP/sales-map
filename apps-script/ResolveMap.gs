/**
 * แก้ลิงก์ Google Maps สั้น (maps.app.goo.gl / goo.gl/maps) บนเซิร์ฟเวอร์
 * เพราะเบราว์เซอร์ตามลิงก์นี้เองไม่ได้ (CORS)
 *
 * โปรเจกต์นี้คือ Apps Script เดิมของ PE Jobs (ตัวเดียวกับที่เว็บแผนที่เรียก)
 * อย่าสร้างเว็บแอปใหม่ เพราะ URL จะเปลี่ยน
 *
 * วิธีใส่
 * 1) เปิดโปรเจกต์ Apps Script ของชีต PE Jobs
 * 2) ใน Code.gs ให้แทนที่ฟังก์ชัน doGet ทั้งก้อน ด้วย doGet ด้านล่าง
 *    (ฟังก์ชันอื่นใน Code.gs คงไว้ รวม ADMIN_KEY)
 * 3) เพิ่มไฟล์นี้เข้าโปรเจกต์ หรือวางฟังก์ชัน mapHostOk_ resolveRedirect_
 *    parseMapPoint_ resolveMapUrl_ ต่อท้าย Code.gs
 *    ห้ามมี doGet สองอัน — เหลือเฉพาะก้อนใหม่
 * 4) Deploy > Manage deployments > แก้ deployment เดิม (ดินสอ)
 *    Version = New version > Deploy
 *    ไม่ต้องเปลี่ยน URL ในเว็บ
 *
 * ถ้ายังไม่ได้ลงเวอร์ชันใหม่ เว็บยังทำงานกับ backend เดิม
 * ลิงก์สั้นจะขึ้นข้อความให้เปิดลิงก์แล้วคัดลอก URL เต็มจากแถบที่อยู่
 * ลิงก์เต็มและข้อความ "ละติจูด, ลองจิจูด" ใช้ได้โดยไม่ต้องพึ่งฟังก์ชันนี้
 */

function doGet(e) {
  e = e || {};
  var action = String((e.parameter && e.parameter.action) || '').trim();
  if (action === 'resolveMap') return emit_(e, resolveMapUrl_(e.parameter && e.parameter.url));
  var table = requestedTable_(e && e.parameter);
  if (table === 'service') return doGetService_(e);
  if (table === 'plan') return doGetPlan_(e);
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return emit_(e, { ok: false, error: 'ระบบไม่ว่าง รอสักครู่แล้วกด โหลดใหม่' });
  }
  try {
    var snap = snapshot_();
    return emit_(e, {
      ok: true,
      count: snap.rows.length,
      lastSaved: snap.lastSaved,
      fields: HEADERS,
      rows: snap.rows
    });
  } catch (err) {
    return emit_(e, { ok: false, error: 'อ่านข้อมูลไม่สำเร็จ ลองกด โหลดใหม่' });
  } finally {
    lock.releaseLock();
  }
}

function mapHostOk_(url) {
  var m = String(url || '').match(/^https:\/\/([^\/?#]+)/i);
  if (!m) return false;
  var host = m[1].toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') return true;
  if (host === 'google.com' || host === 'maps.google.com') return true;
  if (host.length > 11 && host.substring(host.length - 11) === '.google.com') return true;
  if (host.length > 13 && host.substring(host.length - 13) === '.google.co.th') return true;
  return false;
}

function resolveRedirect_(base, loc) {
  loc = String(loc || '').trim();
  if (!loc) return '';
  if (/^https?:\/\//i.test(loc)) return loc;
  if (loc.charAt(0) === '/') {
    var origin = String(base || '').match(/^https:\/\/[^\/?#]+/i);
    return origin ? origin[0] + loc : '';
  }
  return '';
}

function parseMapPoint_(text) {
  var raw = String(text || '').trim();
  if (!raw) return null;
  var decoded = raw;
  try { decoded = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch (e) {}
  var rePin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g;
  var pins = decoded.match(rePin);
  if (pins && pins.length) {
    var last = pins[pins.length - 1].match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (last) {
      var lat = Number(last[1]), lng = Number(last[2]);
      if (isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat: lat, lng: lng };
      }
    }
  }
  var at = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    var alat = Number(at[1]), alng = Number(at[2]);
    if (isFinite(alat) && isFinite(alng) && alat >= -90 && alat <= 90 && alng >= -180 && alng <= 180) {
      return { lat: alat, lng: alng };
    }
  }
  var q = decoded.match(/(?:[?&]|^)(?:q|query|ll|center)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if (q) {
    var qlat = Number(q[1]), qlng = Number(q[2]);
    if (isFinite(qlat) && isFinite(qlng) && qlat >= -90 && qlat <= 90 && qlng >= -180 && qlng <= 180) {
      return { lat: qlat, lng: qlng };
    }
  }
  return null;
}

/** ตาม Location แบบไม่ให้ UrlFetchApp ตามเอง แล้วอ่านพิกัดจาก URL เต็ม */
function resolveMapUrl_(raw) {
  var current = String(raw || '').trim();
  if (!mapHostOk_(current)) {
    return { ok: false, action: 'resolveMap', error: 'ลิงก์นี้ไม่ใช่ Google Maps' };
  }
  var hop;
  for (hop = 0; hop < 5; hop++) {
    var found = parseMapPoint_(current);
    if (found) {
      return { ok: true, action: 'resolveMap', lat: found.lat, lng: found.lng, url: current };
    }
    var res;
    try {
      res = UrlFetchApp.fetch(current, { muteHttpExceptions: true, followRedirects: false });
    } catch (err) {
      return { ok: false, action: 'resolveMap', error: 'เปิดลิงก์ไม่สำเร็จ' };
    }
    var code = res.getResponseCode();
    var headers = res.getHeaders() || {};
    var loc = headers.Location || headers.location || '';
    if (Object.prototype.toString.call(loc) === '[object Array]') loc = loc[0];
    loc = String(loc || '').replace(/^\s+|\s+$/g, '');
    if (!loc || (code !== 301 && code !== 302 && code !== 303 && code !== 307 && code !== 308)) break;
    var next = resolveRedirect_(current, loc);
    if (!next || !mapHostOk_(next)) break;
    current = next;
  }
  var done = parseMapPoint_(current);
  if (done) return { ok: true, action: 'resolveMap', lat: done.lat, lng: done.lng, url: current };
  return { ok: false, action: 'resolveMap', error: 'เปิดลิงก์แล้วแต่ไม่พบพิกัด', url: current };
}
