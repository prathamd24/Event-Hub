import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

/**
 * Fire a telemetry event to the backend.
 * Silent — never throws, never blocks the UI.
 *
 * @param {string} event_type   e.g. 'PAGE_VIEW' | 'LOGIN' | 'EVENT_VIEW'
 * @param {string|null} entity_type  e.g. 'EVENT' | 'CLUB' | 'COLLEGE'
 * @param {number|null} entity_id
 * @param {object} extra_data   arbitrary metadata (page path, search query, etc.)
 * @param {number|null} college_id
 */
export function trackEvent(event_type, entity_type = null, entity_id = null, extra_data = {}, college_id = null) {
    try {
        api.post('/api/telemetry/ingest', {
            event_type,
            entity_type,
            entity_id,
            college_id,
            extra_data,
        }).catch(() => {});   // fire-and-forget
    } catch (_) {
        // silent fail
    }
}

/**
 * Hook: auto-fires PAGE_VIEW on every route change.
 * Place this once near the top of your router tree.
 */
export function useTelemetry() {
    const location = useLocation();

    useEffect(() => {
        trackEvent('PAGE_VIEW', null, null, {
            page: location.pathname,
            search: location.search || undefined,
        });
    }, [location.pathname]);
}
