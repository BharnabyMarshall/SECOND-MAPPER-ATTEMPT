#!/usr/bin/env node

// Simple diagnostic tool to test tile coordinate calculations
import fs from 'fs';
import path from 'path';
import url from 'url';

const CACHE_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'tile-cache');

// Convert lat/lng to tile coordinates (same as animation-preloader.js)
function latLngToTile(lat, lng, zoom) {
    const latRad = lat * Math.PI / 180;
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y, z: zoom };
}

// Test coordinates - Dubai area
const testLat = 25.2048;
const testLng = 55.2708;
const testZoom = 8;

console.log('=== Tile Coordinate Diagnostic ===');
console.log(`Testing coordinates: ${testLat}, ${testLng} at zoom ${testZoom}`);

const tile = latLngToTile(testLat, testLng, testZoom);
console.log(`Calculated tile: ${tile.z}/${tile.x}/${tile.y}`);

// Check if this tile exists in cache
const tilePath = path.join(CACHE_DIR, 'esri-satellite', tile.z.toString(), tile.x.toString(), `${tile.y}.png`);
console.log(`Expected cache path: ${tilePath}`);
console.log(`Tile exists in cache: ${fs.existsSync(tilePath)}`);

// List some actual cached tiles for comparison
console.log('\n=== Some cached tiles at this zoom level ===');
const zoomDir = path.join(CACHE_DIR, 'esri-satellite', testZoom.toString());
if (fs.existsSync(zoomDir)) {
    const xDirs = fs.readdirSync(zoomDir).slice(0, 3); // First 3 X directories
    for (const xDir of xDirs) {
        const xPath = path.join(zoomDir, xDir);
        if (fs.statSync(xPath).isDirectory()) {
            const tiles = fs.readdirSync(xPath).slice(0, 3); // First 3 tiles
            for (const tile of tiles) {
                console.log(`Cached: ${testZoom}/${xDir}/${tile}`);
            }
        }
    }
} else {
    console.log('No tiles cached at this zoom level');
}

// Test ESRI URL generation
const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tile.z}/${tile.y}/${tile.x}`;
console.log(`\n=== ESRI URL Test ===`);
console.log(`Generated ESRI URL: ${esriUrl}`);
console.log('Note: ESRI uses z/y/x format, but we cache as z/x/y');
