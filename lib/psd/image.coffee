{Module}    = require 'coffeescript-module'

ImageFormat = require './image_format.coffee'
ImageMode   = require './image_mode.coffee'
Export      = require './image_export.coffee'

module.exports = class Image extends Module
  @includes ImageFormat.RAW
  @includes ImageFormat.RLE
  @includes ImageMode.Greyscale
  @includes ImageMode.RGB
  @includes ImageMode.CMYK
  @includes Export.PNG
  
  COMPRESSIONS = [
    'Raw'
    'RLE'
    'ZIP'
    'ZIPPrediction'
  ]

  constructor: (@file, @header) ->
    @numPixels = @width() * @height()
    @numPixels *= 2 if @depth() is 16

    @calculateLength()

    @channelData = []
    @pixelData = []
    @opacity = 1.0
    @hasMask = false

    @startPos = @file.tell()
    @endPos = @startPos + @length

    @setChannelsInfo()

  for attr in ['width', 'height', 'channels', 'depth', 'mode'] then do (attr) =>
    @::[attr] = -> @header[attr]

  setChannelsInfo: ->
    switch @mode()
      when 1 then @setGreyscaleChannels()
      when 3 then @setRgbChannels()
      when 4 then @setCmykChannels()

  calculateLength: ->
    @length = switch @depth()
      when 1 then (@width() + 7) / 8 * @height()
      when 16 then @width() * @height() * 2
      else @width() * @height()

    @channelLength = @length
    @length *= @channels()

  parse: ->
    @compression = @parseCompression()

    if @compression in [2, 3]
      @file.seek @endPos
      return

    @parseImageData()

  parseCompression: -> @file.readShort()
    
  parseImageData: ->
    switch @compression
      when 0 then @parseRaw()
      when 1 then @parseRLE()
      when 2, 3 then @parseZip()
      else @file.seek(@endPos)

    @processImageData()

  processImageData: ->
    switch @mode()
      when 1 then @combineGreyscaleChannel()
      when 3 then @combineRgbChannel()
      when 4 then @combineCmykChannel()

    @channelData = null
