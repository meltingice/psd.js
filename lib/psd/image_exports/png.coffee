fs = require 'fs'
{Png} = require 'png'
RSVP = require 'rsvp'

module.exports =
  toPng: ->
    new RSVP.Promise (resolve, reject) =>
      png = new Png(new Buffer(@pixelData), @width(), @height(), 'rgba')

      console.log "Encoding!"
      png.encode(resolve)

  saveAsPng: (output) ->
    new RSVP.Promise (resolve, reject) =>
      @toPng()
        .then (image) ->
          console.log "Writing!"
          fs.writeFile output, image.toString('binary'), 'binary', resolve
          
