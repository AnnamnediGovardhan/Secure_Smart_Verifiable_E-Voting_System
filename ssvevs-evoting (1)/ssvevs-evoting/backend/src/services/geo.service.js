// Geo-fence verification (NEW): confirm voter is inside an allowed polling region.
const ALLOWED = [{ lat: 9.6, lng: 6.5, radiusKm: 50 }]; // configure per election

function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function withinAllowedRegion(lat, lng) {
  return ALLOWED.some((z) => haversineKm({ lat, lng }, z) <= z.radiusKm);
}
