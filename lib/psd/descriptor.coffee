module.exports = class Descriptor
  constructor: (@file) ->
    @data = {}

  parse: ->
    @data.class = @parseClass()
    numItems = @file.readInt()

    for i in [0...numItems]
      [id, value] = @parseKeyItem()
      @data[id] = value

    @data

  parseClass: ->
    name: @file.readUnicodeString()
    id: @parseId()

  parseId: ->
    len = @file.readInt()
    if len is 0 then @file.readString(4) else @file.readString(len)

  parseKeyItem: ->
    id = @parseId()
    value = @parseItem()
    return [id, value]

  parseItem: (type = null) ->
    type = @file.readString(4) unless type?

    switch type
      when 'bool'         then @parseBoolean()
      when 'type', 'GlbC' then @parseClass()
      when 'Objc', 'GlbO' then new Descriptor(@file).parse()
      when 'doub'         then @parseDouble()
      when 'enum'         then @parseEnum()
      when 'alis'         then @parseAlias()
      when 'Pth'          then @parseFilePath()
      when 'long'         then @parseInteger()
      when 'comp'         then @parseLargeInteger()
      when 'VlLs'         then @parseList()
      when 'ObAr'         then @parseObjectArray()
      when 'tdta'         then @parseRawData()
      when 'obj '         then @parseReference()
      when 'TEXT'         then @file.readUnicodeString()
      when 'UntF'         then @parseUnitDouble()
      when 'UnFl'         then @parseUnitFloat()

  parseBoolean: -> @file.readBoolean()
  parseDouble: -> @file.readDouble()
  parseInteger: -> @file.readInt()
  parseLargeInteger: -> @file.readLongLong()
  parseIdentifier: -> @file.readInt()
  parseIndex: -> @file.readInt()
  parseOffset: -> @file.readInt()

  parseProperty: ->
    class: @parseClass()
    id: @parseId()

  parseEnum: ->
    type: @parseId()
    value: @parseId()

  parseEnumReference: ->
    class: @parseClass()
    type: @parseId()
    value: @parseId()

  parseAlias: ->
    len = @file.readInt()
    @file.readString(len)

  parseFilePath: ->
    len = @file.readInt()
    sig = @file.readString(4)

    # Little endian
    pathSize = @file.read('<i')
    numChars = @file.read('<i')

    path = @file.readUnicodeString(numChars)

    sig: sig
    path: path

  parseList: ->
    count = @file.readInt()
    items = []

    for i in [0...count]
      items.push @parseItem()

    items

  parseObjectArray: ->
    throw "Descriptor object array not implemented yet @ #{@file.tell()}"

  parseRawData: ->
    len = @file.readInt()
    @file.read(len)

  parseReference: ->
    numItems = @file.readInt()
    items = []

    for i in [0...numItems]
      type = @file.readString(4)
      value = switch type
        when 'prop' then @parseProperty()
        when 'Clss' then @parseClass()
        when 'Enmr' then @parseEnumReference()
        when 'Idnt' then @parseIdentifier()
        when 'indx' then @parseIndex()
        when 'name' then @file.readUnicodeString()
        when 'rele' then @parseOffset()

      items.push type: type, value: value

    items

  parseUnitDouble: ->
    unitId = @file.readString(4)
    unit = switch unitId
      when '#Ang' then 'Angle'
      when '#Rsl' then 'Density'
      when '#Rlt' then 'Distance'
      when '#Nne' then 'None'
      when '#Prc' then 'Percent'
      when '#Pxl' then 'Pixels'
      when '#Mlm' then 'Millimeters'
      when '#Pnt' then 'Points'

    value = @file.readDouble()
    id: unitId, unit: unit, value: value

  parseUnitFloat: ->
    unitId = @file.readString(4)
    unit = switch unitId
      when '#Ang' then 'Angle'
      when '#Rsl' then 'Density'
      when '#Rlt' then 'Distance'
      when '#Nne' then 'None'
      when '#Prc' then 'Percent'
      when '#Pxl' then 'Pixels'
      when '#Mlm' then 'Millimeters'
      when '#Pnt' then 'Points'

    value = @file.readFloat()
    id: unitId, unit: unit, value: value
    