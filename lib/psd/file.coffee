{jspack} = require('jspack')

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

  readString: (length) -> @read(length).toString()
  readByte: -> @read(1)[0]