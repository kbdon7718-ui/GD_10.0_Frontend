import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../../../utils/apiBaseUrl';
import { useMediaQuery } from '../../../utils/useMediaQuery';
import PickupOfferDialog from './PickupOfferDialog';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useOfferCountdown } from './hooks/useOfferCountdown';
import { toast } from 'sonner';
import VendorPickupHeader from './VendorPickupHeader';
import ActivePickupCard from './ActivePickupCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

// Google Maps implementation for vendor pickup map.
// Requires REACT_APP_GOOGLE_MAPS_API_KEY in frontend env.

export default function PickupMap({ vendorId, initialCenter }) {
  const [vendorLoc, setVendorLoc] = useState(null);
  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const vendorMarkerRef = useRef(null);
  const [mapState, setMapState] = useState('idle'); // idle | loading | ready | error
  const [mapError, setMapError] = useState('');
  const [offerActionPending, setOfferActionPending] = useState(false);
  const [assignedPickup, setAssignedPickup] = useState(null);
  const [assignedStatus, setAssignedStatus] = useState('assigned');
  const [available, setAvailable] = useState(() => {
    try {
      const raw = window.localStorage.getItem('scrapco_vendor_available');
      if (raw == null) return true;
      return String(raw).toLowerCase() === 'true';
    } catch (_e) {
      return true;
    }
  });
  const [sseStatus, setSseStatus] = useState('connecting');
  const sentDiscoverabilityRef = useRef(false);
  const busyRef = useRef(false);
  const currentOfferMarkerRef = useRef(null);
  const assignedMarkerRef = useRef(null);
  const [locationLabel, setLocationLabel] = useState('');
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { online } = useNetworkStatus();

  useEffect(() => {
    busyRef.current = !!assignedPickup;
  }, [assignedPickup]);

  useEffect(() => {
    try {
      window.localStorage.setItem('scrapco_vendor_available', String(available));
    } catch (_e) {}

    if (!available) {
      setCurrentOffer(null);
    }
  }, [available]);
  // Vite exposes env vars as import.meta.env and expects `VITE_` prefix.
  const KEY =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    window?.REACT_APP_GOOGLE_MAPS_API_KEY ||
    (typeof window !== 'undefined' ? window.localStorage.getItem('scrapco_gmaps_key') : null) ||
    null;
  const API_BASE = getApiBaseUrl();

  const BILLING_ENABLED = String(import.meta.env.VITE_BILLING_ENABLED ?? 'true').toLowerCase() === 'true';
  const MAP_ENABLED = BILLING_ENABLED && !!KEY;

  const mapDisabledReason = (() => {
    if (!BILLING_ENABLED) return 'Maps are disabled (VITE_BILLING_ENABLED=false).';
    if (!KEY) return 'Missing Google Maps API key. Set VITE_GOOGLE_MAPS_API_KEY and restart the dev server.';
    return '';
  })();

  const CUSTOMER_BACKEND_LOCATION_URL =
    import.meta.env.VITE_CUSTOMER_BACKEND_LOCATION_URL ||
    import.meta.env.CUSTOMER_BACKEND_LOCATION_URL ||
    import.meta.env.REACT_APP_CUSTOMER_BACKEND_LOCATION_URL ||
    window?.VITE_CUSTOMER_BACKEND_LOCATION_URL ||
    window?.CUSTOMER_BACKEND_LOCATION_URL ||
    window?.REACT_APP_CUSTOMER_BACKEND_LOCATION_URL ||
    null;

  const DISCOVER_VENDOR_ID = 'mohar_singh_01';

  const normalizeBaseUrl = (baseUrl) => {
    if (!baseUrl) return '';
    return String(baseUrl).trim().replace(/\/+$/, '');
  };

  const computeOfferUrl = () => {
    const base = normalizeBaseUrl(API_BASE) || (typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '');
    if (!base) return '';
    return `${base}/api/offer`;
  };

  const sendVendorDiscoverability = async ({ latitude, longitude }) => {
    if (!CUSTOMER_BACKEND_LOCATION_URL) {
      console.warn('CUSTOMER_BACKEND_LOCATION_URL not configured; skipping vendor discoverability POST');
      return;
    }
    const offerUrl = computeOfferUrl();
    try {
      await axios.post(CUSTOMER_BACKEND_LOCATION_URL, {
        vendor_id: DISCOVER_VENDOR_ID,
        latitude,
        longitude,
        offer_url: offerUrl,
      });
      console.log('Vendor discoverability location sent');
    } catch (e) {
      console.error('Failed to send vendor discoverability location', e);
    }
  };

  // On map load/startup: send vendor location to customer backend once (no timers/polling)
  useEffect(() => {
    if (sentDiscoverabilityRef.current) return;
    sentDiscoverabilityRef.current = true;

    const fallbackLat = Number(initialCenter?.lat ?? 20.0);
    const fallbackLng = Number(initialCenter?.lng ?? 77.0);

    if (!navigator.geolocation) {
      sendVendorDiscoverability({ latitude: fallbackLat, longitude: fallbackLng });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        sendVendorDiscoverability({ latitude: lat, longitude: lng });
      },
      () => {
        sendVendorDiscoverability({ latitude: fallbackLat, longitude: fallbackLng });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // Send vendor location to backend
  const sendVendorLocation = async (lat, lng) => {
    try {
      await axios.post(`${API_BASE || ''}/api/vendor/live-location`, { vendor_id: vendorId, latitude: lat, longitude: lng });
    } catch (e) {
      console.error('Failed to send vendor location', e);
    }
  };

  // SSE: listen for pickup offers pushed to vendor
  const [currentOffer, setCurrentOffer] = useState(null);
  const { secondsLeft: offerSecondsLeft, progress: offerProgress } = useOfferCountdown(currentOffer);

  useEffect(() => {
    if (!vendorId) return;
    if (!available) return;
    if (!online) return;
    const url = `${API_BASE || ''}/api/vendor/events?vendor_id=${encodeURIComponent(vendorId)}`;
    let es;
    try {
      setSseStatus('connecting');
      es = new EventSource(url);
    } catch (e) {
      console.warn('EventSource not available', e);
      setSseStatus('reconnecting');
      return;
    }

    es.onopen = () => setSseStatus('connected');

    es.addEventListener('pickup_offer', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (busyRef.current) {
          toast('New pickup offer received (you are busy)');
          return;
        }
        setCurrentOffer(data);
      } catch (e) { console.error('Malformed offer', e); }
    });

    es.addEventListener('vendor_availability', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const next = !!(data?.available ?? data?.is_available ?? data?.isAvailable);
        setAvailable(next);
      } catch (_e) {
        // ignore
      }
    });

    es.onerror = (err) => {
      console.warn('SSE error', err);
      setSseStatus('reconnecting');
      // reconnect logic could go here; EventSource auto-reconnects by default
    };

    return () => {
      try { es.close(); } catch (e) {}
    };
  }, [vendorId, available, online]);

  const closeOffer = () => {
    setCurrentOffer(null);
  };

  const getOfferRequestId = (offer) => {
    if (!offer) return null;
    return (
      offer.request_id ||
      offer.requestId ||
      offer.pickupId ||
      offer.pickup_id ||
      offer.id ||
      null
    );
  };

  const sendOfferDecision = async (decision) => {
    if (offerActionPending) return;
    if (!vendorId) {
      toast.error('Vendor not set');
      return;
    }
    if (!online) {
      toast.error('You are offline.');
      return;
    }
    if (decision === 'accept' && busyRef.current) {
      toast('You already have an active pickup');
      return;
    }
    const requestId = getOfferRequestId(currentOffer);
    if (!requestId) {
      toast.error('Offer is missing request_id');
      return;
    }

    setOfferActionPending(true);
    try {
      const endpoint = decision === 'accept' ? 'accept' : 'reject';
      await axios.post(`${API_BASE || ''}/api/vendor/${endpoint}`, {
        vendor_id: vendorId,
        request_id: requestId,
      });

      if (decision === 'accept') {
        const lat = Number(currentOffer?.latitude ?? currentOffer?.lat);
        const lng = Number(currentOffer?.longitude ?? currentOffer?.lng);
        setAssignedPickup({
          request_id: requestId,
          scrap_type: currentOffer?.scrap_type ?? currentOffer?.scrapType ?? null,
          estimated_quantity: currentOffer?.estimated_quantity ?? currentOffer?.estimated_weight ?? null,
          latitude: Number.isFinite(lat) ? lat : null,
          longitude: Number.isFinite(lng) ? lng : null,
          assigned_at: Date.now(),
          raw: currentOffer,
        });
        setAssignedStatus('assigned');
        toast.success('Pickup accepted');
        closeOffer();
      } else {
        toast('Pickup rejected');
        closeOffer();
      }
    } catch (e) {
      console.error(`Failed to ${decision} offer`, e);
      toast.error(`${decision.toUpperCase()} failed: ` + (e.response?.data?.error || e.message));
    } finally {
      setOfferActionPending(false);
    }
  };

  const openDirections = (destLat, destLng) => {
    if (!destLat || !destLng) return;
    if (assignedPickup) setAssignedStatus((s) => (s === 'completed' ? s : 'on_the_way'));
    const origin = vendorLoc?.lat && vendorLoc?.lng ? `${vendorLoc.lat},${vendorLoc.lng}` : null;
    const destination = `${destLat},${destLng}`;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const centerMapOn = (lat, lng, zoom = 15) => {
    if (!mapObj.current || !window.google) return;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
    mapObj.current.setCenter({ lat: Number(lat), lng: Number(lng) });
    mapObj.current.setZoom(zoom);
  };

  const initMapIfPossible = () => {
    if (!MAP_ENABLED) return;
    if (!mapEl.current) return;
    if (!window.google || !window.google.maps) return;

    try {
      if (!mapObj.current) {
        mapObj.current = new window.google.maps.Map(mapEl.current, {
          center: { lat: initialCenter?.lat || 20.0, lng: initialCenter?.lng || 77.0 },
          zoom: 12,
        });
      }
      setMapState('ready');
      setMapError('');
    } catch (e) {
      console.error('Failed to initialize Google Map', e);
      setMapState('error');
      setMapError(e?.message ? String(e.message) : 'Failed to initialize map');
    }
  };

  // Initialize Google Maps script dynamically
  useEffect(() => {
    if (!MAP_ENABLED) {
      setMapState('disabled');
      setMapError(mapDisabledReason);
      return;
    }

    setMapState('loading');
    setMapError('');

    const existing = document.querySelector(`script[data-gmapi]`);
    if (window.google && window.google.maps) {
      initMapIfPossible();
      return;
    }

    if (!existing) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-gmapi', 'true');
      script.onload = () => {
        if (!window.google || !window.google.maps) {
          setMapState('error');
          setMapError('Google Maps loaded but did not initialize (check API key restrictions / billing).');
          return;
        }
        initMapIfPossible();
      };
      script.onerror = (e) => {
        console.error('Google Maps script load error', e);
        setMapState('error');
        setMapError('Failed to load Google Maps script (check network / ad blockers / key restrictions).');
      };
      document.head.appendChild(script);
    } else {
      // If the tag exists but google isn't ready yet, wait for it.
      const onLoad = () => initMapIfPossible();
      existing.addEventListener('load', onLoad);
      // Cleanup listener in case the component unmounts before it loads.
      return () => {
        try {
          existing.removeEventListener('load', onLoad);
        } catch (_e) {}
      };
    }
  }, [KEY, initialCenter]);

  // Watch geolocation and update vendor location periodically
  useEffect(() => {
    if (!vendorId || !navigator.geolocation) return;

    let watchId = null;
    const sendPosition = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setVendorLoc({ lat, lng });
      sendVendorLocation(lat, lng);
      if (MAP_ENABLED && mapObj.current) {
        const center = { lat, lng };
        if (!vendorMarkerRef.current) {
          vendorMarkerRef.current = new window.google.maps.Marker({ position: center, map: mapObj.current, title: 'You', icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#0f9d58', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
          mapObj.current.setCenter(center);
        } else {
          vendorMarkerRef.current.setPosition(center);
        }
      }
    };

    // get current position and then watchPosition with maximumAge and timeout
    navigator.geolocation.getCurrentPosition(sendPosition, (e) => console.warn('Geolocation error', e), { enableHighAccuracy: true, timeout: 5000 });
    watchId = navigator.geolocation.watchPosition(sendPosition, (e) => console.warn('Geolocation watch error', e), { enableHighAccuracy: true, maximumAge: 30000, timeout: 5000 });

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [vendorId]);

  // Render assigned pickup marker (green)
  useEffect(() => {
    if (!MAP_ENABLED || !mapObj.current || !window.google) return;

    try {
      if (assignedMarkerRef.current) {
        assignedMarkerRef.current.setMap(null);
        assignedMarkerRef.current = null;
      }

      if (!assignedPickup) return;
      const lat = Number(assignedPickup?.latitude);
      const lng = Number(assignedPickup?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      assignedMarkerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapObj.current,
        title: 'Assigned Pickup',
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#0f9d58',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    } catch (e) {
      console.warn('Failed to render assigned marker', e);
    }
  }, [assignedPickup, MAP_ENABLED]);

  // Show current offer location on the map while offer is active
  useEffect(() => {
    if (!MAP_ENABLED || !mapObj.current || !window.google) return;

    try {
      if (currentOfferMarkerRef.current) {
        currentOfferMarkerRef.current.setMap(null);
        currentOfferMarkerRef.current = null;
      }

      if (!currentOffer) return;
      const lat = Number(currentOffer?.latitude ?? currentOffer?.lat);
      const lng = Number(currentOffer?.longitude ?? currentOffer?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      currentOfferMarkerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapObj.current,
        title: 'New Pickup Offer',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#1a73e8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    } catch (e) {
      console.warn('Failed to render current offer marker', e);
    }
  }, [currentOffer]);

  const reverseGeocodeLabel = async (lat, lng) => {
    if (!MAP_ENABLED) return '';
    if (!window.google?.maps?.Geocoder) return '';
    return new Promise((resolve) => {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status !== 'OK' || !results?.length) return resolve('');
          const formatted = results[0]?.formatted_address || '';
          const short = formatted.split(',').slice(0, 2).join(',').trim();
          return resolve(short || formatted);
        });
      } catch (_e) {
        resolve('');
      }
    });
  };

  const activePickup = assignedPickup || currentOffer || null;
  const activeMode = assignedPickup ? 'assigned' : currentOffer ? 'offer' : 'idle';

  useEffect(() => {
    if (!assignedPickup) setAssignedStatus('assigned');
  }, [assignedPickup]);

  useEffect(() => {
    let cancelled = false;
    setLocationLabel('');

    const lat = Number(activePickup?.latitude ?? activePickup?.lat);
    const lng = Number(activePickup?.longitude ?? activePickup?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return () => { cancelled = true; };

    (async () => {
      const label = await reverseGeocodeLabel(lat, lng);
      if (!cancelled) setLocationLabel(label);
    })();

    return () => { cancelled = true; };
  }, [activeMode, activePickup?.latitude, activePickup?.longitude, MAP_ENABLED]);

  return (
    <div className="p-3 space-y-3">
      <PickupOfferDialog
        open={!!currentOffer}
        offer={currentOffer}
        areaLabel={locationLabel}
        busy={!!assignedPickup}
        online={online}
        pending={offerActionPending}
        secondsLeft={offerSecondsLeft}
        progress={offerProgress}
        onAccept={() => sendOfferDecision('accept')}
        onReject={() => sendOfferDecision('reject')}
        onClose={closeOffer}
      />

      <VendorPickupHeader
        mode={activeMode}
        online={online}
        sseStatus={sseStatus}
        available={available}
        busy={!!assignedPickup}
        onToggleAvailable={async (v) => {
          const next = !!v;
          setAvailable(next);
          toast(next ? 'Available for offers' : 'Not available for offers');
          try {
            if (vendorId) {
              await axios.post(`${API_BASE || ''}/api/vendor/availability`, {
                vendor_id: vendorId,
                available: next,
              });
            }
          } catch (e) {
            toast.error('Failed to update availability: ' + (e.response?.data?.error || e.message));
          }
        }}
      />

      <div className={isMobile ? 'grid gap-3' : 'grid grid-cols-5 gap-3'}>
        <Card className={isMobile ? '' : 'col-span-3'}>
          <CardHeader>
            <CardTitle className="text-sm">Map</CardTitle>
          </CardHeader>
          <CardContent>
            {MAP_ENABLED ? (
              <div className="relative">
                <div
                  ref={mapEl}
                  className="h-[520px] w-full rounded-md"
                  style={{ height: 520 }}
                />
                {mapState !== 'ready' ? (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="pointer-events-auto max-w-[95%] rounded-md border bg-white/95 p-3 text-xs text-gray-700 shadow">
                      <div className="font-semibold">
                        {mapState === 'loading' ? 'Loading map…' : 'Map not available'}
                      </div>
                      <div className="mt-1 text-gray-600">
                        {mapError || 'If you just updated .env.local, restart `npm run dev`.'}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-gray-50 p-3 text-sm text-gray-600">
                Map unavailable. {mapDisabledReason}
              </div>
            )}
          </CardContent>
        </Card>

        <div className={isMobile ? '' : 'col-span-2'}>
          <ActivePickupCard
            mode={activeMode}
            pickup={activePickup}
            areaLabel={locationLabel}
            assignedStatus={assignedStatus}
            online={online}
            pending={offerActionPending}
            onShowOnMap={() => {
              const lat = Number(activePickup?.latitude ?? activePickup?.lat);
              const lng = Number(activePickup?.longitude ?? activePickup?.lng);
              centerMapOn(lat, lng, 16);
            }}
            onDirections={() => openDirections(Number(activePickup?.latitude ?? activePickup?.lat), Number(activePickup?.longitude ?? activePickup?.lng))}
            onMarkOnTheWay={() => setAssignedStatus('on_the_way')}
            onComplete={async () => {
              if (!assignedPickup) return;
              if (!confirm('Mark pickup as completed?')) return;
              if (!online) {
                toast.error('You are offline.');
                return;
              }
              setOfferActionPending(true);
              try {
                await axios.post(`${API_BASE || ''}/api/vendor/complete`, {
                  vendor_id: vendorId,
                  request_id: assignedPickup.request_id,
                });
                toast.success('Pickup marked completed');
                setAssignedStatus('completed');
                setAssignedPickup(null);
              } catch (e) {
                toast.error('Complete failed: ' + (e.response?.data?.error || e.message));
              } finally {
                setOfferActionPending(false);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
