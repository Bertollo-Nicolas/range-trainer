'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function MobileRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Détecter si on est sur mobile (largeur < 1024px)
    const isMobile = window.innerWidth < 1024
    
    // Si on est sur mobile et pas déjà sur /trainer
    if (isMobile && !pathname.startsWith('/trainer')) {
      router.push('/trainer')
    }
  }, [router, pathname])

  return null
}