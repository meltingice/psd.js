fs = require 'fs'
{PNG} = require 'pngjs'
RSVP = require 'rsvp'

module.exports =
  toPng: ->
    new RSVP.Promise (resolve, reject) =>
      png = new PNG(filterType: 4, width: @width(), height: @height())

      png.data[i] = p for p, i in @pixelData
      resolve(png)

  saveAsPng: (output) ->
    new RSVP.Promise (resolve, reject) =>
      @toPng()
        .then (image) ->
          image.pack().pipe(fs.createWriteStream(output))
          resolve()
          
