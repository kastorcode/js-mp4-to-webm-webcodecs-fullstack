import CanvasRenderer from './canvasRenderer.js'
import MP4Demuxer from './mp4Demuxer.js'
import Service from './service.js'
import VideoProcessor from './videoProcessor.js'
import { API_URL } from '../app/config.js'
import WebMWriter from '../deps/webm-writer2.js'


const HD = { width: 1280, height: 720 }
const QVGA = { width: 320, height: 240 }
const VGA = { width: 640, height: 480 }

const encoderConfig = {
  // WebM
  ...QVGA,
  bitrate: 10e6,
  codec: 'vp09.00.10.08',
  hardwareAcceleration: 'prefer-software',
  pt: 4
}

const webmWriterConfig = {
  bitrate: encoderConfig.bitrate,
  codec: 'VP9',
  height: encoderConfig.height,
  width: encoderConfig.width
}

const videoProcessor = new VideoProcessor({
  mp4Demuxer: new MP4Demuxer(),
  service: new Service({ url: API_URL }),
  webmWriter: new WebMWriter(webmWriterConfig)
})


onmessage = async function ({ data }) {
  await videoProcessor.start({
    encoderConfig,
    download: data.download,
    file: data.file,
    renderFrame: CanvasRenderer.getRenderer(data.canvas),
    sendMessage: message => self.postMessage(message)
  })
}