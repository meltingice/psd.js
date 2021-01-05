module.exports = class Guides

  id: 1032
  name: 'guides'

  constructor: (@resource) ->
    @file = @resource.file
    @data = []

  parse: ->
    # Descriptor version
    @file.seek 4, true

    # Future implementation of document-specific grids
    @file.seek 8, true

    num_guides = @file.readInt()

    for i in [1..num_guides]
      location = (@file.readInt() / 32).toFixed(1)
      direction = if @file.readByte() then "horizontal" else "vertical"
      @data.push({ location, direction })

  export: ->
    @data