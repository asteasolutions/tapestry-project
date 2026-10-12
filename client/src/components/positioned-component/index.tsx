import ConcreteWallImage from '../../assets/images/landing-page/concrete-wall.png'

interface PositionedComponentProps {
  top?: number
  left?: number
  right?: number
  bottom?: number
  width?: number
  height?: number
  rotation?: number
  style?: React.CSSProperties
}

function getPositionedComponentStyle({
  top,
  left,
  right,
  bottom,
  width,
  height,
  rotation,
  style,
}: PositionedComponentProps): React.CSSProperties {
  return {
    position: 'absolute',
    top: top && `${top}px`,
    left: left && `${left}px`,
    right: right && `${right}px`,
    bottom: bottom && `${bottom}px`,
    width: `${width}px`,
    height: `${height}px`,
    rotate: `${rotation}deg`,

    ...style,
  }
}

interface PositionedCircleProps extends Omit<PositionedComponentProps, 'height'> {
  backgroundColor: string
}

export function PositionedCircle({ backgroundColor, ...props }: PositionedCircleProps) {
  return (
    <div
      style={{
        ...getPositionedComponentStyle({ ...props, height: props.width }),
        backgroundColor,
        borderRadius: '50%',
      }}
    />
  )
}

export function ConcreteWall(props: PositionedComponentProps) {
  return (
    <div
      style={{
        background: `url(${ConcreteWallImage})`,
        ...getPositionedComponentStyle(props),
      }}
    />
  )
}

interface PositionedImageProps extends PositionedComponentProps {
  src: string
}

export function PositionedImage({ src, ...props }: PositionedImageProps) {
  return <img src={src} style={getPositionedComponentStyle(props)} draggable={false} />
}

interface PositionedMaskProps extends PositionedComponentProps {
  src: string
  backgroundColor: string
}

export function PositionedMask({ src, backgroundColor, ...props }: PositionedMaskProps) {
  return (
    <div
      style={{
        ...getPositionedComponentStyle(props),
        mask: `url(${src}) no-repeat center / contain`,
        WebkitMask: `url(${src}) no-repeat center / contain`,
        backgroundColor,
      }}
    />
  )
}
