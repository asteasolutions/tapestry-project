import { ComponentProps, createElement } from 'react'
import ConcreteWallImage from '../../assets/images/landing-page/concrete-wall.png'

export type PositionedComponentElement = keyof React.JSX.IntrinsicElements

type PositionedComponentProps<T extends PositionedComponentElement = 'div'> = ComponentProps<T> & {
  component?: T
  top?: number | string
  left?: number | string
  right?: number | string
  bottom?: number | string
  width?: number | string
  height?: number | string
  rotation?: number
}

export function PositionedComponent<T extends PositionedComponentElement = 'div'>({
  component,
  top,
  left,
  right,
  bottom,
  width,
  height,
  rotation,
  children,
  style,
  ...rest
}: PositionedComponentProps<T>) {
  const toCssValue = (value?: number | string) => {
    return typeof value === 'number' ? `${value}px` : value
  }

  return createElement(component ?? 'div', {
    style: {
      position: 'absolute',
      top: toCssValue(top),
      left: toCssValue(left),
      right: toCssValue(right),
      bottom: toCssValue(bottom),
      width: toCssValue(width),
      height: toCssValue(height),
      rotate: rotation && `${rotation}deg`,
      ...style,
    },
    ...rest,
    children,
  })
}

interface PositionedCircleProps extends Omit<
  PositionedComponentProps,
  'height' | 'width' | 'component'
> {
  diameter: number
  backgroundColor: string
}

export function PositionedCircle({
  backgroundColor,
  diameter,
  style,
  ...props
}: PositionedCircleProps) {
  return (
    <PositionedComponent
      width={diameter}
      height={diameter}
      style={{
        backgroundColor,
        borderRadius: '50%',
        ...style,
      }}
      {...props}
    />
  )
}

export function ConcreteWall({ style, ...props }: Omit<PositionedComponentProps, 'component'>) {
  return (
    <PositionedComponent
      style={{
        background: `url(${ConcreteWallImage})`,
        ...style,
      }}
      {...props}
    />
  )
}

export function PositionedImage({ ...props }: Omit<PositionedComponentProps<'img'>, 'component'>) {
  return <PositionedComponent component="img" draggable={false} {...props} />
}

interface PositionedMaskProps extends Omit<PositionedComponentProps, 'component'> {
  src: string
  backgroundColor: string
}

export function PositionedMask({ src, backgroundColor, style, ...props }: PositionedMaskProps) {
  return (
    <PositionedComponent
      style={{
        mask: `url(${src}) no-repeat center / contain`,
        WebkitMask: `url(${src}), no-repeat center / contain`,
        backgroundColor,
        ...style,
      }}
      {...props}
    />
  )
}
