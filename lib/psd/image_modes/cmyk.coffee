Color = require '../color.coffee'
module.exports =
  setCmykChannels: ->
    @channelsInfo = [
      { id: 0 },
      { id: 1 },
      { id: 2 },
      { id: 3 }
    ]

    @channelsInfo.push { id: -1 } if @channels() is 5

  combineCmykChannel: ->
    cmykChannels = @channelsInfo
      .map (ch) -> ch.id
      .filter (ch) -> ch >= -1

    for i in [0...@numPixels]
      c = m = y = k = 0
      a = 255

      for chan, index in cmykChannels
        val = @channelData[i + (@channelLength * index)]

        switch chan
          when -1 then a = val
          when 0 then c = val
          when 1 then m = val
          when 2 then y = val
          when 3 then k = val

      [r, g, b] = Color.cmykToRgb(255 - c, 255 - m, 255 - y, 255 - k)
      @pixelData.set([r, g, b, a], i*4)

    @readMaskData(cmykChannels)

