const CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function toBase62(n: number): string {
  if (n === 0) return CHARS[0];
  let result = "";
  while (n > 0) {
    result = CHARS[n % 62] + result;
    n = Math.floor(n / 62);
  }
  return result;
}
