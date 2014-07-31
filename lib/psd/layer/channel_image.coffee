ChannelImage = require '../channel_image.coffee'
LazyExecute  = require '../lazy_execute.coffee'

module.exports =
  parseChannelImage: ->
    image = new ChannelImage(@file, @header, @)
    @image = new LazyExecute(image, @file)
      .now('skip')
      .later('parse')
      .get()
