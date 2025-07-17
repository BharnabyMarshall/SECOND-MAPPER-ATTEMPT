#!/usr/bin/env node

/**
 * Pre-warm tile cache for broadcast areas
 * This script pre-downloads commonly used tiles for instant performance
 */

import fs from 'fs';

const CACHE_SERVER = 'http://localhost:8001';

// Define common broadcast areas and zoom levels
const PRELOAD_AREAS = [
    // Europe
    { name: 'Europe', centerLat: 54.5, centerLng: 15, zooms: [0, 1, 2, 3, 4, 5] },
    // North America
    { name: 'North America', centerLat: 45, centerLng: -100, zooms: [0, 1, 2, 3, 4, 5] },
    // Global overview
    { name: 'Global', centerLat: 0, centerLng: 0, zooms: [0, 1, 2, 3] }
];

function latLngToTile(lat, lng, zoom) {
    const latRad = lat * Math.PI / 180;
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y, z: zoom };
}

function getTilesForArea(centerLat, centerLng, zoom, radius = 2) {
    const center = latLngToTile(centerLat, centerLng, zoom);
    const tiles = [];
    
    for (let x = center.x - radius; x <= center.x + radius; x++) {
        for (let y = center.y - radius; y <= center.y + radius; y++) {
            if (x >= 0 && y >= 0 && x < Math.pow(2, zoom) && y < Math.pow(2, zoom)) {
                tiles.push({ x, y, z: zoom });
            }
        }
    }
    return tiles;
}

async function preloadTile(source, tile) {
    const url = `${CACHE_SERVER}/${source}/${tile.z}/${tile.x}/${tile.y}.png`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            console.log(`✓ Preloaded: ${source} ${tile.z}/${tile.x}/${tile.y}`);
        } else {
            console.log(`✗ Failed: ${source} ${tile.z}/${tile.x}/${tile.y} (${response.status})`);
        }
    } catch (error) {
        console.log(`✗ Error: ${source} ${tile.z}/${tile.x}/${tile.y} - ${error.message}`);
    }
}

async function preloadArea(area, source = 'esri-satellite') {
    console.log(`\n🌍 Preloading ${area.name} for ${source}...`);
    
    for (const zoom of area.zooms) {
        const tiles = getTilesForArea(area.centerLat, area.centerLng, zoom);
        console.log(`  📍 Zoom ${zoom}: ${tiles.length} tiles`);
        
        // Load tiles in batches to avoid overwhelming the server
        for (let i = 0; i < tiles.length; i += 5) {
            const batch = tiles.slice(i, i + 5);
            await Promise.all(batch.map(tile => preloadTile(source, tile)));
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

async function main() {
    console.log('🚀 Starting tile cache preload...');
    console.log('This will download commonly used tiles for instant broadcast performance.');
    
    // Check if cache server is running
    try {
        const response = await fetch(`${CACHE_SERVER}/esri-satellite/0/0/0.png`);
        if (!response.ok) throw new Error('Cache server not responding');
        console.log('✓ Cache server is running');
    } catch (error) {
        console.error('❌ Cache server not available. Please start it first with: node tile-cache-server.js');
        process.exit(1);
    }
    
    // Preload areas
    for (const area of PRELOAD_AREAS) {
        await preloadArea(area);
    }
    
    console.log('\n🎉 Preload complete! Your cached tiles are ready for broadcast-quality performance.');
    console.log('💡 Tip: Navigate to these areas in your map and they\'ll load instantly!');
}

main().catch(console.error);
