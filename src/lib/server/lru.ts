// Tiny bounded LRU with TTL (Map keeps insertion order).
export class Lru<V> {
  private map = new Map<string, { at: number; v: V }>();
  constructor(private max: number, private ttlMs: number) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.v;
  }

  set(key: string, v: V) {
    this.map.delete(key);
    this.map.set(key, { at: Date.now(), v });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
}
