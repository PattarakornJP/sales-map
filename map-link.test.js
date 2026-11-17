const assert = require('assert');
const { parseMapPoint, isShortMapLink } = require('./map-link.js');

const NATURE = 'https://www.google.com/maps/place/%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%81%E0%B8%A3%E0%B8%A1+%E0%B9%80%E0%B8%94%E0%B8%AD%E0%B8%B0%E0%B9%80%E0%B8%99%E0%B9%80%E0%B8%88%E0%B8%AD%E0%B8%A3%E0%B9%8C+%E0%B8%A0%E0%B8%B9%E0%B9%80%E0%B8%81%E0%B9%87%E0%B8%95/@7.9142547,98.2920859,830m/data=!3m1!1e3!4m11!3m10!1s0x30503a9a02267ab5:0x1799341a7b6cb38e!5m4!1s2026-12-10!2i3!4m1!1i2!8m2!3d7.9149857!4d98.2928654!16s%2Fg%2F11f54wv80h';

const pin = parseMapPoint(NATURE);
assert.strictEqual(pin.lat, 7.9149857);
assert.strictEqual(pin.lng, 98.2928654);

assert.deepStrictEqual(
  parseMapPoint('https://www.google.com/maps/@8.1,98.2,15z'),
  { lat: 8.1, lng: 98.2, url: 'https://www.google.com/maps/@8.1,98.2,15z' }
);
assert.deepStrictEqual(
  parseMapPoint('https://www.google.com/maps?q=7.5,98.3'),
  { lat: 7.5, lng: 98.3, url: 'https://www.google.com/maps?q=7.5,98.3' }
);
assert.deepStrictEqual(
  parseMapPoint('https://www.google.com/maps/search/?api=1&query=9.5,100.0'),
  { lat: 9.5, lng: 100.0, url: 'https://www.google.com/maps/search/?api=1&query=9.5,100.0' }
);
assert.deepStrictEqual(
  parseMapPoint('https://maps.google.com/?ll=8.03,98.82'),
  { lat: 8.03, lng: 98.82, url: 'https://maps.google.com/?ll=8.03,98.82' }
);
assert.deepStrictEqual(parseMapPoint('7.9149857, 98.2928654'), { lat: 7.9149857, lng: 98.2928654, url: '' });
assert.deepStrictEqual(parseMapPoint('7.91 98.29'), { lat: 7.91, lng: 98.29, url: '' });
assert.strictEqual(parseMapPoint('https://www.google.com/maps/search/?api=1&query=The%20Nature%20Patong'), null);
assert.strictEqual(parseMapPoint('ไม่ใช่ลิงก์'), null);
assert.strictEqual(parseMapPoint(''), null);

const short = parseMapPoint('https://maps.app.goo.gl/mPTUsxYjGUv7UECo7');
assert.strictEqual(short.short, true);
assert.strictEqual(isShortMapLink('https://goo.gl/maps/abcDEF'), true);
assert.strictEqual(isShortMapLink('https://www.google.com/maps?q=1,2'), false);

console.log('map-link tests ok');
