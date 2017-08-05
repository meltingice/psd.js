import Node from '../node'

export default class Layer extends Node {
  type = "layer"

  isEmpty() {
    return this.width === 0 || this.height === 0;
  }
}
