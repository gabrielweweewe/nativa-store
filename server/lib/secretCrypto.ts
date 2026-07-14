import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export type SecretEncryptionKey =
  | "MERCADO_PAGO_ENCRYPTION_KEY"
  | "BREVO_ENCRYPTION_KEY";

function encryptionKey(keyName: SecretEncryptionKey): Buffer {
  const source = process.env[keyName]?.trim();
  if (!source || source.length < 32) {
    throw new Error(`${keyName} deve ter pelo menos 32 caracteres`);
  }
  return createHash("sha256").update(source).digest();
}

export function encryptSecret(
  value: string,
  keyName: SecretEncryptionKey = "MERCADO_PAGO_ENCRYPTION_KEY"
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyName), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(
  value: string,
  keyName: SecretEncryptionKey = "MERCADO_PAGO_ENCRYPTION_KEY"
): string {
  const [version, ivRaw, tagRaw, payloadRaw] = value.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error("Segredo criptografado inválido");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyName),
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
