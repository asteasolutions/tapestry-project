export interface SvgIconProps extends SvgComponentProps {
  Icon: SvgComponent
  size?: number
}

export function SvgIcon({ Icon, size, ...svgProps }: SvgIconProps) {
  return <Icon aria-hidden width={size} height={size} {...svgProps} />
}
