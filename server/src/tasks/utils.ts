import { exec as nodeExec } from 'child_process'

export function exec(cmd: string) {
  return new Promise<string>((resolve, reject) => {
    nodeExec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout)
    })
  })
}
