import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const derivePasswordHash = (password: string, salt: string): string =>
  scryptSync(password, salt, 64).toString("hex");

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = derivePasswordHash(password, salt);

  return `${salt}:${derivedKey}`;
};

export const verifyPassword = (password: string, storedHash: string): boolean => {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(derivePasswordHash(password, salt), "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
