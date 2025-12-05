import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';

export interface GeolocationOptions {
    mockData?: {
        country?: string;
        city?: string;
        region?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
    };
    provider?: 'mock' | 'cloudflare' | 'custom';
    customResolver?: (ip: string) => Promise<any>;
}

/**
 * Geolocation detection middleware
 * Detects user location from IP address
 */
export function geolocation(options: GeolocationOptions = {}): Handler {
    const {
        mockData,
        provider = 'mock',
        customResolver
    } = options;

    return async (req: Request, res: Response, next: Function) => {
        const ip = req.ip || '';

        try {
            let geoData: any = {};

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
            } else if (provider === 'cloudflare') {
                // Cloudflare provides geolocation headers
                geoData = {
                    country: req.headers['cf-ipcountry'] as string,
                    city: req.headers['cf-ipcity'] as string,
                    region: req.headers['cf-region'] as string,
                    latitude: parseFloat(req.headers['cf-iplatitude'] as string || '0'),
                    longitude: parseFloat(req.headers['cf-iplongitude'] as string || '0'),
                    timezone: req.headers['cf-timezone'] as string
                };
            } else if (provider === 'custom' && customResolver) {
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
        } catch (error) {
            // If geolocation fails, continue without it
            req.geo = {};
            next();
        }
    };
}

/**
 * Check if request is from a specific country
 */
export function requireCountry(countries: string | string[]): Handler {
    const allowedCountries = Array.isArray(countries) ? countries : [countries];

    return async (req: Request, res: Response, next: Function) => {
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
export function blockCountry(countries: string | string[]): Handler {
    const blockedCountries = Array.isArray(countries) ? countries : [countries];

    return async (req: Request, res: Response, next: Function) => {
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
