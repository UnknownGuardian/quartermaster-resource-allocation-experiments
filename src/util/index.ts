const jStat = require("jstat");

export function mean(arr: number[]): number {
  return jStat.mean(arr);
}

export function bound(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}


export class SeededMath {
  private static rand: () => number;

  static reseed(): void {
    const seed = this.xmur3("quartermaster")
    SeededMath.rand = this.sfc32(seed(), seed(), seed(), seed())
  }
  static random(): number {
    if (!SeededMath.rand) {
      SeededMath.reseed();
    }
    return SeededMath.rand() as number;
  }
  private static xmur3(str: string): () => number {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
        h = h << 13 | h >>> 19;
    return function () {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^= h >>> 16) >>> 0;
    }
  }
  private static sfc32(a: number, b: number, c: number, d: number): () => number {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
  }
}


