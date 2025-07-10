// output-map.js
// Minimal map for EM OUTPUT tab, controlled by EM CONTROL via BroadcastChannel

import 'https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js';

let map;
let markerA = null;
let markerB = null;
let pointA = null;
let pointB = null;
let labelA = '';
let labelB = '';

function addMarker(coord, color, label) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.pointerEvents = 'none';

  if (label) {
    const labelDiv = document.createElement('div');
    labelDiv.textContent = String(label).toUpperCase();
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
    labelDiv.style.marginBottom = '2px';
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

function setPoint(coord, which, label) {
  if (which === 'A') {
    pointA = coord;
    labelA = label;
    if (markerA) markerA.remove();
    markerA = addMarker(coord, '#ff3333', labelA);
  }
  if (which === 'B') {
    pointB = coord;
    labelB = label;
    if (markerB) markerB.remove();
    markerB = addMarker(coord, '#33aaff', labelB);
  }
}

function cue(center, zoom, bearing, pitch) {
  if (center) {
    map.jumpTo({ center, zoom, bearing, pitch });
  }
}

function animate(animTime, from, to, zoom, bearing, pitch) {
  if (from && to) {
    map.jumpTo({ center: from, zoom, bearing, pitch });
    map.flyTo({ center: to, duration: animTime });
  }
}

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

      // Listen for control messages from EM CONTROL
      const channel = new BroadcastChannel('em-map-sync');
      channel.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'setPoint') {
          setPoint(msg.coord, msg.which, msg.label);
        } else if (msg.type === 'cue') {
          cue(msg.center, msg.zoom, msg.bearing, msg.pitch);
        } else if (msg.type === 'animate') {
          animate(msg.animTime, msg.from, msg.to, msg.zoom, msg.bearing, msg.pitch);
        }
      };
    });
});
