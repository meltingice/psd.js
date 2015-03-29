module.exports =
  setRgbChannels: ->
    @channelsInfo = [
      {id: 0}
      {id: 1}
      {id: 2}
    ]

    @channelsInfo.push {id: -1} if @channels() is 4

  combineRgbChannel: ->
    rgbChannels = @channelsInfo
      .map (ch) -> ch.id
      .filter (ch) -> ch >= -1 # Mask data is -2

    for i in [0...@numPixels]
      r = g = b = 0
      a = 255

      for chan, index in rgbChannels
        val = @channelData[i + (@channelLength * index)]

        switch chan
          when -1 then a = val
          when 0 then  r = val
          when 1 then  g = val
          when 2 then  b = val

      @pixelData.push r, g, b, a
