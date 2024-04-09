import { IncomingMessage, ServerResponse } from 'node:http'
import { pipeline } from 'node:stream/promises'

import ConcatenateVideos from './concatenateVideos.js'
import { HEADERS } from './config.js'
import UploadHandler from './uploadHandler.js'
import { logger } from './util.js'


export default class Routes {

  #downloadsFolder

  constructor ({ downloadsFolder }) {
    this.#downloadsFolder = downloadsFolder
  }


  async options (request, response) {
    response.writeHead(204, HEADERS)
    response.end()
  }


  get (request, response) {
    response.writeHead(200, { Connection: 'close' })
    response.end(`
      <html>
        <head><title>File Upload</title></head>
        <body>
          <form method="POST" enctype="multipart/form-data">
            <input type="file" name="filefield" /><br />
            <input type="text" name="textfield" /><br />
            <input type="submit" />
          </form>
        </body>
      </html>`
    )
  }


  async post (request, response) {
    const { headers } = request
    const redirectTo = headers.origin

    const uploadHandler = new UploadHandler({
      downloadsFolder: this.#downloadsFolder
    })

    const onFinish = (response, redirectTo) => () => {
      response.writeHead(200, HEADERS)
      response.end('Files uploaded with success!')
    }

    const busboy = uploadHandler
      .registerEvents(headers, onFinish(response, redirectTo))

    await pipeline(request, busboy)
    logger.info('Request finished with success!')
  }


  /**
   * @param {IncomingMessage} request 
   * @param {ServerResponse} response 
   */
  async put (request, response) {
    let body = ''
    request.on('data', chunk => body += chunk)
    request.on('end', () => {
      const files = ConcatenateVideos.getFiles({
        downloadsFolder: this.#downloadsFolder, name: body
      })
      if (files) {
        response.writeHead(200, HEADERS)
        response.end(body)
        ConcatenateVideos.run({
          downloadsFolder: this.#downloadsFolder, files
        })
      }
      else {
        response.writeHead(400, HEADERS)
        response.end()
      }
    })
  }

}