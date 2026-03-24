import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Map as MapIcon, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/lib/mock-data';
import { statusConfig } from '@/lib/mock-data';
import { ChartCard } from './shared';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Swiss canton centers for approximate placement when no coordinates available
const CANTON_CENTERS: Record<string, [number, number]> = {
  ZH: [8.55, 47.37], BE: [7.45, 46.95], LU: [8.30, 47.05], UR: [8.64, 46.88],
  SZ: [8.65, 47.02], OW: [8.24, 46.87], NW: [8.38, 46.96], GL: [9.07, 47.04],
  ZG: [8.52, 47.17], FR: [7.16, 46.80], SO: [7.54, 47.21], BS: [7.59, 47.56],
  BL: [7.73, 47.44], SH: [8.64, 47.70], AR: [9.38, 47.38], AI: [9.41, 47.33],
  SG: [9.37, 47.42], GR: [9.53, 46.85], AG: [8.08, 47.39], TG: [9.05, 47.55],
  TI: [8.95, 46.20], VD: [6.63, 46.62], VS: [7.60, 46.23], NE: [6.93, 47.00],
  GE: [6.15, 46.20], JU: [7.09, 47.37],
};

// Status → map pin color
const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  appointment: '#10b981',
  follow_up: '#8b5cf6',
  hired: '#22c55e',
  rejected: '#ef4444',
};

// Swiss canton GeoJSON boundaries (simplified)
const CANTON_GEOJSON_URL = 'https://raw.githubusercontent.com/interactivethings/swiss-maps/master/topo/ch-cantons.json';

interface MapTabProps {
  filtered: Lead[];
  agencies: any[];
}

