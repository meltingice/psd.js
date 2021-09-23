/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ResolutionInfo;
module.exports = (ResolutionInfo = (function() {
  ResolutionInfo = class ResolutionInfo {
    static initClass() {
      this.prototype.id = 1005;
      this.prototype.name = 'resolutionInfo';
    }

    constructor(resource) {
      this.resource = resource;
      this.file = this.resource.file;
    }

    parse() {
      // 32-bit fixed-point number (16.16)
      this.h_res = this.file.readUInt() / 65536;
      this.h_res_unit = this.file.readUShort();
      this.width_unit = this.file.readUShort();

      // 32-bit fixed-point number (16.16)
      this.v_res = this.file.readUInt() / 65536;
      this.v_res_unit = this.file.readUShort();
      this.height_unit = this.file.readUShort();

      return this.resource.data = this;
    }

    export() {
      const data = {};
      for (let key of ['h_res', 'h_res_unit', 'width_unit', 'v_res', 'v_res_unit', 'height_unit']) {
        data[key] = this[key];
      }

      return data;
    }
  };
  ResolutionInfo.initClass();
  return ResolutionInfo;
})());