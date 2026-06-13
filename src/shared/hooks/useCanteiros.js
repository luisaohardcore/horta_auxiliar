// src/shared/hooks/useCanteiros.js
import { useState, useEffect, useCallback } from 'react';
import { fetchCanteiros } from '../../features/canteiros/services/canteirosService.js';
import { logger } from '../utils/logger.js';

// Broadcast channel — notifies all useCanteiros instances when list changes
export const refreshCanteiros = () =>
  window.dispatchEvent(new CustomEvent('canteiros:updated'));

export function useCanteiros() {
  const [canteiros, setCanteiros] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(() => {
    fetchCanteiros()
      .then(data => {
        setCanteiros(data);
        logger.info('useCanteiros', 'loaded', { count: data.length });
      })
      .catch(err => logger.error('useCanteiros', 'error', { message: err.message }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('canteiros:updated', load);
    return () => window.removeEventListener('canteiros:updated', load);
  }, [load]);

  return { canteiros, loading };
}
