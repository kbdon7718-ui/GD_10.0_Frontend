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
import { Button } from '../../ui/button';
import { ensurePushSubscription } from '../../../utils/pushNotifications';
import { CheckCircle2 } from 'lucide-react';

// Google Maps implementation for vendor pickup map.
// Requires REACT_APP_GOOGLE_MAPS_API_KEY in frontend env.

export default function PickupMap({ vendorId, initialCenter }) {
  const OFFER_PERSIST_TTL_MS = 60 * 1000;
  const HISTORY_LIMIT = 50;

  const formatRupees = (value) => {
    if (value == null || value === '') return '';
    const n = Number(value);
    if (Number.isFinite(n)) return `₹${n.toFixed(2)}`;
    return String(value);
  };

  const safeJsonParse = (raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(String(raw));
    } catch (_e) {
      return null;
    }
  };

  const computeOfferExpiryMs = (offer, savedAtMs) => {
    if (!offer) return null;

    const expiresAt = offer.expires_at || offer.expiresAt;
    if (expiresAt) {
      const ms = Date.parse(String(expiresAt));
      if (!Number.isNaN(ms)) return ms;
    }

    const ttlSeconds = offer.ttl_seconds ?? offer.ttlSeconds ?? offer.expires_in ?? offer.expiresIn;
    if (ttlSeconds != null && ttlSeconds !== '') {
      const s = Number(ttlSeconds);
      if (Number.isFinite(s) && s > 0) return Date.now() + s * 1000;
    }

    const base = Number.isFinite(Number(savedAtMs)) ? Number(savedAtMs) : Date.now();
    return base + OFFER_PERSIST_TTL_MS;
  };

  const offerStorageKey = (id) => `scrapco_vendor_offer_${String(id)}`;
  const assignedStorageKey = (id) => `scrapco_vendor_assigned_${String(id)}`;
  const historyStorageKey = (id) => `scrapco_vendor_pickup_history_${String(id)}`;

  const getPickupRequestId = (pickup) => {
    if (!pickup) return null;
    return pickup.request_id || pickup.requestId || pickup.pickupId || pickup.pickup_id || pickup.id || null;
  };

  const [vendorLoc, setVendorLoc] = useState(null);
  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const vendorMarkerRef = useRef(null);
  const [mapState, setMapState] = useState('idle'); // idle | loading | ready | error
  const [mapError, setMapError] = useState('');
  const [offerActionPending, setOfferActionPending] = useState(false);
  const [assignedPickups, setAssignedPickups] = useState([]);
  const [pickupStatuses, setPickupStatuses] = useState({});
  const [selectedPickupId, setSelectedPickupId] = useState(null);
  const [pickupHistory, setPickupHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sseStatus, setSseStatus] = useState('connecting');
  const sentDiscoverabilityRef = useRef(false);
  const currentOfferMarkerRef = useRef(null);
  const assignedMarkersRef = useRef(new Map());
  const [locationLabel, setLocationLabel] = useState('');
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { online } = useNetworkStatus();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [offerVisualState, setOfferVisualState] = useState(null); // accepted | rejected | expired
  const offerVisualTimerRef = useRef(null);
  const [uiBanner, setUiBanner] = useState(null); // { type: 'assigned'|'completed', at: number }

  const selectedAssignedPickup = (() => {
    if (!assignedPickups?.length) return null;
    const wanted = selectedPickupId
      ? assignedPickups.find((p) => getPickupRequestId(p) === selectedPickupId)
      : null;
    return wanted || assignedPickups[0] || null;
  })();

  useEffect(() => {
    if (!assignedPickups?.length) {
      setSelectedPickupId(null);
      return;
    }
    const selectedStillExists =
      selectedPickupId && assignedPickups.some((p) => getPickupRequestId(p) === selectedPickupId);
    if (!selectedStillExists) {
      setSelectedPickupId(getPickupRequestId(assignedPickups[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedPickups]);

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

  // Note: The frontend should only depend on the vendor backend base URL (VITE_API_URL).
  // Any customer-backend URLs should live in the vendor backend .env and be forwarded server-side.

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
    if (!vendorId) return;
    const offerUrl = computeOfferUrl();
    try {
      await axios.post(`${API_BASE || ''}/api/vendor/live-location`, {
        vendor_id: vendorId,
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
    if (!vendorId) return;
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
  }, [vendorId]);

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
    // Reset offer UI state for each new offer.
    setOfferVisualState(null);
    if (offerVisualTimerRef.current) {
      try { clearTimeout(offerVisualTimerRef.current); } catch (_e) {}
      offerVisualTimerRef.current = null;
    }
  }, [currentOffer?.request_id, currentOffer?.requestId, currentOffer?.id]);

  // UI-only: when countdown hits 0, show a gentle expiry then close.
  useEffect(() => {
    if (!currentOffer) return;
    if (offerActionPending) return;
    if (offerVisualState) return;
    if (typeof offerSecondsLeft !== 'number') return;
    if (offerSecondsLeft > 0) return;

    setOfferVisualState('expired');
    offerVisualTimerRef.current = setTimeout(() => {
      closeOffer();
      setOfferVisualState(null);
    }, 650);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerSecondsLeft, currentOffer, offerActionPending, offerVisualState]);

  // Restore offer/assigned state after reload (per vendor).
  useEffect(() => {
    if (!vendorId) return;

    try {
      const savedHistory = safeJsonParse(window.localStorage.getItem(historyStorageKey(vendorId)));
      if (Array.isArray(savedHistory)) {
        setPickupHistory(savedHistory.slice(0, HISTORY_LIMIT));
      }
    } catch (_e) {}

    try {
      const savedAssigned = safeJsonParse(window.localStorage.getItem(assignedStorageKey(vendorId)));
      const legacyPickup = savedAssigned?.pickup || savedAssigned?.assignedPickup || null;
      const legacyStatus = savedAssigned?.status || savedAssigned?.assignedStatus || 'assigned';

      const pickups =
        savedAssigned?.pickups ||
        savedAssigned?.assignedPickups ||
        (legacyPickup ? [legacyPickup] : []);

      if (Array.isArray(pickups) && pickups.length) {
        const normalized = pickups.filter((p) => !!getPickupRequestId(p));
        if (normalized.length) {
          setAssignedPickups(normalized);

          const savedStatuses = savedAssigned?.statuses || savedAssigned?.pickupStatuses || null;
          if (savedStatuses && typeof savedStatuses === 'object') {
            setPickupStatuses(savedStatuses);
          } else if (legacyPickup) {
            const id = getPickupRequestId(legacyPickup);
            setPickupStatuses(id ? { [id]: legacyStatus } : {});
          }

          const savedSelected = savedAssigned?.selectedPickupId || null;
          setSelectedPickupId(savedSelected || getPickupRequestId(normalized[0]));
          return;
        }
      }
    } catch (_e) {}

    try {
      const savedOffer = safeJsonParse(window.localStorage.getItem(offerStorageKey(vendorId)));
      const offer = savedOffer?.offer || null;
      if (!offer) return;

      const expiryMs = computeOfferExpiryMs(offer, savedOffer?.saved_at);
      if (expiryMs && Date.now() > expiryMs) {
        try {
          window.localStorage.removeItem(offerStorageKey(vendorId));
        } catch (_e2) {}
        return;
      }

      setCurrentOffer(offer);
    } catch (_e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // Persist pickup history across reload.
  useEffect(() => {
    if (!vendorId) return;
    try {
      if (pickupHistory?.length) {
        window.localStorage.setItem(historyStorageKey(vendorId), JSON.stringify(pickupHistory.slice(0, HISTORY_LIMIT)));
      } else {
        window.localStorage.removeItem(historyStorageKey(vendorId));
      }
    } catch (_e) {}
  }, [vendorId, pickupHistory]);

  // Persist assigned pickups across reload.
  useEffect(() => {
    if (!vendorId) return;
    try {
      if (assignedPickups?.length) {
        window.localStorage.setItem(
          assignedStorageKey(vendorId),
          JSON.stringify({
            pickups: assignedPickups,
            statuses: pickupStatuses,
            selectedPickupId,
            saved_at: Date.now(),
          })
        );
      } else {
        window.localStorage.removeItem(assignedStorageKey(vendorId));
      }
    } catch (_e) {}
  }, [vendorId, assignedPickups, pickupStatuses, selectedPickupId]);

  // Persist current offer across reload (short TTL).
  useEffect(() => {
    if (!vendorId) return;
    try {
      if (currentOffer) {
        window.localStorage.setItem(
          offerStorageKey(vendorId),
          JSON.stringify({ offer: currentOffer, saved_at: Date.now() })
        );
      } else {
        window.localStorage.removeItem(offerStorageKey(vendorId));
      }
    } catch (_e) {}
  }, [vendorId, currentOffer]);

  useEffect(() => {
    if (!vendorId) return;
    if (!online) return;
    const url = `${API_BASE || ''}/api/vendor/events?vendor_id=${encodeURIComponent(vendorId)}`;
    let es;
    try {
      setSseStatus('connecting');
      es = new EventSource(url);
    } catch (e) {
      console.warn('EventSource not available', e);
      // Some mobile browsers/webviews don't support EventSource reliably.
      // We'll fall back to polling pending offers.
      setSseStatus('polling');
      return;
    }

    es.onopen = () => setSseStatus('connected');

    es.addEventListener('pickup_offer', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // Ensure we have a timestamp for reload persistence/expiry fallback.
        const withTimestamps = {
          ...data,
          received_at: data?.received_at || data?.receivedAt || new Date().toISOString(),
        };
        setCurrentOffer(withTimestamps);
      } catch (e) { console.error('Malformed offer', e); }
    });

    es.onerror = (err) => {
      console.warn('SSE error', err);
      setSseStatus('reconnecting');
      // reconnect logic could go here; EventSource auto-reconnects by default
    };

    return () => {
      try { es.close(); } catch (e) {}
    };
  }, [vendorId, online, API_BASE]);

  // If vendor opens pickup screen later, load any pending offers saved by the backend.
  useEffect(() => {
    if (!vendorId) return;
    if (!online) return;
    if (currentOffer) return;

    let cancelled = false;
    (async () => {
      try {
        const resp = await axios.get(`${API_BASE || ''}/api/vendor/pending-offers`, {
          params: { vendor_id: vendorId },
        });
        const offers = resp?.data?.offers;
        if (cancelled) return;
        if (Array.isArray(offers) && offers.length) {
          const first = offers[0];
          setCurrentOffer({
            ...first,
            received_at: first?.received_at || first?.receivedAt || new Date().toISOString(),
          });
        }
      } catch (_e) {
        // ignore; SSE will still work when connected
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [API_BASE, vendorId, online, currentOffer]);

  // Fallback: poll pending offers when SSE is not connected (helps on some phones/webviews).
  useEffect(() => {
    if (!vendorId) return;
    if (!online) return;

    const shouldPoll = sseStatus !== 'connected';
    if (!shouldPoll) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const resp = await axios.get(`${API_BASE || ''}/api/vendor/pending-offers`, {
          params: { vendor_id: vendorId },
        });
        if (cancelled) return;
        const offers = resp?.data?.offers;
        if (Array.isArray(offers) && offers.length && !currentOffer) {
          const first = offers[0];
          setCurrentOffer({
            ...first,
            received_at: first?.received_at || first?.receivedAt || new Date().toISOString(),
          });
        }
      } catch (_e) {
        // ignore
      }
    };

    const id = setInterval(tick, 10_000);
    tick();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [API_BASE, vendorId, online, sseStatus, currentOffer]);

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
        setOfferVisualState('accepted');
        const lat = Number(currentOffer?.latitude ?? currentOffer?.lat);
        const lng = Number(currentOffer?.longitude ?? currentOffer?.lng);
        const nextPickup = {
          request_id: requestId,
          scrap_type: currentOffer?.scrap_type ?? currentOffer?.scrapType ?? null,
          estimated_quantity: currentOffer?.estimated_quantity ?? currentOffer?.estimated_weight ?? null,
          latitude: Number.isFinite(lat) ? lat : null,
          longitude: Number.isFinite(lng) ? lng : null,
          assigned_at: Date.now(),
          raw: currentOffer,
        };

        setAssignedPickups((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          if (arr.some((p) => getPickupRequestId(p) === requestId)) return arr;
          return [nextPickup, ...arr];
        });
        setPickupStatuses((prev) => ({ ...(prev || {}), [requestId]: 'assigned' }));
        setSelectedPickupId(requestId);
        toast.success('Pickup accepted');
        setUiBanner({ type: 'assigned', at: Date.now() });
        offerVisualTimerRef.current = setTimeout(() => {
          closeOffer();
          setOfferVisualState(null);
        }, 700);
      } else {
        setOfferVisualState('rejected');
        toast('Pickup rejected');
        offerVisualTimerRef.current = setTimeout(() => {
          closeOffer();
          setOfferVisualState(null);
        }, 450);
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
    if (selectedAssignedPickup) {
      const id = getPickupRequestId(selectedAssignedPickup);
      if (id) {
        setPickupStatuses((prev) => {
          const cur = prev?.[id];
          if (cur === 'completed') return prev;
          return { ...(prev || {}), [id]: 'on_the_way' };
        });
      }
    }
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

  // Render assigned pickup markers (green)
  useEffect(() => {
    if (!MAP_ENABLED || !mapObj.current || !window.google) return;

    try {
      const markers = assignedMarkersRef.current;
      const currentIds = new Set((assignedPickups || []).map((p) => getPickupRequestId(p)).filter(Boolean));

      for (const [id, marker] of markers.entries()) {
        if (!currentIds.has(id)) {
          try { marker.setMap(null); } catch (_e) {}
          markers.delete(id);
        }
      }

      for (const pickup of assignedPickups || []) {
        const id = getPickupRequestId(pickup);
        if (!id) continue;
        const lat = Number(pickup?.latitude);
        const lng = Number(pickup?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        if (markers.has(id)) {
          try { markers.get(id).setPosition({ lat, lng }); } catch (_e) {}
          continue;
        }

        const marker = new window.google.maps.Marker({
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

        marker.addListener?.('click', () => {
          setSelectedPickupId(id);
        });

        markers.set(id, marker);
      }
    } catch (e) {
      console.warn('Failed to render assigned marker', e);
    }
  }, [assignedPickups, MAP_ENABLED]);

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

  const activePickup = selectedAssignedPickup || currentOffer || null;
  const activeMode = selectedAssignedPickup ? 'assigned' : currentOffer ? 'offer' : 'idle';

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
      {uiBanner ? (
        <div className="fixed top-16 left-1/2 z-50 -translate-x-1/2 w-[92%] max-w-md">
          <div className="scrapco-pop flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-lg">
            <CheckCircle2 className={`h-5 w-5 ${uiBanner.type === 'completed' ? 'text-emerald-600' : 'text-emerald-600'}`} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {uiBanner.type === 'completed' ? 'Pickup completed' : 'Pickup assigned'}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {uiBanner.type === 'completed' ? 'Great work. Saved to history.' : 'You can start navigation now.'}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button
          variant={pushEnabled ? 'secondary' : 'default'}
          className="rounded-xl active:scale-[0.98] transition-transform"
          onClick={async () => {
            try {
              const res = await ensurePushSubscription({ apiBase: API_BASE || '', vendorId });
              if (res?.enabled) {
                setPushEnabled(true);
                toast.success('Notifications enabled');
              } else {
                toast.error('Notifications not enabled');
              }
            } catch (e) {
              toast.error('Notifications failed: ' + (e?.response?.data?.error || e?.message || 'Unknown error'));
            }
          }}
        >
          {pushEnabled ? 'Notifications enabled' : 'Enable notifications'}
        </Button>
      </div>

      <PickupOfferDialog
        open={!!currentOffer}
        offer={currentOffer}
        areaLabel={locationLabel}
        vendorLoc={vendorLoc}
        online={online}
        pending={offerActionPending}
        secondsLeft={offerSecondsLeft}
        progress={offerProgress}
        visualState={offerVisualState}
        onAccept={() => sendOfferDecision('accept')}
        onReject={() => sendOfferDecision('reject')}
        onClose={closeOffer}
      />

      <VendorPickupHeader
        mode={activeMode}
        online={online}
        sseStatus={sseStatus}
        activeCount={assignedPickups?.length || 0}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-600">
          {pickupHistory?.length ? `History: ${pickupHistory.length}` : 'No history yet'}
        </div>
        <Button variant="secondary" className="rounded-xl active:scale-[0.98] transition-transform" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Hide history' : 'View history'}
        </Button>
      </div>

      {showHistory ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pickup history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pickupHistory || []).length ? (
              (pickupHistory || []).map((h) => (
                <div key={String(h?.request_id || h?.requestId || h?.id || h?.completed_at || Math.random())} className="rounded-md border p-3">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {String(h?.customer_name || h?.customerName || h?.name || h?.scrap_type || h?.scrapType || 'Pickup')}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {h?.completed_at ? new Date(h.completed_at).toLocaleString() : ''}
                        </div>
                      </div>
                      <div className="text-xs text-gray-700 text-right">
                        {formatRupees(h?.amount)}
                      </div>
                    </div>

                    <div className="text-xs text-gray-700">
                      <span className="font-semibold">Scrap:</span>{' '}
                      {String(h?.scrap_type || h?.scrapType || 'Unknown')}
                      {h?.estimated_quantity != null && h?.estimated_quantity !== '' ? ` • Qty: ${String(h.estimated_quantity)}` : ''}
                    </div>

                    {h?.address || h?.areaLabel || h?.locationLabel ? (
                      <div className="text-xs text-gray-600 truncate">
                        <span className="font-semibold">Address:</span>{' '}
                        {String(h?.address || h?.areaLabel || h?.locationLabel)}
                      </div>
                    ) : null}

                    <div className="text-[11px] text-gray-500 truncate">
                      ID: {String(h?.request_id || h?.requestId || h?.id || '-')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed bg-gray-50 p-3 text-sm text-gray-600">
                Completed pickups will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

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
                {mapState === 'loading' ? (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="pointer-events-auto max-w-[95%] rounded-md border bg-white/95 p-3 text-xs text-gray-700 shadow">
                      <div className="font-semibold">Loading map…</div>
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
          <div className="space-y-3">
            {(assignedPickups || []).length ? (
              (assignedPickups || []).map((pickup) => {
                const id = getPickupRequestId(pickup);
                const isSelected = !!id && id === selectedPickupId;
                const status = (id && pickupStatuses?.[id]) || 'assigned';
                const lat = Number(pickup?.latitude ?? pickup?.lat);
                const lng = Number(pickup?.longitude ?? pickup?.lng);

                return (
                  <div key={id || JSON.stringify(pickup)} className={isSelected ? '' : 'opacity-95'}>
                    <ActivePickupCard
                      mode="assigned"
                      pickup={pickup}
                      areaLabel={isSelected ? locationLabel : ''}
                      assignedStatus={status}
                      sseStatus={sseStatus}
                      online={online}
                      pending={offerActionPending}
                      onShowOnMap={() => {
                        if (id) setSelectedPickupId(id);
                        centerMapOn(lat, lng, 16);
                      }}
                      onDirections={() => {
                        if (id) setSelectedPickupId(id);
                        openDirections(lat, lng);
                      }}
                      onMarkOnTheWay={async () => {
                        if (!id) return;
                        if (!online) {
                          toast.error('You are offline.');
                          return;
                        }
                        setOfferActionPending(true);
                        try {
                          await axios.post(`${API_BASE || ''}/api/vendor/on-the-way`, {
                            vendor_id: vendorId,
                            request_id: id,
                          });
                          toast.success('Marked on the way');
                          setPickupStatuses((prev) => ({ ...(prev || {}), [id]: 'on_the_way' }));
                          setSelectedPickupId(id);
                        } catch (e) {
                          toast.error('On-the-way failed: ' + (e.response?.data?.error || e.message));
                        } finally {
                          setOfferActionPending(false);
                        }
                      }}
                      onComplete={async () => {
                        if (!id) return;
                        if (!confirm('Mark pickup as completed?')) return;
                        if (!online) {
                          toast.error('You are offline.');
                          return;
                        }
                        setOfferActionPending(true);
                        try {
                          const doPickupDone = () =>
                            axios.post(`${API_BASE || ''}/api/vendor/pickup-done`, {
                              vendor_id: vendorId,
                              request_id: id,
                            });

                          let resp;
                          try {
                            resp = await doPickupDone();
                          } catch (e1) {
                            const status = e1?.response?.status;
                            const msg = String(e1?.response?.data?.error || e1?.message || '');

                            // Common customer-backend rule: completion allowed only after on-the-way.
                            if (status === 409) {
                              try {
                                await axios.post(`${API_BASE || ''}/api/vendor/on-the-way`, {
                                  vendor_id: vendorId,
                                  request_id: id,
                                });
                                setPickupStatuses((prev) => ({ ...(prev || {}), [id]: 'on_the_way' }));
                              } catch (_e2) {
                                // ignore; still try completion
                              }

                              try {
                                resp = await doPickupDone();
                              } catch (e3) {
                                const msg2 = String(e3?.response?.data?.error || e3?.message || '');
                                throw new Error(
                                  msg2 ||
                                    msg ||
                                    'Pickup cannot be completed yet. It may not be assigned to this vendor or may require a different state.'
                                );
                              }
                            } else {
                              throw new Error(msg || 'Complete failed');
                            }
                          }
                          toast.success('Pickup marked completed');
                          setUiBanner({ type: 'completed', at: Date.now() });
                          setPickupStatuses((prev) => ({ ...(prev || {}), [id]: 'completed' }));

                          const raw = pickup?.raw || {};
                          const responseData = resp?.data || {};
                          const customerName =
                            raw?.customer_name || raw?.customerName || raw?.name ||
                            pickup?.customer_name || pickup?.customerName || pickup?.name ||
                            responseData?.customer_name || responseData?.customerName || responseData?.name ||
                            null;

                          const amount =
                            responseData?.amount ?? responseData?.total_amount ?? responseData?.totalAmount ??
                            raw?.amount ?? raw?.total_amount ?? raw?.totalAmount ??
                            null;

                          let address =
                            raw?.address || raw?.areaLabel || raw?.locationLabel ||
                            pickup?.address || pickup?.areaLabel || pickup?.locationLabel ||
                            null;

                          if (!address) {
                            try {
                              const lat2 = Number(pickup?.latitude ?? pickup?.lat);
                              const lng2 = Number(pickup?.longitude ?? pickup?.lng);
                              if (Number.isFinite(lat2) && Number.isFinite(lng2)) {
                                address = await reverseGeocodeLabel(lat2, lng2);
                              }
                            } catch (_e) {}
                          }

                          setPickupHistory((prev) => {
                            const arr = Array.isArray(prev) ? prev : [];
                            const entry = {
                              request_id: id,
                              customer_name: customerName,
                              amount,
                              address,
                              scrap_type: pickup?.scrap_type ?? pickup?.scrapType ?? null,
                              estimated_quantity:
                                pickup?.estimated_quantity ?? pickup?.estimated_qty ?? pickup?.estimated_weight ?? pickup?.estimatedWeight ?? null,
                              latitude: pickup?.latitude ?? pickup?.lat ?? null,
                              longitude: pickup?.longitude ?? pickup?.lng ?? null,
                              completed_at: new Date().toISOString(),
                            };
                            return [entry, ...arr].slice(0, HISTORY_LIMIT);
                          });
                          setAssignedPickups((prev) => (Array.isArray(prev) ? prev.filter((p) => getPickupRequestId(p) !== id) : []));
                        } catch (e) {
                          toast.error('Complete failed: ' + (e?.message || 'Unknown error'));
                        } finally {
                          setOfferActionPending(false);
                        }
                      }}
                    />
                  </div>
                );
              })
            ) : (
              <ActivePickupCard
                mode={activeMode}
                pickup={activePickup}
                areaLabel={locationLabel}
                assignedStatus={'assigned'}
                sseStatus={sseStatus}
                online={online}
                pending={offerActionPending}
                onShowOnMap={() => {
                  const lat = Number(activePickup?.latitude ?? activePickup?.lat);
                  const lng = Number(activePickup?.longitude ?? activePickup?.lng);
                  centerMapOn(lat, lng, 16);
                }}
                onDirections={() => openDirections(Number(activePickup?.latitude ?? activePickup?.lat), Number(activePickup?.longitude ?? activePickup?.lng))}
                onMarkOnTheWay={() => {}}
                onComplete={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
