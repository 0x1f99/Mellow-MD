export async function getLyrics(artist, song) {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Lyrics request failed (HTTP ${response.status})`);
    const data = await response.json();
    return data.lyrics;
  } catch (e) {
    return "err: Lyrics not found";
  }
}
