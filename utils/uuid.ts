import { base58 } from "@scure/base";
import { parse as uuid2Bytes, v7 } from "uuid";

export const uuid = () => v7();

export const newToken = () => {
  const uuidBytes = uuid2Bytes(uuid());
  const randomBytes = new Uint8Array(13);
  crypto.getRandomValues(randomBytes);
  const bytes = new Uint8Array([...uuidBytes, ...randomBytes]);
  return base58.encode(bytes);
};
