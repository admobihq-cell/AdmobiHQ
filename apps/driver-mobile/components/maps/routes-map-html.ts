import {
  DEFAULT_BASEMAP,
  NAIROBI_CENTER,
  NAIROBI_DEFAULT_ZOOM,
  resolveBasemapStyleUrl,
  type BasemapId,
} from "@workspace/geo"

const CARTO_LIGHT =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const CARTO_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"

export function buildMapHtml(opts: {
  dark: boolean
  basemap?: BasemapId
}) {
  const basemap = opts.basemap ?? DEFAULT_BASEMAP
  const primaryStyle = resolveBasemapStyleUrl(basemap, opts.dark)
  const fallbackStyle = opts.dark ? CARTO_DARK : CARTO_LIGHT
  const pitch = basemap === "streets3d" ? 52 : 0
  const buildings = basemap === "streets3d"
  const bg = opts.dark ? "#111111" : "#faf9f7"

  const payload = JSON.stringify({
    center: NAIROBI_CENTER,
    zoom: NAIROBI_DEFAULT_ZOOM,
    pitch,
    buildings,
    styleUrl: primaryStyle,
    fallbackStyle,
  })

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${bg};
    }
    #map {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    (function () {
      if (!window.maplibregl) {
        document.body.innerHTML = '<p style="padding:16px;font:14px system-ui;color:#666">Map failed to load. Check your network connection.</p>';
        return;
      }

      var cfg = ${payload};
      var ready = false;
      var usedFallback = false;

      var map = new maplibregl.Map({
        container: 'map',
        style: cfg.styleUrl,
        center: cfg.center,
        zoom: cfg.zoom,
        pitch: cfg.pitch || 0,
        maxPitch: 68,
        attributionControl: true,
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: !!cfg.pitch }), 'bottom-right');

      function resize() {
        try { map.resize(); } catch (e) {}
      }

      function addBuildings() {
        if (!cfg.buildings) return;
        if (map.getLayer('admobi-3d-buildings')) return;
        var style = map.getStyle();
        if (!style || !style.sources) return;
        var sourceId = ['openmaptiles', 'carto'].find(function (id) {
          return !!style.sources[id];
        });
        if (!sourceId) return;
        try {
          map.addLayer({
            id: 'admobi-3d-buildings',
            source: sourceId,
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': ${opts.dark ? "'#4a4654'" : "'#c8c2b8'"},
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
              'fill-extrusion-opacity': 0.7
            }
          });
        } catch (err) {}
      }

      function onReady() {
        ready = true;
        resize();
        addBuildings();
      }

      map.on('load', onReady);
      map.on('style.load', function () {
        if (ready) addBuildings();
      });

      setTimeout(function () {
        if (ready || usedFallback) return;
        if (cfg.styleUrl === cfg.fallbackStyle) return;
        usedFallback = true;
        map.setStyle(cfg.fallbackStyle, { diff: false });
        map.once('load', onReady);
      }, 3500);

      setTimeout(resize, 150);
      setTimeout(resize, 600);
      window.addEventListener('resize', resize);
    })();
  </script>
</body>
</html>`
}
