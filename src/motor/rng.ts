/** Sorteio com semente: mesma entrada + mesma semente = mesmo layout. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export type Rng = () => number

/** hash estável de qualquer sequência (semente + id da sala, por exemplo) */
export function hash(...p: (string | number)[]) {
  let h = 2166136261
  for (const ch of p.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export const pick = <V,>(rng: Rng, xs: readonly V[]) => xs[Math.floor(rng() * xs.length)]
export function shuffle<V>(rng: Rng, xs: readonly V[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
/** id curto aleatório (não depende da semente: é só identidade) */
export const uid = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)
