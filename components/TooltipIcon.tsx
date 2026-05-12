'use client'

// ══════════════════════════════════════════════════════════════════════════════
// components/TooltipIcon.tsx  —  Tooltip con posicionamiento adaptativo
//
// Usa getBoundingClientRect() + position:fixed para evitar que el tooltip
// quede cortado por los bordes del viewport, sea cual sea la posición del ícono.
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const TIP_WIDTH  = 272   // px — ancho del tooltip (w-68)
const TIP_GAP    = 8     // px — separación entre ícono y tooltip
const MARGIN     = 12    // px — margen mínimo respecto al borde del viewport

interface Pos { top: number; left: number }

function calcPos(rect: DOMRect, tipHeight: number): Pos {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Intentar a la derecha del ícono
  let left = rect.right + TIP_GAP
  let top  = rect.top + rect.height / 2 - tipHeight / 2

  // ¿Desborda por la derecha? → cambiar a la izquierda
  if (left + TIP_WIDTH > vw - MARGIN) {
    left = rect.left - TIP_GAP - TIP_WIDTH
  }

  // ¿Desborda por la izquierda? → centrar bajo el ícono
  if (left < MARGIN) {
    left = Math.min(Math.max(MARGIN, rect.left), vw - TIP_WIDTH - MARGIN)
    top  = rect.bottom + TIP_GAP
  }

  // Ajustar verticalmente para que no salga del viewport
  top = Math.max(MARGIN, Math.min(top, vh - tipHeight - MARGIN))

  return { top, left }
}

export default function TooltipIcon({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos]         = useState<Pos>({ top: 0, left: 0 })
  const btnRef  = useRef<HTMLButtonElement>(null)
  const tipRef  = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const show = useCallback(() => {
    if (!btnRef.current) return
    setVisible(true)
    // Calcular posición en el siguiente frame (cuando el tip ya tiene altura)
    requestAnimationFrame(() => {
      if (!btnRef.current) return
      const rect = btnRef.current.getBoundingClientRect()
      const tipH = tipRef.current?.offsetHeight ?? 80
      setPos(calcPos(rect, tipH))
    })
  }, [])

  const hide = useCallback(() => setVisible(false), [])

  // Recalcular si el viewport cambia de tamaño con el tooltip abierto
  useEffect(() => {
    if (!visible) return
    const recalc = () => {
      if (!btnRef.current) return
      const rect = btnRef.current.getBoundingClientRect()
      const tipH = tipRef.current?.offsetHeight ?? 80
      setPos(calcPos(rect, tipH))
    }
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, true)
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc, true)
    }
  }, [visible])

  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        ref={btnRef}
        onMouseEnter={show}
        onFocus={show}
        onMouseLeave={hide}
        onBlur={hide}
        className="w-4 h-4 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold
                   inline-flex items-center justify-center
                   hover:bg-blue-100 hover:text-blue-700 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-blue-400"
        tabIndex={-1}
        aria-label="Más información"
      >
        i
      </button>

      {mounted && visible && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top:  pos.top,
            left: pos.left,
            width: TIP_WIDTH,
            zIndex: 9999,
          }}
          className="p-3 bg-stone-800 text-white text-xs rounded-xl shadow-2xl leading-relaxed
                     pointer-events-none animate-in fade-in duration-100"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}
