import File from './psd/file'
import Header from './psd/header'

class PSD {
  constructor(data) {
    this.file = new File(data);
    this.parsed = false;
    this.header = null;
  }

  parse() {
    if (this.parsed) return;

    this._parseHeader();

    this.parsed = true;
  }

  _parseHeader() {
    this.header = new Header(this.file);
    this.header.parse();
  }
}

export default PSD
