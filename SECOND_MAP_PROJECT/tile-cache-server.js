#!/usr/bin/env node

/**
 * Tile Cache Server for Satellite Imagery
 * This script creates a local tile cache server that downloads and stores tiles locally
 * Usage: node tile-cache-server.js
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import url from 'url';

// Disable SSL certificate validation for development
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const CACHE_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'tile-cache');
const PORT = 8001;

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Tile sources - prioritize ESRI over Google due to SSL issues
const TILE_SOURCES = {
    'esri-satellite': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    'google-satellite': 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
};

function getTilePath(source, z, x, y) {
    // Store all tiles using standard x/y format
    return path.join(CACHE_DIR, source, z.toString(), x.toString(), `${y}.png`);
}

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function downloadTile(tileUrl, filePath) {
    return new Promise((resolve, reject) => {
        const client = tileUrl.startsWith('https') ? https : http;
        
        client.get(tileUrl, (response) => {
            if (response.statusCode === 200) {
                ensureDir(filePath);
                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`Cached: ${filePath}`);
                    resolve();
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}: ${tileUrl}`));
            }
        }).on('error', reject);
    });
}

function buildTileUrl(source, z, x, y) {
    let template = TILE_SOURCES[source];
    if (!template) return null;
    
    // For Google, pick a random server (0-3)
    if (source === 'google-satellite') {
        const server = Math.floor(Math.random() * 4);
        template = template.replace('{s}', server.toString());
    }
    
    // ESRI uses standard {z}/{x}/{y} format
    return template
        .replace('{z}', z)
        .replace('{x}', x)
        .replace('{y}', y);
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS headers for faster loading
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Handle HEAD requests for cache checking
    if (req.method === 'HEAD') {
        // Parse tile request: /source/z/x/y.png
        const match = pathname.match(/^\/([^\/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
        if (!match) {
            res.writeHead(404);
            res.end();
            return;
        }
        
        const [, source, z, x, y] = match;
        const filePath = getTilePath(source, z, x, y);
        
        if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'image/png');
            res.writeHead(200);
            res.end();
        } else {
            res.writeHead(404);
            res.end();
        }
        return;
    }
    
    // Handle root path for server test
    if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Tile cache server is running');
        return;
    }
    
    // Parse tile request: /source/z/x/y.png
    const match = pathname.match(/^\/([^\/]+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (!match) {
        res.writeHead(404);
        res.end('Invalid tile request');
        return;
    }
    
    const [, source, z, x, y] = match;
    
    // Use standard coordinate system for all sources
    const filePath = getTilePath(source, z, x, y);
    
    // Check if tile is cached
    if (fs.existsSync(filePath)) {
        console.log(`✓ Serving cached: ${source}/${z}/${x}/${y}`);
        res.setHeader('Content-Type', 'image/png');
        fs.createReadStream(filePath).pipe(res);
        return;
    }

    // Download and cache tile
    try {
        const tileUrl = buildTileUrl(source, z, x, y);
        if (!tileUrl) {
            res.writeHead(404);
            res.end('Unknown tile source');
            return;
        }

        console.log(`⬇ Downloading: ${source}/${z}/${x}/${y} from ${tileUrl}`);
        await downloadTile(tileUrl, filePath);        // Serve the downloaded tile
        res.setHeader('Content-Type', 'image/png');
        fs.createReadStream(filePath).pipe(res);
        
    } catch (error) {
        console.error('Error downloading tile:', error);
        res.writeHead(500);
        res.end('Error downloading tile');
    }
});

server.listen(PORT, () => {
    console.log(`Tile cache server running on http://localhost:${PORT}`);
    console.log(`Cache directory: ${path.resolve(CACHE_DIR)}`);
    console.log('Available sources:', Object.keys(TILE_SOURCES).join(', '));
});
