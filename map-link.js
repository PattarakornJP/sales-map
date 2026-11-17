/**
 * Read a point from a Google Maps link or from plain "lat, lng" text.
 * Place pins (!3dlat!4dlng) win over the camera (@lat,lng).
 * Short links (maps.app.goo.gl / goo.gl/maps) are flagged, not fetched.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SalesMapLink = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function decodeText(s) {
    var t = String(s || '').trim();
    try { t = decodeURIComponent(t.replace(/\+/g, ' ')); } catch (e) {}
    return t;
  }

  function extractUrl(text) {
    var m = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
    if (!m) return '';
    return m[0].replace(/[),.;]+$/, '');
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./i, '').toLowerCase(); }
    catch (e) { return ''; }
  }

  function isShortMapLink(text) {
    var url = extractUrl(text) || String(text || '').trim();
    var host = hostOf(url);
    if (!host) return false;
    if (host === 'maps.app.goo.gl') return true;
    if (host === 'goo.gl') {
      try { return new URL(url).pathname.indexOf('/maps') === 0; }
      catch (e) { return false; }
    }
    return false;
  }

  function inRange(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function pair(lat, lng) {
    var a = Number(lat), b = Number(lng);
    if (!isFinite(a) || !isFinite(b) || !inRange(a, b)) return null;
    return { lat: a, lng: b };
  }

  function parseMapPoint(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    var url = extractUrl(raw);
    if (isShortMapLink(url || raw)) return { short: true, url: url || raw };
    var decoded = decodeText(url || raw);
    var pins = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g);
    if (pins && pins.length) {
      var last = pins[pins.length - 1].match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
      var pin = last && pair(last[1], last[2]);
      if (pin) return { lat: pin.lat, lng: pin.lng, url: url };
    }
    var at = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) {
      var atPair = pair(at[1], at[2]);
      if (atPair) return { lat: atPair.lat, lng: atPair.lng, url: url };
    }
    var q = decoded.match(/(?:[?&]|^)(?:q|query|ll|center)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
    if (q) {
      var qPair = pair(q[1], q[2]);
      if (qPair) return { lat: qPair.lat, lng: qPair.lng, url: url };
    }
    if (!url) {
      var plain = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (plain) {
        var plainPair = pair(plain[1], plain[2]);
        if (plainPair) return { lat: plainPair.lat, lng: plainPair.lng, url: '' };
      }
    }
    return null;
  }

  return {
    decodeText: decodeText,
    extractUrl: extractUrl,
    isShortMapLink: isShortMapLink,
    parseMapPoint: parseMapPoint
  };
});
