module.exports = class Image
  constructor: (@file, @header) ->
    @width = @header.width
    @height = @header.height

  parse: ->
    console.log "parse!"
    