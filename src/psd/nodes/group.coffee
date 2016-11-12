_    = require 'lodash'
Node = require '../node.coffee'

module.exports = class Group extends Node
  type: 'group'

  passthruBlending: ->
    @get('blendingMode') is 'passthru'

  isEmpty: ->
    return false unless child.isEmpty() for child in @_children

  export: ->
    _.merge super(),
      type: 'group'
      children: @_children.map((c) -> c.export())
