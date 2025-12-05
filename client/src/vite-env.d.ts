/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

type SvgComponentProps = React.SVGProps<SVGSVGElement> & {
  title?: string | undefined
}
type SvgComponent = React.FunctionComponent<SvgComponentProps>

interface LaunchParams {
  files: FileSystemHandle[]
  targetURL: string
}

interface Window {
  launchQueue?: {
    setConsumer: (callback: (params: LaunchParams) => void) => void
  }
}
