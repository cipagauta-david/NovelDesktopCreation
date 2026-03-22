import { useState, useCallback, useEffect, useRef } from 'react'
import type { PanelWidths } from '../../types/workspace'

const STORAGE_KEY = 'novel-panel-widths'

// Valores por defecto
const DEFAULT_WIDTHS: PanelWidths = {
	sidebar: 320,
	inspector: 340,
}

// Límites
const MIN_WIDTH = 200
const MAX_WIDTH = 1000

export function usePanelWidths(initialWidths?: PanelWidths) {
	const [widths, setWidths] = useState<PanelWidths>(() => {
		// Primero intenta cargar del localStorage
		if (typeof window !== 'undefined') {
			try {
				const stored = localStorage.getItem(STORAGE_KEY)
				if (stored) {
					const parsed = JSON.parse(stored) as PanelWidths
					// Validar que los valores sean razonables
					if (typeof parsed.sidebar === 'number' && typeof parsed.inspector === 'number') {
						return {
							sidebar: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed.sidebar)),
							inspector: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed.inspector)),
						}
					}
				}
			} catch {
				// Ignorar errores de parsing
			}
		}
		// Si no hay nada guardado, usa los iniciales o los defaults
		return initialWidths ?? DEFAULT_WIDTHS
	})

	// Persistir cuando cambian los anchos
	useEffect(() => {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
			} catch {
				// Ignorar errores de quota
			}
		}
	}, [widths])

	const setSidebarWidth = useCallback((width: number) => {
		setWidths((prev) => ({
			...prev,
			sidebar: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)),
		}))
	}, [])

	const adjustSidebarWidth = useCallback((delta: number) => {
		setWidths((prev) => ({
			...prev,
			sidebar: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, prev.sidebar + delta)),
		}))
	}, [])

	const setInspectorWidth = useCallback((width: number) => {
		setWidths((prev) => ({
			...prev,
			inspector: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)),
		}))
	}, [])

	const adjustInspectorWidth = useCallback((delta: number) => {
		setWidths((prev) => ({
			...prev,
			inspector: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, prev.inspector + delta)),
		}))
	}, [])

	const resetWidths = useCallback(() => {
		setWidths(DEFAULT_WIDTHS)
	}, [])

	return {
		widths,
		setSidebarWidth,
		adjustSidebarWidth,
		setInspectorWidth,
		adjustInspectorWidth,
		resetWidths,
		MIN_WIDTH,
		MAX_WIDTH,
	}
}

// Componente de resize handle
type ResizeHandleProps = {
	side: 'left' | 'right'
	onResize: (delta: number) => void
	onResizeEnd: () => void
}

export function ResizeHandle({ side, onResize, onResizeEnd }: ResizeHandleProps) {
	const isDragging = useRef(false)
	const lastPos = useRef(0)
	// Keep stable refs so the mousemove/mouseup closures always call the latest callback
	const onResizeRef = useRef(onResize)
	const onResizeEndRef = useRef(onResizeEnd)
	onResizeRef.current = onResize
	onResizeEndRef.current = onResizeEnd

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault()
			isDragging.current = true
			lastPos.current = e.clientX

			const handleMouseMove = (moveEvent: MouseEvent) => {
				if (!isDragging.current) return
				const delta = side === 'left'
					? moveEvent.clientX - lastPos.current
					: lastPos.current - moveEvent.clientX
				lastPos.current = moveEvent.clientX
				onResizeRef.current(delta)
			}

			const handleMouseUp = () => {
				isDragging.current = false
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('mouseup', handleMouseUp)
				document.body.style.cursor = ''
				document.body.style.userSelect = ''
				onResizeEndRef.current()
			}

			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
		},
		[side],
	)

	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={`Ajustar ancho del panel ${side === 'left' ? 'izquierdo' : 'derecho'}`}
			onMouseDown={handleMouseDown}
			style={{
				position: 'absolute',
				[side === 'left' ? 'right' : 'left']: 0,
				top: 0,
				bottom: 0,
				width: 6,
				cursor: 'col-resize',
				zIndex: 50,
				background: 'transparent',
				transition: 'background 0.15s',
			}}
			className={`panel-resize-handle panel-resize-handle-${side}`}
		/>
	)
}
