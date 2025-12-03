import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.TOTP_SECRET_KEY || "fh38F92ks9jLhgdshjgjhdh72889hjscnj9f0f1c2d3e4f506172839b3c4d5e6f708192a3b4c5d6e7hghjhjghjgjhgjhgjhx6ut76yu76yf76", "hex");

// 32 bytes key required for aes-256-gcm
if (!KEY || KEY.length !== 32) {
  console.log(KEY.length);
  throw new Error(
    "TOTP_SECRET_KEY must be a 64-char hex string (32 bytes) in env"
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

  // store iv + authTag + ciphertext (all base64)
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