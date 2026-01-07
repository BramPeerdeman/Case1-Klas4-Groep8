export const getImageUrl = (url: string | undefined | null) => {
  // 1. Geen URL? Geef een placeholder terug
  if (!url) {
    return "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg";
  }

  // 2. Is het al een volledige link (bijv. oude data, externe link of blob preview)?
  if (url.startsWith("http") || url.startsWith("blob:")) {
    return url;
  }

  // 3. Het is een relatief pad (uit de backend upload), plak de server URL ervoor
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
  
  // Zorg dat we geen dubbele slashes krijgen //
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;

  return `${cleanBase}${cleanUrl}`;
};