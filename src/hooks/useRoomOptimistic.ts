import { useQueryClient } from '@tanstack/react-query'
import { createOptimisticRollback } from '../lib/optimisticRollback'
import { mutate } from '../lib/db'
import type { Op } from '../lib/mutations/room'
import { showToast } from '../lib/toast'
import { roomDataKey, type RoomPayload } from './useRoomData'

/**
 * Mutazione ottimistica sulla cache della stanza: applica subito l'effetto in
 * cache, esegue la scrittura, e su errore inverte solo le righe/campi modificati
 * mostrando un toast con "Riprova". Al successo, la patch realtime (STEP 3b)
 * riconcilia lo stato reale. Se offline, `mutate` accoda l'Op (STEP 4c) e
 * torna senza errore: l'aggiornamento ottimistico resta applicato finché la
 * coda non lo rimpiazza col dato reale al ritorno online. `make` è una
 * FACTORY dell'Op così il Riprova può ricrearlo (i builder supabase non sono
 * riutilizzabili).
 */
export function useRoomOptimistic(roomId: string) {
  const queryClient = useQueryClient()

  return async function optimistic(
    label: string,
    apply: (prev: RoomPayload) => RoomPayload,
    make: () => Op<unknown>,
    errorMessage = 'Modifica non salvata.',
  ): Promise<void> {
    const key = roomDataKey(roomId)
    await queryClient.cancelQueries({ queryKey: key })
    const snapshot = queryClient.getQueryData<RoomPayload>(key)

    const applied = snapshot ? apply(snapshot) : undefined
    const revert = snapshot && applied ? createOptimisticRollback(snapshot, applied) : null
    queryClient.setQueryData(key, applied)

    const { error } = await mutate(label, make())
    if (error) {
      queryClient.setQueryData<RoomPayload>(key, (current) => current && revert ? revert(current) : current)
      // Riconcilia anche eventuali cancellazioni concorrenti della stessa riga.
      void queryClient.invalidateQueries({ queryKey: key })
      showToast(errorMessage, 'error', {
        label: 'Riprova',
        onClick: () => optimistic(label, apply, make, errorMessage),
      })
    }
  }
}
