'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TimeSightRoot() {
  const router = useRouter()
  useEffect(() => { router.replace('/timesight/data') }, [router])
  return null
}
