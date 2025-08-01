import { Metadata } from 'next'
import { MindClient } from './mind-client'

export const metadata: Metadata = {
  title: 'PokerMind+ - Range Trainer',
  description: 'Dashboard mental pour améliorer votre jeu et votre mindset poker',
}

export default function MindPage() {
  return <MindClient />
}