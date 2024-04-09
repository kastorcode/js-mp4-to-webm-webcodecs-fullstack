import { API_URL } from './config.js'
import View from './view.js'
import Clock from '../deps/clock.js'


const clock = new Clock()
const view = new View()
const worker = new Worker('../worker/worker.js', { type: 'module' })

let took = ''


view.onFileChange(file => {
  const canvas = view.getCanvas()
  worker.postMessage(
    { canvas, download: view.isToDownloadConvertedVideo(), file },
    [canvas]
  )
  clock.start(time => {
    took = time
    view.updateElapsed(`Process started ${time}`)
  })
})


worker.onerror = function (error) {
  console.error(error)
}


worker.onmessage = function ({ data }) {
  if (data.status !== 'done') return
  clock.stop()
  view.updateElapsed(`Process took ${took.replace('ago', '')}`)
  fetch(API_URL, { method: 'PUT', body: data.fileName })
  if (!data.buffers) return
  view.downloadBlobAsFile(data.buffers, data.fileName)
}