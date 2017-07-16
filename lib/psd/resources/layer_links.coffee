module.exports = class LinkLayers

  id: 1026
  name: 'LinkLayers'

  constructor: (@resource) ->
    @file = @resource.file
    @linkArray = []

  parse: ->
    end = @file.tell() + @resource.length

    while end > @file.tell()
      @linkArray.push(@file.readShort())
    
    #in the same order as layers
    @linkArray.reverse();