export default function MapTab({ filtered, agencies }: MapTabProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('mapbox-token');
        if (fnError) throw fnError;
        if (data?.token) {
          setMapToken(data.token);
        } else {
          setError('Mapbox Token nicht konfiguriert');
        }
      } catch (e) {
        console.error('Failed to fetch Mapbox token:', e);
        setError('Mapbox Token konnte nicht geladen werden');
      }
    };
    fetchToken();
  }, []);

  // Group leads by approximate location
  const leadPoints = useMemo(() => {
    return filtered
      .map(lead => {
        const cantonCode = lead.cantonCode || '';
        const center = CANTON_CENTERS[cantonCode];
        if (!center) return null;
        // Add slight random offset to prevent exact overlap
        const jitter = () => (Math.random() - 0.5) * 0.08;
        return {
          lng: center[0] + jitter(),
          lat: center[1] + jitter(),
          lead,
        };
      })
      .filter(Boolean) as { lng: number; lat: number; lead: Lead }[];
  }, [filtered]);

  // Agency canton mapping
  const agencyCantonMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    for (const agency of agencies) {
      for (const canton of agency.allowedCantons || []) {
        map[canton] = { name: agency.name, color: agency.color || '#6B7280' };
      }
    }
    return map;
  }, [agencies]);

  // Stats
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byCanton: Record<string, number> = {};
    for (const lead of filtered) {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      if (lead.cantonCode) byCanton[lead.cantonCode] = (byCanton[lead.cantonCode] || 0) + 1;
    }
    const topCanton = Object.entries(byCanton).sort((a, b) => b[1] - a[1])[0];
    return {
      totalWithLocation: leadPoints.length,
      totalWithout: filtered.length - leadPoints.length,
      byStatus,
      topCanton: topCanton ? { code: topCanton[0], count: topCanton[1] } : null,
      cantonCount: Object.keys(byCanton).length,
    };
  }, [filtered, leadPoints]);

  // Initialize map
  useEffect(() => {
    if (!mapToken || !mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [8.23, 46.82],
      zoom: 7.2,
      minZoom: 6,
      maxZoom: 14,
      maxBounds: [[5.5, 45.5], [11.0, 48.0]],
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setLoading(false);

      // Add canton boundaries as source
      // Use a simplified swiss boundary approach
      addAgencyTerritories(map);
      addLeadPins(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapToken]);

  // Update pins when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Update lead source
    const source = map.getSource('leads') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(buildLeadGeoJSON());
    }
  }, [leadPoints]);

  // Update agency territories when agencies change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('agency-territories') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(buildAgencyGeoJSON());
    }
  }, [agencyCantonMap]);

  function buildLeadGeoJSON(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: leadPoints.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          name: p.lead.name,
          status: p.lead.status,
          statusLabel: statusConfig[p.lead.status]?.label || p.lead.status,
          canton: p.lead.cantonCode,
          city: p.lead.city || '',
          color: STATUS_COLORS[p.lead.status] || '#6B7280',
        },
      })),
    };
  }

  function buildAgencyGeoJSON(): GeoJSON.FeatureCollection {
    // Create circle markers for each canton that has an agency assigned
    const features: GeoJSON.Feature[] = [];
    for (const [cantonCode, info] of Object.entries(agencyCantonMap)) {
      const center = CANTON_CENTERS[cantonCode];
      if (!center) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: {
          canton: cantonCode,
          agencyName: info.name,
          color: info.color,
        },
      });
    }
    return { type: 'FeatureCollection', features };
  }

  function addAgencyTerritories(map: mapboxgl.Map) {
    map.addSource('agency-territories', {
      type: 'geojson',
      data: buildAgencyGeoJSON(),
    });

    // Large translucent circles to represent agency territory
    map.addLayer({
      id: 'agency-territory-circles',
      type: 'circle',
      source: 'agency-territories',
      paint: {
        'circle-radius': 35,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.12,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.3,
      },
    });

    // Agency label
    map.addLayer({
      id: 'agency-territory-labels',
      type: 'symbol',
      source: 'agency-territories',
      layout: {
        'text-field': ['get', 'canton'],
        'text-size': 10,
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-offset': [0, 3],
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  function addLeadPins(map: mapboxgl.Map) {
    map.addSource('leads', {
      type: 'geojson',
      data: buildLeadGeoJSON(),
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 40,
    });

    // Cluster circles
    map.addLayer({
      id: 'lead-clusters',
      type: 'circle',
      source: 'leads',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'hsl(168, 17%, 23%)',
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.85,
      },
    });

    // Cluster count
    map.addLayer({
      id: 'lead-cluster-count',
      type: 'symbol',
      source: 'leads',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Individual lead pins
    map.addLayer({
      id: 'lead-pins',
      type: 'circle',
      source: 'leads',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 6,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // Popup on click
    map.on('click', 'lead-pins', (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties!;
      const coords = (e.features[0].geometry as any).coordinates.slice();
      new mapboxgl.Popup({ offset: 12, closeButton: false, maxWidth: '220px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family: system-ui; padding: 2px 0;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${props.name}</div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #666;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${props.color}; display: inline-block;"></span>
              ${props.statusLabel}
            </div>
            ${props.city ? `<div style="font-size: 11px; color: #888; margin-top: 2px;">${props.city} (${props.canton})</div>` : ''}
          </div>
        `)
        .addTo(map);
    });

    // Popup on agency territory click
    map.on('click', 'agency-territory-circles', (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties!;
      const coords = (e.features[0].geometry as any).coordinates.slice();
      const leadsInCanton = filtered.filter(l => l.cantonCode === props.canton).length;
      new mapboxgl.Popup({ offset: 12, closeButton: false, maxWidth: '220px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="font-family: system-ui; padding: 2px 0;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${props.agencyName}</div>
            <div style="font-size: 11px; color: #666;">Kanton ${props.canton} · ${leadsInCanton} Leads</div>
          </div>
        `)
        .addTo(map);
    });

    // Zoom into cluster on click
    map.on('click', 'lead-clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['lead-clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties!.cluster_id;
      (map.getSource('leads') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom!,
        });
      });
    });

    // Pointer cursor
    map.on('mouseenter', 'lead-pins', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'lead-pins', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'lead-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'lead-clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'agency-territory-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'agency-territory-circles', () => { map.getCanvas().style.cursor = ''; });
  }

  if (error) {
    return (
      <ChartCard title="Karte" subtitle="Lead-Verteilung und Agentur-Gebiete" icon={MapIcon}>
        <div className="flex items-center justify-center h-[500px] text-muted-foreground gap-2">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </ChartCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Leads auf Karte</p>
          <p className="text-xl font-bold mt-1">{stats.totalWithLocation}</p>
          {stats.totalWithout > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalWithout} ohne Standort</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Kantone abgedeckt</p>
          <p className="text-xl font-bold mt-1">{stats.cantonCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Top Kanton</p>
          <p className="text-xl font-bold mt-1">{stats.topCanton?.code || '–'}</p>
          {stats.topCanton && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.topCanton.count} Leads</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Agenturen</p>
          <p className="text-xl font-bold mt-1">{agencies.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{Object.keys(agencyCantonMap).length} Kantone zugewiesen</p>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5 pb-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <MapIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-semibold">Lead-Verteilung Schweiz</h3>
            <p className="text-[10px] text-muted-foreground">Status-kodierte Pins und Agentur-Zuständigkeitsgebiete</p>
          </div>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Karte wird geladen…</span>
              </div>
            </div>
          )}
          <div ref={mapContainer} className="h-[520px] w-full" />
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t bg-muted/30">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status:</span>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[key] }} />
                {cfg.label}
                {stats.byStatus[key] ? <span className="font-semibold text-foreground">({stats.byStatus[key]})</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
