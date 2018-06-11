module.exports =
  parseRaw: ->
    @channelData.set @file.read(@length)