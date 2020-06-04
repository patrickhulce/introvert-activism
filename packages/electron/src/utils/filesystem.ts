import * as fs from 'fs'
import * as path from 'path'

export function findFrontendDirectory(): string {
  return findDirectory('frontend', directory => [
    path.join(directory, 'frontend', 'dist'),
    path.join(directory, 'packages', 'frontend', 'dist'),
  ])
}

export function findDirectory(
  name: string,
  generateOptionsFn: (dir: string) => string[],
  extraConditionFn?: (dir: string) => boolean,
): string {
  let directory = path.join(__dirname, '../')
  for (let attempt = 0; attempt < 100; attempt++) {
    const dirOptions = generateOptionsFn(directory)
    for (const dir of dirOptions) {
      if (fs.existsSync(dir)) {
        if (extraConditionFn && !extraConditionFn(dir)) continue
        return dir
      }
    }

    const lastDir = directory
    directory = path.join(directory, '../')
    if (lastDir === directory) throw new Error(`Unable to locate ${name} directory`)
  }

  throw new Error(`Unable to locate ${name} directory`)
}
