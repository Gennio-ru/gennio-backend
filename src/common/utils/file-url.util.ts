export function buildPublicUrl(
  key?: string | null,
  bucket?: string | null
): string | null {
  if (!key || !bucket) return null;

  const baseUrl = process.env.YANDEX_S3_ENDPOINT;

  return `${baseUrl}/${bucket}/${key}`;
}
