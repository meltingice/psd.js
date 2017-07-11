Resource = require './resource.coffee'

module.exports = class Resources
  constructor: (@file) ->
    @resources = {}
    @typeIndex = {}
    @length = null

  skip: ->
    @length = @file.readInt()
    @file.seek @length, true

  parse: ->
    @length = @file.readInt()
    finish = @length + @file.tell()

    while @file.tell() < finish
      resource = new Resource(@file)
      resource.parse()

      resourceEnd = @file.tell() + resource.length

      section = Resource.Section.factory(resource)
      unless section?
        @file.seek(resourceEnd)
        continue

      @resources[section.id] = section
      @typeIndex[section.name] = section.id if section.name?

      @file.seek resourceEnd

    @file.seek finish

  resource: (search) ->
    if typeof(search) is 'string'
      @byType(search)
    else
      @resources[search]

  byType: (name) -> @resources[@typeIndex[name]]