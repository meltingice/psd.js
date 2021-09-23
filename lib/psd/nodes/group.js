/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Group;
const _    = require('lodash');
const Node = require('../node.js');

module.exports = (Group = (function() {
  Group = class Group extends Node {
    static initClass() {
      this.prototype.type = 'group';
    }

    passthruBlending() {
      return this.get('blendingMode') === 'passthru';
    }

    isEmpty() {
      if (!Array.from(this._children).map((child) => child.isEmpty())) { return false; }
    }

    export() {
      return _.merge(super.export(), {
        type: 'group',
        children: this._children.map(c => c.export())
      }
      );
    }
  };
  Group.initClass();
  return Group;
})());
