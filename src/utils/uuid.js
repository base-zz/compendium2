export function generateUuid() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);

  buffer[6] = (buffer[6] & 0x0f) | 0x40;
  buffer[8] = (buffer[8] & 0x3f) | 0x80;

  const hex = Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
