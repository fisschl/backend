import { PrismaClient } from "@prisma/client";
import { v7 ,parse as uuidParse} from "uuid";
import { base58 ,} from "@scure/base";

export const prisma = new PrismaClient();

export const uuid = () => v7();

export const newToken = () => {
  const uuidBytes = uuidParse(uuid());
  const randomBytes = new Uint8Array(13);
  crypto.getRandomValues(randomBytes);
  const bytes = new Uint8Array([...uuidBytes, ...randomBytes]);
  return base58.encode(bytes);
};
