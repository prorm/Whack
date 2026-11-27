import type { ComponentType } from 'react'
import { PracticalArena } from './PracticalArena'
import { FieldScars } from './FieldScars'
import { Forge } from './Forge'
import { Passport2, PublicProof2 } from './Passport'
import { LAB_NAV, PROOF_NAV, Shell, SubNav, TEACH_NAV } from '../sp/Sp'
import type { CapableRoute, Route } from '../router'
import './capable.css'

// The practical labs live inside the one CAPABLE frame: labs under Learn, receipts under Proof, lab notes under Teach.
const pages: Record<CapableRoute, { tab: string; nav: readonly [string, readonly { route: Route; text: string }[]] | null; Page: ComponentType }> = {
  capable: { tab: 'learn', nav: ['Practical labs', LAB_NAV], Page: PracticalArena },
  'capable-forge': { tab: 'learn', nav: ['Practical labs', LAB_NAV], Page: Forge },
  'capable-scars': { tab: 'teach', nav: ['Teach', TEACH_NAV], Page: FieldScars },
  'capable-proof': { tab: 'passport', nav: ['Proof Passport', PROOF_NAV], Page: Passport2 },
  'capable-public': { tab: '', nav: null, Page: PublicProof2 },
}
export type { CapableRoute }

export default function Capable({ route }: { route: CapableRoute }) {
  const { tab, nav, Page } = pages[route]
  return <Shell tab={tab} bare={!nav}>
    <div className="c2">
      {nav && <SubNav label={nav[0]} items={[...nav[1]]} />}
      <Page key={location.hash} />
    </div>
  </Shell>
}
