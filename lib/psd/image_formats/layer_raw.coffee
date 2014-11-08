module.exports =
  parseRaw: ->
    for i in [@chanPos...(@chanPos + @chan.length - 2)]
      @channelData[i] = @file.readByte()

    @chanPos += (@chan.length - 2)
