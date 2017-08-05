import Node from '../node'

export default class Group extends Node {
  type = "group"

  passthruBlending() {
    return this.info('blendingMode') === 'passthru'
  }

  isEmpty() {
    for (var i = 0; i < this._children.length; i++) {
      if (!this._children[i].isEmpty()) return false;
    }

    return true;
  }
}
