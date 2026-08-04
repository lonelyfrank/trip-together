import type { PostgrestError } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { mutate } from '../lib/db'
import { showToast } from '../lib/toast'
import { roomDataKey, type RoomPayload } from './useRoomData'

type Builder = PromiseLike<{ data?: unknown; error: PostgrestError | null }>

/**
 * Mutazione ottimistica sulla cache della stanza: applica subito l'effetto in
 * cache, esegue la scrittura, e su errore fa rollback allo snapshot precedente
 * mostrando un toast con "Riprova". Al successo, la patch realtime (STEP 3b)
 * riconcilia lo stato reale. `make` è una FACTORY del builder così il Riprova
 * può ricrearlo (i builder supabase non sono riutilizzabili).
 */
export function useRoomOptimistic(roomId: string) {
  const queryClient = useQueryClient()

  return async function optimistic(
    label: string,
    apply: (prev: RoomPayload) => RoomPayload,
    make: () => Builder,
    errorMessage = 'Modifica non salvata.',
  ): Promise<void> {
    const key = roomDataKey(roomId)
    await queryClient.cancelQueries({ queryKey: key })
    const snapshot = queryClient.getQueryData<RoomPayload>(key)

    queryClient.setQueryData<RoomPayload>(key, (prev) => (prev ? apply(prev) : prev))

    const { error } = await mutate(label, make())
    if (error) {
      queryClient.setQueryData(key, snapshot) // rollback
      showToast(errorMessage, 'error', {
        label: 'Riprova',
        onClick: () => optimistic(label, apply, make, errorMessage),
      })
    }
  }
}
