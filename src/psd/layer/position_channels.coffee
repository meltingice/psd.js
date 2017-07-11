module.exports =
  # Every layer starts with the basics. Here we have the layer dimensions,
  # the number of color channels for the image data, and information about
  # the color channels.
  parsePositionAndChannels: ->
    @top = @file.readInt()
    @left = @file.readInt()
    @bottom = @file.readInt()
    @right = @file.readInt()
    @channels = @file.readShort()

    @rows = @height = @bottom - @top
    @cols = @width = @right - @left

    # Every color channel has both an ID and a length. The ID correlates to
    # the color channel, e.g. 0 = R, 1 = G, 2 = B, -1 = A, and the length is
    # the size of the data.
    for i in [0...@channels]
      id = @file.readShort()
      length = @file.readInt()

      @channelsInfo.push id: id, length: length
