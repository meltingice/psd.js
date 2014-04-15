module.exports = class LazyExecute
  constructor: (@obj, @file) ->
    @startPos = @file.tell()
    @loaded = false
    @loadMethod = null
    @loadArgs = []
    @passthru = []

  now: (method, args...) ->
    @obj[method].apply(@obj, args)
    return @

  later: (method, args...) ->
    @loadMethod = method
    @loadArgs = args
    return @

  ignore: (args...) ->
    @passthru.concat args
    return @

  get: ->
    for key, val of @obj then do (key, val) =>
      return if @[key]?
      Object.defineProperty @, key,
        get: ->
          @load() if not @loaded and not (key in @passthru)
          @obj[key]

    @

  load: ->
    origPos = @file.tell()
    @file.seek @startPos

    @obj[@loadMethod].apply(@obj, @loadArgs)

    @file.seek origPos
    @loaded = true
