export function createKeyedSingleFlight<K, T>() {
  const pending = new Map<K, Promise<T>>();

  return {
    run(key: K, task: () => Promise<T>): Promise<T> {
      const existing = pending.get(key);
      if (existing) return existing;

      const promise = Promise.resolve()
        .then(task)
        .finally(() => {
          if (pending.get(key) === promise) pending.delete(key);
        });
      pending.set(key, promise);
      return promise;
    },
  };
}

export function createRequestSequence() {
  let sequence = 0;
  return {
    begin() {
      sequence += 1;
      return sequence;
    },
    invalidate() {
      sequence += 1;
      return sequence;
    },
    isCurrent(value: number) {
      return sequence === value;
    },
    current() {
      return sequence;
    },
  };
}
