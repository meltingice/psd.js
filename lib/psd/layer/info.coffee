LazyExecute = require '../lazy_execute.coffee'
Util = require '../util.coffee'

LAYER_INFO = {
  name: require('../layer_info/unicode_name.coffee')
}

module.exports =
  parseLayerInfo: ->
    while @file.tell() < @layerEnd
      @file.seek 4, true # sig

      key = @file.readString(4)
      length = Util.pad2 @file.readInt()
      pos = @file.tell()

      keyParseable = false
      for own name, klass of LAYER_INFO
        continue unless klass.shouldParse(key)

        i = new klass(@, length)
        @adjustments[name] = new LazyExecute(i, @file)
          .now('skip')
          .later('parse')
          .get()

        keyParseable = true
        break

      @file.seek length, true if not keyParseable