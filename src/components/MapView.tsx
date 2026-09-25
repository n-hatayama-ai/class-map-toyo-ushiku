import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { JuniorHighSchool, HighSchoolInfo, GradeFilter } from '../types';
import { Layers, Navigation, Maximize2 } from 'lucide-react';
import { countForGrade } from '../utils/counts';

// Escapes user-supplied text (from uploaded Excel/CSV) before it is interpolated
// into Leaflet tooltip/popup HTML strings, to prevent stored XSS.
const escapeHtml = (value: unknown): string => {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
};

interface MapViewProps {
  highSchool: HighSchoolInfo;
  schools: JuniorHighSchool[];
  selectedSchool: JuniorHighSchool | null;
  onSelectSchool: (school: JuniorHighSchool) => void;
  gradeFilter: GradeFilter;
  highlightedSchoolId?: string | null;
  // Increments on every pinpoint click, including repeat clicks on the
  // school that's already highlighted, so the panTo effect below always
  // re-runs even when highlightedSchoolId itself doesn't change.
  pinpointRequestId?: number;
}

export const MapView: React.FC<MapViewProps> = ({
  highSchool,
  schools,
  selectedSchool,
  onSelectSchool,
  gradeFilter,
  highlightedSchoolId,
  pinpointRequestId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.CircleMarker>>(new Map());
  // Read by the pinpoint effect without making it depend on `schools`:
  // otherwise every filter/search change would re-fly the map to the last
  // pinpointed school and scroll the page.
  const schoolsRef = useRef(schools);
  schoolsRef.current = schools;

  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [mapStyle, setMapStyle] = useState<'gsi-pale' | 'gsi-std' | 'osm-jp'>('gsi-pale');

  // Tile layer reference
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map centered near Ushiku / Southern Ibaraki
    const map = L.map(mapContainerRef.current, {
      center: [highSchool.lat, highSchool.lng],
      zoom: 11,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false,
    });

    // Add zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer: 国土地理院 淡色地図 (100%日本語・APIキー不要・データ重ね合わせ最適)
    const initialTileUrl = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
    const tile = L.tileLayer(initialTileUrl, {
      attribution:
        '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>',
      maxZoom: 18,
    }).addTo(map);

    tileLayerRef.current = tile;

    // Layer groups for markers and rings
    const circlesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    circlesLayerRef.current = circlesLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // High School Main Campus Marker
    const highSchoolIcon = L.divIcon({
      className: 'custom-hs-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-amber-500/30 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center shadow-lg text-amber-300">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </div>
          <div class="absolute top-9 whitespace-nowrap bg-slate-900/90 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded shadow border border-amber-500/40">
            東洋大牛久高校
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const hsMarker = L.marker([highSchool.lat, highSchool.lng], {
      icon: highSchoolIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    hsMarker.bindPopup(`
      <div class="p-2 text-slate-800">
        <div class="font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-1">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          ${highSchool.name}
        </div>
        <p class="text-xs text-slate-600 mb-1.5">${highSchool.address}</p>
        <p class="text-xs text-slate-500 leading-relaxed">${highSchool.description}</p>
      </div>
    `);

    // Keep Leaflet's cached size in sync with layout changes (view switches,
    // window resizes, the mobile address bar collapsing, etc.).
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [highSchool]);

  // Update Tile Layer when style changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    let newUrl = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
    let attribution =
      '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>';

    if (mapStyle === 'gsi-std') {
      newUrl = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';
      attribution =
        '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>';
    } else if (mapStyle === 'osm-jp') {
      newUrl = 'https://tile.openstreetmap.jp/{z}/{x}/{y}.png';
      attribution =
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, <a href="https://openstreetmap.jp" target="_blank" rel="noreferrer">OSM Japan</a>';
    }

    const newTile = L.tileLayer(newUrl, { attribution, maxZoom: 18 }).addTo(
      mapInstanceRef.current
    );
    tileLayerRef.current = newTile;
  }, [mapStyle]);

  // Update Distance Rings
  useEffect(() => {
    if (!circlesLayerRef.current) return;
    circlesLayerRef.current.clearLayers();

    if (!showDistanceRings) return;

    const radii = [
      { km: 5, color: '#0284c7', label: '5km圏' },
      { km: 10, color: '#0d9488', label: '10km圏' },
      { km: 15, color: '#f59e0b', label: '15km圏' },
      { km: 20, color: '#e11d48', label: '20km圏' },
      { km: 30, color: '#7c3aed', label: '30km圏' },
    ];

    radii.forEach((r) => {
      const circle = L.circle([highSchool.lat, highSchool.lng], {
        radius: r.km * 1000,
        color: r.color,
        weight: 1.2,
        dashArray: '4, 6',
        fill: false,
        opacity: 0.7,
        // Rings are decoration only; they must not swallow clicks meant for
        // the school markers underneath.
        interactive: false,
      });
      circlesLayerRef.current?.addLayer(circle);

      // Label at north edge of circle
      const latOffset = (r.km / 111.0); // ~111km per latitude degree
      const labelMarker = L.marker([highSchool.lat + latOffset, highSchool.lng], {
        interactive: false,
        icon: L.divIcon({
          className: 'custom-ring-label',
          html: `<div class="whitespace-nowrap text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/90 text-slate-700 shadow-xs border border-slate-200 pointer-events-none -translate-x-1/2 -translate-y-1/2">${r.label}</div>`,
          iconSize: [40, 16],
          iconAnchor: [20, 8],
        }),
      });
      circlesLayerRef.current?.addLayer(labelMarker);
    });
  }, [showDistanceRings, highSchool]);

  // Update Junior High School Markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    markersMapRef.current.clear();

    schools.forEach((s) => {
      // Calculate active student count based on grade filter
      const count = countForGrade(s, gradeFilter);

      if (count <= 0) return;

      // Color based on student volume
      let fillColor = '#3b82f6'; // 1-4
      let strokeColor = '#1d4ed8';
      if (count >= 20) {
        fillColor = '#ef4444'; // 20+
        strokeColor = '#b91c1c';
      } else if (count >= 10) {
        fillColor = '#f97316'; // 10-19
        strokeColor = '#c2410c';
      } else if (count >= 5) {
        fillColor = '#eab308'; // 5-9
        strokeColor = '#a16207';
      }

      // Radius scaled mathematically: 6px to 22px
      const radius = Math.max(6, Math.min(22, 6 + Math.sqrt(count) * 2.2));

      const circle = L.circleMarker([s.lat, s.lng], {
        radius,
        fillColor,
        color: strokeColor,
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75,
        dashArray: s.geoEstimated ? '3, 3' : undefined,
      });

      // Tooltip for quick hover preview
      circle.bindTooltip(
        `<strong>${escapeHtml(s.name)}</strong> (${escapeHtml(s.city)})<br/>在籍生徒数: <strong>${count}名</strong> (本校まで ${s.distanceKm}km)`,
        { direction: 'top', offset: [0, -radius] }
      );

      // Popup with rich information
      const popupHtml = `
        <div class="p-2.5 min-w-[220px] text-slate-800 text-xs">
          <div class="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
            <div>
              <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                ${escapeHtml(s.prefecture)} ${escapeHtml(s.city)}
              </span>
              <h4 class="font-bold text-sm text-slate-900 mt-1 leading-snug">${escapeHtml(s.name)}</h4>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block">順位</span>
              <span class="font-bold text-amber-600 text-sm">#${s.rank}</span>
            </div>
          </div>
          ${
            s.geoEstimated
              ? '<div class="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-1 mb-2">位置データ未登録のため、地図上の位置と距離は仮のものです</div>'
              : ''
          }

          <div class="grid grid-cols-2 gap-2 mb-2 bg-slate-50 p-2 rounded border border-slate-200/80">
            <div>
              <span class="text-slate-500 block text-[10px]">${gradeFilter === 'all' ? '合計在籍数' : `${gradeFilter}年生の在籍数`}</span>
              <span class="text-base font-bold text-slate-900">${count}</span>
              <span class="text-slate-500 text-[10px] ml-0.5">名</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px]">本校からの直線距離</span>
              <span class="text-sm font-semibold text-slate-700">${s.distanceKm} km</span>
              <span class="text-[10px] text-slate-400 block">${s.bearing}方向</span>
            </div>
          </div>

          <!-- Grade breakdown bars -->
          <div class="space-y-1 mb-2.5">
            <span class="text-[10px] font-medium text-slate-500 block">学年別内訳</span>
            <div class="flex items-center text-[11px]">
              <span class="w-8 text-slate-500">1年:</span>
              <div class="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden mr-2">
                <div class="bg-emerald-500 h-full rounded-full" style="width: ${Math.min(100, (s.grade1Count / Math.max(1, s.totalCount)) * 100)}%"></div>
              </div>
              <span class="font-semibold text-slate-800 w-5 text-right">${s.grade1Count}</span>
            </div>
            <div class="flex items-center text-[11px]">
              <span class="w-8 text-slate-500">2年:</span>
              <div class="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden mr-2">
                <div class="bg-sky-500 h-full rounded-full" style="width: ${Math.min(100, (s.grade2Count / Math.max(1, s.totalCount)) * 100)}%"></div>
              </div>
              <span class="font-semibold text-slate-800 w-5 text-right">${s.grade2Count}</span>
            </div>
            <div class="flex items-center text-[11px]">
              <span class="w-8 text-slate-500">3年:</span>
              <div class="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden mr-2">
                <div class="bg-indigo-500 h-full rounded-full" style="width: ${Math.min(100, (s.grade3Count / Math.max(1, s.totalCount)) * 100)}%"></div>
              </div>
              <span class="font-semibold text-slate-800 w-5 text-right">${s.grade3Count}</span>
            </div>
          </div>

          <div class="text-[10px] text-slate-500 mb-2">
            主要コース: <span class="font-medium text-slate-700">${escapeHtml(s.primaryCourse)}</span>
          </div>

          <button id="popup-detail-btn-${s.id}" class="w-full py-1 text-center bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition cursor-pointer">
            詳細内訳を見る
          </button>
        </div>
      `;

      // autoPan disabled: opening this popup after a pinpoint flyTo would
      // otherwise re-pan the map to fit the popup, undoing the centering
      // and leaving the selected school off-center.
      circle.bindPopup(popupHtml, { autoPan: false });

      circle.on('popupopen', () => {
        const btn = document.getElementById(`popup-detail-btn-${s.id}`);
        if (btn) {
          btn.onclick = () => onSelectSchool(s);
        }
      });

      markersLayerRef.current?.addLayer(circle);
      markersMapRef.current.set(s.id, circle);
    });
  }, [schools, gradeFilter, onSelectSchool]);

  // Handle selected or highlighted school panTo
  useEffect(() => {
    if (!highlightedSchoolId || !mapInstanceRef.current) return;
    const targetSchool = schoolsRef.current.find((s) => s.id === highlightedSchoolId);
    if (!targetSchool) return;

    // Pinpointing from table view remounts MapView (it's absent from the DOM
    // in table-only mode), so this effect can run before the map's
    // ResizeObserver has reported the container's real size. flyTo would then center against
    // a stale/incorrect container size, leaving the target visibly off-center
    // once the map settles. Force a synchronous resize check first.
    mapInstanceRef.current.invalidateSize();

    // In split view the map column has no fixed height (h-auto) and can be
    // taller than the browser viewport, so flyTo's target is centered inside
    // the full container but only part of it may be visible on screen —
    // making the pin look off-center even though it's centered in the DOM
    // element. scrollIntoView's own "center" ignores the app's sticky
    // navbar + filter bar, which permanently occlude a strip at the top of
    // the viewport, so it undershoots and leaves the marker too high (or
    // even hidden behind the sticky header). Center against the space that
    // is actually visible below the sticky header instead.
    const container = mapContainerRef.current;
    if (container) {
      const stickyHeight =
        (document.querySelector('header')?.getBoundingClientRect().height ?? 0) +
        (document.getElementById('filter-bar-sticky')?.getBoundingClientRect().height ?? 0);
      const rect = container.getBoundingClientRect();
      const containerCenterDocY = rect.top + window.scrollY + rect.height / 2;
      const visibleAreaCenterY = stickyHeight + (window.innerHeight - stickyHeight) / 2;
      window.scrollTo({
        top: Math.max(0, containerCenterDocY - visibleAreaCenterY),
        behavior: 'smooth',
      });
    }

    mapInstanceRef.current.flyTo([targetSchool.lat, targetSchool.lng], 13, {
      duration: 0.8,
    });

    const marker = markersMapRef.current.get(targetSchool.id);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();

        // The popup opens above the marker and its height varies with
        // content, so centering the marker alone doesn't guarantee the
        // popup's own top (with its × close button) clears the sticky
        // header. Nudge the scroll up a little more if it's still clipped.
        requestAnimationFrame(() => {
          const popupEl = marker.getPopup()?.getElement();
          const stickyBottom = document.getElementById('filter-bar-sticky')?.getBoundingClientRect().bottom;
          if (popupEl && stickyBottom !== undefined) {
            const overlap = stickyBottom - popupEl.getBoundingClientRect().top;
            if (overlap > 0) {
              window.scrollBy({ top: -(overlap + 12), behavior: 'smooth' });
            }
          }
        });
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see schoolsRef
  }, [highlightedSchoolId, pinpointRequestId]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([highSchool.lat, highSchool.lng], 11, {
      duration: 0.6,
    });
  };

  const handleFitAll = () => {
    // Far-away one-offs (e.g. a Japanese school overseas) would zoom the map
    // out to a whole continent, so only the commuting area is fitted.
    const nearby = schools.filter((s) => s.distanceKm <= 100);
    if (!mapInstanceRef.current || nearby.length === 0) return;
    const bounds = L.latLngBounds(nearby.map((s) => [s.lat, s.lng]));
    bounds.extend([highSchool.lat, highSchool.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div className="relative w-full h-full min-h-[380px] sm:min-h-[420px] rounded-xl overflow-hidden shadow-xs border border-slate-200 bg-slate-100 flex flex-col">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full flex-1 z-10" />

      {/* Floating Map Controls & Overlays */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex items-center space-x-1.5 sm:space-x-2">
        {/* Recenter button */}
        <button
          id="map-recenter-btn"
          onClick={handleRecenter}
          className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-white/95 hover:bg-white text-slate-800 rounded-lg shadow-sm border border-slate-200/80 text-xs font-semibold backdrop-blur-xs transition touch-manipulation min-h-[34px]"
          title="東洋大牛久高校を中心に表示"
        >
          <Navigation className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>本校中心</span>
        </button>

        {/* Fit all schools button */}
        <button
          id="map-fit-all-btn"
          onClick={handleFitAll}
          className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-white/95 hover:bg-white text-slate-800 rounded-lg shadow-sm border border-slate-200/80 text-xs font-semibold backdrop-blur-xs transition touch-manipulation min-h-[34px]"
          title="通学圏（本校から100km以内）の中学校が収まるように表示"
        >
          <Maximize2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>全体表示</span>
        </button>
      </div>

      {/* Bottom Map Controls: Layer & Ring Toggles */}
      <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2 bg-white/95 p-1.5 rounded-lg shadow-sm border border-slate-200 text-xs backdrop-blur-xs max-w-[calc(100%-20px)] sm:max-w-none">
        {/* Distance ring toggle */}
        <label className="flex items-center space-x-1.5 px-1.5 py-1 hover:bg-slate-100 rounded cursor-pointer select-none touch-manipulation">
          <input
            type="checkbox"
            checked={showDistanceRings}
            onChange={(e) => setShowDistanceRings(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
          />
          <span className="text-slate-700 font-medium text-[11px]">同心円 (5〜30km)</span>
        </label>

        <span className="text-slate-300 hidden sm:inline">|</span>

        {/* Basemap switcher */}
        <div className="flex items-center space-x-1 pl-1">
          <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            id="map-style-select"
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as 'gsi-pale' | 'gsi-std' | 'osm-jp')}
            className="bg-transparent text-[11px] font-medium text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer pr-1"
            title="地図スタイルの切り替え（国土地理院地図・日本語OSM）"
          >
            <option value="gsi-pale">地理院 淡色地図</option>
            <option value="gsi-std">地理院 標準地図</option>
            <option value="osm-jp">OSM 日本語</option>
          </select>
        </div>
      </div>

      {/* Map Legend (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-20 bg-white/95 px-3 py-2 rounded-lg shadow-sm border border-slate-200 text-[11px] backdrop-blur-xs pointer-events-none hidden sm:block">
        <span className="font-bold text-slate-800 block text-[10px] mb-1">在籍生徒数</span>
        <div className="flex items-center space-x-2 text-slate-600">
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-red-700 inline-block"></span>
            <span>20名+</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-700 inline-block"></span>
            <span>10〜19名</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 border border-amber-700 inline-block"></span>
            <span>5〜9名</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 border border-blue-700 inline-block"></span>
            <span>1〜4名</span>
          </div>
        </div>
      </div>
    </div>
  );
};
