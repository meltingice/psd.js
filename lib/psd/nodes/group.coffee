_    = require 'lodash'
Node = require '../node.coffee'

module.exports = class Group extends Node
  type: 'group'

  passthruBlending: ->
    @get('blendingMode') is 'passthru'

  isEmpty: ->
    return false unless child.isEmpty() for child in @children

  export: ->
    _.merge super(),
      type: 'group'
      children: @children.map((c) -> c.export())