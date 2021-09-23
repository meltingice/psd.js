/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Guides;
module.exports = (Guides = (function() {
  Guides = class Guides {
    static initClass() {
  
      this.prototype.id = 1032;
      this.prototype.name = 'guides';
    }

    constructor(resource) {
      this.resource = resource;
      this.file = this.resource.file;
      this.data = [];
    }

    parse() {
      // Descriptor version
      this.file.seek(4, true);

      // Future implementation of document-specific grids
      this.file.seek(8, true);

      const num_guides = this.file.readInt();

      return (() => {
        const result = [];
        for (let i = 1, end = num_guides, asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
          const location = (this.file.readInt() / 32).toFixed(1);
          const direction = this.file.readByte() ? "horizontal" : "vertical";
          result.push(this.data.push({ location, direction }));
        }
        return result;
      })();
    }

    export() {
      return this.data;
    }
  };
  Guides.initClass();
  return Guides;
})());