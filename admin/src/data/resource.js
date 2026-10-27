// Memory-only, scoped to one signed-in admin. Concurrent consumers share a read.
export function createResource(load, maxAge = 60000) {
  let snapshot = { data: null, error: null, loading: false };
  let pending = null;
  let loadedAt = 0;
  let revision = 0;
  const listeners = new Set();
  const publish = (next) => {
    snapshot = next;
    listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh(force = false) {
      if (pending) return pending;
      if (!force && snapshot.data !== null && Date.now() - loadedAt < maxAge) {
        return Promise.resolve(snapshot.data);
      }
      const requestRevision = revision;
      publish({ ...snapshot, loading: true, error: null });
      const request = Promise.resolve().then(load).then(data => {
        if (requestRevision === revision) {
          loadedAt = Date.now();
          publish({ data, error: null, loading: false });
        }
        return data;
      }, error => {
        if (requestRevision === revision) publish({ ...snapshot, error, loading: false });
        throw error;
      }).finally(() => {
        if (pending === request) pending = null;
      });
      pending = request;
      return request;
    },
    update(change) {
      // A read started before a successful write must not overwrite that write.
      revision++;
      pending = null;
      publish({ data: change(snapshot.data || []), error: null, loading: false });
    }
  };
}
