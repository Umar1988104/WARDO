import { SnowIcon, SunIcon, InnerIcon, AccessoryIcon } from './components/Icons.jsx'

export const SECTIONS = [
  { id: 'winter', label: 'Winter', hint: 'Jackets, sweaters, hoodies', Icon: SnowIcon, tone: 'blue' },
  { id: 'summer', label: 'Summer', hint: 'Tees, shorts, light layers', Icon: SunIcon, tone: 'amber' },
  { id: 'inner', label: 'Innerwear', hint: 'Basics and thermals', Icon: InnerIcon, tone: 'rose' },
  { id: 'accessories', label: 'Accessories', hint: 'Caps, belts, watches', Icon: AccessoryIcon, tone: 'mint' },
]

export const sectionById = (id) => SECTIONS.find((s) => s.id === id)
