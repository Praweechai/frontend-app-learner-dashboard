// ELMP Classroom messages (S-74, F-100, doc 05 CA-09/10, doc 03 §6 targets).
import { useCallback, useEffect, useState } from 'react';
import { getPortalClient } from '@elmp/classroom-kit';

export const POLL_MS = 5 * 60 * 1000;

// Notification target → Classroom route (doc 03 §6). `portal` targets carry their own URL.
export function targetPath(target) {
  switch (target?.kind) {
    // Plan 4: the home page lists deadlines in one card (S-90) → scroll to it
    case 'assignment': return { path: '/', hash: '#cls3-dl' };
    case 'certificate': return { path: '/certificates', hash: target.code ? `#cert-${target.code}` : '' };
    case 'portal': return { href: target.url };
    default: return { path: '/', hash: '' };
  }
}

export function useUnreadCount(initial = 0) {
  const [unread, setUnread] = useState(initial);
  useEffect(() => { setUnread(initial); }, [initial]);

  const poll = useCallback(async () => {
    if (document.visibilityState === 'hidden') { return; }
    try {
      const res = await getPortalClient().unreadCount();
      setUnread(res?.data?.unread ?? 0);
    } catch (e) { /* quiet: the bell keeps its last value (NFR-C8) */ }
  }, []);

  useEffect(() => {
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') { poll(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [poll]);

  return [unread, setUnread, poll];
}

export function useMessageList(open) {
  const [state, setState] = useState({
    items: [], cursor: null, loading: false, error: false,
  });

  const load = useCallback(async (cursor) => {
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const res = await getPortalClient().notifications(cursor);
      setState((s) => ({
        items: cursor ? [...s.items, ...(res?.data || [])] : (res?.data || []),
        cursor: res?.meta?.next_cursor || null,
        loading: false,
        error: false,
      }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => { if (open) { load(null); } }, [open, load]);

  const markRead = useCallback(async (item) => {
    const now = new Date().toISOString();
    setState((s) => ({
      ...s, items: s.items.map((n) => (n.id === item.id ? { ...n, read_at: n.read_at || now } : n)),
    }));
    try { await getPortalClient().markRead(item.id); } catch (e) { /* the next poll corrects the count */ }
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setState((s) => ({ ...s, items: s.items.map((n) => ({ ...n, read_at: n.read_at || now })) }));
    try { await getPortalClient().markAllRead(); } catch (e) { /* idem */ }
  }, []);

  return {
    ...state, reload: () => load(null), loadMore: () => load(state.cursor), markRead, markAllRead,
  };
}
