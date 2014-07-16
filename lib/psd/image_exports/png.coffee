fs = require 'fs'
{Png} = require 'png'
RSVP = require 'rsvp'

module.exports =
  toPng: ->
    new RSVP.Promise (resolve, reject) =>
      png = new Png(new Buffer(@pixelData), @width(), @height(), 'rgba')
      png.encode(resolve)

  saveAsPng: (output) ->
    new RSVP.Promise (resolve, reject) =>
      @toPng()
        .then (image) ->
          fs.writeFile output, image.toString('binary'), 'binary', resolve
          
