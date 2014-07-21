_ = require 'lodash'
Image = require './image.coffee'

module.exports = class ChannelImage extends Image
  
  constructor: (file, header, @layer) ->
    @width = @layer.width
    @height = @layer.height

    super(file, header)

    @channelsInfo = @layer.channelsInfo
    @hasMask = _.any @channelsInfo, (c) -> c.id < -1
    @opacity = @layer.opacity / 255.0
    @maskData = []

  skip: ->
    for chan in @channelsInfo
      @file.seek chan.length, true

  channels: -> @layer.channels

  parse: ->
    @chanPos = 0
    for chan in @channelsInfo
      if chan.length <= 0
        @parseCompression()
        continue

      @chan = chan

      if chan.id < -1
        @width = @layer.mask.width
        @height = @layer.mask.height
      else
        @width = @layer.width
        @height = @layer.height

      @length = @width * @height
      start = @file.tell()

      @parseImageData()

      finish = @file.tell()

      if finish isnt start + @chan.length
        @file.seek(start + @chan.length)

    @width = @layer.width
    @height = @layer.height

    @processImageData()
