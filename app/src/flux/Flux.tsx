// FLUX views the product routes to: story episodes, revision reels and the Field Scars studio and review queue.
import { SolarEpisode } from './Episode'
import { PayEpisode } from './PayLab'
import { BlueprintEpisode } from './BlueprintEpisode'
import type { Blueprint } from './blueprint'
import EV from './blueprints/ev_charger.json'
import { Queue } from './Queue'
import { Reels } from './Reels'
import { Studio } from './Studio'
import './flux.css'

const VIEWS = { solar: SolarEpisode, pay: PayEpisode, reels: Reels, studio: Studio, queue: Queue, ev: () => <BlueprintEpisode bp={EV as unknown as Blueprint} /> }
export function Flux({ view }: { view: keyof typeof VIEWS }) {
  const View = VIEWS[view]
  return <div className="fx-root"><View /><div className="fx-grain" aria-hidden="true" /></div>
}
