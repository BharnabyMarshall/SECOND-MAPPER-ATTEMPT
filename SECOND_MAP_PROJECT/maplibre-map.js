// maplibre-map.js
// MapLibre GL JS map logic for animating between Point A and Point B

import 'https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js';

// Default flat style with customizable land/sea colors
const defaultStyle = {
  version: 8,
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://api.maptiler.com/tiles/v3/tiles.json?key=mTauVrXF22hFSJJ8MDcT"
    }
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#f8a800" // land color
      }
    },
    {
      id: "sea",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "fill-color": "#28384d"
      }
    },
    {
      id: "country-borders",
      type: "line",
      source: "openmaptiles",
      "source-layer": "admin",
      filter: ["==", "admin_level", 2],
      paint: {
        "line-color": "#000000",
        "line-opacity": 0.4,
        "line-width": 1
      }
    }
  ]
};

let map;
let pointA = null;
let pointB = null;

function initMap() {
  // Load the custom style JSON dynamically
  fetch('custom-style.json')
    .then(response => response.json())
    .then(style => {
      map = new maplibregl.Map({
        container: 'map',
        style: style,
        center: [0, 0],
        zoom: 2,
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
    });
}

function addMarker(coord, color) {
  return new maplibregl.Marker({ color })
    .setLngLat(coord)
    .addTo(map);
}

let markerA = null;
let markerB = null;

function setPoint(coord, which) {
  if (which === 'A') {
    pointA = coord;
    if (markerA) markerA.remove();
    markerA = addMarker(coord, '#ff3333');
  }
  if (which === 'B') {
    pointB = coord;
    if (markerB) markerB.remove();
    markerB = addMarker(coord, '#33aaff');
  }
}

function animatePan(from, to, duration = 2000) {
  if (!map) return;
  map.jumpTo({ center: from });
  map.flyTo({ center: to, duration });
}

function setMapColors(landColor = '#eaeaea', seaColor = '#aadaff') {
  if (!map) return;
  map.setPaintProperty('background', 'background-color', seaColor);
  // For full vector style, you would update land layers here if present
}

// Helper: Geocode using MapTiler API
async function geocode(query) {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=mTauVrXF22hFSJJ8MDcT`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.features || [];
}

window.initMap = initMap;
window.setPoint = setPoint;
window.animatePan = animatePan;
window.setMapColors = setMapColors;

// Connect UI controls
window.addEventListener('DOMContentLoaded', () => {
  fetch('custom-style.json')
    .then(response => response.json())
    .then(style => {
      map = new maplibregl.Map({
        container: 'map',
        style: style,
        center: [0, 0],
        zoom: 2,
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Point A search
      document.getElementById('searchA').onclick = async () => {
        const val = document.getElementById('pointA').value.trim();
        if (!val) return;
        const results = await geocode(val);
        const select = document.getElementById('resultsA');
        select.innerHTML = '';
        if (results.length === 0) {
          select.style.display = 'none';
          return;
        }
        results.forEach((f, i) => {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = f.place_name;
          select.appendChild(opt);
        });
        // Make sure the parent is positioned relatively for absolute dropdown
        select.parentElement.style.position = 'relative';
        select.size = Math.min(results.length, 5); // Show up to 5 results
        select.style.display = 'block';
        select.style.background = '#222';
        select.style.color = '#fff';
        select.style.border = '1px solid #888';
        select.style.position = 'absolute';
        select.style.zIndex = 2001;
        select.style.left = 0;
        select.style.top = select.parentElement.offsetHeight + 'px';
        select.style.width = '100%';
        select.onchange = () => {
          const idx = select.value;
          if (results[idx]) {
            setPoint(results[idx].center, 'A');
            map.flyTo({ center: results[idx].center, zoom: 8 });
            // Set the search box to the selected result's name
            document.getElementById('pointA').value = results[idx].place_name;
            select.style.display = 'none';
          }
        };
        // Auto-select first result
        setPoint(results[0].center, 'A');
        map.flyTo({ center: results[0].center, zoom: 8 });
      };

      // Point B search
      document.getElementById('searchB').onclick = async () => {
        const val = document.getElementById('pointB').value.trim();
        if (!val) return;
        const results = await geocode(val);
        const select = document.getElementById('resultsB');
        select.innerHTML = '';
        if (results.length === 0) {
          select.style.display = 'none';
          return;
        }
        results.forEach((f, i) => {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = f.place_name;
          select.appendChild(opt);
        });
        // Make sure the parent is positioned relatively for absolute dropdown
        select.parentElement.style.position = 'relative';
        select.size = Math.min(results.length, 5); // Show up to 5 results
        select.style.display = 'block';
        select.style.background = '#222';
        select.style.color = '#fff';
        select.style.border = '1px solid #888';
        select.style.position = 'absolute';
        select.style.zIndex = 2001;
        select.style.left = 0;
        select.style.top = select.parentElement.offsetHeight + 'px';
        select.style.width = '100%';
        select.onchange = () => {
          const idx = select.value;
          if (results[idx]) {
            setPoint(results[idx].center, 'B');
            map.flyTo({ center: results[idx].center, zoom: 8 });
            document.getElementById('pointB').value = results[idx].place_name;
            select.style.display = 'none';
          }
        };
        // Auto-select first result
        setPoint(results[0].center, 'B');
        map.flyTo({ center: results[0].center, zoom: 8 });
      };

      // Animate
      document.getElementById('animateBtn').onclick = () => {
        const animTime = parseFloat(document.getElementById('animTime').value) * 1000;
        if (pointA && pointB) {
          map.jumpTo({ center: pointA });
          map.flyTo({ center: pointB, duration: animTime });
        }
      };

      // Map click to set points
      map.on('click', (e) => {
        const which = document.getElementById('editA').checked ? 'A' : 'B';
        setPoint([e.lngLat.lng, e.lngLat.lat], which);
        if (which === 'A') document.getElementById('pointA').value = `${e.lngLat.lat.toFixed(5)},${e.lngLat.lng.toFixed(5)}`;
        if (which === 'B') document.getElementById('pointB').value = `${e.lngLat.lat.toFixed(5)},${e.lngLat.lng.toFixed(5)}`;
      });
    });
});
