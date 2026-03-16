import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { makeId } from "./crypto.js";
import {
  getR2AccessKeyId,
  getR2AccountId,
  getR2BucketName,
  getR2PublicBaseUrl,
  getR2SecretAccessKey,
  getR2SignedUrlExpirySeconds,
} from "./config.js";

type UploadTicketInput = {
  wineryId: string;
  fileName: string;
  contentType: string;
};

function slugifyFileName(value: string) {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "") || "image-upload";
}

function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return "";
  }
  return fileName.slice(lastDot).toLowerCase();
}

function buildClient() {
  const accountId = getR2AccountId();
  const accessKeyId = getR2AccessKeyId();
  const secretAccessKey = getR2SecretAccessKey();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function isMediaStorageConfigured() {
  return Boolean(
    getR2AccountId() &&
      getR2AccessKeyId() &&
      getR2SecretAccessKey() &&
      getR2BucketName() &&
      getR2PublicBaseUrl(),
  );
}

export async function createWineryImageUploadTicket(input: UploadTicketInput) {
  const client = buildClient();
  const bucket = getR2BucketName();
  const publicBaseUrl = getR2PublicBaseUrl();
  if (!client || !bucket || !publicBaseUrl) {
    throw new Error("R2 media storage is not configured.");
  }

  const safeName = slugifyFileName(input.fileName);
  const extension = getFileExtension(safeName);
  const objectKey = `wineries/${input.wineryId}/${Date.now()}-${makeId()}${extension}`;
  const expiresInSeconds = getR2SignedUrlExpirySeconds();
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: input.contentType,
    CacheControl: "public,max-age=31536000,immutable",
  });

  const uploadUrl = await getSignedUrl(client, putCommand, {
    expiresIn: expiresInSeconds,
  });

  return {
    objectKey,
    uploadUrl,
    publicUrl: `${publicBaseUrl.replace(/\/+$/, "")}/${objectKey}`,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

export async function assertWineryImageExists(objectKey: string) {
  const client = buildClient();
  const bucket = getR2BucketName();
  if (!client || !bucket) {
    throw new Error("R2 media storage is not configured.");
  }

  await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
}
