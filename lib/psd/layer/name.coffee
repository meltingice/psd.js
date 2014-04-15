Util = require '../util.coffee'

module.exports =
  parseLegacyLayerName: ->
    len = Util.pad4 @file.readByte()
    @legacyName = @file.readString(len)

    Object.defineProperty @, 'name',
      get: ->
        if @adjustments['name']?
          @adjustments['name'].data
        else
          @legacyName