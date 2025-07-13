import { PrismaClient } from "@prisma/client";
import { v7, parse as uuidParse } from "uuid";
import { S3Client } from "bun";
import { base58 } from "@scure/base";

export const prisma = new PrismaClient();

export const uuid = () => v7();

export const newToken = () => {
  const uuidBytes = uuidParse(uuid());
  const randomBytes = new Uint8Array(13);
  crypto.getRandomValues(randomBytes);
  const bytes = new Uint8Array([...uuidBytes, ...randomBytes]);
  return base58.encode(bytes);
};

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT } = Bun.env;

export const s3 = new S3Client({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT,
  virtualHostedStyle: true,
});
