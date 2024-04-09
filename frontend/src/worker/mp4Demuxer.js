import { createFile, DataStream } from '../deps/mp4box.0.5.2.js'


export default class MP4Demuxer {

  #file
  #onChunk
  #onConfig


  #description ({ id }) {
    const track = this.#file.getTrackById(id)
    for (const entry of track.mdia.minf.stbl.stsd.entries) {
      const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C
      if (box) {
        const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN)
        box.write(stream)
        return new Uint8Array(stream.buffer, 8)
      }
    }
    throw new Error('avcC, hvcC, vpcC, or av1C box not found')
  }


  /**
   * @param {ReadableStream} stream 
   */
  #init (stream) {
    let _offset = 0
    return stream.pipeTo(new WritableStream({
      /** @param {Uint8Array} chunk */
      write: chunk => {
        const { buffer } = chunk
        buffer.fileStart = _offset
        this.#file.appendBuffer(buffer)
        _offset += chunk.length
      },
      close: () => {
        this.#file.flush()
      }
    }))
  }


  #onReady (info) {
    const [track] = info.videoTracks
    this.#onConfig({
      codec: track.codec,
      codedHeight: track.video.height,
      codedWidth: track.video.width,
      description: this.#description(track),
      durationSecs: info.duration / info.timescale
    })
    this.#file.setExtractionOptions(track.id)
    this.#file.start()
  }


  #onSamples (trackId, ref, samples) {
    for (const sample of samples) {
      this.#onChunk(new EncodedVideoChunk({
        type: sample.is_sync ? 'key' : 'delta',
        timestamp: 1e6 * sample.cts / sample.timescale,
        duration: 1e6 * sample.duration / sample.timescale,
        data: sample.data
      }))
    }
  }


  /**
   * @param {ReadableStream} stream 
   * @param {object} options 
   * @param {(config : object) => void} options.onConfig 
   * @returns {Promise<void>}
   */
  async run (stream, { onChunk, onConfig }) {
    this.#onChunk = onChunk
    this.#onConfig = onConfig
    this.#file = createFile()
    this.#file.onReady = this.#onReady.bind(this)
    this.#file.onSamples = this.#onSamples.bind(this)
    return this.#init(stream)
  }

}