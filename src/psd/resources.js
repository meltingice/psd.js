import Resource from './resource'

export default class Resources {
  constructor(file) {
    this.file = file;
    this.resources = {};
    this.typeIndex = {};
    this.length = null;
  }

  skip() {
    this.length = this.file.readInt();
    this.file.seek(this.length, true);
  }

  parse() {
    this.length = this.file.readInt();
    console.log(`Resources length: ${this.length}`)
    const finish = this.length + this.file.tell();

    while (this.file.tell() < finish) {
      const resource = new Resource(this.file);
      const section = resource.parse();

      this.resources[resource.id] = section;

      if (resource.name) {
        this.typeIndex[resource.name] = resource.id;
      }
    }

    this.file.seek(finish);
  }

  resource(search) {
    if (typeof(search) === 'string') {
      return this.byType(search);
    } else {
      return this.resources[search];
    }
  }

  byType(name) {
    return this.resources[this.typeIndex[name]];
  }
}
