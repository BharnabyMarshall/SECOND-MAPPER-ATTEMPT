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
let currentStyle = 'positron.json'; // Default to positron to match control map

// Video recording variables
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStream = null;
let recordingCanvas = null;
let recordingContext = null;

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
  console.log('📍 Setting point:', which, 'at:', coord, 'with label:', label);
  
  if (which === 'A') {
    pointA = coord;
    labelA = label || `POINT A`; // Fallback label if none provided
    if (markerA) markerA.remove();
    markerA = addMarker(coord, '#ff3333', labelA);
    console.log('✅ Point A set:', pointA, 'label:', labelA);
  }
  if (which === 'B') {
    pointB = coord;
    labelB = label || `POINT B`; // Fallback label if none provided
    if (markerB) markerB.remove();
    markerB = addMarker(coord, '#33aaff', labelB);
    console.log('✅ Point B set:', pointB, 'label:', labelB);
  }
}

function cue(center, zoom, bearing, pitch) {
  if (center) {
    map.jumpTo({ center, zoom, bearing, pitch });
  }
}

function animate(animTime, from, to, zoomA, zoomB, bearing, pitch) {
  if (from) {
    console.log('🎬 Starting animation with cached tiles for smooth playback');
    
    // Check if this is a simple zoom animation (same from/to coordinates)
    const isSimpleZoom = to && from[0] === to[0] && from[1] === to[1];
    
    if (isSimpleZoom) {
      // Simple zoom animation: start at lower zoom, animate to higher zoom
      const startZoom = Math.min(zoomA || 8, zoomB || 8);
      const endZoom = Math.max(zoomA || 8, zoomB || 8);
      
      // Pre-position the map at start zoom
      map.jumpTo({ center: from, zoom: startZoom, bearing, pitch });
      
      // Wait briefly for tiles to load before starting zoom animation
      setTimeout(() => {
        map.flyTo({ 
          center: from, // Stay at same location
          zoom: endZoom, // Zoom to end level
          duration: animTime,
          essential: true,
          easing(t) {
            return t * t * (3.0 - 2.0 * t);
          }
        });
      }, 200);
    } else if (to) {
      // Point-to-point animation
      map.jumpTo({ center: from, zoom: zoomA || 8, bearing, pitch });
      
      // Wait briefly for tiles to fully load before starting animation
      setTimeout(() => {
        map.flyTo({ 
          center: to,
          zoom: zoomB || 8, // Animate to Point B's zoom level
          duration: animTime,
          essential: true, // Ensures animation completes
          easing(t) {
            // Use a smoother easing function for better animation
            return t * t * (3.0 - 2.0 * t);
          }
        });
      }, 200); // Reduced delay for immediate EM OUTPUT playback
    }
  }
}

