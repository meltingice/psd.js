/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Resource;
const Util = require('./util.js');

module.exports = (Resource = (function() {
  Resource = class Resource {
    static initClass() {
      this.Section = require('./resource_section.js');
    }

    constructor(file) {
      this.file = file;
      this.id = null;
      this.type = null;
      this.length = 0;
    }

    parse() {
      this.type = this.file.readString(4);
      this.id = this.file.readShort();

      const nameLength = Util.pad2(this.file.readByte() + 1) - 1;
      this.name = this.file.readString(nameLength);
      return this.length = Util.pad2(this.file.readInt());
    }
  };
  Resource.initClass();
  return Resource;
})());