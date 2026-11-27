import type { ComponentType } from 'react'
import type { OsRoute, Route } from '../../router'
import { LAB_NAV, ORG_NAV, Shell, SubNav } from '../../sp/Sp'
import { AiPair } from './AiPair'
import { CodeLab, DataLab } from './Labs'
import { Demand, Exchange, Gps } from './Os'
import '../../capable/capable.css'
import './os.css'

const pages: Record<OsRoute, { tab: string; light?: boolean; nav?: [string, { route: Route; text: string }[]]; Page: ComponentType }> = {
  gps: { tab: 'learn', Page: Gps },
  codelab: { tab: 'learn', nav: ['Practical labs', LAB_NAV], Page: CodeLab },
  datalab: { tab: 'learn', nav: ['Practical labs', LAB_NAV], Page: DataLab },
  ailab: { tab: 'learn', nav: ['Practical labs', LAB_NAV], Page: AiPair },
  exchange: { tab: 'jobs', Page: Exchange },
  demand: { tab: '', light: true, nav: ['Organization', ORG_NAV], Page: Demand },
}

export default function OsPage({ route }: { route: OsRoute }) {
  const { tab, light, nav, Page } = pages[route]
  return <Shell tab={tab} light={light}>
    <div className="c2 os-wrap">
      {nav && <SubNav label={nav[0]} items={nav[1]} />}
      <Page key={location.hash} />
    </div>
  </Shell>
}
