/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

type SvgComponentProps = React.SVGProps<SVGSVGElement> & {
  title?: string | undefined
}
type SvgComponent = React.FunctionComponent<SvgComponentProps>
