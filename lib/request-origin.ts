export function isSameOriginPost(request: Request) {
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  return Boolean(host && request.headers.get("origin") === `${protocol}://${host}`);
}
