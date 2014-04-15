module.exports =
  parseBlendingRanges: ->
    length = @file.readInt()

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