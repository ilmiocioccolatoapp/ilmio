// Product cards need thumbnails, not the original multi-megapixel upload.
// Keep existing transformations and version/public-id segments intact.
export function catalogImageUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'res.cloudinary.com' || !parsed.pathname.includes('/image/upload/')) return url;
    return url.replace('/image/upload/', '/image/upload/c_limit,w_640,q_auto,f_auto/');
  } catch {
    return url;
  }
}
