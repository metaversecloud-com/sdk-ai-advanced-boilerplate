export function getBaseUrl(host: string) {
  const protocol = process.env.INSTANCE_PROTOCOL;
  let baseUrl;

  if (host === "localhost") {
    baseUrl = `http://localhost:3001`;
  } else {
    baseUrl = `${protocol}://${host}`;
  }

  return baseUrl;
}
