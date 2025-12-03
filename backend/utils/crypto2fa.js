import crypto from "crypto";

const ALGO = "aes-256-gcm";

const hexKey = process.env.TOTP_SECRET_KEY || "";

if (!hexKey) {
  throw new Error("TOTP_SECRET_KEY is not set in environment variables");
}

const KEY = Buffer.from(hexKey, "hex");

// 32 bytes key required for aes-256-gcm
if (KEY.length !== 32) {
  throw new Error(
    "TOTP_SECRET_KEY must be a 64-char hex string (32 bytes)"
  );
}

export const encryptTOTPSecret = (plainSecret) => {
  const iv = crypto.randomBytes(12); // recommended IV size for GCM
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainSecret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
};

export const decryptTOTPSecret = (encryptedObject) => {
  if (!encryptedObject) return null;

  const { iv, authTag, ciphertext } = encryptedObject;

  const ivBuf = Buffer.from(iv, "base64");
  const authTagBuf = Buffer.from(authTag, "base64");
  const cipherBuf = Buffer.from(ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGO, KEY, ivBuf);
  decipher.setAuthTag(authTagBuf);

  const decrypted = Buffer.concat([
    decipher.update(cipherBuf),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};