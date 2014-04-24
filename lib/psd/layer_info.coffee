module.exports = class LayerInfo
  constructor: (@layer, @length) ->
    @file = @layer.file
    @section_end = @file.tell() + @length
    @data = {}

  skip: -> @file.seek @section_end
  parse: -> @skip() # skip by default