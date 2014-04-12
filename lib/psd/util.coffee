module.exports = class Util
  @pad2: (i) -> (i + 1) & ~0x01
  @pad4: (i) -> ((i + 4) & ~0x03) - 1