function changeStyle(styleName) {
  const styleMap = {
    'cached-satellite': 'google-satellite-cached-style.json',
    'google-satellite': 'google-satellite-style.json',
    'esri-satellite': 'esri-satellite-style.json',
    'google': 'google-style.json',
    'custom': 'custom-style.json',
    'snazzy': 'snazzy-style.json',
    'positron': 'positron.json'
  };
  
  const styleFile = styleMap[styleName] || 'positron.json'; // Default to positron to match control
  console.log('🎨 Output window changing style to:', styleName, '->', styleFile);
  
  if (!map) {
    console.warn('⚠️ Map not ready, storing style for later application');
    currentStyle = styleFile;
    return;
  }
  
  fetch(styleFile)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(style => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      
      map.setStyle(style);
      currentStyle = styleFile;
      
      // Wait for style to load, then restore map state and markers
      map.once('style.load', () => {
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
    })
    .catch(error => {
      console.error('❌ Error loading style:', error);
      // Keep current style on error
    });
}

// Video Recording Functions
function initRecordingControls() {
  const recordingControls = document.getElementById('recordingControls');
  const startRecordBtn = document.getElementById('startRecord');
  const stopRecordBtn = document.getElementById('stopRecord');
  const videoFormat = document.getElementById('videoFormat');
  const recordingStatus = document.getElementById('recordingStatus');
  const recordingInfo = document.getElementById('recordingInfo');
  
  // Show controls
  recordingControls.classList.add('show');
  
  // Check codec support
  const formats = [
    { value: 'video/webm;codecs=vp9', name: 'WebM (VP9)' },
    { value: 'video/webm;codecs=vp8', name: 'WebM (VP8)' },
    { value: 'video/webm', name: 'WebM (Default)' },
    { value: 'video/mp4;codecs=h264', name: 'MP4 (H.264)' },
    { value: 'video/mp4', name: 'MP4 (Default)' }
  ];
  
  // Update format dropdown with supported codecs
  videoFormat.innerHTML = '';
  formats.forEach(format => {
    if (MediaRecorder.isTypeSupported(format.value)) {
      const option = document.createElement('option');
      option.value = format.value;
      option.textContent = format.name + ' ✓';
      videoFormat.appendChild(option);
    }
  });
  
  // Add unsupported formats with warning
  formats.forEach(format => {
    if (!MediaRecorder.isTypeSupported(format.value)) {
      const option = document.createElement('option');
      option.value = format.value;
      option.textContent = format.name + ' (Not Supported)';
      option.disabled = true;
      videoFormat.appendChild(option);
    }
  });
  
  startRecordBtn.onclick = startRecording;
  stopRecordBtn.onclick = stopRecording;
  
  // Add a test button to create sample points for testing recording
  const testBtn = document.createElement('button');
  testBtn.textContent = 'Add Test Points';
  testBtn.className = 'record-btn';
  testBtn.onclick = () => {
    // Add test points for recording verification
    setPoint([1.1481, 52.0597], 'A', 'TEST POINT A');
    setPoint([1.2000, 52.1000], 'B', 'TEST POINT B');
    console.log('🧪 Test points added for recording');
  };
  recordingControls.appendChild(testBtn);
}

async function startRecording() {
  try {
    const videoFormat = document.getElementById('videoFormat').value;
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingInfo = document.getElementById('recordingInfo');
    const startRecordBtn = document.getElementById('startRecord');
    const stopRecordBtn = document.getElementById('stopRecord');
    
    // Get the current frame rate from settings or default to 25fps
    const frameRate = window.currentFrameRate || 25;
    
    // Get the map canvas - try multiple ways to find it
    let mapCanvas = map.getCanvas();
    if (!mapCanvas) {
      mapCanvas = document.querySelector('#map canvas');
    }
    if (!mapCanvas) {
      console.error('❌ Map canvas not found');
      recordingStatus.textContent = 'Error: Map not ready';
      recordingInfo.textContent = 'Map canvas not found';
      return;
    }
    
    console.log('🎥 Found map canvas:', mapCanvas.width, 'x', mapCanvas.height);
    
    // Create a composite canvas that includes both map and labels
    recordingCanvas = document.createElement('canvas');
    recordingCanvas.width = mapCanvas.width;
    recordingCanvas.height = mapCanvas.height;
    recordingContext = recordingCanvas.getContext('2d');
    
    console.log('🎥 Created recording canvas:', recordingCanvas.width, 'x', recordingCanvas.height);
    
    // Create a reliable drawing interval instead of requestAnimationFrame
    let drawingInterval;
    
    function drawCompositeFrame() {
      if (!isRecording) return;
      
      console.log('🎬 Drawing composite frame, isRecording:', isRecording);
      
      try {
        // Clear the recording canvas
        recordingContext.clearRect(0, 0, recordingCanvas.width, recordingCanvas.height);
        
        // Draw the map canvas
        recordingContext.drawImage(mapCanvas, 0, 0);
        console.log('🗺️ Drew map canvas');
        
        // Draw labels on top
        drawLabelsOnCanvas(recordingCanvas, recordingContext);
        console.log('🏷️ Drew labels');
        
      } catch (error) {
        console.error('❌ Error drawing composite frame:', error);
      }
    }
    
    // Start the composite drawing loop with interval (more reliable than requestAnimationFrame)
    drawingInterval = setInterval(drawCompositeFrame, 1000 / frameRate); // Draw at the specified frame rate
    console.log('🎬 Started drawing interval at', frameRate, 'fps');
    
    // Create stream from composite canvas
    recordingStream = recordingCanvas.captureStream(frameRate);
    console.log('🎥 Created stream with frame rate:', frameRate, 'tracks:', recordingStream.getTracks().length);
    
    // Verify the stream is active
    const tracks = recordingStream.getTracks();
    if (tracks.length === 0) {
      console.error('❌ No tracks in recording stream');
      recordingStatus.textContent = 'Error: No stream tracks';
      recordingInfo.textContent = 'Failed to create video stream';
      return;
    }
    
    tracks.forEach((track, index) => {
      console.log(`🎥 Track ${index}:`, track.kind, track.enabled, track.readyState);
    });
    
    // Check if selected format is supported
    if (!MediaRecorder.isTypeSupported(videoFormat)) {
      console.error('❌ Format not supported:', videoFormat);
      recordingStatus.textContent = 'Format Not Supported';
      recordingInfo.textContent = `Format ${videoFormat} is not supported`;
      return;
    }
    
    console.log('✅ Video format supported:', videoFormat);
    
    // Create MediaRecorder
    const options = {
      mimeType: videoFormat,
      videoBitsPerSecond: 8000000 // 8 Mbps for high quality
    };
    
    mediaRecorder = new MediaRecorder(recordingStream, options);
    recordedChunks = [];
    
    console.log('🎥 MediaRecorder created with options:', options);
    
    mediaRecorder.ondataavailable = (event) => {
      console.log('📹 Data available:', event.data.size, 'bytes');
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log('📦 Total chunks collected:', recordedChunks.length);
      } else {
        console.warn('⚠️ Empty data chunk received');
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('🛑 Recording stopped, chunks:', recordedChunks.length);
      
      // Clear the drawing interval
      if (drawingInterval) {
        clearInterval(drawingInterval);
        console.log('🛑 Drawing interval cleared');
      }
      
      if (recordedChunks.length > 0) {
        saveRecording();
        recordingStatus.textContent = 'Recording Saved';
        recordingStatus.className = '';
        recordingInfo.textContent = 'File downloaded to your Downloads folder';
      } else {
        recordingStatus.textContent = 'Recording Failed';
        recordingStatus.className = '';
        recordingInfo.textContent = 'No data was recorded';
      }
      startRecordBtn.disabled = false;
      stopRecordBtn.disabled = true;
      isRecording = false;
      
      // Clean up recording canvas
      if (recordingCanvas) {
        recordingCanvas = null;
        recordingContext = null;
      }
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
      
      // Clear the drawing interval
      if (drawingInterval) {
        clearInterval(drawingInterval);
        console.log('🛑 Drawing interval cleared (error)');
      }
      
      recordingStatus.textContent = 'Recording Error';
      recordingStatus.className = '';
      recordingInfo.textContent = 'Error: ' + event.error.message;
      startRecordBtn.disabled = false;
      stopRecordBtn.disabled = true;
      isRecording = false;
      
      // Clean up recording canvas
      if (recordingCanvas) {
        recordingCanvas = null;
        recordingContext = null;
      }
    };
    
    // Start recording
    mediaRecorder.start(1000); // Collect data every 1000ms (1 second) instead of 100ms
    isRecording = true;
    
    console.log('🎥 MediaRecorder state:', mediaRecorder.state);
    console.log('🎥 Recording canvas size:', recordingCanvas.width, 'x', recordingCanvas.height);
    console.log('🎥 Map canvas size:', mapCanvas.width, 'x', mapCanvas.height);
    
    // Test: automatically stop recording after 3 seconds to see if we get data
    setTimeout(() => {
      if (isRecording) {
        console.log('🕐 Auto-stopping recording after 3 seconds for testing');
        stopRecording();
      }
    }, 3000);
    
    // Update UI
    recordingStatus.textContent = '● Recording...';
    recordingStatus.className = 'recording';
    recordingInfo.textContent = `Recording at ${frameRate}fps in ${videoFormat} (with labels)`;
    startRecordBtn.disabled = true;
    stopRecordBtn.disabled = false;
    
    console.log('🎥 Recording started with labels:', { format: videoFormat, frameRate });
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    document.getElementById('recordingStatus').textContent = 'Recording Failed';
    document.getElementById('recordingInfo').textContent = 'Error: ' + error.message;
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    isRecording = false; // Stop the animation loop first
    mediaRecorder.stop();
    
    // Stop all tracks in the stream
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
    }
    
    console.log('🎥 Recording stopped');
  }
}

