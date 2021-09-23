/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Resources;
const Resource = require('./resource.js');

module.exports = (Resources = class Resources {
  constructor(file) {
    this.file = file;
    this.resources = {};
    this.typeIndex = {};
    this.length = null;
  }

  skip() {
    this.length = this.file.readInt();
    return this.file.seek(this.length, true);
  }

  parse() {
    this.length = this.file.readInt();
    const finish = this.length + this.file.tell();

    while (this.file.tell() < finish) {
      const resource = new Resource(this.file);
      resource.parse();

      const resourceEnd = this.file.tell() + resource.length;

      const section = Resource.Section.factory(resource);
      if (section == null) {
        this.file.seek(resourceEnd);
        continue;
      }

      this.resources[section.id] = section;
      if (section.name != null) { this.typeIndex[section.name] = section.id; }

      this.file.seek(resourceEnd);
    }

    return this.file.seek(finish);
  }

  resource(search) {
    if (typeof(search) === 'string') {
      return this.byType(search);
    } else {
      return this.resources[search];
    }
  }

  byType(name) { return this.resources[this.typeIndex[name]]; }
});