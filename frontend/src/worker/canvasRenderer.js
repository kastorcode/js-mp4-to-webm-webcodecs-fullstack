export default class CanvasRenderer {

  /** @type {OffscreenCanvas} */
  static _canvas
  /** @type {OffscreenCanvasRenderingContext2D} */
  static _context


  /**
   * @param {VideoFrame} frame 
   */
  static _draw (frame) {
    const { displayHeight, displayWidth } = frame
    this._canvas.height = displayHeight
    this._canvas.width = displayWidth
    this._context.drawImage(frame, 0, 0, displayWidth, displayHeight)
    frame.close()
  }


  /**
   * @param {OffscreenCanvas} canvas 
   */
  static getRenderer (canvas) {
    this._canvas = canvas
    this._context = canvas.getContext('2d')
    let pendingFrame = null
    return function (frame) {
      function renderAnimationFrame () {
        CanvasRenderer._draw(pendingFrame)
        pendingFrame = null
      }
      if (!pendingFrame) requestAnimationFrame(renderAnimationFrame)
      else pendingFrame.close()
      pendingFrame = frame
    }
  }

}