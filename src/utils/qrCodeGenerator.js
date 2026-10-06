const generateQR = async (text) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=50&data=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`QR code request failed (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
};

export default generateQR;
