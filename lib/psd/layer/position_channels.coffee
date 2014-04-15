module.exports =
  parsePositionAndChannels: ->
    @top = @file.readInt()
    @left = @file.readInt()
    @bottom = @file.readInt()
    @right = @file.readInt()
    @channels = @file.readShort()

    @rows = @height = @bottom - @top
    @cols = @width = @right - @left

    for i in [0...@channels]
      id = @file.readShort()
      length = @file.readInt()

      @channelsInfo.push id: id, length: length
