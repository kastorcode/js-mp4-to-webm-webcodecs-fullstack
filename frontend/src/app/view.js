export default class View {

  #btnUploadVideos = document.getElementById('btnUploadVideos')
  /** @type {HTMLCanvasElement} */
  #canvas = document.getElementById('preview')
  /** @type {HTMLInputElement} */
  #download = document.getElementById('download')
  #elapsed = document.getElementById('elapsed')
  #fileName = document.getElementById('fileName')
  #fileSize = document.getElementById('fileSize')
  #fileUpload = document.getElementById('fileUpload')
  #sample = document.getElementById('sample')
  #uploadContainer = document.getElementById('uploadContainer')
  #uploadInfo = document.getElementById('uploadInfo')


  constructor () {
    this.onBtnUploadVideosClick()
    this.onSampleClick()
  }


  downloadBlobAsFile (buffers, fileName) {
    const blob = new Blob(buffers, { type: 'video/webm' })
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    a.click()
    URL.revokeObjectURL(blobUrl)
  }


  getCanvas () {
    return this.#canvas.transferControlToOffscreen()
  }


  isToDownloadConvertedVideo () {
    return this.#download.checked
  }


  onBtnUploadVideosClick () {
    this.#btnUploadVideos.addEventListener('click', () => {
      this.#fileUpload.click()
    })
  }


  /**
   * @param {File} file 
   * @param {Function} callback 
   */
  onChange (file, callback) {
    const { name, size } = file
    this.#fileName.innerText = name
    this.#fileSize.innerText = this.parseBytesIntoMBandGB(size)
    this.#uploadContainer.classList.add('hide')
    this.#uploadInfo.classList.remove('hide')
    callback(file)
  }


  /**
   * @param {Function} callback 
   */
  onFileChange (callback) {
    this.#fileUpload.addEventListener('change', event =>
      this.onChange(event.target.files[0], callback)
    )
    this.#onUploadContainerDrop(callback)
  }


  onSampleClick (filePath = 'https://raw.githubusercontent.com/ErickWendel/semana-javascript-expert08/main/initial-template/app/videos/frag_bunny.mp4') {
    this.#sample.onclick = async () => {
      const response = await fetch(filePath)
      const file = new File([await response.blob()], filePath, {
        type: 'video/mp4', lastModified: Date.now()
      })
      const event = new Event('change')
      Reflect.defineProperty(event, 'target', {
        value: { files: [file] }
      })
      this.#fileUpload.dispatchEvent(event)
    }
  }


  /**
   * @param {Function} callback 
   */
  #onUploadContainerDrop (callback) {
    this.#uploadContainer.ondragover = event => {
      event.preventDefault()
      this.#uploadContainer.classList.add('ondrop')
    }
    this.#uploadContainer.ondragleave = event => {
      event.preventDefault()
      this.#uploadContainer.classList.remove('ondrop')
    }
    this.#uploadContainer.ondrop = event => {
      event.preventDefault()
      this.onChange(event.dataTransfer.files[0], callback)
    }
  }


  /**
   * @param {number} bytes 
   */
  parseBytesIntoMBandGB (bytes) {
    const mb = bytes / (1024 * 1024)
    // if mb is greater than 1024, then convert to GB
    if (mb > 1024) {
      // rount to 2 decimal places
      return `${Math.round(mb / 1024)}GB`
    }
    return `${Math.round(mb)}MB`
  }


  /**
   * @param {string} text 
   */
  updateElapsed (text) {
    this.#elapsed.innerText = text
  }
}