_           = require 'lodash'
Image       = require './image.coffee'
ImageFormat = require './image_format.coffee'

module.exports = class ChannelImage extends Image
  @includes ImageFormat.LayerRAW
  @includes ImageFormat.LayerRLE

  constructor: (file, header, @layer) ->
    @_width = @layer.width
    @_height = @layer.height

    super(file, header)

    @channelsInfo = @layer.channelsInfo
    @hasMask = _.any @channelsInfo, (c) -> c.id < -1
    @opacity = @layer.opacity / 255.0
    @maskData = []

  skip: ->
    for chan in @channelsInfo
      @file.seek chan.length, true

  width: -> @_width
  height: -> @_height
  channels: -> @layer.channels

  parse: ->
    @chanPos = 0
    for chan in @channelsInfo
      if chan.length <= 0
        @parseCompression()
        continue

      @chan = chan

      if chan.id < -1
        @_width = @layer.mask.width
        @_height = @layer.mask.height
      else
        @_width = @layer.width
        @_height = @layer.height

      @length = @_width * @_height
      start = @file.tell()

      @parseImageData()

      finish = @file.tell()

      if finish isnt start + @chan.length
        @file.seek(start + @chan.length)

    @_width = @layer.width
    @_height = @layer.height

    @processImageData()

  parseImageData: ->
    @compression = @parseCompression()

    switch @compression
      when 0 then @parseRaw()
      when 1 then @parseRLE()
      when 2, 3 then @parseZip()
      else @file.seek(@endPos)
