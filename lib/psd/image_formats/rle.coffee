module.exports =
  parseRLE: ->
    @byteCounts = @parseByteCounts()
    @parseChannelData()

  parseByteCounts: ->
    @file.readShort() for i in [0...(@channels() * @height())]
  
  parseChannelData: ->
    @chanPos = 0
    @lineIndex = 0
    for i in [0...@channels()]
      @decodeRLEChannel()
      @lineIndex += @height()
          
  decodeRLEChannel: ->
    for j in [0...@height()]
      byteCount = @byteCounts[@lineIndex + j]
      finish = @file.tell() + byteCount
      
      while @file.tell() < finish
        len = @file.read(1)[0]
        
        if len < 128
          len += 1
          #@channelData.splice @chanPos, 0, @file.read(len)...
          data = @file.read(len)          
          @channelData.set data, @chanPos
          @chanPos += len
        else if len > 128
          len ^= 0xff
          len += 2

          val = @file.read(1)[0]
          #@channelData[@chanPos++] = val for i in [0...len]
          @channelData.fill(val, @chanPos, @chanPos+len)
          @chanPos += len
          