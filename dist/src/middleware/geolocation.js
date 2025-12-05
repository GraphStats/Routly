"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geolocation = geolocation;
exports.requireCountry = requireCountry;
exports.blockCountry = blockCountry;
/**
 * Geolocation detection middleware
 * Detects user location from IP address
 */
function geolocation(options = {}) {
    const { mockData, provider = 'mock', customResolver } = options;
    return async (req, res, next) => {
        const ip = req.ip || '';
        try {
            let geoData = {};
            if (provider === 'mock' || !ip || ip === '127.0.0.1' || ip === '::1') {
                // Use mock data for localhost or when provider is mock
                geoData = mockData || {
                    country: 'US',
                    city: 'San Francisco',
                    region: 'California',
                    latitude: 37.7749,
                    longitude: -122.4194,
                    timezone: 'America/Los_Angeles'
                };
            }
            else if (provider === 'cloudflare') {
                // Cloudflare provides geolocation headers
                geoData = {
                    country: req.headers['cf-ipcountry'],
                    city: req.headers['cf-ipcity'],
                    region: req.headers['cf-region'],
                    latitude: parseFloat(req.headers['cf-iplatitude'] || '0'),
                    longitude: parseFloat(req.headers['cf-iplongitude'] || '0'),
                    timezone: req.headers['cf-timezone']
                };
            }
            else if (provider === 'custom' && customResolver) {
                // Use custom resolver
                geoData = await customResolver(ip);
            }
            // Add geolocation data to request
            req.geo = {
                country: geoData.country,
                city: geoData.city,
                region: geoData.region,
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                timezone: geoData.timezone
            };
            // Add geolocation headers to response
            if (req.geo.country) {
                res.setHeader('X-Geo-Country', req.geo.country);
            }
            if (req.geo.city) {
                res.setHeader('X-Geo-City', req.geo.city);
            }
            next();
        }
        catch (error) {
            // If geolocation fails, continue without it
            req.geo = {};
            next();
        }
    };
}
/**
 * Check if request is from a specific country
 */
function requireCountry(countries) {
    const allowedCountries = Array.isArray(countries) ? countries : [countries];
    return async (req, res, next) => {
        const country = req.geo?.country;
        if (!country || !allowedCountries.includes(country)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied from your location'
            });
        }
        next();
    };
}
/**
 * Block requests from specific countries
 */
function blockCountry(countries) {
    const blockedCountries = Array.isArray(countries) ? countries : [countries];
    return async (req, res, next) => {
        const country = req.geo?.country;
        if (country && blockedCountries.includes(country)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied from your location'
            });
        }
        next();
    };
}
