import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Minimal Pickup List component (Vendor portal)
// - Shows nearby pickup requests (no PII)
// - Expects API: GET /api/pickup/nearby?vendor_id=<id>&radius_km=10

export default function PickupList({ vendorId }) {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    axios.get(`/api/pickup/nearby`, { params: { vendor_id: vendorId, radius_km: 10 } })
      .then(res => {
        if (res.data && res.data.success) {
          setPickups(res.data.pickups || []);
          setOffline(res.data.offline || false);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [vendorId]);

  if (!vendorId) return <div>Please select vendor.</div>;
  if (loading) return <div>Loading pickups...</div>;

  return (
    <div>
      <h3>Nearby Pickup Requests {offline ? '(You appear offline)' : ''}</h3>
      {pickups.length === 0 && <div>No pickups in range.</div>}
      <ul>
        {pickups.map(p => (
          <li key={p.id} style={{ marginBottom: 12 }}>
            <div><strong>{p.scrap_type}</strong> — {p.estimated_weight ? p.estimated_weight + ' kg' : 'Est. weight N/A'}</div>
            <div>Distance: {p.distance_km} km</div>
            <div>Status: {p.status}</div>
            <button onClick={() => window.location.href = `/vendor/pickup/map?focus=${p.id}`}>View on Map</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
