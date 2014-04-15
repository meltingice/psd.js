fs = require 'fs'
{Png} = require 'png'
RSVP = require 'rsvp'

module.exports =
  toPng: ->
    return @png if @png

    @png = new Png(new Buffer(@pixelData), @width(), @height(), 'rgba')

    new RSVP.Promise (resolve, reject) =>
      console.log "Encoding!"
      @png.encode(resolve)

  saveAsPng: (output) ->
    new RSVP.Promise (resolve, reject) =>
      @toPng()
        .then (image) ->
          console.log "Writing!"
          fs.writeFile output, image.toString('binary'), 'binary', resolve
          
