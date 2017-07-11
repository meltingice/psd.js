LayerInfo = require '../layer_info.coffee'
PathRecord = require '../path_record.coffee'

module.exports = class VectorMask extends LayerInfo
  @shouldParse: (key) -> key in ['vmsk', 'vsms']

  constructor: (layer, length) ->
    super(layer, length)

    @invert = null
    @notLink = null
    @disable = null
    @paths = []

  parse: ->
    @file.seek 4, true # version
    tag = @file.readInt()

    @invert = (tag & 0x01) > 0
    @notLink = (tag & (0x01 << 1)) > 0
    @disable = (tag & (0x01 << 2)) > 0

    # I haven't figured out yet why this is 10 and not 8.
    numRecords = (@length - 10) / 26
    for i in [0...numRecords]
      record = new PathRecord(@file)
      record.parse()

      @paths.push record

  export: ->
    invert: @invert
    notLink: @notLink
    disable: @disable
    paths: @paths.map (p) -> p.export()
