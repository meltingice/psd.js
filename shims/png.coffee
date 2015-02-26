RSVP = require 'rsvp'

module.exports = 
  toBase64: ->
    # Draw the pixels to the canvas
    canvas = document.createElement('canvas')
    canvas.width = @width()
    canvas.height = @height()
    context = canvas.getContext('2d')

    imageData = context.getImageData(0, 0, @width(), @height())
    pixelData = imageData.data

    pixelData[i] = pixel for pixel, i in @pixelData

    context.putImageData(imageData, 0, 0)

    canvas.toDataURL 'image/png'

  toPng: ->
    dataUrl = @toBase64()
    # Create the image and set the source to the
    # canvas data URL.
    image = new Image()
    image.width = @width()
    image.height = @height()
    image.src = dataUrl

    image

  saveAsPng: ->
    throw "Not available in the browser. Use toPng() instead."
