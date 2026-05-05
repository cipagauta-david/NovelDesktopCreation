import { useCallback, useRef } from 'react'

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
