# A descriptor is a block of data that describes a complex data structure of some kind.
# It was added sometime around Photoshop 5.0 and it superceded a few legacy things such
# as layer names and type data. The benefit of the Descriptor is that it is self-contained,
# and allows us to dynamically define data of any size. It's always represented by an Object
# at the root.
module.exports = class Descriptor
  # The object that will store the resulting data.
  data: {}

  # Creates a new Descriptor.
  # @param [File] The PSD file.
  constructor: (@file) ->

  # Parses the Descriptor at the current location in the file.
  parse: ->
    @data.class = @parseClass()
    numItems = @file.readInt()

    for i in [0...numItems]
      [id, value] = @parseKeyItem()
      @data[id] = value

    @data

  # Parses a class representation, which consists of a name and a unique ID.
  # @private
  parseClass: ->
    name: @file.readUnicodeString()
    id: @parseId()

  # Parses an ID, which is a unique String.
  # @private
  parseId: ->
    len = @file.readInt()
    if len is 0 then @file.readString(4) else @file.readString(len)

  # Parses a key/item value, which consists of an ID and an Item of any type.
  # @private
  parseKeyItem: ->
    id = @parseId()
    value = @parseItem()
    return [id, value]

  # Parses an Item, which can be one of many types of data, depending on the key.
  # @private
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

  # @private
  parseBoolean: -> @file.readBoolean()

  # @private
  parseDouble: -> @file.readDouble()

  # @private
  parseInteger: -> @file.readInt()
  parseLargeInteger: -> @file.readLongLong()

  # An identifier is an Integer.
  # @private
  parseIdentifier: -> @file.readInt()

  # An index is an Integer.
  # @private
  parseIndex: -> @file.readInt()

  # An office is an Integer.
  # @private
  parseOffset: -> @file.readInt()

  # Parses a Property, which consists of a class and a unique ID.
  # @private
  parseProperty: ->
    class: @parseClass()
    id: @parseId()

  # Parses an enumerator, which consists of 2 IDs, one of which is
  # the type, and the other is the value.
  # @private
  parseEnum: ->
    type: @parseId()
    value: @parseId()

  # Parses an enumerator reference, which consists of a class and
  # 2 IDs: a type and value.
  # @private
  parseEnumReference: ->
    class: @parseClass()
    type: @parseId()
    value: @parseId()

  # Parses an Alias, which is a string of arbitrary length.
  # @private
  parseAlias: ->
    len = @file.readInt()
    @file.readString(len)

  # Parses a file path, which consists of a 4 character signature
  # and a path.
  # @private
  parseFilePath: ->
    len = @file.readInt()
    sig = @file.readString(4)

    # Little endian
    pathSize = @file.read('<i')
    numChars = @file.read('<i')

    path = @file.readUnicodeString(numChars)

    sig: sig
    path: path

  # Parses a list/array of Items.
  # @private
  parseList: ->
    count = @file.readInt()
    items = []

    for i in [0...count]
      items.push @parseItem()

    items

  # @todo Not documented anywhere and unsure of the data format.
  parseObjectArray: ->
    throw "Descriptor object array not implemented yet @ #{@file.tell()}"

  # Parses raw byte data of arbitrary length.
  # @private
  parseRawData: ->
    len = @file.readInt()
    @file.read(len)

  # Parses a Reference, which is an array of items of multiple types.
  # @private
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

  # Parses a double with a unit, such as angle, percent, pixels, etc.
  # Returns an object with an ID, a unit, and a value.
  # @private
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

  # Parses a float with a unit, such as angle, percent, pixels, etc.
  # Returns an object with an ID, a unit, and a value.
  # @private
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
    
