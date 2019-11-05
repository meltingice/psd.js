_ = require 'lodash'
iconv = require 'iconv-lite'
Util = require './util.coffee'
Layer = require './layer.coffee'

# The layer mask is the overarching data structure that describes both
# the layers/groups in the PSD document, and the global mask.
# This part of the document is ordered as such:
# 
# * Layers
# * Layer images
# * Global Mask
# 
# The file does not need to have a global mask. If there is none, then
# its length will be zero.
module.exports = class LayerMask
  constructor: (@file, @header) ->
    @layers = []
    @mergedAlpha = false
    @globalMask = null
    @patterns = []
    @textInfo = []
    
  skip: -> @file.seek @file.readInt(), true

  parse: ->
    maskSize = @file.readInt()
    finish = maskSize + @file.tell()

    return if maskSize <= 0

    @parseLayers()
    @parseGlobalMask()

    # The layers are stored in the reverse order that we would like them. In other
    # words, they're stored bottom to top and we want them top to bottom.
    @layers.reverse()

    while @file.pos < finish and !@file.data[@file.pos]
      @file.seek 1, true

    while @file.pos < finish and @file.readString(4) == '8BIM'
      str = @file.readString(4)
      sectionLen = @file.readInt()
      endSection = ((sectionLen + 3) & ~3) + @file.tell()
      if sectionLen > 0
        @file.seek -4, true
        switch str
          when 'Patt', 'Pat2', 'Pat3' then @parsePatterns()
          when 'Txt2'                 then @parseTextInfo()
        @file.seek endSection
            
    @file.seek finish

  parseLayers: ->
    layerInfoSize = Util.pad2 @file.readInt()

    if layerInfoSize > 0
      layerCount = @file.readShort()

      if layerCount < 0
        layerCount = Math.abs layerCount
        @mergedAlpha = true

      for i in [0...layerCount]
        @layers.push new Layer(@file, @header).parse()

      layer.parseChannelImage() for layer in @layers

  parseGlobalMask: ->
    length = @file.readInt()
    return if length <= 0

    maskEnd = @file.tell() + length + 3

    @globalMask = _({}).tap (mask) =>
      mask.overlayColorSpace = @file.readShort()
      mask.colorComponents = [
        @file.readShort() >> 8
        @file.readShort() >> 8
        @file.readShort() >> 8
        @file.readShort() >> 8
      ]

      mask.opacity = @file.readShort() / 16.0

      # 0 = color selected, 1 = color protected, 128 = use value per layer
      mask.kind = @file.readByte()

    @file.seek maskEnd

  getPatternAsPNG: (pattern) ->
    canvas = document.createElement('canvas')
    canvas.width = pattern.width
    canvas.height = pattern.height
    ctx = canvas.getContext('2d')
    imageData = ctx.createImageData(pattern.width, pattern.height)
    pixelData = imageData.data
    numPixels = pattern.width * pattern.height
    nbChannels = pattern.data.slice(0,24).length
    for i in [0...numPixels]
      r = g = b = 0
      a = 255

      for chan in [0...nbChannels]
        channelData = pattern.data[chan]
        val = channelData[i]

        switch chan
          when 0 then  r = val
          when 1 then  g = val
          when 2 then  b = val
          when 3 then a = val
      pixelData.set([r, g, b, a], i*4)

      if pattern.data[24]
        channelData = pattern.data[24]
        for i in [0...numPixels]
          val = channelData[i]
          pixelData[i*4 + 3] = val    
    ctx.putImageData(imageData, 0, 0)
    canvas.toDataURL("image/png")

  parsePatterns: ->
    file = @file
    patterns = @patterns
    getPatternAsPNG = @getPatternAsPNG
    readVirtualMemoryArrayList = ->
      file.seek 4, true # version
      VMALEnd = file.readInt() + file.tell()
      pattern = {top: file.readInt(), left: file.readInt(), bottom: file.readInt(), right : file.readInt(), channels: file.readInt(), data: []}
      pattern.width = pattern.right - pattern.left
      pattern.height = pattern.bottom - pattern.top
      pattern.toURL = () ->
        getPatternAsPNG(@)
      for i in [0...pattern.channels+2]
        lineIndex = 0
        chanPos = 0
        if !file.readInt()
          continue
        l = file.readInt()
        endChannel =  l + file.tell()
        depth = file.readInt()
        file.readInt()
        file.readInt()
        file.readInt()
        file.readInt()
        file.readShort()
        compressed = file.readByte()
        if compressed
          byteCounts = []
          pattern.data[i] = new Uint8Array(pattern.width*pattern.height)
          for j in [0...pattern.height]
            byteCounts.push(file.readShort());
          for j in [0...pattern.height]
            finish = file.tell() + byteCounts[lineIndex + j]
            while file.tell() < finish
              len = file.read(1)[0]
              if len < 128
                len += 1
                data = file.read(len)          
                pattern.data[i].set data, chanPos
                chanPos += len
              else if len > 128
                len ^= 0xff
                len += 2
                val = file.read(1)[0]
                pattern.data[i].fill(val, chanPos, chanPos+len)
                chanPos += len
          lineIndex += pattern.height
        else
          pattern.data[i] = new Uint8Array(file.read(l-23))
        file.seek endChannel
      file.seek VMALEnd
      pattern
      
    readPattern = ->
      patternEnd = ((file.readInt() + 3) & ~3) + file.tell()     
      file.seek 4, true # version
      mode = file.readInt()
      point = [file.readShort(), file.readShort()]
      pattern = {name: file.readUnicodeString(), id: file.readString(file.readByte()), palette: []}
      if mode == 2
        pattern.palette = file.read(256*3)
      pattern.data = readVirtualMemoryArrayList()
      patterns.push(pattern)
      file.seek patternEnd

    patternsEnd = file.readInt() + file.tell()
    readPattern() while file.tell() < patternsEnd 
    
  parseTextInfo: ->
    textInfoLen = @file.readInt()
    if !textInfoLen
      return
    endTextInfo = ((textInfoLen + 3) & ~3) + @file.tell()
    rawText = ""
    c = ''
    pc
    while 1
      if @file.pos >= endTextInfo
        break
      pc = c
      c = @file.readString(1)
      if c == '(' and pc == ' '
        d = []
        l = 0;
        while @file.pos+l < endTextInfo and (@file.data[@file.pos+l] != ')'.charCodeAt(0) or @file.data[@file.pos+l+1] != 32 or @file.data[@file.pos+l-1] == '\\'.charCodeAt(0))
          if !['('.charCodeAt(0), ')'.charCodeAt(0)].includes(@file.data[@file.pos+l+1]) || @file.data[@file.pos+l] != '\\'.charCodeAt(0)
            d.push(@file.data[@file.pos+l])
          l++
        @file.seek l+2, true
        rawText += ' "' + iconv.decode(new Buffer(d), 'utf16').replace(/\u0000/g, "").replace(/\t/gm, "\\t").replace(/\r/gm, "\\r").replace(/\n/gm, "\\n") + '",'
      else if c == "<" and @file.data[@file.pos] == "<".charCodeAt(0)      
        rawText += '{'
        @file.seek 1, true
      else if c == ">" and @file.data[@file.pos] == ">".charCodeAt(0)      
        rawText += '},'
        @file.seek 1, true
      else if c == "]"      
        rawText += '],'
      else if c == "." and [' ', '-'].includes(pc)      
        rawText += '0.'
      else
        rawText += c
    @textInfo = JSON.parse(('{'+rawText+'}').replace(/ ?\/([\d]+)/g, "\"$1\":").replace(/\/([\w]+) ?/g,"\"$1\",").replace(/(false ?|true ?)/g, '$1,').replace(/"nil ?"/g, 'null,').replace(/([-\.\d]+) ?/g, "$1, ").replace(/, ?(,|}|\])/gm,"$1").replace(/\u0003/gm,"\\u0003").replace(/\u2029/gm,"\\u2029").replace(/"([\d]+), "/g,'"$1"'))
