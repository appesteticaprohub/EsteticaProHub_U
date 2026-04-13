'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

export default function ConditionalHeader() {
  const pathname = usePathname()
  
  if (pathname === '/banned') return null
  
  return <Header />
}