RSVP = require 'rsvp'

module.exports = 
  toPng: ->
    new RSVP.Promise (resolve, reject) =>
      # Draw the pixels to the canvas
      canvas = document.createElement('canvas')
      canvas.width = @width()
      canvas.height = @height()
      context = canvas.getContext('2d')

      imageData = context.getImageData(0, 0, @width(), @height())
      pixelData = imageData.data

      pixelData[i] = pixel for pixel, i in @pixelData

      context.putImageData(imageData, 0, 0)

      # Create the image and set the source to the
      # canvas data URL.
      image = new Image()
      image.width = @width()
      image.height = @height()
      image.src = canvas.toDataURL 'image/png'

      resolve(image)

  saveAsPng: ->
    throw "Not available in the browser. Use toPng() instead."