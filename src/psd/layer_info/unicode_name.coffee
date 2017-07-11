LayerInfo = require '../layer_info.coffee'

module.exports = class UnicodeName extends LayerInfo
  @shouldParse: (key) -> key is 'luni'

  parse: ->
    pos = @file.tell()
    @data = @file.readUnicodeString()

    @file.seek pos + @length
    return @