export default class Service {

  #url

  constructor ({ url }) {
    this.#url = url
  }


  async uploadFile ({ fileBuffer, fileName }) {
    const formData = new FormData()
    formData.append(fileName, fileBuffer)
    const response = await fetch(this.#url, { method: 'POST', body: formData })
    return response
  }

}