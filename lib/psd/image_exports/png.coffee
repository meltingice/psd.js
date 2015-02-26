fs = require 'fs'
{PNG} = require 'pngjs'
RSVP = require 'rsvp'

module.exports =
  toPng: ->
    png = new PNG(filterType: 4, width: @width(), height: @height())
    png.data = @pixelData
    png

  saveAsPng: (output) ->
    new RSVP.Promise (resolve, reject) =>
      @toPng()
        .pack()
        .pipe(fs.createWriteStream(output))
        .on 'finish', resolve
