import { mkdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PORT } from './config.js'
import Routes from './routes.js'
import { logger } from './util.js'


const dirName = fileURLToPath(new URL(import.meta.url))
const downloadsFolder = join(dirName, '../../', 'downloads')


function requestListener (request, response) {
  async function defaultRoute (request, response) {
    response.end('Hello, World!')
  }
  const routes = new Routes({ downloadsFolder })
  const chosen = routes[request.method.toLowerCase()] || defaultRoute
  return chosen.apply(routes, [request, response])
}


const server = createServer(requestListener)

await rm(downloadsFolder, { recursive: true, force: true })
await mkdir(downloadsFolder)


server.listen(PORT, () => {
  logger.info(`Server running at ${PORT}`)
})