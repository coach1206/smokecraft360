import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { logger } from "./logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env["DATA_ENCRYPTION_KEY"];
  if (!raw || raw.length < 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be set (minimum 32 chars)");
  }
  return Buffer.from(raw.slice(0, 32), "utf8");
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptField(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final("utf8");
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function tryEncrypt(value: string): string {
  try {
    return encryptField(value);
  } catch (err) {
    logger.error({ err }, "encryption unavailable — refusing to store plaintext");
    throw new Error("Encryption is required but DATA_ENCRYPTION_KEY is not configured");
  }
}

export function tryDecrypt(value: string): string {
  try {
    return decryptField(value);
  } catch {
    return value;
  }
}
