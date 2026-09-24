// Deliberately mixed so the percentage is non-trivial and stable across
// compiler versions: 8 covered identifiers, 4 uncovered `any`s.
export const typed: number = 1;
export const alsoTyped: string = "two";

export function add(a: number, b: number): number {
  return a + b;
}

export const untyped: any = { nope: true };

export function loose(x: any) {
  return x.whatever;
}
