module.exports =
  parseByteCounts: ->
    @file.readShort() for i in [0...@height()]

  parseChannelData: ->
    @lineIndex = 0
    @decodeRLEChannel()
