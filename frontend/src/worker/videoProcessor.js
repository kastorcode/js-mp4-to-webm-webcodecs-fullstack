export default class VideoProcessor {

  #buffers = []
  #mp4Demuxer
  #service
  #webmWriter

  /**
   * @param {object} options 
   * @param {import('./mp4Demuxer.js').default} options.mp4Demuxer 
   * @param {import('./service.js').default} options.service 
   * @param {import('../deps/webm-writer2.js').default} options.webmWriter 
   */
  constructor ({ mp4Demuxer, service, webmWriter }) {
    this.#mp4Demuxer = mp4Demuxer
    this.#service = service
    this.#webmWriter = webmWriter
  }


  convertToWebM () {
    const writable = new WritableStream({
      close: () => {
        debugger
      },
      write: frame => {
        this.#webmWriter.addFrame(frame)
      }
    })
    return {
      readable: this.#webmWriter.getStream(), writable
    }
  }


  encodeQVGA (encoderConfig) {
    let encoder
    const readable = new ReadableStream({
      start: async controller => {
        const { supported } = await VideoEncoder.isConfigSupported(encoderConfig)
        if (!supported) {
          controller.error(`VideoEncoder config not supported\n\n${JSON.stringify(encoderConfig)}\n`)
        }
        encoder = new VideoEncoder({
          error: error => controller.error(error),
          output: (frame, config) => {
            if (config.decoderConfig) {
              const decoderConfig = {
                type: 'config',
                config: config.decoderConfig
              }
              controller.enqueue(decoderConfig)
            }
            controller.enqueue(frame)
          }
        })
        encoder.configure(encoderConfig)
      }
    })
    const writable = new WritableStream({
      write: async frame => {
        encoder.encode(frame)
        frame.close()
      }
    })
    return {
      readable, writable
    }
  }


  mp4Decoder (stream) {
    return new ReadableStream({
      start: async (controller) => {
        const decoder = new VideoDecoder({
          error (error) {
            controller.error(error)
          },
          /** @param {VideoFrame} frame */
          output (frame) {
            controller.enqueue(frame)
          }
        })
        return this.#mp4Demuxer.run(stream, {
          /** @param {EncodedVideoChunk} chunk */
          onChunk (chunk) {
            decoder.decode(chunk)
          },
          async onConfig (config) {
            const { supported } = await VideoDecoder.isConfigSupported(config)
            if (!supported) {
              controller.close()
              throw new Error(`VideoDecoder config not supported\n\n${JSON.stringify(config)}\n`)
            }
            decoder.configure(config)
          }
        })
      }
    })
  }


  renderDecodedFrameAndGetEncodedChunk (renderFrame) {
    let decoder
    return new TransformStream({
      start: controller => {
        decoder = new VideoDecoder({
          error (error) {
            controller.error(error)
          },
          output (frame) {
            renderFrame(frame)
          }
        })
      },
      /**
       * @param {EncodedVideoChunk} encodedChunk 
       * @param {TransformStreamDefaultController} controller 
       */
      transform: async (encodedChunk, controller) => {
        if (encodedChunk.type === 'config') {
          decoder.configure(encodedChunk.config)
          return
        }
        decoder.decode(encodedChunk)
        controller.enqueue(encodedChunk)
      }
    })
  }


  async start ({ download, encoderConfig, file, renderFrame, sendMessage }) {
    const stream = file.stream()
    const fileName = file.name.split('/').pop().replace('.mp4', '')
    await this.mp4Decoder(stream)
      .pipeThrough(this.encodeQVGA(encoderConfig))
      .pipeThrough(this.renderDecodedFrameAndGetEncodedChunk(renderFrame))
      .pipeThrough(this.convertToWebM())
      .pipeThrough(new TransformStream({
        transform: ({ data, position }, controller) => {
          download && this.#buffers.push(data)
          controller.enqueue(data)
        }
      }))
      .pipeTo(this.upload(fileName, '240p', 'webm', () => {
        sendMessage({
          buffers: download ? this.#buffers : null,
          fileName: fileName.concat('-240p.webm'),
          status: 'done'
        })
      }))
    }


  upload (fileName, resolution, type, callback) {
    const chunks = []
    let byteCount = 0
    let segmentCount = 0
    const triggerUpload = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      chunks.length = 0
      byteCount = 0
      await this.#service.uploadFile({
        fileBuffer: blob,
        fileName: `${fileName}-${resolution}.${++segmentCount}.${type}`
      })
    }
    return new WritableStream({
      async close () {
        if (chunks.length) await triggerUpload()
        callback()
      },
      /**
       * @param {object} options 
       * @param {Uint8Array} options.data 
       */
      async write (data) {
        chunks.push(data)
        byteCount += data.byteLength
        if (byteCount <= 10e6) return
        await triggerUpload()
      }
    })
  }

}