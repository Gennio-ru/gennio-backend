export function buildPublicUrl(
  key?: string | null,
  bucket?: string | null
): string | null {
  if (!key) return null;

  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  const endpoint =
    process.env.YANDEX_S3_ENDPOINT ?? "https://storage.yandexcloud.net";

  const cleanEndpoint = endpoint.replace(/\/+$/, "");
  const cleanBucket = (bucket ?? process.env.YANDEX_S3_BUCKET ?? "").replace(
    /^\/+|\/+$/g,
    ""
  );
  const cleanKey = key.replace(/^\/+/, "");

  return `${cleanEndpoint}/${cleanBucket}/${cleanKey}`;
}
