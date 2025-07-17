// Helper to re-add markerA on every map move
function keepMarkerAInSync() {
  if (markerA && pointA) {
    markerA.setLngLat(pointA);
  }
}
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

// Available map styles
const mapStyles = {
  positron: 'positron.json',
  snazzy: 'snazzy-style.json',
  google: 'google-style.json',
  satellite: 'google-satellite-style.json',
  'esri-satellite': 'esri-satellite-style.json',
  'cached-satellite': 'google-satellite-cached-style.json'
};

let map;
let pointA = null;
let pointB = null;

// Simple Zoom state
let simpleZoomTarget = null;
let simpleZoomLevel = 8;
const simpleZoomOutSteps = 2;

function initMap() {
  // Load the positron style JSON dynamically
  fetch('positron.json')
    .then(response => response.json())
    .then(style => {
      map = new maplibregl.Map({
        container: 'map',
        style: style,
        // Center on Northern Europe (approximate: longitude 15, latitude 60)
        center: [15, 60],
        zoom: 2.5, // Zoomed out by about 2 steps from previous default
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // --- Ensure Simple Zoom end zoom is always updated on zoom change ---
      let lastZoomSetByUser = null;
      let ignoreNextZoomend = false;
      map.on('zoomstart', () => {
        if (modeSimpleZoom.checked && simpleZoomTarget) {
          lastZoomSetByUser = map.getZoom();
        }
      });
      map.on('zoomend', () => {
        if (modeSimpleZoom.checked && simpleZoomTarget) {
          // Only update if not triggered by animation
          if (!ignoreNextZoomend) {
            simpleZoomLevel = map.getZoom();
          }
          ignoreNextZoomend = false;
        }
      });

      // Helper for Simple Zoom: always use the saved zoom, not the current map zoom
      function getSimpleZoomStart() {
        // Always use the last user-set zoom, not the current map zoom
        return simpleZoomLevel - simpleZoomOutSteps;
      }

      // No vignette or overlay added
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
    // Always show uppercase, use custom font if available
    labelDiv.textContent = String(arguments[2]).toUpperCase();
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
    labelDiv.style.fontFamily = "ITV Reem Avid, Montserrat, Arial, sans-serif";
    labelDiv.style.letterSpacing = '0.5px';
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

// Function to change map style
async function changeMapStyle(styleKey) {
  console.log('changeMapStyle called with:', styleKey); // Debug log
  if (!map || !mapStyles[styleKey]) {
    console.error('Map not ready or style not found:', { map: !!map, styleKey, mapStyles });
    return;
  }
  
  // Store current map state
  const center = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();
  
  try {
    console.log('Fetching style:', mapStyles[styleKey]); // Debug log
    // Fetch and apply new style
    const response = await fetch(mapStyles[styleKey]);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const style = await response.json();
    
    console.log('Setting style on map'); // Debug log
    map.setStyle(style);
    
    // Wait for style to load, then restore map state and markers
    map.once('style.load', () => {
      console.log('Style loaded, restoring state'); // Debug log
      map.jumpTo({
        center: center,
        zoom: zoom,
        bearing: bearing,
        pitch: pitch
      });
      
      // Re-add markers if they exist
      if (pointA && markerA) {
        markerA.remove();
        markerA = addMarker(pointA, '#ff3333', labelA);
      }
      if (pointB && markerB) {
        markerB.remove();
        markerB = addMarker(pointB, '#33aaff', labelB);
      }
    });
  } catch (error) {
    console.error('Error loading map style:', error);
  }
}

// Helper: Geocode using MapTiler API
async function geocode(query) {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=Ku1lF67CbFiT0fC3NUzQ`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.features || [];
}

window.initMap = initMap;
window.setPoint = setPoint;
window.animatePan = animatePan;
window.setMapColors = setMapColors;
window.changeMapStyle = changeMapStyle;

// Connect UI controls
window.addEventListener('DOMContentLoaded', () => {
  // Animation mode radio buttons
  const modePointToPoint = document.getElementById('modePointToPoint');
  const modeSimpleZoom = document.getElementById('modeSimpleZoom');
  const rowPointB = document.getElementById('pointB').closest('.row');

  // Animate and CUE buttons
  const animateBtn = document.getElementById('animateBtn');
  const cueBtn = document.getElementById('cueBtn');

  function updateAnimModeUI() {
    if (modeSimpleZoom.checked) {
      // Hide Point B row and marker
      rowPointB.style.display = 'none';
      if (markerB) { markerB.remove(); markerB = null; labelB = ''; pointB = null; }
    } else {
      rowPointB.style.display = '';
    }
    // In both modes, disable Animate until CUE is pressed
    animateBtn.disabled = true;
  }
  modePointToPoint.addEventListener('change', updateAnimModeUI);
  modeSimpleZoom.addEventListener('change', updateAnimModeUI);
  updateAnimModeUI();
  fetch('positron.json')
    .then(response => response.json())
    .then(style => {
      map = new maplibregl.Map({
        container: 'map',
        style: style,
        // Center on Northern Europe (approximate: longitude 15, latitude 60)
        center: [15, 60],
        zoom: 4.5,
        attributionControl: false
      });
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      // Keep Point A marker in sync during map moves
      map.on('move', keepMarkerAInSync);

      // --- Ensure Simple Zoom end zoom is always updated on zoom change ---
      let lastZoomSetByUser = null;
      let ignoreNextZoomend = false;
      map.on('zoomstart', () => {
        if (modeSimpleZoom.checked && simpleZoomTarget) {
          lastZoomSetByUser = map.getZoom();
        }
      });
      map.on('zoomend', () => {
        if (modeSimpleZoom.checked && simpleZoomTarget) {
          // Only update if not triggered by animation
          if (!ignoreNextZoomend) {
            simpleZoomLevel = map.getZoom();
          }
          ignoreNextZoomend = false;
        }
      });

      // Helper for Simple Zoom: always use the saved zoom, not the current map zoom
      function getSimpleZoomStart() {
        // Always use the last user-set zoom, not the current map zoom
        return simpleZoomLevel - simpleZoomOutSteps;
      }

      // Settings menu logic
      const settingsBtn = document.getElementById('settingsBtn');
      const settingsMenu = document.getElementById('settingsMenu');
      const closeSettings = document.getElementById('closeSettings');
      const mapSize = document.getElementById('mapSize');
      const frameRate = document.getElementById('frameRate');
      const mapDiv = document.getElementById('map');
      let currentFrameRate = 25;

      settingsBtn.onclick = () => {
        settingsMenu.style.display = 'block';
      };
      closeSettings.onclick = () => {
        settingsMenu.style.display = 'none';
      };
      mapSize.onchange = () => {
        const val = mapSize.value;
        if (val === '1920x1080') {
          mapDiv.style.width = '1920px';
          mapDiv.style.height = '1080px';
        } else if (val === '3840x2160') {
          mapDiv.style.width = '3840px';
          mapDiv.style.height = '2160px';
        }
        map.resize();
      };
      frameRate.onchange = () => {
        currentFrameRate = parseInt(frameRate.value, 10);
        // You can use currentFrameRate elsewhere for animation, export, etc.
      };

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
        promptOpt.selected = true;
        promptOpt.disabled = false;
        select.appendChild(promptOpt);
        results.forEach((f, i) => {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = f.place_name;
          select.appendChild(opt);
        });
        // Make sure the parent is positioned relatively for absolute dropdown
        select.parentElement.style.position = 'static'; // Not needed for fixed
        select.size = Math.min(results.length, 5); // Show up to 5 results
        select.style.display = 'block';
        select.style.background = '#222';
        select.style.color = '#fff';
        select.style.border = '1px solid #888';
        select.style.position = 'fixed';
        select.style.zIndex = 2001;
        select.style.left = '600px'; // Fixed position from window left
        // Calculate top offset below the search field
        const parentRectA = select.parentElement.getBoundingClientRect();
        select.style.top = (parentRectA.top + select.parentElement.offsetHeight) + 'px';
        select.style.width = select.parentElement.offsetWidth + 'px';
        select.onchange = () => {
          const idx = select.value;
          if (idx !== '') {
            const i = parseInt(idx, 10);
            if (!isNaN(i) && results[i]) {
              document.getElementById('pointA').value = results[i].place_name;
              setPoint(results[i].center, 'A', results[i].place_name);
              if (modeSimpleZoom.checked) {
                // Center map on target, let user adjust zoom
                map.flyTo({ center: results[i].center, duration: 2000 });
                simpleZoomTarget = results[i].center;
                simpleZoomLevel = map.getZoom(); // Will be updated by user
              } else {
                map.flyTo({ center: results[i].center, zoom: 8, duration: 2000 });
              }
              select.style.display = 'none';
            }
          }
        };
        // Allow editing the label after selection
        document.getElementById('pointA').addEventListener('input', function inputAHandler() {
          if (markerA && pointA) {
            setPoint(pointA, 'A', this.value);
          }
        });
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
        promptOpt.selected = true;
        promptOpt.disabled = false;
        select.appendChild(promptOpt);
        results.forEach((f, i) => {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = f.place_name;
          select.appendChild(opt);
        });
        // Make sure the parent is positioned relatively for absolute dropdown
        select.parentElement.style.position = 'static'; // Not needed for fixed
        select.size = Math.min(results.length, 5); // Show up to 5 results
        select.style.display = 'block';
        select.style.background = '#222';
        select.style.color = '#fff';
        select.style.border = '1px solid #888';
        select.style.position = 'fixed';
        select.style.zIndex = 2001;
        select.style.left = '600px'; // Fixed position from window left
        // Calculate top offset below the search field
        const parentRectB = select.parentElement.getBoundingClientRect();
        select.style.top = (parentRectB.top + select.parentElement.offsetHeight) + 'px';
        select.style.width = select.parentElement.offsetWidth + 'px';
        select.onchange = () => {
          const idx = select.value;
          // Only act if a real result is chosen (not the prompt)
          if (idx !== '') {
            const i = parseInt(idx, 10);
            if (!isNaN(i) && results[i]) {
              document.getElementById('pointB').value = results[i].place_name;
              setPoint(results[i].center, 'B', results[i].place_name);
              map.flyTo({ center: results[i].center, zoom: 8, duration: 2000 });
              select.style.display = 'none';
            }
          }
        };
        // Allow editing the label after selection
        document.getElementById('pointB').addEventListener('input', function inputBHandler() {
          if (markerB && pointB) {
            setPoint(pointB, 'B', this.value);
          }
        });
        // Do not auto-select first result; require user to choose
      };

      // Animate
      // BroadcastChannel for EM OUTPUT sync
      const channel = new BroadcastChannel('em-map-sync');

      // Initialize animation tile preloader
      const preloader = new AnimationTilePreloader();

      // CUE button: jump to first frame (pointA) and hold, and sync to output
      document.getElementById('cueBtn').onclick = async () => {
        if (modeSimpleZoom.checked) {
          if (simpleZoomTarget && typeof simpleZoomLevel === 'number') {
            // Disable Animate button while pre-caching
            animateBtn.disabled = true;
            
            // Always use the last user-set zoom, never accumulate
            // Only update simpleZoomLevel if the user has changed the zoom since last cue/animate
            // Prevent CUE from ever causing cumulative zoom out
            // Save the current user zoom if the map is at the target center
            const mapCenter = map.getCenter();
            const isAtTarget = Math.abs(mapCenter.lng - simpleZoomTarget[0]) < 1e-6 && Math.abs(mapCenter.lat - simpleZoomTarget[1]) < 1e-6;
            if (isAtTarget) {
              // If the user has changed the zoom, update simpleZoomLevel
              if (!ignoreNextZoomend) {
                simpleZoomLevel = map.getZoom();
              }
            }
            const startZoom = simpleZoomLevel - simpleZoomOutSteps;
            ignoreNextZoomend = true;
            map.flyTo({ center: simpleZoomTarget, zoom: startZoom, duration: 2000 });
            
            // Pre-cache tiles for zoom animation if using cached satellite
            if (preloader.isUsingCachedSatellite()) {
              console.log('🔍 Starting zoom pre-cache...');
              await preloader.precacheZoomAnimation(
                simpleZoomTarget[1], // lat
                simpleZoomTarget[0], // lng
                startZoom,
                simpleZoomLevel
              );
              console.log('🔍 Zoom pre-cache complete');
            } else {
              console.log('❌ Skipping zoom pre-cache - cached satellite:', preloader.isUsingCachedSatellite());
            }
            
            // Enable Animate button after pre-caching is complete
            animateBtn.disabled = false;
            
            channel.postMessage({
              type: 'cue',
              center: simpleZoomTarget,
              zoom: startZoom,
              bearing: map.getBearing(),
              pitch: map.getPitch()
            });
          }
        } else {
          if (pointA) {
            // Disable Animate button while pre-caching
            animateBtn.disabled = true;
            
            const zoom = map.getZoom();
            const bearing = map.getBearing();
            const pitch = map.getPitch();
            map.jumpTo({ center: pointA, zoom, bearing, pitch });
            
            // Pre-cache tiles for point-to-point animation if using cached satellite
            if (pointB && preloader.isUsingCachedSatellite()) {
              console.log('🎬 Starting point-to-point pre-cache...');
              await preloader.precachePointToPoint(
                pointA[1], pointA[0], // from lat, lng
                pointB[1], pointB[0], // to lat, lng
                zoom
              );
              console.log('🎬 Point-to-point pre-cache complete');
            } else {
              console.log('❌ Skipping pre-cache - pointB:', pointB, 'cached satellite:', preloader.isUsingCachedSatellite());
            }
            
            // Enable Animate button after pre-caching is complete
            animateBtn.disabled = false;
            
            channel.postMessage({
              type: 'cue',
              center: pointA,
              zoom,
              bearing,
              pitch
            });
          }
        }
      };

      // Animate button: run animation from A to B, and sync to output
      document.getElementById('animateBtn').onclick = () => {
        const animTime = parseFloat(document.getElementById('animTime').value) * 1000;
        if (modeSimpleZoom.checked) {
          if (simpleZoomTarget && typeof simpleZoomLevel === 'number') {
            const startZoom = getSimpleZoomStart();
            ignoreNextZoomend = true;
            map.flyTo({ center: simpleZoomTarget, zoom: startZoom, duration: 2000 });
            map.flyTo({ center: simpleZoomTarget, zoom: simpleZoomLevel, duration: animTime });
            channel.postMessage({
              type: 'animate',
              animTime,
              from: simpleZoomTarget,
              to: simpleZoomTarget,
              zoom: simpleZoomLevel,
              bearing: map.getBearing(),
              pitch: map.getPitch()
            });
            // Disable Animate button after animation completes
            map.once('moveend', () => {
              animateBtn.disabled = true;
            });
          }
        } else {
          // Point to Point: normal A to B
          if (pointA && pointB) {
            const zoom = map.getZoom();
            const bearing = map.getBearing();
            const pitch = map.getPitch();
            map.flyTo({ center: pointA, zoom, bearing, pitch, duration: 2000 });
            map.flyTo({ center: pointB, duration: animTime });
            channel.postMessage({
              type: 'animate',
              animTime,
              from: pointA,
              to: pointB,
              zoom,
              bearing,
              pitch
            });
            // Disable Animate button after animation completes
            map.once('moveend', () => {
              animateBtn.disabled = true;
            });
          }
        }
      };

      // Sync points/labels to output tab whenever setPoint is called
      const originalSetPoint = setPoint;
      setPoint = function(coord, which, label) {
        originalSetPoint(coord, which, label);
        channel.postMessage({ type: 'setPoint', coord, which, label });
      };

      // Open Output Tab button
      document.getElementById('openOutput').onclick = () => {
        window.open('output.html', 'EM OUTPUT');
      };

      // Map style radio buttons (add after map is created)
      const styleRadios = document.querySelectorAll('input[name="mapStyle"]');
      styleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            console.log('Changing style to:', e.target.value); // Debug log
            changeMapStyle(e.target.value);
          }
        });
      });

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
