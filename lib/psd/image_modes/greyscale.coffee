module.exports =
  setGreyscaleChannels: ->
    @channelsInfo = [{id: 0}]
    @channelsInfo.push {id: -1} if @channels() is 2

  combineGreyscaleChannel: ->
    for i in [0...@numPixels]
      grey = @channelData[i]
      alpha = if @channels() is 2
        @channelData[@channelLength + i]
      else
        255

      @pixelData.set([grey, grey, grey, alpha], i*4)
