import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import Busboy from 'busboy'

import { logger } from './util.js'


export default class UploadHandler {

  #downloadsFolder

  /**
   * @param {object} params 
   * @param {string} params.downloadsFolder 
   */
  constructor ({ downloadsFolder }) {
    this.#downloadsFolder = downloadsFolder
  }


  registerEvents (headers, onFinish) {
    const busboy = Busboy({ headers })
    busboy.on('file', this.#onFile.bind(this))
    busboy.on('finish', onFinish)
    return busboy
  }


  async #onFile (name, file, { encoding, filename, mimeType }) {
    const saveFileTo = join(this.#downloadsFolder, name)
    logger.info(`Uploading: ${saveFileTo}`)
    await pipeline(file, createWriteStream(saveFileTo))
    logger.info(`File [${name}] finished!`)
  }

}