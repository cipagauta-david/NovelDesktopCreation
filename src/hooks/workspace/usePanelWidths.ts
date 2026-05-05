import { useState, useCallback, useEffect } from 'react'
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
