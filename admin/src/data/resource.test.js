import { createResource } from './resource';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('concurrent readers and fresh tab visits share one request', async () => {
  const load = jest.fn().mockResolvedValue(['catalog']);
  const resource = createResource(load);
  const first = resource.refresh();
  expect(resource.refresh()).toBe(first);
  await first;
  expect(await resource.refresh()).toEqual(['catalog']);
  expect(load).toHaveBeenCalledTimes(1);
});

test('stale refresh preserves visible data and recovers from network failure', async () => {
  const load = jest.fn().mockResolvedValueOnce(['catalog']).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['updated']);
  const resource = createResource(load, 0);
  await resource.refresh();
  const refresh = resource.refresh();
  expect(resource.getSnapshot()).toMatchObject({ data: ['catalog'], loading: true });
  await expect(refresh).rejects.toThrow('offline');
  expect(resource.getSnapshot().data).toEqual(['catalog']);
  await resource.refresh();
  expect(resource.getSnapshot()).toEqual({ data: ['updated'], error: null, loading: false });
});

test('a slow pre-mutation read cannot overwrite a confirmed edit', async () => {
  const oldRead = deferred();
  const resource = createResource(() => oldRead.promise);
  const request = resource.refresh();
  resource.update(() => [{ id: '1', available: false }]);
  oldRead.resolve([{ id: '1', available: true }]);
  await request;
  expect(resource.getSnapshot().data).toEqual([{ id: '1', available: false }]);
});

test('data is isolated between signed-in providers', async () => {
  const first = createResource(async () => ['first account']);
  const second = createResource(async () => ['second account']);
  await first.refresh();
  expect(second.getSnapshot().data).toBeNull();
  await second.refresh();
  expect(second.getSnapshot().data).toEqual(['second account']);
});
