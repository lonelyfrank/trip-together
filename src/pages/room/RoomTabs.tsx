import { useSearchParams } from 'react-router-dom'
import SwipePager from '../../components/SwipePager'
import { isTabId, TAB_IDS, TAB_LABELS, type TabId } from '../../lib/tabs'
import AutoPage from './tabs/AutoPage'
import BachecaPage from './tabs/BachecaPage'
import RadarPage from './tabs/RadarPage'
import SpesePage from './tabs/SpesePage'
import StanzaPage from './tabs/StanzaPage'

// Le cinque tab della stanza dentro il pager. Import statici: mentre il dito
// trascina, la tab vicina deve essere già pronta, non un fallback di Suspense.

const PAGES: Record<TabId, () => React.ReactNode> = {
  stanza: () => <StanzaPage />,
  auto: () => <AutoPage />,
  bacheca: () => <BachecaPage />,
  spese: () => <SpesePage />,
  radar: () => <RadarPage />,
}

export default function RoomTabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  const index = TAB_IDS.indexOf(isTabId(tab) ? tab : 'stanza')

  return (
    <SwipePager
      count={TAB_IDS.length}
      index={index}
      onIndexChange={(next) =>
        setSearchParams(
          (params) => {
            params.set('tab', TAB_IDS[next])
            return params
          },
          { replace: true },
        )
      }
      labelFor={(i) => TAB_LABELS[TAB_IDS[i]]}
      renderPage={(i) => <div className="tab-page mx-auto max-w-[430px]">{PAGES[TAB_IDS[i]]()}</div>}
    />
  )
}
