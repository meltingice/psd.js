/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  isFolder() {
    if (this.adjustments['sectionDivider'] != null) {
      return this.adjustments['sectionDivider'].isFolder;
    } else if (this.adjustments['nestedSectionDivider'] != null) {
      return this.adjustments['nestedSectionDivider'].isFolder;
    } else {
      return this.name === "<Layer group>";
    }
  },

  isFolderEnd() {
    if (this.adjustments['sectionDivider'] != null) {
      return this.adjustments['sectionDivider'].isHidden;
    } else if (this.adjustments['nestedSectionDivider'] != null) {
      return this.adjustments['nestedSectionDivider'].isHidden;
    } else {
      return this.name === "</Layer group>";
    }
  }
};