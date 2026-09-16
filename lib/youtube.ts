/** Acepta un link de YouTube en cualquier formato (o ya el ID puro) y devuelve solo el ID. */
export function extraerYoutubeId(input: string): string {
  const v = input.trim();
  if (!v) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

  try {
    const url = new URL(v);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] ?? "";
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] ?? "";
    return url.searchParams.get("v") ?? "";
  } catch {
    return "";
  }
}

export function youtubeThumbnail(idOrUrl: string): string {
  const id = extraerYoutubeId(idOrUrl);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

export function youtubeEmbedUrl(idOrUrl: string): string {
  const id = extraerYoutubeId(idOrUrl);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}
