export default function buildStoreKey(kind: "email" | "phone", value: string) {
  return `${kind}:${value}`;
}
