module.exports =
  pad2: (i) -> (i + 1) & ~0x01
  pad4: (i) -> ((i + 4) & ~0x03) - 1
  getUnicodeCharacter: (cp) ->
    if cp >= 0 and cp <= 0xD7FF or cp >= 0xE000 and cp <= 0xFFFF
      return String.fromCharCode(cp)
    else if cp >= 0x10000 and cp <= 0x10FFFF
      # we substract 0x10000 from cp to get a 20-bits number
      # in the range 0..0xFFFF
      cp -= 0x10000

      # we add 0xD800 to the number formed by the first 10 bits
      # to give the first byte
      first = ((0xffc00 & cp) >> 10) + 0xD800

      # we add 0xDC00 to the number formed by the low 10 bits
      # to give the second byte
      second = (0x3ff & cp) + 0xDC00

      String.fromCharCode(first) + String.fromCharCode(second)

  clamp: (num, min, max) ->
    Math.min(Math.max(num, min), max)
