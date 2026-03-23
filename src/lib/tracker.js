/**
 * GSA Sales OS - Marketing Attribution Tracker
 * Captures UTM parameters, fbclid, and Pixel IDs from the URL
 * and stores them in sessionStorage for lead attribution.
 */

const STORAGE_KEY = 'gsa_attribution_data';

export const initTracker = () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const attributionData = {
            utm_source: urlParams.get('utm_source'),
            utm_medium: urlParams.get('utm_medium'),
            utm_campaign: urlParams.get('utm_campaign'),
            utm_term: urlParams.get('utm_term'),
            utm_content: urlParams.get('utm_content'),
            fbclid: urlParams.get('fbclid'),
            // Sometimes Pixel ID is passed explicitly in custom campaigns
            meta_pixel_id: urlParams.get('pixel_id')
        };

        // Filter out null/undefined values
        const cleanData = Object.fromEntries(
            Object.entries(attributionData).filter(([_, v]) => v != null)
        );

        if (Object.keys(cleanData).length > 0) {
            // Merge with existing data (giving preference to new data)
            const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
            const merged = { ...existing, ...cleanData, timestamp: new Date().toISOString() };

            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            console.log('📊 GSA Attribution Captured:', merged);
        }
    } catch (error) {
        console.error('Error in GSA Tracker:', error);
    }
};

export const getAttributionData = () => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
};

export const clearAttributionData = () => {
    sessionStorage.removeItem(STORAGE_KEY);
};
