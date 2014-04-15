module.exports =
  parseRaw: ->
    @channelData = @file.read(@length)