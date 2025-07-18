// Animation tile pre-caching for smooth broadcast performance
// This module pre-caches tiles along animation paths when CUE is pressed

class AnimationTilePreloader {
    constructor(cacheServerUrl = 'http://localhost:8001') {
        this.cacheServerUrl = cacheServerUrl;
        this.isPreloading = false;
        this.statusElement = null;
    }

    // Show/hide preload status
    showStatus(message) {
        if (!this.statusElement) {
            this.statusElement = document.getElementById('preloadStatus');
        }
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.style.display = 'inline';
        }
    }

    hideStatus() {
        if (this.statusElement) {
            this.statusElement.style.display = 'none';
        }
    }

    // Convert lat/lng to tile coordinates
    latLngToTile(lat, lng, zoom) {
        const latRad = lat * Math.PI / 180;
        const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
        const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
        return { x, y, z: zoom };
    }

    // Get tiles around a point with buffer
    getTilesAroundPoint(lat, lng, zoom, buffer = 3) {
        const center = this.latLngToTile(lat, lng, zoom);
        const tiles = [];
        // Increase buffer to 4 for better coverage
        buffer = 4;
        for (let x = center.x - buffer; x <= center.x + buffer; x++) {
            for (let y = center.y - buffer; y <= center.y + buffer; y++) {
                if (x >= 0 && y >= 0 && x < Math.pow(2, zoom) && y < Math.pow(2, zoom)) {
                    tiles.push({ x, y, z: zoom });
                }
            }
        }
        return tiles;
    }

    // Interpolate between two points for animation path
    interpolatePath(fromLat, fromLng, toLat, toLng, steps = 20) {
        const path = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const lat = fromLat + (toLat - fromLat) * t;
            const lng = fromLng + (toLng - fromLng) * t;
            path.push({ lat, lng });
        }
        return path;
    }

        // Test cache server availability
    async testCacheServer() {
        try {
            // Test with a simple OPTIONS request to check if server is running
            const response = await fetch('http://localhost:8001/', {
                method: 'OPTIONS'
            });
            console.log(`Cache server test: ${response.status} - Server is running`);
            return true; // Any response means server is running
        } catch (error) {
            // If OPTIONS fails, try a HEAD request to a tile endpoint
            try {
                const response = await fetch('http://localhost:8001/esri-satellite/0/0/0', {
                    method: 'HEAD'
                });
                console.log(`Cache server test: ${response.status} - Server is running (HEAD)`);
                return true; // Any response (even 404) means server is running
            } catch (headError) {
                console.error('Cache server not available:', error);
                return false;
            }
        }
    }

    // Check if tile already exists in cache
    async checkCachedTile(z, x, y, source) {
        try {
            // Use standard x,y format for all sources since the map style now uses {z}/{x}/{y}
            const url = `http://localhost:8001/${source}/${z}/${x}/${y}.png`;
            const response = await fetch(url, {
                method: 'HEAD'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Pre-cache a single tile
    async cacheTile(z, x, y, source) {
        try {
            // First check if tile is already cached using HEAD request
            const url = `http://localhost:8001/${source}/${z}/${x}/${y}.png`;
            
            // Check if already cached
            const headResponse = await fetch(url, { method: 'HEAD' });
            if (headResponse.ok) {
                // Already cached, don't need to re-download
                if (Math.random() < 0.05) { // Log ~5% of cached tiles
                    console.log(`✓ Already cached: ${z}/${x}/${y}`);
                }
                return true;
            }
            
            // Not cached, request it (this will download and cache)
            const response = await fetch(url);
            if (response.ok) {
                // Log successful cache - but don't spam too much
                if (Math.random() < 0.1) { // Log ~10% of new downloads
                    console.log(`✓ Downloaded & cached: ${z}/${x}/${y} (status: ${response.status})`);
                }
                return true;
            } else {
                console.error(`Failed to cache tile ${z}/${x}/${y}: HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error(`Error caching tile ${z}/${x}/${y}:`, error);
            return false;
        }
    }

    // Pre-cache tiles for point-to-point animation
    async precachePointToPoint(fromLat, fromLng, toLat, toLng, zoom, source = 'esri-satellite') {
        console.log('🎬 precachePointToPoint called with:', { fromLat, fromLng, toLat, toLng, zoom, source });
        
        if (!this.isUsingCachedSatellite()) {
            console.log('❌ Not using cached satellite, skipping pre-cache');
            return true; // Immediately return success for non-cached styles
        }

        console.log('✅ Using cached satellite, proceeding with pre-cache');

        // Test cache server first
        const serverAvailable = await this.testCacheServer();
        if (!serverAvailable) {
            console.log('❌ Cache server not available, skipping pre-cache');
            return true; // Allow animation to proceed without pre-caching
        }
        
        console.log('✅ Cache server available, starting pre-cache');
        
        if (this.isPreloading) return true;
        this.isPreloading = true;

        this.showStatus('📦 Pre-caching animation tiles...');
        console.log('🎬 Pre-caching tiles for point-to-point animation...');
        
        // Get animation path with more steps for denser coverage
        const path = this.interpolatePath(fromLat, fromLng, toLat, toLng, 50);
        const allTiles = new Set();

        // Increase buffer to 10 for animation path tiles
        for (const point of path) {
            const tiles = this.getTilesAroundPoint(point.lat, point.lng, zoom, 10);
            tiles.forEach(tile => {
                allTiles.add(`${tile.z}-${tile.x}-${tile.y}`);
            });
        }

        // Cache all tiles in the current viewport before animation starts
        if (window.map && window.map.getBounds && window.map.getZoom) {
            const bounds = window.map.getBounds();
            const currentZoom = window.map.getZoom();
            // Get tile coordinates for viewport corners
            const nw = this.latLngToTile(bounds.getNorth(), bounds.getWest(), currentZoom);
            const se = this.latLngToTile(bounds.getSouth(), bounds.getEast(), currentZoom);
            for (let x = nw.x; x <= se.x; x++) {
                for (let y = nw.y; y <= se.y; y++) {
                    allTiles.add(`${currentZoom}-${x}-${y}`);
                }
            }
        }

        // Cache tiles in batches
        const tileArray = Array.from(allTiles).map(key => {
            const [z, x, y] = key.split('-').map(Number);
            return { x, y, z };
        });

        console.log(`📦 Caching ${tileArray.length} tiles for smooth animation...`);
        
        let cached = 0;
        let failed = 0;
        for (let i = 0; i < tileArray.length; i += 5) {
            const batch = tileArray.slice(i, i + 5);
            this.showStatus(`📦 Caching tiles: ${cached + failed}/${tileArray.length}`);
            
            const promises = batch.map(tile => this.cacheTile(tile.z, tile.x, tile.y, source));
            const results = await Promise.all(promises);
            cached += results.filter(Boolean).length;
            failed += results.filter(r => !r).length;
            
            // Small delay to not overwhelm the server
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const success = failed === 0;
        const message = success ? 
            `✅ Animation ready! (${cached} tiles cached)` : 
            `⚠ Animation ready with ${failed} failed tiles`;
        
        console.log(`✅ Pre-cached ${cached}/${tileArray.length} tiles for animation (${failed} failed)`);
        this.showStatus(message);
        setTimeout(() => this.hideStatus(), 2000);
        this.isPreloading = false;
        return success;
    }

    // Pre-cache tiles for zoom animation
    async precacheZoomAnimation(lat, lng, fromZoom, toZoom, source = 'esri-satellite') {
        if (!this.isUsingCachedSatellite()) {
            console.log('Not using cached satellite, skipping pre-cache');
            return true; // Immediately return success for non-cached styles
        }

        // Test cache server first
        const serverAvailable = await this.testCacheServer();
        if (!serverAvailable) {
            console.log('Cache server not available, skipping pre-cache');
            return true; // Allow animation to proceed without pre-caching
        }
        
        if (this.isPreloading) return true;
        this.isPreloading = true;

        this.showStatus('📦 Pre-caching zoom tiles...');
        console.log('🔍 Pre-caching tiles for zoom animation...');
        
        const allTiles = new Set();
        const minZoom = Math.min(fromZoom, toZoom);
        const maxZoom = Math.max(fromZoom, toZoom);

        // Increase buffer to 10 for zoom animation tiles
        for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
            const tiles = this.getTilesAroundPoint(lat, lng, zoom, 10);
            tiles.forEach(tile => {
                allTiles.add(`${tile.z}-${tile.x}-${tile.y}`);
            });
        }

        // Cache all tiles in the current viewport before zoom animation starts
        if (window.map && window.map.getBounds && window.map.getZoom) {
            const bounds = window.map.getBounds();
            const currentZoom = window.map.getZoom();
            const nw = this.latLngToTile(bounds.getNorth(), bounds.getWest(), currentZoom);
            const se = this.latLngToTile(bounds.getSouth(), bounds.getEast(), currentZoom);
            for (let x = nw.x; x <= se.x; x++) {
                for (let y = nw.y; y <= se.y; y++) {
                    allTiles.add(`${currentZoom}-${x}-${y}`);
                }
            }
        }

        // Cache tiles in batches
        const tileArray = Array.from(allTiles).map(key => {
            const [z, x, y] = key.split('-').map(Number);
            return { x, y, z };
        });

        console.log(`📦 Caching ${tileArray.length} tiles for smooth zoom animation...`);
        
        let cached = 0;
        let failed = 0;
        for (let i = 0; i < tileArray.length; i += 5) {
            const batch = tileArray.slice(i, i + 5);
            this.showStatus(`📦 Caching tiles: ${cached + failed}/${tileArray.length}`);
            
            const promises = batch.map(tile => this.cacheTile(tile.z, tile.x, tile.y, source));
            const results = await Promise.all(promises);
            cached += results.filter(Boolean).length;
            failed += results.filter(r => !r).length;
            
            // Small delay to not overwhelm the server
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const success = failed === 0;
        const message = success ? 
            `✅ Zoom ready! (${cached} tiles cached)` : 
            `⚠ Zoom ready with ${failed} failed tiles`;

        console.log(`✅ Pre-cached ${cached}/${tileArray.length} tiles for zoom animation (${failed} failed)`);
        this.showStatus(message);
        setTimeout(() => this.hideStatus(), 2000);
        this.isPreloading = false;
        return success;
    }

    // Check if using cached satellite
    isUsingCachedSatellite() {
        const selectedStyle = document.querySelector('input[name="mapStyle"]:checked');
        console.log('🔍 Checking map style:', selectedStyle ? selectedStyle.value : 'none selected');
        return selectedStyle && selectedStyle.value === 'cached-satellite';
    }
}

// Export for use in main map script
window.AnimationTilePreloader = AnimationTilePreloader;
