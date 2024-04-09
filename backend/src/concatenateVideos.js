import {
  createReadStream, createWriteStream, existsSync, readdirSync, unlinkSync
} from 'node:fs'
import { join } from 'node:path'


export default class ConcatenateVideos {

  /**
   * @param {object} params 
   * @param {string} params.downloadsFolder 
   * @param {string} params.name 
   */
  static getFiles ({ downloadsFolder, name }) {
    const filePath = join(downloadsFolder, name)
    if (existsSync(filePath)) unlinkSync(filePath)
    const [fileName] = name.split('.')
    const files = readdirSync(downloadsFolder)
      .filter(file => file.includes(fileName))
    if (files.length) {
      files.filePath = filePath
      return files
    }
    return null
  }


  /**
   * @param {object} params 
   * @param {string} params.downloadsFolder 
   * @param {string[]} params.files 
   */
  static run ({ downloadsFolder, files }) {
    let index = 0
    const lastIndex = files.length - 1
    const paths = []
    const write = createWriteStream(files.filePath)
    write.on('finish', () => {
      paths.forEach(path => unlinkSync(path))
    })
    const stream = () => {
      paths.push(join(downloadsFolder, files[index]))
      const read = createReadStream(paths[index])
      read.pipe(write, { end: index === lastIndex })
      read.on('end', () => {
        if (files[++index]) stream()
      })
    }
    stream()
  }

}