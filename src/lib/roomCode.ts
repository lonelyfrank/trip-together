const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Esclude i caratteri confondibili a voce.

export function generateRoomCode(length = 7): string {
  if (!Number.isInteger(length) || length < 1) throw new Error('Lunghezza del codice non valida.')
  let code = '', mask = 1
  while (mask < ALPHABET.length - 1) mask = (mask << 1) | 1
  const bytes = new Uint8Array(32)
  while (code.length < length) {
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      const index = byte & mask
      if (index < ALPHABET.length) code += ALPHABET[index]
      if (code.length === length) break
    }
  }
  return code
}
