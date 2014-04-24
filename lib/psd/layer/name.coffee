Util = require '../util.coffee'

module.exports =
  parseLegacyLayerName: ->
    len = Util.pad4 @file.readByte()
    @legacyName = @file.readString(len)