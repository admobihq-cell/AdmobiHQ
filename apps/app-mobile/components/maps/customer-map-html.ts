import {
  COVERAGE_ZONES,
  NAIROBI_CENTER,
  NAIROBI_DEFAULT_ZOOM,
  getCustomerBookedCorridors,
  getCustomerPlayPoints,
  type Corridor,
} from "@workspace/geo"

import type { MapLayerKey } from "@/components/maps/customer-map-header"

export function corridorsToGeoJSON(corridors: Corridor[]) {
  return {
    type: "FeatureCollection" as const,
    features: corridors.map((corridor) => ({
      type: "Feature" as const,
      id: corridor.id,
      properties: {
        id: corridor.id,
        name: corridor.name,
        color: corridor.color,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: corridor.coordinates,
      },
    })),
  }
}

export function getCustomerMapData() {
  const corridors = getCustomerBookedCorridors()
  return {
    corridors,
    corridorGeo: corridorsToGeoJSON(corridors),
    plays: getCustomerPlayPoints(),
    coverage: COVERAGE_ZONES,
  }
}

export function buildMapHtml(opts: {
  dark: boolean
  layers: Record<MapLayerKey, boolean>
  corridors: ReturnType<typeof corridorsToGeoJSON>
  coverage: typeof COVERAGE_ZONES
  plays: ReturnType<typeof getCustomerPlayPoints>
}) {
  const styleUrl = opts.dark
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

  const payload = JSON.stringify({
    center: NAIROBI_CENTER,
    zoom: NAIROBI_DEFAULT_ZOOM,
    styleUrl,
    layers: opts.layers,
    corridors: opts.corridors,
    coverage: opts.coverage,
    plays: opts.plays,
  })

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    html, body, #map { margin: 0; height: 100%; width: 100%; background: ${opts.dark ? "#111" : "#faf9f7"}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    const cfg = ${payload};
    const map = new maplibregl.Map({
      container: 'map',
      style: cfg.styleUrl,
      center: cfg.center,
      zoom: cfg.zoom,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('load', () => {
      if (cfg.layers.coverage) {
        map.addSource('coverage', { type: 'geojson', data: cfg.coverage });
        map.addLayer({
          id: 'coverage-fill',
          type: 'fill',
          source: 'coverage',
          paint: {
            'fill-color': [
              'match', ['get', 'kind'],
              'cbd', '#0F766E',
              'estate', '#C2410C',
              'arterial', '#1D4ED8',
              '#64748B'
            ],
            'fill-opacity': 0.22
          }
        });
        map.addLayer({
          id: 'coverage-line',
          type: 'line',
          source: 'coverage',
          paint: { 'line-color': '#0F766E', 'line-width': 1.5, 'line-opacity': 0.55 }
        });
      }
      if (cfg.layers.corridors) {
        map.addSource('corridors', { type: 'geojson', data: cfg.corridors });
        map.addLayer({
          id: 'corridors-line',
          type: 'line',
          source: 'corridors',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 4,
            'line-opacity': 0.9
          }
        });
      }
      if (cfg.layers.plays) {
        map.addSource('plays', {
          type: 'geojson',
          data: cfg.plays,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });
        map.addLayer({
          id: 'plays-clusters',
          type: 'circle',
          source: 'plays',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step', ['get', 'point_count'],
              '#0F766E', 5, '#C2410C', 15, '#9A3412'
            ],
            'circle-radius': [
              'step', ['get', 'point_count'],
              16, 5, 20, 15, 26
            ],
            'circle-opacity': 0.85
          }
        });
        map.addLayer({
          id: 'plays-points',
          type: 'circle',
          source: 'plays',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#0F766E',
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      }
    });
  </script>
</body>
</html>`
}