function saveRecording() {
  if (recordedChunks.length === 0) {
    console.error('No recorded data to save');
    return;
  }
  
  const videoFormat = document.getElementById('videoFormat').value;
  const mimeType = videoFormat.split(';')[0]; // Get base mime type
  let extension = 'webm';
  
  if (mimeType.includes('mp4')) {
    extension = 'mp4';
  } else if (mimeType.includes('webm')) {
    extension = 'webm';
  }
  
  const blob = new Blob(recordedChunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const a = document.createElement('a');
  a.href = url;
  a.download = `map-animation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up
  URL.revokeObjectURL(url);
  
  console.log('🎥 Recording saved as:', a.download);
}

// Function to draw labels on canvas for recording
function drawLabelsOnCanvas(canvas, context) {
  // Don't clear the canvas! We want to draw labels ON TOP of the map
  // context.clearRect(0, 0, canvas.width, canvas.height); // REMOVED THIS LINE
  
  console.log('🏷️ Drawing labels on canvas. Points available:', { 
    pointA: pointA ? `${pointA[0].toFixed(4)}, ${pointA[1].toFixed(4)}` : 'none', 
    labelA, 
    pointB: pointB ? `${pointB[0].toFixed(4)}, ${pointB[1].toFixed(4)}` : 'none', 
    labelB 
  });
  
  let labelsDrawn = 0;
  
  // Draw Point A label if it exists
  if (pointA && labelA) {
    const pixel = map.project(pointA);
    console.log('🏷️ Drawing Point A label at pixel:', { x: pixel.x.toFixed(2), y: pixel.y.toFixed(2) }, 'for:', labelA);
    drawLabel(context, pixel.x, pixel.y, labelA, '#026473');
    labelsDrawn++;
  } else {
    console.log('❌ Point A not available for drawing:', { pointA, labelA });
  }
  
  // Draw Point B label if it exists
  if (pointB && labelB) {
    const pixel = map.project(pointB);
    console.log('🏷️ Drawing Point B label at pixel:', { x: pixel.x.toFixed(2), y: pixel.y.toFixed(2) }, 'for:', labelB);
    drawLabel(context, pixel.x, pixel.y, labelB, '#026473');
    labelsDrawn++;
  } else {
    console.log('❌ Point B not available for drawing:', { pointB, labelB });
  }
  
  console.log(`📊 Labels drawn: ${labelsDrawn}/2`);
}

function drawLabel(context, x, y, text, backgroundColor) {
  console.log('🎨 Drawing label:', text, 'at position:', x, y);
  
  // Check if the point is within the visible canvas area
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;
  const margin = 100; // Allow some margin for labels that extend outside
  
  if (x < -margin || x > canvasWidth + margin || y < -margin || y > canvasHeight + margin) {
    console.warn('⚠️ Label position is off-screen:', { x, y, canvasWidth, canvasHeight });
    // Still draw it, but log the warning
  }
  
  const fontSize = 13;
  const padding = 6;
  const triangleHeight = 12;
  
  // Set font to match the HTML labels
  context.font = `bold ${fontSize}px "ITV Reem Avid", Montserrat, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Measure text
  const upperText = text.toUpperCase();
  const textMetrics = context.measureText(upperText);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  // Calculate label dimensions
  const labelWidth = textWidth + (padding * 2);
  const labelHeight = textHeight + (padding * 2);
  
  // Calculate positions (label above the point)
  const labelX = x - labelWidth / 2;
  const labelY = y - labelHeight - triangleHeight - 16; // 16px for the white dot
  
  console.log('🎨 Label dimensions:', { labelWidth, labelHeight, labelX, labelY, canvasWidth, canvasHeight });
  
  // Draw label background with shadow effect
  context.shadowColor = 'rgba(0, 0, 0, 0.13)';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 1;
  context.shadowBlur = 4;
  context.fillStyle = backgroundColor;
  context.fillRect(labelX, labelY, labelWidth, labelHeight);
  
  // Reset shadow for triangle
  context.shadowColor = 'transparent';
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;
  
  // Draw triangle pointer
  context.beginPath();
  context.moveTo(x, labelY + labelHeight + triangleHeight); // Point at bottom
  context.lineTo(x - triangleHeight/2, labelY + labelHeight); // Left corner
  context.lineTo(x + triangleHeight/2, labelY + labelHeight); // Right corner
  context.closePath();
  context.fillStyle = backgroundColor;
  context.fill();
  
  // Draw label text
  context.fillStyle = '#ffffff';
  context.fillText(upperText, x, labelY + labelHeight / 2);
  
  // Draw white dot at the actual point location
  context.beginPath();
  context.arc(x, y, 8, 0, 2 * Math.PI);
  context.fillStyle = '#ffffff';
  context.fill();
  context.strokeStyle = '#333333';
  context.lineWidth = 1;
  context.stroke();
  
  console.log('🎨 Label drawn successfully for:', upperText);
}

window.addEventListener('DOMContentLoaded', () => {
  fetch(currentStyle) // Use cached satellite style by default
    .then(response => response.json())
    .then(style => {
      map = new maplibregl.Map({
        container: 'map',
        style: style,
        center: [0, 0],
        zoom: 2,
        attributionControl: false,
        // Add smooth animation settings for seamless tile display
        renderWorldCopies: false,
        maxTileCacheSize: 2000, // Increased cache size
        localIdeographFontFamily: false,
        // Optimize tile loading for smooth animation
        maxPitch: 60,
        maxZoom: 22,
        minZoom: 0,
        hash: false,
        // Prevent tile flickering during animation
        fadeInTiles: false,
        crossSourceCollisions: false
      });

      // Add event listeners for better tile management
      map.on('style.load', () => {
        console.log('🎨 Output map style loaded successfully');
      });

      map.on('sourcedata', (e) => {
        // Ensure tiles are loaded before allowing smooth animation
        if (e.sourceId && e.isSourceLoaded) {
          console.log('📦 Tiles loaded for source:', e.sourceId);
        }
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
          // Handle both old format (zoom) and new format (zoomA, zoomB)
          const zoomA = msg.zoomA || msg.zoom || 8;
          const zoomB = msg.zoomB || msg.zoom || 8;
          animate(msg.animTime, msg.from, msg.to, zoomA, zoomB, msg.bearing, msg.pitch);
        } else if (msg.type === 'changeStyle') {
          changeStyle(msg.styleName);
        } else if (msg.type === 'changeResolution') {
          // Apply resolution changes to EM OUTPUT
          const mapDiv = document.getElementById('map');
          if (msg.resolution === '1920x1080') {
            mapDiv.style.width = '1920px';
            mapDiv.style.height = '1080px';
          } else if (msg.resolution === '3840x2160') {
            mapDiv.style.width = '3840px';
            mapDiv.style.height = '2160px';
          }
          map.resize();
          console.log('📺 EM OUTPUT resolution changed to:', msg.resolution);
        } else if (msg.type === 'changeFrameRate') {
          // Store frame rate for potential use in animations
          window.currentFrameRate = msg.frameRate;
          console.log('🎬 EM OUTPUT frame rate changed to:', msg.frameRate, 'fps');
        } else if (msg.type === 'startRecording') {
          // Remote start recording command from EM CONTROL
          startRecording();
        } else if (msg.type === 'stopRecording') {
          // Remote stop recording command from EM CONTROL
          stopRecording();
        }
      };

      // Initialize video recording controls
      initRecordingControls();
    });
});
