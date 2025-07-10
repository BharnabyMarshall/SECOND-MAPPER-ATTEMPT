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
  // Create a container for label and dot
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.pointerEvents = 'none';

  if (color && typeof color === 'string') {
    // Not used, but kept for compatibility
  }

  if (arguments.length > 2 && arguments[2]) {
    const labelDiv = document.createElement('div');
    labelDiv.textContent = arguments[2];
    labelDiv.style.fontSize = '13px';
    labelDiv.style.fontWeight = 'bold';
    labelDiv.style.color = '#fff';
    labelDiv.style.background = '#026473';
    labelDiv.style.padding = '2px 6px';
    labelDiv.style.borderRadius = '0';
    labelDiv.style.marginBottom = '0';
    labelDiv.style.whiteSpace = 'nowrap';
    labelDiv.style.boxShadow = '0 1px 4px #0002';
    labelDiv.style.position = 'relative';
    // Triangle pointer
    const triangle = document.createElement('div');
    triangle.style.position = 'absolute';
    triangle.style.left = '50%';
    triangle.style.bottom = '-12px';
    triangle.style.transform = 'translateX(-50%)';
    triangle.style.width = '0';
    triangle.style.height = '0';
    triangle.style.borderLeft = '12px solid transparent';
    triangle.style.borderRight = '12px solid transparent';
    triangle.style.borderTop = '12px solid #026473';
    labelDiv.appendChild(triangle);
    container.appendChild(labelDiv);
    labelDiv.style.marginBottom = '2px'; // visually separate from dot
  }

  const el = document.createElement('div');
  el.style.width = '16px';
  el.style.height = '16px';
  el.style.background = '#fff';
  el.style.borderRadius = '50%';
  el.style.boxSizing = 'border-box';
  container.appendChild(el);

  return new maplibregl.Marker({ element: container })
    .setLngLat(coord)
    .addTo(map);
}


let markerA = null;
let markerB = null;
let labelA = '';
let labelB = '';

function setPoint(coord, which) {
  if (which === 'A') {
    pointA = coord;
    if (arguments.length > 2 && arguments[2]) labelA = arguments[2];
    if (markerA) markerA.remove();
    markerA = addMarker(coord, '#ff3333', labelA);
  }
  if (which === 'B') {
    pointB = coord;
    if (arguments.length > 2 && arguments[2]) labelB = arguments[2];
    if (markerB) markerB.remove();
    markerB = addMarker(coord, '#33aaff', labelB);
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
        // Add a prompt option
        const promptOpt = document.createElement('option');
        promptOpt.value = '';
        promptOpt.textContent = 'Please Choose...';
        promptOpt.disabled = true;
        promptOpt.selected = true;
        select.appendChild(promptOpt);
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
            setPoint(results[idx].center, 'A', results[idx].place_name);
            map.flyTo({ center: results[idx].center, zoom: 8 });
            // Set the search box to the selected result's name
            document.getElementById('pointA').value = results[idx].place_name;
          }
          select.style.display = 'none';
        };
        // Do not auto-select first result; require user to choose
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
        // Add a prompt option
        const promptOpt = document.createElement('option');
        promptOpt.value = '';
        promptOpt.textContent = 'Please Choose...';
        promptOpt.disabled = true;
        promptOpt.selected = true;
        select.appendChild(promptOpt);
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
            setPoint(results[idx].center, 'B', results[idx].place_name);
            map.flyTo({ center: results[idx].center, zoom: 8 });
            document.getElementById('pointB').value = results[idx].place_name;
          }
          select.style.display = 'none';
        };
        // Do not auto-select first result; require user to choose
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
        const coords = [e.lngLat.lng, e.lngLat.lat];
        const label = `${e.lngLat.lat.toFixed(5)},${e.lngLat.lng.toFixed(5)}`;
        setPoint(coords, which, label);
        if (which === 'A') document.getElementById('pointA').value = label;
        if (which === 'B') document.getElementById('pointB').value = label;
      });
    });
});
