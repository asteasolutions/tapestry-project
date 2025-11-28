import { useEffect, useState } from 'react'
import { useTapestryData } from './tapestry-providers'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { mul, ORIGIN } from 'tapestry-core/src/lib/geometry'

export function ViewportDebugData({ debug }: { debug: boolean }) {
  const {
    transform: { translation, scale },
    size,
  } = useTapestryData('viewport', ['transform', 'size'])
  const [pointerCoords, setPointerCoords] = useState(ORIGIN)

  const scaledTranslation = mul(-1 / scale, translation)
  const scaledSize = { width: size.width / scale, height: size.height / scale }
  const pointerInViewport = {
    x: pointerCoords.x / scale + scaledTranslation.dx,
    y: pointerCoords.y / scale + scaledTranslation.dy,
  }

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      setPointerCoords({ x: event.x, y: event.y })
    }

    if (debug) {
      document.addEventListener('mousemove', onMouseMove)
    }

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [debug])

  return !debug ? null : (
    <Text
      variant="bodySm"
      style={{
        backgroundColor: 'white',
        padding: '0px 16px',
        boxShadow: 'var(--box-shadow)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div>
        Viewport coordinates:{' '}
        <span style={{ fontFamily: 'Monaco, mono', fontSize: 12 }}>
          ({scaledTranslation.dx.toFixed(0)}, {scaledTranslation.dy.toFixed(0)}) - (
          {(scaledTranslation.dx + scaledSize.width).toFixed(0)},{' '}
          {(scaledTranslation.dy + scaledSize.height).toFixed(0)})
        </span>
      </div>
      <div>
        Translation:{' '}
        <span style={{ fontFamily: 'Monaco, mono', fontSize: 12 }}>
          ({translation.dx.toFixed(0)}, {translation.dy.toFixed(0)})
        </span>
        , Scale:{' '}
        <span style={{ fontFamily: 'Monaco, mono', fontSize: 12 }}>{scale.toFixed(2)}</span>,
        Pointer:{' '}
        <span style={{ fontFamily: 'Monaco, mono', fontSize: 12 }}>
          ({pointerInViewport.x.toFixed(0)}, {pointerInViewport.y.toFixed(0)})
        </span>
      </div>
    </Text>
  )
}
