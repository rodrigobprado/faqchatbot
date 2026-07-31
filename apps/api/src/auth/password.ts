import * as argon2 from "argon2";

export const hashPassword = (plainText: string): Promise<string> => argon2.hash(plainText);

export const verifyPassword = (hash: string, plainText: string): Promise<boolean> =>
  argon2.verify(hash, plainText);
