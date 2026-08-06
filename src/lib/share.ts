// Condivisione nativa dove disponibile (mobile), altrimenti copia negli
// appunti. Usato sia per l'invito alla stanza sia per il link di recupero.
export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch {
      // annullata dall'utente o non consentita: ripiega sulla copia
    }
  }
  try {
    await navigator.clipboard.writeText(data.url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
