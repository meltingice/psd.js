module.exports =
  # Blending ranges let you control which pixels from this layer and which
  # pixels from the underlying layers appear in the final image. This describes
  # the ranges in both greyscale and for each color channel.
  parseBlendingRanges: ->
    length = @file.readInt()
    if length == 0
      return

    @blendingRanges.grey =
      source:
        black: [@file.readByte(), @file.readByte()]
        white: [@file.readByte(), @file.readByte()]
      dest:
        black: [@file.readByte(), @file.readByte()]
        white: [@file.readByte(), @file.readByte()]

    numChannels = (length - 8) / 8
    
    @blendingRanges.channels = []
    for i in [0...numChannels]
      @blendingRanges.channels.push
        source:
          black: [@file.readByte(), @file.readByte()]
          white: [@file.readByte(), @file.readByte()]
        dest:
          black: [@file.readByte(), @file.readByte()]
          white: [@file.readByte(), @file.readByte()]
