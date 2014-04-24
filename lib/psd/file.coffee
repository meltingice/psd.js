{jspack} = require 'jspack'
Util = require './util.coffee'

module.exports = class File
  FORMATS =
    Int:
      code: '>i'
      length: 4
    UInt:
      code: '>I'
      length: 4
    Short:
      code: '>h'
      length: 2
    UShort:
      code: '>H'
      length: 2
    Float:
      code: '>f'
      length: 4
    Double:
      code: '>d'
      length: 8

  for own format, info of FORMATS then do (format, info) =>
    @::["read#{format}"] = -> @readf(info.code, info.length)[0]

  constructor: (@data) ->
    @pos = 0

  tell: -> @pos
  read: (length) ->
    data = @data[@pos...@pos+length]
    @pos += length
    return data

  readf: (format, len = null) -> jspack.Unpack format, @read(len or jspack.CalcLength(format))

  seek: (amt, rel = false) -> if rel then @pos += amt else @pos = amt

  readString: (length) -> @read(length).toString().replace /\u0000/g, ''
  readUnicodeString: (length = null) ->
    length or= @readInt()
    @read(length * 2)
      .toJSON()
      .map((c) -> Util.getUnicodeCharacter(c))
      .join('')
      .replace(/\u0000/g, '')

  readByte: -> @read(1)[0]