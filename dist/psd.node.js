(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.PSD = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var BlendMode, Module,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Module = require('coffeescript-module').Module;

module.exports = BlendMode = (function(superClass) {
  var BLEND_MODES;

  extend(BlendMode, superClass);

  BlendMode.aliasProperty('blendingMode', 'mode');

  BLEND_MODES = {
    norm: 'normal',
    dark: 'darken',
    lite: 'lighten',
    hue: 'hue',
    sat: 'saturation',
    colr: 'color',
    lum: 'luminosity',
    mul: 'multiply',
    scrn: 'screen',
    diss: 'dissolve',
    over: 'overlay',
    hLit: 'hard_light',
    sLit: 'soft_light',
    diff: 'difference',
    smud: 'exclusion',
    div: 'color_dodge',
    idiv: 'color_burn',
    lbrn: 'linear_burn',
    lddg: 'linear_dodge',
    vLit: 'vivid_light',
    lLit: 'linear_light',
    pLit: 'pin_light',
    hMix: 'hard_mix',
    pass: 'passthru',
    dkCl: 'darker_color',
    lgCl: 'lighter_color',
    fsub: 'subtract',
    fdiv: 'divide'
  };

  function BlendMode(file) {
    this.file = file;
    this.blendKey = null;
    this.opacity = null;
    this.clipping = null;
    this.clipped = null;
    this.flags = null;
    this.mode = null;
    this.visible = null;
  }

  BlendMode.prototype.parse = function() {
    this.file.seek(4, true);
    this.blendKey = this.file.readString(4).trim();
    this.opacity = this.file.readByte();
    this.clipping = this.file.readByte();
    this.flags = this.file.readByte();
    this.mode = BLEND_MODES[this.blendKey];
    this.clipped = this.clipping === 1;
    this.visible = !((this.flags & (0x01 << 1)) > 0);
    return this.file.seek(1, true);
  };

  BlendMode.prototype.opacityPercentage = function() {
    return this.opacity * 100 / 255;
  };

  return BlendMode;

})(Module);


},{"coffeescript-module":undefined}],2:[function(require,module,exports){
var ChannelImage, Image, ImageFormat, _,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

Image = require('./image.coffee');

ImageFormat = require('./image_format.coffee');

module.exports = ChannelImage = (function(superClass) {
  extend(ChannelImage, superClass);

  ChannelImage.includes(ImageFormat.LayerRAW);

  ChannelImage.includes(ImageFormat.LayerRLE);

  function ChannelImage(file, header, layer) {
    this.layer = layer;
    this._width = this.layer.width;
    this._height = this.layer.height;
    ChannelImage.__super__.constructor.call(this, file, header);
    this.channelsInfo = this.layer.channelsInfo;
    this.hasMask = _.any(this.channelsInfo, function(c) {
      return c.id < -1;
    });
    this.opacity = this.layer.opacity / 255.0;
  }

  ChannelImage.prototype.skip = function() {
    var chan, i, len, ref, results;
    ref = this.channelsInfo;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      chan = ref[i];
      results.push(this.file.seek(chan.length, true));
    }
    return results;
  };

  ChannelImage.prototype.width = function() {
    return this._width;
  };

  ChannelImage.prototype.height = function() {
    return this._height;
  };

  ChannelImage.prototype.channels = function() {
    return this.layer.channels;
  };

  ChannelImage.prototype.parse = function() {
    var chan, finish, i, len, ref, start;
    this.chanPos = 0;
    ref = this.channelsInfo;
    for (i = 0, len = ref.length; i < len; i++) {
      chan = ref[i];
      if (chan.length <= 0) {
        this.parseCompression();
        continue;
      }
      this.chan = chan;
      if (chan.id < -1) {
        this._width = this.layer.mask.width;
        this._height = this.layer.mask.height;
      } else {
        this._width = this.layer.width;
        this._height = this.layer.height;
      }
      this.length = this._width * this._height;
      start = this.file.tell();
      this.parseImageData();
      finish = this.file.tell();
      if (finish !== start + this.chan.length) {
        this.file.seek(start + this.chan.length);
      }
    }
    this._width = this.layer.width;
    this._height = this.layer.height;
    return this.processImageData();
  };

  ChannelImage.prototype.parseImageData = function() {
    this.compression = this.parseCompression();
    switch (this.compression) {
      case 0:
        return this.parseRaw();
      case 1:
        return this.parseRLE();
      case 2:
      case 3:
        return this.parseZip();
      default:
        return this.file.seek(this.endPos);
    }
  };

  return ChannelImage;

})(Image);


},{"./image.coffee":7,"./image_format.coffee":10,"lodash":undefined}],3:[function(require,module,exports){
var Util;

Util = require('./util.coffee');

module.exports = {
  cmykToRgb: function(c, m, y, k) {
    var b, g, r;
    r = Util.clamp((65535 - (c * (255 - k) + (k << 8))) >> 8, 0, 255);
    g = Util.clamp((65535 - (m * (255 - k) + (k << 8))) >> 8, 0, 255);
    b = Util.clamp((65535 - (y * (255 - k) + (k << 8))) >> 8, 0, 255);
    return [r, g, b];
  }
};


},{"./util.coffee":67}],4:[function(require,module,exports){
var Descriptor;

module.exports = Descriptor = (function() {
  function Descriptor(file) {
    this.file = file;
    this.data = {};
  }

  Descriptor.prototype.parse = function() {
    var i, id, j, numItems, ref, ref1, value;
    this.data["class"] = this.parseClass();
    numItems = this.file.readInt();
    for (i = j = 0, ref = numItems; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      ref1 = this.parseKeyItem(), id = ref1[0], value = ref1[1];
      this.data[id] = value;
    }
    return this.data;
  };

  Descriptor.prototype.parseClass = function() {
    return {
      name: this.file.readUnicodeString(),
      id: this.parseId()
    };
  };

  Descriptor.prototype.parseId = function() {
    var len;
    len = this.file.readInt();
    if (len === 0) {
      return this.file.readString(4);
    } else {
      return this.file.readString(len);
    }
  };

  Descriptor.prototype.parseKeyItem = function() {
    var id, value;
    id = this.parseId();
    value = this.parseItem();
    return [id, value];
  };

  Descriptor.prototype.parseItem = function(type) {
    if (type == null) {
      type = null;
    }
    if (type == null) {
      type = this.file.readString(4);
    }
    switch (type) {
      case 'bool':
        return this.parseBoolean();
      case 'type':
      case 'GlbC':
        return this.parseClass();
      case 'Objc':
      case 'GlbO':
        return new Descriptor(this.file).parse();
      case 'doub':
        return this.parseDouble();
      case 'enum':
        return this.parseEnum();
      case 'alis':
        return this.parseAlias();
      case 'Pth':
        return this.parseFilePath();
      case 'long':
        return this.parseInteger();
      case 'comp':
        return this.parseLargeInteger();
      case 'VlLs':
        return this.parseList();
      case 'ObAr':
        return this.parseObjectArray();
      case 'tdta':
        return this.parseRawData();
      case 'obj ':
        return this.parseReference();
      case 'TEXT':
        return this.file.readUnicodeString();
      case 'UntF':
        return this.parseUnitDouble();
      case 'UnFl':
        return this.parseUnitFloat();
    }
  };

  Descriptor.prototype.parseBoolean = function() {
    return this.file.readBoolean();
  };

  Descriptor.prototype.parseDouble = function() {
    return this.file.readDouble();
  };

  Descriptor.prototype.parseInteger = function() {
    return this.file.readInt();
  };

  Descriptor.prototype.parseLargeInteger = function() {
    return this.file.readLongLong();
  };

  Descriptor.prototype.parseIdentifier = function() {
    return this.file.readInt();
  };

  Descriptor.prototype.parseIndex = function() {
    return this.file.readInt();
  };

  Descriptor.prototype.parseOffset = function() {
    return this.file.readInt();
  };

  Descriptor.prototype.parseProperty = function() {
    return {
      "class": this.parseClass(),
      id: this.parseId()
    };
  };

  Descriptor.prototype.parseEnum = function() {
    return {
      type: this.parseId(),
      value: this.parseId()
    };
  };

  Descriptor.prototype.parseEnumReference = function() {
    return {
      "class": this.parseClass(),
      type: this.parseId(),
      value: this.parseId()
    };
  };

  Descriptor.prototype.parseAlias = function() {
    var len;
    len = this.file.readInt();
    return this.file.readString(len);
  };

  Descriptor.prototype.parseFilePath = function() {
    var len, numChars, path, pathSize, sig;
    len = this.file.readInt();
    sig = this.file.readString(4);
    pathSize = this.file.read('<i');
    numChars = this.file.read('<i');
    path = this.file.readUnicodeString(numChars);
    return {
      sig: sig,
      path: path
    };
  };

  Descriptor.prototype.parseList = function() {
    var count, i, items, j, ref;
    count = this.file.readInt();
    items = [];
    for (i = j = 0, ref = count; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      items.push(this.parseItem());
    }
    return items;
  };

  Descriptor.prototype.parseObjectArray = function() {
    throw "Descriptor object array not implemented yet @ " + (this.file.tell());
  };

  Descriptor.prototype.parseRawData = function() {
    var len;
    len = this.file.readInt();
    return this.file.read(len);
  };

  Descriptor.prototype.parseReference = function() {
    var i, items, j, numItems, ref, type, value;
    numItems = this.file.readInt();
    items = [];
    for (i = j = 0, ref = numItems; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      type = this.file.readString(4);
      value = (function() {
        switch (type) {
          case 'prop':
            return this.parseProperty();
          case 'Clss':
            return this.parseClass();
          case 'Enmr':
            return this.parseEnumReference();
          case 'Idnt':
            return this.parseIdentifier();
          case 'indx':
            return this.parseIndex();
          case 'name':
            return this.file.readUnicodeString();
          case 'rele':
            return this.parseOffset();
        }
      }).call(this);
      items.push({
        type: type,
        value: value
      });
    }
    return items;
  };

  Descriptor.prototype.parseUnitDouble = function() {
    var unit, unitId, value;
    unitId = this.file.readString(4);
    unit = (function() {
      switch (unitId) {
        case '#Ang':
          return 'Angle';
        case '#Rsl':
          return 'Density';
        case '#Rlt':
          return 'Distance';
        case '#Nne':
          return 'None';
        case '#Prc':
          return 'Percent';
        case '#Pxl':
          return 'Pixels';
        case '#Mlm':
          return 'Millimeters';
        case '#Pnt':
          return 'Points';
      }
    })();
    value = this.file.readDouble();
    return {
      id: unitId,
      unit: unit,
      value: value
    };
  };

  Descriptor.prototype.parseUnitFloat = function() {
    var unit, unitId, value;
    unitId = this.file.readString(4);
    unit = (function() {
      switch (unitId) {
        case '#Ang':
          return 'Angle';
        case '#Rsl':
          return 'Density';
        case '#Rlt':
          return 'Distance';
        case '#Nne':
          return 'None';
        case '#Prc':
          return 'Percent';
        case '#Pxl':
          return 'Pixels';
        case '#Mlm':
          return 'Millimeters';
        case '#Pnt':
          return 'Points';
      }
    })();
    value = this.file.readFloat();
    return {
      id: unitId,
      unit: unit,
      value: value
    };
  };

  return Descriptor;

})();


},{}],5:[function(require,module,exports){
(function (Buffer){
var Color, File, Util, iconv, jspack,
  hasProp = {}.hasOwnProperty;

jspack = require('jspack').jspack;

iconv = require('iconv-lite');

Color = require('./color.coffee');

Util = require('./util.coffee');

module.exports = File = (function() {
  var FORMATS, fn, format, info;

  FORMATS = {
    Int: {
      code: '>i',
      length: 4
    },
    UInt: {
      code: '>I',
      length: 4
    },
    Short: {
      code: '>h',
      length: 2
    },
    UShort: {
      code: '>H',
      length: 2
    },
    Float: {
      code: '>f',
      length: 4
    },
    Double: {
      code: '>d',
      length: 8
    },
    LongLong: {
      code: '>q',
      length: 8
    }
  };

  fn = function(format, info) {
    return File.prototype["read" + format] = function() {
      return this.readf(info.code, info.length)[0];
    };
  };
  for (format in FORMATS) {
    if (!hasProp.call(FORMATS, format)) continue;
    info = FORMATS[format];
    fn(format, info);
  }

  File.prototype.pos = 0;

  function File(data) {
    this.data = data;
  }

  File.prototype.tell = function() {
    return this.pos;
  };

  File.prototype.read = function(length) {
    var i, j, ref, results;
    results = [];
    for (i = j = 0, ref = length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      results.push(this.data[this.pos++]);
    }
    return results;
  };

  File.prototype.readf = function(format, len) {
    if (len == null) {
      len = null;
    }
    return jspack.Unpack(format, this.read(len || jspack.CalcLength(format)));
  };

  File.prototype.seek = function(amt, rel) {
    if (rel == null) {
      rel = false;
    }
    if (rel) {
      return this.pos += amt;
    } else {
      return this.pos = amt;
    }
  };

  File.prototype.readString = function(length) {
    return String.fromCharCode.apply(null, this.read(length)).replace(/\u0000/g, "");
  };

  File.prototype.readUnicodeString = function(length) {
    if (length == null) {
      length = null;
    }
    length || (length = this.readInt());
    return iconv.decode(new Buffer(this.read(length * 2)), 'utf-16be').replace(/\u0000/g, "");
  };

  File.prototype.readByte = function() {
    return this.read(1)[0];
  };

  File.prototype.readBoolean = function() {
    return this.readByte() !== 0;
  };

  File.prototype.readSpaceColor = function() {
    var colorComponent, colorSpace, i, j;
    colorSpace = this.readShort();
    for (i = j = 0; j < 4; i = ++j) {
      colorComponent = this.readShort() >> 8;
    }
    return {
      colorSpace: colorSpace,
      components: colorComponent
    };
  };

  File.prototype.readPathNumber = function() {
    var a, arr, b, b1, b2, b3;
    a = this.readByte();
    arr = this.read(3);
    b1 = arr[0] << 16;
    b2 = arr[1] << 8;
    b3 = arr[2];
    b = b1 | b2 | b3;
    return parseFloat(a, 10) + parseFloat(b / Math.pow(2, 24), 10);
  };

  return File;

})();


}).call(this,require("buffer").Buffer)
},{"./color.coffee":3,"./util.coffee":67,"buffer":undefined,"iconv-lite":undefined,"jspack":undefined}],6:[function(require,module,exports){
var Header, Module,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Module = require('coffeescript-module').Module;

module.exports = Header = (function(superClass) {
  var MODES;

  extend(Header, superClass);

  Header.aliasProperty('height', 'rows');

  Header.aliasProperty('width', 'cols');

  MODES = ['Bitmap', 'GrayScale', 'IndexedColor', 'RGBColor', 'CMYKColor', 'HSLColor', 'HSBColor', 'Multichannel', 'Duotone', 'LabColor', 'Gray16', 'RGB48', 'Lab48', 'CMYK64', 'DeepMultichannel', 'Duotone16'];

  Header.prototype.sig = null;

  Header.prototype.version = null;

  Header.prototype.channels = null;

  Header.prototype.rows = null;

  Header.prototype.cols = null;

  Header.prototype.depth = null;

  Header.prototype.mode = null;

  function Header(file) {
    this.file = file;
  }

  Header.prototype.parse = function() {
    var colorDataLen;
    this.sig = this.file.readString(4);
    if (this.sig !== '8BPS') {
      throw new Error('Invalid file signature detected. Got: ' + this.sig + '. Expected 8BPS.');
    }
    this.version = this.file.readUShort();
    this.file.seek(6, true);
    this.channels = this.file.readUShort();
    this.rows = this.height = this.file.readUInt();
    this.cols = this.width = this.file.readUInt();
    this.depth = this.file.readUShort();
    this.mode = this.file.readUShort();
    colorDataLen = this.file.readUInt();
    return this.file.seek(colorDataLen, true);
  };

  Header.prototype.modeName = function() {
    return MODES[this.mode];
  };

  Header.prototype["export"] = function() {
    var data, i, key, len, ref;
    data = {};
    ref = ['sig', 'version', 'channels', 'rows', 'cols', 'depth', 'mode'];
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      data[key] = this[key];
    }
    return data;
  };

  return Header;

})(Module);


},{"coffeescript-module":undefined}],7:[function(require,module,exports){
var Export, Image, ImageFormat, ImageMode, Module,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Module = require('coffeescript-module').Module;

ImageFormat = require('./image_format.coffee');

ImageMode = require('./image_mode.coffee');

Export = require('./image_export.coffee');

module.exports = Image = (function(superClass) {
  var COMPRESSIONS, attr, fn, i, len, ref;

  extend(Image, superClass);

  Image.includes(ImageFormat.RAW);

  Image.includes(ImageFormat.RLE);

  Image.includes(ImageMode.Greyscale);

  Image.includes(ImageMode.RGB);

  Image.includes(ImageMode.CMYK);

  Image.includes(Export.PNG);

  COMPRESSIONS = ['Raw', 'RLE', 'ZIP', 'ZIPPrediction'];

  function Image(file, header) {
    this.file = file;
    this.header = header;
    this.numPixels = this.width() * this.height();
    if (this.depth() === 16) {
      this.numPixels *= 2;
    }
    this.calculateLength();
    this.pixelData = new Uint8Array(this.channelLength * 4);
    this.maskData = new Uint8Array(this.maskLength * 4);
    this.channelData = new Uint8Array(this.length + this.maskLength);
    this.opacity = 1.0;
    this.hasMask = false;
    this.startPos = this.file.tell();
    this.endPos = this.startPos + this.length;
    this.setChannelsInfo();
  }

  ref = ['width', 'height', 'channels', 'depth', 'mode'];
  fn = function(attr) {
    return Image.prototype[attr] = function() {
      return this.header[attr];
    };
  };
  for (i = 0, len = ref.length; i < len; i++) {
    attr = ref[i];
    fn(attr);
  }

  Image.prototype.setChannelsInfo = function() {
    switch (this.mode()) {
      case 1:
        return this.setGreyscaleChannels();
      case 3:
        return this.setRgbChannels();
      case 4:
        return this.setCmykChannels();
    }
  };

  Image.prototype.calculateLength = function() {
    this.length = (function() {
      switch (this.depth()) {
        case 1:
          return (this.width() + 7) / 8 * this.height();
        case 16:
          return this.width() * this.height() * 2;
        default:
          return this.width() * this.height();
      }
    }).call(this);
    this.channelLength = this.length;
    this.length *= this.channels();
    if (this.layer && this.layer.mask.size) {
      return this.maskLength = this.layer.mask.width * this.layer.mask.height;
    } else {
      return this.maskLength = 0;
    }
  };

  Image.prototype.parse = function() {
    var ref1;
    this.compression = this.parseCompression();
    if ((ref1 = this.compression) === 2 || ref1 === 3) {
      this.file.seek(this.endPos);
      return;
    }
    return this.parseImageData();
  };

  Image.prototype.parseCompression = function() {
    return this.file.readShort();
  };

  Image.prototype.parseImageData = function() {
    switch (this.compression) {
      case 0:
        this.parseRaw();
        break;
      case 1:
        this.parseRLE();
        break;
      case 2:
      case 3:
        this.parseZip();
        break;
      default:
        this.file.seek(this.endPos);
    }
    return this.processImageData();
  };

  Image.prototype.processImageData = function() {
    switch (this.mode()) {
      case 1:
        this.combineGreyscaleChannel();
        break;
      case 3:
        this.combineRgbChannel();
        break;
      case 4:
        this.combineCmykChannel();
    }
    return this.channelData = null;
  };

  return Image;

})(Module);


},{"./image_export.coffee":8,"./image_format.coffee":10,"./image_mode.coffee":15,"coffeescript-module":undefined}],8:[function(require,module,exports){
module.exports = {
  PNG: require('./image_exports/png.coffee')
};


},{"./image_exports/png.coffee":9}],9:[function(require,module,exports){
var PNG, RSVP, fs;

fs = require('fs');

PNG = require('pngjs').PNG;

RSVP = require('rsvp');

module.exports = {
  toPng: function() {
    var png;
    png = new PNG({
      filterType: 4,
      width: this.width(),
      height: this.height()
    });
    png.data = this.pixelData;
    return png;
  },
  saveAsPng: function(output) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.toPng().pack().pipe(fs.createWriteStream(output)).on('finish', resolve);
      };
    })(this));
  },
  maskToPng: function() {
    var png;
    png = new PNG({
      filterType: 4,
      width: this.layer.mask.width,
      height: this.layer.mask.height
    });
    png.data = this.maskData;
    return png;
  },
  saveMaskAsPng: function(output) {
    return new RSVP.Promise((function(_this) {
      return function(resolve, reject) {
        return _this.maskToPng().pack().pipe(fs.createWriteStream(output)).on('finish', resolve);
      };
    })(this));
  }
};


},{"fs":undefined,"pngjs":undefined,"rsvp":undefined}],10:[function(require,module,exports){
module.exports = {
  RAW: require('./image_formats/raw.coffee'),
  RLE: require('./image_formats/rle.coffee'),
  LayerRLE: require('./image_formats/layer_rle.coffee'),
  LayerRAW: require('./image_formats/layer_raw.coffee')
};


},{"./image_formats/layer_raw.coffee":11,"./image_formats/layer_rle.coffee":12,"./image_formats/raw.coffee":13,"./image_formats/rle.coffee":14}],11:[function(require,module,exports){
module.exports = {
  parseRaw: function() {
    var i, j, ref, ref1;
    for (i = j = ref = this.chanPos, ref1 = this.chanPos + this.chan.length - 2; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
      this.channelData[i] = this.file.readByte();
    }
    return this.chanPos += this.chan.length - 2;
  }
};


},{}],12:[function(require,module,exports){
module.exports = {
  parseByteCounts: function() {
    var i, j, ref, results;
    results = [];
    for (i = j = 0, ref = this.height(); 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      results.push(this.file.readShort());
    }
    return results;
  },
  parseChannelData: function() {
    this.lineIndex = 0;
    return this.decodeRLEChannel();
  }
};


},{}],13:[function(require,module,exports){
module.exports = {
  parseRaw: function() {
    return this.channelData.set(this.file.read(this.length));
  }
};


},{}],14:[function(require,module,exports){
module.exports = {
  parseRLE: function() {
    this.byteCounts = this.parseByteCounts();
    return this.parseChannelData();
  },
  parseByteCounts: function() {
    var i, k, ref, results;
    results = [];
    for (i = k = 0, ref = this.channels() * this.height(); 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
      results.push(this.file.readShort());
    }
    return results;
  },
  parseChannelData: function() {
    var i, k, ref, results;
    this.chanPos = 0;
    this.lineIndex = 0;
    results = [];
    for (i = k = 0, ref = this.channels(); 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
      this.decodeRLEChannel();
      results.push(this.lineIndex += this.height());
    }
    return results;
  },
  decodeRLEChannel: function() {
    var byteCount, data, finish, j, k, len, ref, results, val;
    results = [];
    for (j = k = 0, ref = this.height(); 0 <= ref ? k < ref : k > ref; j = 0 <= ref ? ++k : --k) {
      byteCount = this.byteCounts[this.lineIndex + j];
      finish = this.file.tell() + byteCount;
      results.push((function() {
        var results1;
        results1 = [];
        while (this.file.tell() < finish) {
          len = this.file.read(1)[0];
          if (len < 128) {
            len += 1;
            data = this.file.read(len);
            this.channelData.set(data, this.chanPos);
            results1.push(this.chanPos += len);
          } else if (len > 128) {
            len ^= 0xff;
            len += 2;
            val = this.file.read(1)[0];
            this.channelData.fill(val, this.chanPos, this.chanPos + len);
            results1.push(this.chanPos += len);
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  }
};


},{}],15:[function(require,module,exports){
module.exports = {
  Greyscale: require('./image_modes/greyscale.coffee'),
  RGB: require('./image_modes/rgb.coffee'),
  CMYK: require('./image_modes/cmyk.coffee')
};


},{"./image_modes/cmyk.coffee":16,"./image_modes/greyscale.coffee":17,"./image_modes/rgb.coffee":18}],16:[function(require,module,exports){
var Color;

Color = require('../color.coffee');

module.exports = {
  setCmykChannels: function() {
    this.channelsInfo = [
      {
        id: 0
      }, {
        id: 1
      }, {
        id: 2
      }, {
        id: 3
      }
    ];
    if (this.channels() === 5) {
      return this.channelsInfo.push({
        id: -1
      });
    }
  },
  combineCmykChannel: function() {
    var a, b, c, chan, cmykChannels, g, i, index, j, k, l, len, m, r, ref, ref1, val, y;
    cmykChannels = this.channelsInfo.map(function(ch) {
      return ch.id;
    }).filter(function(ch) {
      return ch >= -1;
    });
    for (i = j = 0, ref = this.numPixels; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      c = m = y = k = 0;
      a = 255;
      for (index = l = 0, len = cmykChannels.length; l < len; index = ++l) {
        chan = cmykChannels[index];
        val = this.channelData[i + (this.channelLength * index)];
        switch (chan) {
          case -1:
            a = val;
            break;
          case 0:
            c = val;
            break;
          case 1:
            m = val;
            break;
          case 2:
            y = val;
            break;
          case 3:
            k = val;
        }
      }
      ref1 = Color.cmykToRgb(255 - c, 255 - m, 255 - y, 255 - k), r = ref1[0], g = ref1[1], b = ref1[2];
      this.pixelData.set([r, g, b, a], i * 4);
    }
    return this.readMaskData(cmykChannels);
  }
};


},{"../color.coffee":3}],17:[function(require,module,exports){
module.exports = {
  setGreyscaleChannels: function() {
    this.channelsInfo = [
      {
        id: 0
      }
    ];
    if (this.channels() === 2) {
      return this.channelsInfo.push({
        id: -1
      });
    }
  },
  combineGreyscaleChannel: function() {
    var alpha, grey, i, j, ref, results;
    results = [];
    for (i = j = 0, ref = this.numPixels; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      grey = this.channelData[i];
      alpha = this.channels() === 2 ? this.channelData[this.channelLength + i] : 255;
      results.push(this.pixelData.set([grey, grey, grey, alpha], i * 4));
    }
    return results;
  }
};


},{}],18:[function(require,module,exports){
module.exports = {
  setRgbChannels: function() {
    this.channelsInfo = [
      {
        id: 0
      }, {
        id: 1
      }, {
        id: 2
      }
    ];
    if (this.channels() === 4) {
      return this.channelsInfo.push({
        id: -1
      });
    }
  },
  combineRgbChannel: function() {
    var a, b, chan, g, i, index, j, k, len, r, ref, rgbChannels, val;
    rgbChannels = this.channelsInfo.map(function(ch) {
      return ch.id;
    }).filter(function(ch) {
      return ch >= -1;
    });
    for (i = j = 0, ref = this.numPixels; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      r = g = b = 0;
      a = 255;
      for (index = k = 0, len = rgbChannels.length; k < len; index = ++k) {
        chan = rgbChannels[index];
        val = this.channelData[i + (this.channelLength * index)];
        switch (chan) {
          case -1:
            a = val;
            break;
          case 0:
            r = val;
            break;
          case 1:
            g = val;
            break;
          case 2:
            b = val;
        }
      }
      this.pixelData.set([r, g, b, a], i * 4);
    }
    return this.readMaskData(rgbChannels);
  },
  readMaskData: function(rgbChannels) {
    var i, j, maskPixels, offset, ref, results, val;
    if (this.hasMask) {
      maskPixels = this.layer.mask.width * this.layer.mask.height;
      offset = this.channelLength * rgbChannels.length;
      results = [];
      for (i = j = 0, ref = maskPixels; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        val = this.channelData[i + offset];
        results.push(this.maskData.set([0, 0, 0, val], i * 4));
      }
      return results;
    }
  }
};


},{}],19:[function(require,module,exports){
var RSVP, fs;

fs = require('fs');

RSVP = require('rsvp');

module.exports = {
  extended: function(PSD) {
    this.fromFile = function(file) {
      return new PSD(fs.readFileSync(file));
    };
    return this.open = function(file) {
      return new RSVP.Promise(function(resolve, reject) {
        return fs.readFile(file, (function(_this) {
          return function(err, data) {
            var psd;
            if (err) {
              return reject(err);
            }
            psd = new PSD(data);
            psd.parse();
            return resolve(psd);
          };
        })(this));
      });
    };
  }
};


},{"fs":undefined,"rsvp":undefined}],20:[function(require,module,exports){
var Layer, Module,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Module = require('coffeescript-module').Module;

module.exports = Layer = (function(superClass) {
  extend(Layer, superClass);

  Layer.includes(require('./layer/position_channels.coffee'));

  Layer.includes(require('./layer/blend_modes.coffee'));

  Layer.includes(require('./layer/mask.coffee'));

  Layer.includes(require('./layer/blending_ranges.coffee'));

  Layer.includes(require('./layer/name.coffee'));

  Layer.includes(require('./layer/info.coffee'));

  Layer.includes(require('./layer/helpers.coffee'));

  Layer.includes(require('./layer/channel_image.coffee'));

  function Layer(file, header) {
    this.file = file;
    this.header = header;
    this.mask = {};
    this.blendingRanges = {};
    this.adjustments = {};
    this.channelsInfo = [];
    this.blendMode = {};
    this.groupLayer = null;
    this.infoKeys = [];
    Object.defineProperty(this, 'name', {
      get: function() {
        if (this.adjustments['name'] != null) {
          return this.adjustments['name'].data;
        } else {
          return this.legacyName;
        }
      }
    });
  }

  Layer.prototype.parse = function() {
    var extraLen;
    this.parsePositionAndChannels();
    this.parseBlendModes();
    extraLen = this.file.readInt();
    this.layerEnd = this.file.tell() + extraLen;
    this.parseMaskData();
    this.parseBlendingRanges();
    this.parseLegacyLayerName();
    this.parseLayerInfo();
    this.file.seek(this.layerEnd);
    return this;
  };

  Layer.prototype["export"] = function() {
    return {
      name: this.name,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      left: this.left,
      width: this.width,
      height: this.height,
      opacity: this.opacity,
      visible: this.visible,
      clipped: this.clipped,
      mask: this.mask["export"]()
    };
  };

  return Layer;

})(Module);


},{"./layer/blend_modes.coffee":21,"./layer/blending_ranges.coffee":22,"./layer/channel_image.coffee":23,"./layer/helpers.coffee":24,"./layer/info.coffee":25,"./layer/mask.coffee":26,"./layer/name.coffee":27,"./layer/position_channels.coffee":28,"coffeescript-module":undefined}],21:[function(require,module,exports){
var BlendMode;

BlendMode = require('../blend_mode.coffee');

module.exports = {
  parseBlendModes: function() {
    this.blendMode = new BlendMode(this.file);
    this.blendMode.parse();
    this.opacity = this.blendMode.opacity;
    this.visible = this.blendMode.visible;
    return this.clipped = this.blendMode.clipped;
  },
  hidden: function() {
    return !this.visible;
  },
  blendingMode: function() {
    return this.blendMode.mode;
  }
};


},{"../blend_mode.coffee":1}],22:[function(require,module,exports){
module.exports = {
  parseBlendingRanges: function() {
    var i, j, length, numChannels, ref, results;
    length = this.file.readInt();
    if (length === 0) {
      return;
    }
    this.blendingRanges.grey = {
      source: {
        black: [this.file.readByte(), this.file.readByte()],
        white: [this.file.readByte(), this.file.readByte()]
      },
      dest: {
        black: [this.file.readByte(), this.file.readByte()],
        white: [this.file.readByte(), this.file.readByte()]
      }
    };
    numChannels = (length - 8) / 8;
    this.blendingRanges.channels = [];
    results = [];
    for (i = j = 0, ref = numChannels; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      results.push(this.blendingRanges.channels.push({
        source: {
          black: [this.file.readByte(), this.file.readByte()],
          white: [this.file.readByte(), this.file.readByte()]
        },
        dest: {
          black: [this.file.readByte(), this.file.readByte()],
          white: [this.file.readByte(), this.file.readByte()]
        }
      }));
    }
    return results;
  }
};


},{}],23:[function(require,module,exports){
var ChannelImage, LazyExecute;

ChannelImage = require('../channel_image.coffee');

LazyExecute = require('../lazy_execute.coffee');

module.exports = {
  parseChannelImage: function() {
    var image;
    image = new ChannelImage(this.file, this.header, this);
    return this.image = new LazyExecute(image, this.file).now('skip').later('parse').get();
  }
};


},{"../channel_image.coffee":2,"../lazy_execute.coffee":51}],24:[function(require,module,exports){
module.exports = {
  isFolder: function() {
    if (this.adjustments['sectionDivider'] != null) {
      return this.adjustments['sectionDivider'].isFolder;
    } else if (this.adjustments['nestedSectionDivider'] != null) {
      return this.adjustments['nestedSectionDivider'].isFolder;
    } else {
      return this.name === "<Layer group>";
    }
  },
  isFolderEnd: function() {
    if (this.adjustments['sectionDivider'] != null) {
      return this.adjustments['sectionDivider'].isHidden;
    } else if (this.adjustments['nestedSectionDivider'] != null) {
      return this.adjustments['nestedSectionDivider'].isHidden;
    } else {
      return this.name === "</Layer group>";
    }
  }
};


},{}],25:[function(require,module,exports){
var LAYER_INFO, LazyExecute, Util,
  hasProp = {}.hasOwnProperty;

LazyExecute = require('../lazy_execute.coffee');

Util = require('../util.coffee');

LAYER_INFO = {
  artboard: require('../layer_info/artboard.coffee'),
  blendClippingElements: require('../layer_info/blend_clipping_elements.coffee'),
  blendInteriorElements: require('../layer_info/blend_interior_elements.coffee'),
  fillOpacity: require('../layer_info/fill_opacity.coffee'),
  gradientFill: require('../layer_info/gradient_fill.coffee'),
  layerId: require('../layer_info/layer_id.coffee'),
  layerNameSource: require('../layer_info/layer_name_source.coffee'),
  legacyTypetool: require('../layer_info/legacy_typetool.coffee'),
  locked: require('../layer_info/locked.coffee'),
  metadata: require('../layer_info/metadata.coffee'),
  name: require('../layer_info/unicode_name.coffee'),
  nestedSectionDivider: require('../layer_info/nested_section_divider.coffee'),
  objectEffects: require('../layer_info/object_effects.coffee'),
  sectionDivider: require('../layer_info/section_divider.coffee'),
  solidColor: require('../layer_info/solid_color.coffee'),
  typeTool: require('../layer_info/typetool.coffee'),
  vectorMask: require('../layer_info/vector_mask.coffee'),
  vectorOrigination: require('../layer_info/vector_origination.coffee'),
  vectorStroke: require('../layer_info/vector_stroke.coffee'),
  vectorStrokeContent: require('../layer_info/vector_stroke_content.coffee')
};

module.exports = {
  parseLayerInfo: function() {
    var i, key, keyParseable, klass, length, name, pos, results;
    results = [];
    while (this.file.tell() < this.layerEnd) {
      this.file.seek(4, true);
      key = this.file.readString(4);
      length = Util.pad2(this.file.readInt());
      pos = this.file.tell();
      keyParseable = false;
      for (name in LAYER_INFO) {
        if (!hasProp.call(LAYER_INFO, name)) continue;
        klass = LAYER_INFO[name];
        if (!klass.shouldParse(key)) {
          continue;
        }
        i = new klass(this, length);
        this.adjustments[name] = new LazyExecute(i, this.file).now('skip').later('parse').get();
        if (this[name] == null) {
          (function(_this) {
            return (function(name) {
              return _this[name] = function() {
                return _this.adjustments[name];
              };
            });
          })(this)(name);
        }
        this.infoKeys.push(key);
        keyParseable = true;
        break;
      }
      if (!keyParseable) {
        results.push(this.file.seek(length, true));
      } else {
        results.push(void 0);
      }
    }
    return results;
  }
};


},{"../layer_info/artboard.coffee":30,"../layer_info/blend_clipping_elements.coffee":31,"../layer_info/blend_interior_elements.coffee":32,"../layer_info/fill_opacity.coffee":33,"../layer_info/gradient_fill.coffee":34,"../layer_info/layer_id.coffee":35,"../layer_info/layer_name_source.coffee":36,"../layer_info/legacy_typetool.coffee":37,"../layer_info/locked.coffee":38,"../layer_info/metadata.coffee":39,"../layer_info/nested_section_divider.coffee":40,"../layer_info/object_effects.coffee":41,"../layer_info/section_divider.coffee":42,"../layer_info/solid_color.coffee":43,"../layer_info/typetool.coffee":44,"../layer_info/unicode_name.coffee":45,"../layer_info/vector_mask.coffee":46,"../layer_info/vector_origination.coffee":47,"../layer_info/vector_stroke.coffee":48,"../layer_info/vector_stroke_content.coffee":49,"../lazy_execute.coffee":51,"../util.coffee":67}],26:[function(require,module,exports){
var Mask;

Mask = require('../mask.coffee');

module.exports = {
  parseMaskData: function() {
    return this.mask = new Mask(this.file).parse();
  }
};


},{"../mask.coffee":52}],27:[function(require,module,exports){
var Util;

Util = require('../util.coffee');

module.exports = {
  parseLegacyLayerName: function() {
    var len;
    len = Util.pad4(this.file.readByte());
    return this.legacyName = this.file.readString(len);
  }
};


},{"../util.coffee":67}],28:[function(require,module,exports){
module.exports = {
  parsePositionAndChannels: function() {
    var i, id, j, length, ref, results;
    this.top = this.file.readInt();
    this.left = this.file.readInt();
    this.bottom = this.file.readInt();
    this.right = this.file.readInt();
    this.channels = this.file.readShort();
    this.rows = this.height = this.bottom - this.top;
    this.cols = this.width = this.right - this.left;
    results = [];
    for (i = j = 0, ref = this.channels; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      id = this.file.readShort();
      length = this.file.readInt();
      results.push(this.channelsInfo.push({
        id: id,
        length: length
      }));
    }
    return results;
  }
};


},{}],29:[function(require,module,exports){
var LayerInfo;

module.exports = LayerInfo = (function() {
  function LayerInfo(layer, length) {
    this.layer = layer;
    this.length = length;
    this.file = this.layer.file;
    this.section_end = this.file.tell() + this.length;
    this.data = {};
  }

  LayerInfo.prototype.skip = function() {
    return this.file.seek(this.section_end);
  };

  LayerInfo.prototype.parse = function() {
    return this.skip();
  };

  return LayerInfo;

})();


},{}],30:[function(require,module,exports){
var Artboard, Descriptor, LayerInfo,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = Artboard = (function(superClass) {
  extend(Artboard, superClass);

  function Artboard() {
    return Artboard.__super__.constructor.apply(this, arguments);
  }

  Artboard.shouldParse = function(key) {
    return key === 'artb';
  };

  Artboard.prototype.parse = function() {
    this.file.seek(4, true);
    return this.data = new Descriptor(this.file).parse();
  };

  Artboard.prototype["export"] = function() {
    return {
      coords: {
        left: this.data.artboardRect['Left'],
        top: this.data.artboardRect['Top '],
        right: this.data.artboardRect['Rght'],
        bottom: this.data.artboardRect['Btom']
      }
    };
  };

  return Artboard;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],31:[function(require,module,exports){
var BlendClippingElements, LayerInfo,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = BlendClippingElements = (function(superClass) {
  extend(BlendClippingElements, superClass);

  function BlendClippingElements() {
    return BlendClippingElements.__super__.constructor.apply(this, arguments);
  }

  BlendClippingElements.shouldParse = function(key) {
    return key === 'clbl';
  };

  BlendClippingElements.prototype.parse = function() {
    this.enabled = this.file.readBoolean();
    return this.file.seek(3, true);
  };

  return BlendClippingElements;

})(LayerInfo);


},{"../layer_info.coffee":29}],32:[function(require,module,exports){
var BlendInteriorElements, LayerInfo,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = BlendInteriorElements = (function(superClass) {
  extend(BlendInteriorElements, superClass);

  function BlendInteriorElements() {
    return BlendInteriorElements.__super__.constructor.apply(this, arguments);
  }

  BlendInteriorElements.shouldParse = function(key) {
    return key === 'infx';
  };

  BlendInteriorElements.prototype.parse = function() {
    this.enabled = this.file.readBoolean();
    return this.file.seek(3, true);
  };

  return BlendInteriorElements;

})(LayerInfo);


},{"../layer_info.coffee":29}],33:[function(require,module,exports){
var FillOpacity, LayerInfo,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = FillOpacity = (function(superClass) {
  extend(FillOpacity, superClass);

  function FillOpacity() {
    return FillOpacity.__super__.constructor.apply(this, arguments);
  }

  FillOpacity.shouldParse = function(key) {
    return key === 'iOpa';
  };

  FillOpacity.prototype.parse = function() {
    return this.value = this.file.readByte();
  };

  return FillOpacity;

})(LayerInfo);


},{"../layer_info.coffee":29}],34:[function(require,module,exports){
var Descriptor, GradientFill, LayerInfo,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = GradientFill = (function(superClass) {
  extend(GradientFill, superClass);

  function GradientFill() {
    return GradientFill.__super__.constructor.apply(this, arguments);
  }

  GradientFill.shouldParse = function(key) {
    return key === 'GdFl';
  };

  GradientFill.prototype.parse = function() {
    this.file.seek(4, true);
    return this.data = new Descriptor(this.file).parse();
  };

  return GradientFill;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],35:[function(require,module,exports){
var LayerId, LayerInfo,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = LayerId = (function(superClass) {
  extend(LayerId, superClass);

  function LayerId() {
    return LayerId.__super__.constructor.apply(this, arguments);
  }

  LayerId.shouldParse = function(key) {
    return key === 'lyid';
  };

  LayerId.prototype.parse = function() {
    return this.id = this.file.readInt();
  };

  return LayerId;

})(LayerInfo);


},{"../layer_info.coffee":29}],36:[function(require,module,exports){
var LayerInfo, LayerNameSource,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = LayerNameSource = (function(superClass) {
  extend(LayerNameSource, superClass);

  function LayerNameSource() {
    return LayerNameSource.__super__.constructor.apply(this, arguments);
  }

  LayerNameSource.shouldParse = function(key) {
    return key === 'lnsr';
  };

  LayerNameSource.prototype.parse = function() {
    return this.id = this.file.readString(4);
  };

  return LayerNameSource;

})(LayerInfo);


},{"../layer_info.coffee":29}],37:[function(require,module,exports){
var LegacyTypeTool, TypeTool, _,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

TypeTool = require('./typetool.coffee');

module.exports = LegacyTypeTool = (function(superClass) {
  extend(LegacyTypeTool, superClass);

  LegacyTypeTool.shouldParse = function(key) {
    return key === 'tySh';
  };

  function LegacyTypeTool(layer, length) {
    LegacyTypeTool.__super__.constructor.call(this, layer, length);
    this.transform = {};
    this.faces = [];
    this.styles = [];
    this.lines = [];
    this.type = 0;
    this.scalingFactor = 0;
    this.characterCount = 0;
    this.horzPlace = 0;
    this.vertPlace = 0;
    this.selectStart = 0;
    this.selectEnd = 0;
    this.color = null;
    this.antialias = null;
  }

  LegacyTypeTool.prototype.parse = function() {
    var facesCount, i, k, l, linesCount, m, ref, ref1, ref2, stylesCount;
    this.file.seek(2, true);
    this.parseTransformInfo();
    this.file.seek(2, true);
    facesCount = this.file.readShort();
    for (i = k = 0, ref = facesCount; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
      this.faces.push(_({}).tap((function(_this) {
        return function(face) {
          var j, l, ref1, results;
          face.mark = _this.file.readShort();
          face.fontType = _this.file.readInt();
          face.fontName = _this.file.readString();
          face.fontFamilyName = _this.file.readString();
          face.fontStyleName = _this.file.readString();
          face.script = _this.file.readShort();
          face.numberAxesVector = _this.file.readInt();
          face.vector = [];
          results = [];
          for (j = l = 0, ref1 = face.numberAxesVector; 0 <= ref1 ? l < ref1 : l > ref1; j = 0 <= ref1 ? ++l : --l) {
            results.push(face.vector.push(_this.file.readInt()));
          }
          return results;
        };
      })(this)));
    }
    stylesCount = this.file.readShort();
    for (i = l = 0, ref1 = stylesCount; 0 <= ref1 ? l < ref1 : l > ref1; i = 0 <= ref1 ? ++l : --l) {
      this.styles.push(_({}).tap((function(_this) {
        return function(style) {
          style.mark = _this.file.readShort();
          style.faceMark = _this.file.readShort();
          style.size = _this.file.readInt();
          style.tracking = _this.file.readInt();
          style.kerning = _this.file.readInt();
          style.leading = _this.file.readInt();
          style.baseShift = _this.file.readInt();
          style.autoKern = _this.file.readBoolean();
          _this.file.seek(1, true);
          return style.rotate = _this.file.readBoolean();
        };
      })(this)));
    }
    this.type = this.file.readShort();
    this.scalingFactor = this.file.readInt();
    this.characterCount = this.file.readInt();
    this.horzPlace = this.file.readInt();
    this.vertPlace = this.file.readInt();
    this.selectStart = this.file.readInt();
    this.selectEnd = this.file.readInt();
    linesCount = this.file.readShort();
    for (i = m = 0, ref2 = linesCount; 0 <= ref2 ? m < ref2 : m > ref2; i = 0 <= ref2 ? ++m : --m) {
      this.lines.push(_({}).tap(function(line) {
        line.charCount = this.file.readInt();
        line.orientation = this.file.readShort();
        line.alignment = this.file.readShort();
        line.actualChar = this.file.readShort();
        return line.style = this.file.readShort();
      }));
    }
    this.color = this.file.readSpaceColor();
    return this.antialias = this.file.readBoolean();
  };

  return LegacyTypeTool;

})(TypeTool);


},{"./typetool.coffee":44,"lodash":undefined}],38:[function(require,module,exports){
var LayerInfo, Locked,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = Locked = (function(superClass) {
  extend(Locked, superClass);

  Locked.shouldParse = function(key) {
    return key === 'lspf';
  };

  function Locked(layer, length) {
    Locked.__super__.constructor.call(this, layer, length);
    this.transparencyLocked = false;
    this.compositeLocked = false;
    this.positionLocked = false;
    this.allLocked = false;
  }

  Locked.prototype.parse = function() {
    var locked;
    locked = this.file.readInt();
    this.transparencyLocked = (locked & (0x01 << 0)) > 0 || locked === -2147483648;
    this.compositeLocked = (locked & (0x01 << 1)) > 0 || locked === -2147483648;
    this.positionLocked = (locked & (0x01 << 2)) > 0 || locked === -2147483648;
    return this.allLocked = this.transparencyLocked && this.compositeLocked && this.positionLocked;
  };

  return Locked;

})(LayerInfo);


},{"../layer_info.coffee":29}],39:[function(require,module,exports){
var Descriptor, LayerInfo, Metadata,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = Metadata = (function(superClass) {
  extend(Metadata, superClass);

  function Metadata() {
    return Metadata.__super__.constructor.apply(this, arguments);
  }

  Metadata.shouldParse = function(key) {
    return key === 'shmd';
  };

  Metadata.prototype.parse = function() {
    var copyOnSheetDup, count, end, i, j, key, len, ref, results;
    count = this.file.readInt();
    results = [];
    for (i = j = 0, ref = count; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      this.file.seek(4, true);
      key = this.file.readString(4);
      copyOnSheetDup = this.file.readByte();
      this.file.seek(3, true);
      len = this.file.readInt();
      end = this.file.tell() + len;
      if (key === 'cmls') {
        this.parseLayerComps();
      }
      results.push(this.file.seek(end));
    }
    return results;
  };

  Metadata.prototype.parseLayerComps = function() {
    this.file.seek(4, true);
    return this.data.layerComp = new Descriptor(this.file).parse();
  };

  return Metadata;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],40:[function(require,module,exports){
var LayerInfo, NestedSectionDivider,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = NestedSectionDivider = (function(superClass) {
  extend(NestedSectionDivider, superClass);

  NestedSectionDivider.shouldParse = function(key) {
    return key === 'lsdk';
  };

  function NestedSectionDivider(layer, length) {
    NestedSectionDivider.__super__.constructor.call(this, layer, length);
    this.isFolder = false;
    this.isHidden = false;
  }

  NestedSectionDivider.prototype.parse = function() {
    var code;
    code = this.file.readInt();
    switch (code) {
      case 1:
      case 2:
        return this.isFolder = true;
      case 3:
        return this.isHidden = true;
    }
  };

  return NestedSectionDivider;

})(LayerInfo);


},{"../layer_info.coffee":29}],41:[function(require,module,exports){
var Descriptor, LayerInfo, ObjectEffects,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = ObjectEffects = (function(superClass) {
  extend(ObjectEffects, superClass);

  function ObjectEffects() {
    return ObjectEffects.__super__.constructor.apply(this, arguments);
  }

  ObjectEffects.shouldParse = function(key) {
    return key === 'lfx2';
  };

  ObjectEffects.prototype.parse = function() {
    this.file.seek(8, true);
    return this.data = new Descriptor(this.file).parse();
  };

  return ObjectEffects;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],42:[function(require,module,exports){
var LayerInfo, NestedSectionDivider,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = NestedSectionDivider = (function(superClass) {
  var SECTION_DIVIDER_TYPES;

  extend(NestedSectionDivider, superClass);

  NestedSectionDivider.shouldParse = function(key) {
    return key === 'lsct';
  };

  SECTION_DIVIDER_TYPES = ['other', 'open folder', 'closed folder', 'bounding section divider'];

  function NestedSectionDivider(layer, length) {
    NestedSectionDivider.__super__.constructor.call(this, layer, length);
    this.isFolder = false;
    this.isHidden = false;
    this.layerType = null;
    this.blendMode = null;
    this.subType = null;
  }

  NestedSectionDivider.prototype.parse = function() {
    var code;
    code = this.file.readInt();
    this.layerType = SECTION_DIVIDER_TYPES[code];
    switch (code) {
      case 1:
      case 2:
        this.isFolder = true;
        break;
      case 3:
        this.isHidden = true;
    }
    if (!(this.length >= 12)) {
      return;
    }
    this.file.seek(4, true);
    this.blendMode = this.file.readString(4);
    if (!(this.length >= 16)) {
      return;
    }
    return this.subType = this.file.readInt() === 0 ? 'normal' : 'scene group';
  };

  return NestedSectionDivider;

})(LayerInfo);


},{"../layer_info.coffee":29}],43:[function(require,module,exports){
var Descriptor, LayerInfo, SolidColor,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = SolidColor = (function(superClass) {
  extend(SolidColor, superClass);

  SolidColor.shouldParse = function(key) {
    return key === 'SoCo';
  };

  function SolidColor(layer, length) {
    SolidColor.__super__.constructor.call(this, layer, length);
    this.r = this.g = this.b = 0;
  }

  SolidColor.prototype.parse = function() {
    this.file.seek(4, true);
    this.data = new Descriptor(this.file).parse();
    this.r = Math.round(this.colorData()['Rd  ']);
    this.g = Math.round(this.colorData()['Grn ']);
    return this.b = Math.round(this.colorData()['Bl  ']);
  };

  SolidColor.prototype.colorData = function() {
    return this.data['Clr '];
  };

  SolidColor.prototype.color = function() {
    return [this.r, this.g, this.b];
  };

  return SolidColor;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],44:[function(require,module,exports){
var Descriptor, LayerInfo, TextElements, _, parseEngineData,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

parseEngineData = require('parse-engine-data');

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = TextElements = (function(superClass) {
  var COORDS_VALUE, TRANSFORM_VALUE;

  extend(TextElements, superClass);

  TextElements.shouldParse = function(key) {
    return key === 'TySh';
  };

  TRANSFORM_VALUE = ['xx', 'xy', 'yx', 'yy', 'tx', 'ty'];

  COORDS_VALUE = ['left', 'top', 'right', 'bottom'];

  function TextElements(layer, length) {
    TextElements.__super__.constructor.call(this, layer, length);
    this.version = null;
    this.transform = {};
    this.textVersion = null;
    this.descriptorVersion = null;
    this.textData = null;
    this.engineData = null;
    this.textValue = null;
    this.warpVersion = null;
    this.descriptorVersion = null;
    this.warpData = null;
    this.coords = {};
  }

  TextElements.prototype.parse = function() {
    var i, index, len, name, results;
    this.version = this.file.readShort();
    this.parseTransformInfo();
    this.textVersion = this.file.readShort();
    this.descriptorVersion = this.file.readInt();
    this.textData = new Descriptor(this.file).parse();
    this.textValue = this.textData['Txt '];
    this.engineData = parseEngineData(this.textData.EngineData);
    this.warpVersion = this.file.readShort();
    this.descriptorVersion = this.file.readInt();
    this.warpData = new Descriptor(this.file).parse();
    results = [];
    for (index = i = 0, len = COORDS_VALUE.length; i < len; index = ++i) {
      name = COORDS_VALUE[index];
      results.push(this.coords[name] = this.file.readInt());
    }
    return results;
  };

  TextElements.prototype.parseTransformInfo = function() {
    var i, index, len, name, results;
    results = [];
    for (index = i = 0, len = TRANSFORM_VALUE.length; i < len; index = ++i) {
      name = TRANSFORM_VALUE[index];
      results.push(this.transform[name] = this.file.readDouble());
    }
    return results;
  };

  TextElements.prototype.fonts = function() {
    if (this.engineData == null) {
      return [];
    }
    return this.engineData.ResourceDict.FontSet.map(function(f) {
      return f.Name;
    });
  };

  TextElements.prototype.lengthArray = function() {
    var arr, sum;
    arr = this.engineData.EngineDict.StyleRun.RunLengthArray;
    sum = _.reduce(arr, function(m, o) {
      return m + o;
    });
    if (sum - this.textValue.length === 1) {
      arr[arr.length - 1] = arr[arr.length - 1] - 1;
    }
    return arr;
  };

  TextElements.prototype.fontStyles = function() {
    var data;
    data = this.engineData.EngineDict.StyleRun.RunArray.map(function(r) {
      return r.StyleSheet.StyleSheetData;
    });
    return data.map(function(f) {
      var style;
      if (f.FauxItalic) {
        style = 'italic';
      } else {
        style = 'normal';
      }
      return style;
    });
  };

  TextElements.prototype.fontWeights = function() {
    var data;
    data = this.engineData.EngineDict.StyleRun.RunArray.map(function(r) {
      return r.StyleSheet.StyleSheetData;
    });
    return data.map(function(f) {
      var weight;
      if (f.FauxBold) {
        weight = 'bold';
      } else {
        weight = 'normal';
      }
      return weight;
    });
  };

  TextElements.prototype.textDecoration = function() {
    var data;
    data = this.engineData.EngineDict.StyleRun.RunArray.map(function(r) {
      return r.StyleSheet.StyleSheetData;
    });
    return data.map(function(f) {
      var decoration;
      if (f.Underline) {
        decoration = 'underline';
      } else {
        decoration = 'none';
      }
      return decoration;
    });
  };

  TextElements.prototype.leading = function() {
    var data;
    data = this.engineData.EngineDict.StyleRun.RunArray.map(function(r) {
      return r.StyleSheet.StyleSheetData;
    });
    return data.map(function(f) {
      var leading;
      if (f.Leading) {
        leading = f.Leading;
      } else {
        leading = 'auto';
      }
      return leading;
    });
  };

  TextElements.prototype.sizes = function() {
    if ((this.engineData == null) && (this.styles().FontSize == null)) {
      return [];
    }
    return this.styles().FontSize;
  };

  TextElements.prototype.alignment = function() {
    var alignments;
    if (this.engineData == null) {
      return [];
    }
    alignments = ['left', 'right', 'center', 'justify'];
    return this.engineData.EngineDict.ParagraphRun.RunArray.map(function(s) {
      return alignments[Math.min(parseInt(s.ParagraphSheet.Properties.Justification, 10), 3)];
    });
  };

  TextElements.prototype.colors = function() {
    if ((this.engineData == null) || (this.styles().FillColor == null)) {
      return [[0, 0, 0, 255]];
    }
    return this.styles().FillColor.map(function(s) {
      var values;
      values = s.Values.map(function(v) {
        return Math.round(v * 255);
      });
      values.push(values.shift());
      return values;
    });
  };

  TextElements.prototype.styles = function() {
    var data;
    if (this.engineData == null) {
      return {};
    }
    if (this._styles != null) {
      return this._styles;
    }
    data = this.engineData.EngineDict.StyleRun.RunArray.map(function(r) {
      return r.StyleSheet.StyleSheetData;
    });
    return this._styles = _.reduce(data, function(m, o) {
      var k, v;
      for (k in o) {
        if (!hasProp.call(o, k)) continue;
        v = o[k];
        m[k] || (m[k] = []);
        m[k].push(v);
      }
      return m;
    }, {});
  };

  TextElements.prototype.toCSS = function() {
    var css, definition, k, v;
    definition = {
      'font-family': this.fonts().join(', '),
      'font-size': (this.sizes()[0]) + "pt",
      'color': "rgba(" + (this.colors()[0].join(', ')) + ")",
      'text-align': this.alignment()[0]
    };
    css = [];
    for (k in definition) {
      v = definition[k];
      if (v == null) {
        continue;
      }
      css.push(k + ": " + v + ";");
    }
    return css.join("\n");
  };

  TextElements.prototype["export"] = function() {
    return {
      value: this.textValue,
      font: {
        lengthArray: this.lengthArray(),
        styles: this.fontStyles(),
        weights: this.fontWeights(),
        names: this.fonts(),
        sizes: this.sizes(),
        colors: this.colors(),
        alignment: this.alignment(),
        textDecoration: this.textDecoration(),
        leading: this.leading()
      },
      left: this.coords.left,
      top: this.coords.top,
      right: this.coords.right,
      bottom: this.coords.bottom,
      transform: this.transform
    };
  };

  return TextElements;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29,"lodash":undefined,"parse-engine-data":undefined}],45:[function(require,module,exports){
var LayerInfo, UnicodeName,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

module.exports = UnicodeName = (function(superClass) {
  extend(UnicodeName, superClass);

  function UnicodeName() {
    return UnicodeName.__super__.constructor.apply(this, arguments);
  }

  UnicodeName.shouldParse = function(key) {
    return key === 'luni';
  };

  UnicodeName.prototype.parse = function() {
    var pos;
    pos = this.file.tell();
    this.data = this.file.readUnicodeString();
    this.file.seek(pos + this.length);
    return this;
  };

  return UnicodeName;

})(LayerInfo);


},{"../layer_info.coffee":29}],46:[function(require,module,exports){
var LayerInfo, PathRecord, VectorMask,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

PathRecord = require('../path_record.coffee');

module.exports = VectorMask = (function(superClass) {
  extend(VectorMask, superClass);

  VectorMask.shouldParse = function(key) {
    return key === 'vmsk' || key === 'vsms';
  };

  function VectorMask(layer, length) {
    VectorMask.__super__.constructor.call(this, layer, length);
    this.invert = null;
    this.notLink = null;
    this.disable = null;
    this.paths = [];
  }

  VectorMask.prototype.parse = function() {
    var i, j, numRecords, record, ref, results, tag;
    this.file.seek(4, true);
    tag = this.file.readInt();
    this.invert = (tag & 0x01) > 0;
    this.notLink = (tag & (0x01 << 1)) > 0;
    this.disable = (tag & (0x01 << 2)) > 0;
    numRecords = (this.length - 10) / 26;
    results = [];
    for (i = j = 0, ref = numRecords; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      record = new PathRecord(this.file);
      record.parse();
      results.push(this.paths.push(record));
    }
    return results;
  };

  VectorMask.prototype["export"] = function() {
    return {
      invert: this.invert,
      notLink: this.notLink,
      disable: this.disable,
      paths: this.paths.map(function(p) {
        return p["export"]();
      })
    };
  };

  return VectorMask;

})(LayerInfo);


},{"../layer_info.coffee":29,"../path_record.coffee":60}],47:[function(require,module,exports){
var Descriptor, LayerInfo, VectorOrigination,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = VectorOrigination = (function(superClass) {
  extend(VectorOrigination, superClass);

  function VectorOrigination() {
    return VectorOrigination.__super__.constructor.apply(this, arguments);
  }

  VectorOrigination.shouldParse = function(key) {
    return key === 'vogk';
  };

  VectorOrigination.prototype.parse = function() {
    this.file.seek(8, true);
    return this.data = new Descriptor(this.file).parse();
  };

  return VectorOrigination;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],48:[function(require,module,exports){
var Descriptor, LayerInfo, VectorStroke,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = VectorStroke = (function(superClass) {
  extend(VectorStroke, superClass);

  function VectorStroke() {
    return VectorStroke.__super__.constructor.apply(this, arguments);
  }

  VectorStroke.shouldParse = function(key) {
    return key === 'vstk';
  };

  VectorStroke.prototype.parse = function() {
    this.file.seek(4, true);
    return this.data = new Descriptor(this.file).parse();
  };

  return VectorStroke;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],49:[function(require,module,exports){
var Descriptor, LayerInfo, VectorStrokeContent,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LayerInfo = require('../layer_info.coffee');

Descriptor = require('../descriptor.coffee');

module.exports = VectorStrokeContent = (function(superClass) {
  extend(VectorStrokeContent, superClass);

  function VectorStrokeContent() {
    return VectorStrokeContent.__super__.constructor.apply(this, arguments);
  }

  VectorStrokeContent.shouldParse = function(key) {
    return key === 'vscg';
  };

  VectorStrokeContent.prototype.parse = function() {
    this.file.seek(8, true);
    return this.data = new Descriptor(this.file).parse();
  };

  return VectorStrokeContent;

})(LayerInfo);


},{"../descriptor.coffee":4,"../layer_info.coffee":29}],50:[function(require,module,exports){
var Layer, LayerMask, Util, _;

_ = require('lodash');

Util = require('./util.coffee');

Layer = require('./layer.coffee');

module.exports = LayerMask = (function() {
  function LayerMask(file, header) {
    this.file = file;
    this.header = header;
    this.layers = [];
    this.mergedAlpha = false;
    this.globalMask = null;
  }

  LayerMask.prototype.skip = function() {
    return this.file.seek(this.file.readInt(), true);
  };

  LayerMask.prototype.parse = function() {
    var finish, maskSize;
    maskSize = this.file.readInt();
    finish = maskSize + this.file.tell();
    if (maskSize <= 0) {
      return;
    }
    this.parseLayers();
    this.parseGlobalMask();
    this.layers.reverse();
    return this.file.seek(finish);
  };

  LayerMask.prototype.parseLayers = function() {
    var i, j, k, layer, layerCount, layerInfoSize, len, ref, ref1, results;
    layerInfoSize = Util.pad2(this.file.readInt());
    if (layerInfoSize > 0) {
      layerCount = this.file.readShort();
      if (layerCount < 0) {
        layerCount = Math.abs(layerCount);
        this.mergedAlpha = true;
      }
      for (i = j = 0, ref = layerCount; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        this.layers.push(new Layer(this.file, this.header).parse());
      }
      ref1 = this.layers;
      results = [];
      for (k = 0, len = ref1.length; k < len; k++) {
        layer = ref1[k];
        results.push(layer.parseChannelImage());
      }
      return results;
    }
  };

  LayerMask.prototype.parseGlobalMask = function() {
    var length, maskEnd;
    length = this.file.readInt();
    if (length <= 0) {
      return;
    }
    maskEnd = this.file.tell() + length;
    this.globalMask = _({}).tap((function(_this) {
      return function(mask) {
        mask.overlayColorSpace = _this.file.readShort();
        mask.colorComponents = [_this.file.readShort() >> 8, _this.file.readShort() >> 8, _this.file.readShort() >> 8, _this.file.readShort() >> 8];
        mask.opacity = _this.file.readShort() / 16.0;
        return mask.kind = _this.file.readByte();
      };
    })(this));
    return this.file.seek(maskEnd);
  };

  return LayerMask;

})();


},{"./layer.coffee":20,"./util.coffee":67,"lodash":undefined}],51:[function(require,module,exports){
var LazyExecute,
  slice = [].slice,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

module.exports = LazyExecute = (function() {
  function LazyExecute(obj, file) {
    this.obj = obj;
    this.file = file;
    this.startPos = this.file.tell();
    this.loaded = false;
    this.loadMethod = null;
    this.loadArgs = [];
    this.passthru = [];
  }

  LazyExecute.prototype.now = function() {
    var args, method;
    method = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    this.obj[method].apply(this.obj, args);
    return this;
  };

  LazyExecute.prototype.later = function() {
    var args, method;
    method = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    this.loadMethod = method;
    this.loadArgs = args;
    return this;
  };

  LazyExecute.prototype.ignore = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    this.passthru.concat(args);
    return this;
  };

  LazyExecute.prototype.get = function() {
    var fn, key, ref, val;
    ref = this.obj;
    fn = (function(_this) {
      return function(key, val) {
        if (_this[key] != null) {
          return;
        }
        return Object.defineProperty(_this, key, {
          get: function() {
            if (!this.loaded && !(indexOf.call(this.passthru, key) >= 0)) {
              this.load();
            }
            return this.obj[key];
          }
        });
      };
    })(this);
    for (key in ref) {
      val = ref[key];
      fn(key, val);
    }
    return this;
  };

  LazyExecute.prototype.load = function() {
    var origPos;
    origPos = this.file.tell();
    this.file.seek(this.startPos);
    this.obj[this.loadMethod].apply(this.obj, this.loadArgs);
    this.file.seek(origPos);
    return this.loaded = true;
  };

  return LazyExecute;

})();


},{}],52:[function(require,module,exports){
var Mask;

module.exports = Mask = (function() {
  function Mask(file) {
    this.file = file;
    this.top = 0;
    this.right = 0;
    this.bottom = 0;
    this.left = 0;
  }

  Mask.prototype.parse = function() {
    var maskEnd;
    this.size = this.file.readInt();
    if (this.size === 0) {
      return this;
    }
    maskEnd = this.file.tell() + this.size;
    this.top = this.file.readInt();
    this.left = this.file.readInt();
    this.bottom = this.file.readInt();
    this.right = this.file.readInt();
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;
    this.relative = (this.flags & 0x01) > 0;
    this.disabled = (this.flags & (0x01 << 1)) > 0;
    this.invert = (this.flags & (0x01 << 2)) > 0;
    this.defaultColor = this.file.readByte();
    this.flags = this.file.readByte();
    this.file.seek(maskEnd);
    return this;
  };

  Mask.prototype["export"] = function() {
    if (this.size === 0) {
      return {};
    }
    return {
      top: this.top,
      left: this.left,
      bottom: this.bottom,
      right: this.right,
      width: this.width,
      height: this.height,
      defaultColor: this.defaultColor,
      relative: this.relative,
      disabled: this.disabled,
      invert: this.invert
    };
  };

  return Mask;

})();


},{}],53:[function(require,module,exports){
var Module, Node, _,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

Module = require('coffeescript-module').Module;

module.exports = Node = (function(superClass) {
  extend(Node, superClass);

  Node.includes(require('./nodes/ancestry.coffee'));

  Node.includes(require('./nodes/search.coffee'));

  Node.includes(require('./nodes/build_preview.coffee'));

  Node.PROPERTIES = ['name', 'left', 'right', 'top', 'bottom', 'height', 'width'];

  Node.prototype.type = 'node';

  function Node(layer, parent) {
    this.layer = layer;
    this.parent = parent != null ? parent : null;
    this.layer.node = this;
    this._children = [];
    this.name = this.layer.name;
    this.forceVisible = null;
    this.coords = {
      top: this.layer.top,
      bottom: this.layer.bottom,
      left: this.layer.left,
      right: this.layer.right
    };
    this.topOffset = 0;
    this.leftOffset = 0;
    this.createProperties();
  }

  Node.prototype.createProperties = function() {
    Object.defineProperty(this, 'top', {
      get: function() {
        return this.coords.top + this.topOffset;
      },
      set: function(val) {
        return this.coords.top = val;
      }
    });
    Object.defineProperty(this, 'right', {
      get: function() {
        return this.coords.right + this.leftOffset;
      },
      set: function(val) {
        return this.coords.right = val;
      }
    });
    Object.defineProperty(this, 'bottom', {
      get: function() {
        return this.coords.bottom + this.topOffset;
      },
      set: function(val) {
        return this.coords.bottom = val;
      }
    });
    Object.defineProperty(this, 'left', {
      get: function() {
        return this.coords.left + this.leftOffset;
      },
      set: function(val) {
        return this.coords.left = val;
      }
    });
    Object.defineProperty(this, 'width', {
      get: function() {
        return this.right - this.left;
      }
    });
    return Object.defineProperty(this, 'height', {
      get: function() {
        return this.bottom - this.top;
      }
    });
  };

  Node.prototype.get = function(prop) {
    var value;
    value = this[prop] != null ? this[prop] : this.layer[prop];
    if (typeof value === 'function') {
      return value();
    } else {
      return value;
    }
  };

  Node.prototype.visible = function() {
    if (this.layer.clipped && !this.clippingMask().visible()) {
      return false;
    }
    if (this.forceVisible != null) {
      return this.forceVisible;
    } else {
      return this.layer.visible;
    }
  };

  Node.prototype.hidden = function() {
    return !this.visible();
  };

  Node.prototype.isLayer = function() {
    return this.type === 'layer';
  };

  Node.prototype.isGroup = function() {
    return this.type === 'group';
  };

  Node.prototype.isRoot = function() {
    return this.type === 'root';
  };

  Node.prototype.clippingMask = function() {
    var maskNode;
    if (!this.layer.clipped) {
      return null;
    }
    return this.clippingMaskCached || (this.clippingMaskCached = ((function() {
      maskNode = this.nextSibling();
      while (maskNode.clipped) {
        maskNode = maskNode.nextSibling();
      }
      return maskNode;
    }).call(this)));
  };

  Node.prototype.clippedBy = function() {
    return this.clippingMask();
  };

  Node.prototype["export"] = function() {
    var hash, i, len, prop, ref;
    hash = {
      type: null,
      visible: this.visible(),
      opacity: this.layer.opacity / 255.0,
      blendingMode: this.layer.blendingMode()
    };
    ref = Node.PROPERTIES;
    for (i = 0, len = ref.length; i < len; i++) {
      prop = ref[i];
      hash[prop] = this[prop];
    }
    return hash;
  };

  Node.prototype.updateDimensions = function() {
    var child, i, len, nonEmptyChildren, ref;
    if (this.isLayer()) {
      return;
    }
    ref = this._children;
    for (i = 0, len = ref.length; i < len; i++) {
      child = ref[i];
      child.updateDimensions();
    }
    if (this.isRoot()) {
      return;
    }
    nonEmptyChildren = this._children.filter(function(c) {
      return !c.isEmpty();
    });
    this.left = _.min(nonEmptyChildren.map(function(c) {
      return c.left;
    })) || 0;
    this.top = _.min(nonEmptyChildren.map(function(c) {
      return c.top;
    })) || 0;
    this.bottom = _.max(nonEmptyChildren.map(function(c) {
      return c.bottom;
    })) || 0;
    return this.right = _.max(nonEmptyChildren.map(function(c) {
      return c.right;
    })) || 0;
  };

  return Node;

})(Module);


},{"./nodes/ancestry.coffee":54,"./nodes/build_preview.coffee":55,"./nodes/search.coffee":59,"coffeescript-module":undefined,"lodash":undefined}],54:[function(require,module,exports){
var _;

_ = require('lodash');

module.exports = {
  root: function() {
    if (this.isRoot()) {
      return this;
    }
    return this.parent.root();
  },
  isRoot: function() {
    return this.depth() === 0;
  },
  children: function() {
    return this._children;
  },
  ancestors: function() {
    if ((this.parent == null) || this.parent.isRoot()) {
      return [];
    }
    return this.parent.ancestors().concat([this.parent]);
  },
  hasChildren: function() {
    return this._children.length > 0;
  },
  childless: function() {
    return !this.hasChildren();
  },
  siblings: function() {
    if (this.parent == null) {
      return [];
    }
    return this.parent.children();
  },
  nextSibling: function() {
    var index;
    if (this.parent == null) {
      return null;
    }
    index = this.siblings().indexOf(this);
    return this.siblings()[index + 1];
  },
  prevSibling: function() {
    var index;
    if (this.parent == null) {
      return null;
    }
    index = this.siblings().indexOf(this);
    return this.siblings()[index - 1];
  },
  hasSiblings: function() {
    return this.siblings().length > 1;
  },
  onlyChild: function() {
    return !this.hasSiblings();
  },
  descendants: function() {
    return _.flatten(this._children.map(function(n) {
      return n.subtree();
    }));
  },
  subtree: function() {
    return [this].concat(this.descendants());
  },
  depth: function() {
    return this.ancestors().length + 1;
  },
  path: function(asArray) {
    var path;
    if (asArray == null) {
      asArray = false;
    }
    path = this.ancestors().map(function(n) {
      return n.name;
    }).concat([this.name]);
    if (asArray) {
      return path;
    } else {
      return path.join('/');
    }
  }
};


},{"lodash":undefined}],55:[function(require,module,exports){
module.exports = {
  toPng: function() {
    return this.layer.image.toPng();
  },
  saveAsPng: function(output) {
    return this.layer.image.saveAsPng(output);
  }
};


},{}],56:[function(require,module,exports){
var Group, Node, _,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

Node = require('../node.coffee');

module.exports = Group = (function(superClass) {
  extend(Group, superClass);

  function Group() {
    return Group.__super__.constructor.apply(this, arguments);
  }

  Group.prototype.type = 'group';

  Group.prototype.passthruBlending = function() {
    return this.get('blendingMode') === 'passthru';
  };

  Group.prototype.isEmpty = function() {
    var child;
    if (!(function() {
      var i, len, ref, results;
      ref = this._children;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        results.push(child.isEmpty());
      }
      return results;
    }).call(this)) {
      return false;
    }
  };

  Group.prototype["export"] = function() {
    return _.merge(Group.__super__["export"].call(this), {
      type: 'group',
      children: this._children.map(function(c) {
        return c["export"]();
      })
    });
  };

  return Group;

})(Node);


},{"../node.coffee":53,"lodash":undefined}],57:[function(require,module,exports){
var Layer, Node, _,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

Node = require('../node.coffee');

module.exports = Layer = (function(superClass) {
  extend(Layer, superClass);

  function Layer() {
    return Layer.__super__.constructor.apply(this, arguments);
  }

  Layer.prototype.type = 'layer';

  Layer.prototype.isEmpty = function() {
    return this.width === 0 || this.height === 0;
  };

  Layer.prototype["export"] = function() {
    var ref;
    return _.merge(Layer.__super__["export"].call(this), {
      type: 'layer',
      mask: this.layer.mask["export"](),
      text: (ref = this.get('typeTool')) != null ? ref["export"]() : void 0,
      image: {}
    });
  };

  return Layer;

})(Node);


},{"../node.coffee":53,"lodash":undefined}],58:[function(require,module,exports){
var Group, Layer, Node, Root, _,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

Node = require('../node.coffee');

Group = require('./group.coffee');

Layer = require('./layer.coffee');

module.exports = Root = (function(superClass) {
  extend(Root, superClass);

  Root.layerForPsd = function(psd) {
    var i, layer, len, prop, ref;
    layer = {};
    ref = Node.PROPERTIES;
    for (i = 0, len = ref.length; i < len; i++) {
      prop = ref[i];
      layer[prop] = null;
    }
    layer.top = 0;
    layer.left = 0;
    layer.right = psd.header.width;
    layer.bottom = psd.header.height;
    return layer;
  };

  Root.prototype.type = 'root';

  function Root(psd1) {
    this.psd = psd1;
    Root.__super__.constructor.call(this, Root.layerForPsd(this.psd));
    this.buildHeirarchy();
  }

  Root.prototype.documentDimensions = function() {
    return [this.width, this.height];
  };

  Root.prototype.depth = function() {
    return 0;
  };

  Root.prototype.opacity = function() {
    return 255;
  };

  Root.prototype.fillOpacity = function() {
    return 255;
  };

  Root.prototype["export"] = function() {
    var ref, ref1;
    return {
      children: this._children.map(function(c) {
        return c["export"]();
      }),
      document: {
        width: this.width,
        height: this.height,
        resources: {
          layerComps: ((ref = this.psd.resources.resource('layerComps')) != null ? ref["export"]() : void 0) || [],
          resolutionInfo: ((ref1 = this.psd.resources.resource('resolutionInfo')) != null ? ref1["export"]() : void 0) || [],
          guides: [],
          slices: []
        }
      }
    };
  };

  Root.prototype.buildHeirarchy = function() {
    var currentGroup, i, layer, len, parent, parseStack, ref;
    currentGroup = this;
    parseStack = [];
    ref = this.psd.layers;
    for (i = 0, len = ref.length; i < len; i++) {
      layer = ref[i];
      if (layer.isFolder()) {
        parseStack.push(currentGroup);
        currentGroup = new Group(layer, _.last(parseStack));
      } else if (layer.isFolderEnd()) {
        parent = parseStack.pop();
        parent.children().push(currentGroup);
        currentGroup = parent;
      } else {
        currentGroup.children().push(new Layer(layer, currentGroup));
      }
    }
    return this.updateDimensions();
  };

  return Root;

})(Node);


},{"../node.coffee":53,"./group.coffee":56,"./layer.coffee":57,"lodash":undefined}],59:[function(require,module,exports){
var _;

_ = require('lodash');

module.exports = {
  childrenAtPath: function(path, opts) {
    var matches, query;
    if (opts == null) {
      opts = {};
    }
    if (!Array.isArray(path)) {
      path = path.split('/').filter(function(p) {
        return p.length > 0;
      });
    }
    path = _.clone(path);
    query = path.shift();
    matches = this.children().filter(function(c) {
      if (opts.caseSensitive) {
        return c.name === query;
      } else {
        return c.name.toLowerCase() === query.toLowerCase();
      }
    });
    if (path.length === 0) {
      return matches;
    } else {
      return _.flatten(matches.map(function(m) {
        return m.childrenAtPath(_.clone(path), opts);
      }));
    }
  }
};


},{"lodash":undefined}],60:[function(require,module,exports){
var PathRecord, _;

_ = require('lodash');

module.exports = PathRecord = (function() {
  function PathRecord(file) {
    this.file = file;
    this.recordType = null;
  }

  PathRecord.prototype.parse = function() {
    this.recordType = this.file.readShort();
    switch (this.recordType) {
      case 0:
      case 3:
        return this._readPathRecord();
      case 1:
      case 2:
      case 4:
      case 5:
        return this._readBezierPoint();
      case 7:
        return this._readClipboardRecord();
      case 8:
        return this._readInitialFill();
      default:
        return this.file.seek(24, true);
    }
  };

  PathRecord.prototype["export"] = function() {
    return _.merge({
      recordType: this.recordType
    }, (function() {
      var ref;
      switch (this.recordType) {
        case 0:
        case 3:
          return {
            numPoints: this.numPoints
          };
        case 1:
        case 2:
        case 4:
        case 5:
          return {
            linked: this.linked,
            closed: ((ref = this.recordType) === 1 || ref === 2),
            preceding: {
              vert: this.precedingVert,
              horiz: this.precedingHoriz
            },
            anchor: {
              vert: this.anchorVert,
              horiz: this.anchorHoriz
            },
            leaving: {
              vert: this.leavingVert,
              horiz: this.leavingHoriz
            }
          };
        case 7:
          return {
            clipboard: {
              top: this.clipboardTop,
              left: this.clipboardLeft,
              bottom: this.clipboardBottom,
              right: this.clipboardRight,
              resolution: this.clipboardResolution
            }
          };
        case 8:
          return {
            initialFill: this.initialFill
          };
        default:
          return {};
      }
    }).call(this));
  };

  PathRecord.prototype.isBezierPoint = function() {
    var ref;
    return (ref = this.recordType) === 1 || ref === 2 || ref === 4 || ref === 5;
  };

  PathRecord.prototype._readPathRecord = function() {
    this.numPoints = this.file.readShort();
    return this.file.seek(22, true);
  };

  PathRecord.prototype._readBezierPoint = function() {
    var ref;
    this.linked = (ref = this.recordType) === 1 || ref === 4;
    this.precedingVert = this.file.readPathNumber();
    this.precedingHoriz = this.file.readPathNumber();
    this.anchorVert = this.file.readPathNumber();
    this.anchorHoriz = this.file.readPathNumber();
    this.leavingVert = this.file.readPathNumber();
    return this.leavingHoriz = this.file.readPathNumber();
  };

  PathRecord.prototype._readClipboardRecord = function() {
    this.clipboardTop = this.file.readPathNumber();
    this.clipboardLeft = this.file.readPathNumber();
    this.clipboardBottom = this.file.readPathNumber();
    this.clipboardRight = this.file.readPathNumber();
    this.clipboardResolution = this.file.readPathNumber();
    return this.file.seek(4, true);
  };

  PathRecord.prototype._readInitialFill = function() {
    this.initialFill = this.file.readShort();
    return this.file.seek(22, true);
  };

  return PathRecord;

})();


},{"lodash":undefined}],61:[function(require,module,exports){
var Resource, Util;

Util = require('./util.coffee');

module.exports = Resource = (function() {
  Resource.Section = require('./resource_section.coffee');

  function Resource(file) {
    this.file = file;
    this.id = null;
    this.type = null;
    this.length = 0;
  }

  Resource.prototype.parse = function() {
    var nameLength;
    this.type = this.file.readString(4);
    this.id = this.file.readShort();
    nameLength = Util.pad2(this.file.readByte() + 1) - 1;
    this.name = this.file.readString(nameLength);
    return this.length = Util.pad2(this.file.readInt());
  };

  return Resource;

})();


},{"./resource_section.coffee":62,"./util.coffee":67}],62:[function(require,module,exports){
var ResourceSection, _;

_ = require('lodash');

module.exports = ResourceSection = (function() {
  var RESOURCES;

  function ResourceSection() {}

  RESOURCES = [require('./resources/layer_comps.coffee'), require('./resources/layer_links.coffee'), require('./resources/resolution_info.coffee')];

  ResourceSection.factory = function(resource) {
    var Section, i, len;
    for (i = 0, len = RESOURCES.length; i < len; i++) {
      Section = RESOURCES[i];
      if (Section.prototype.id !== resource.id) {
        continue;
      }
      return _.tap(new Section(resource), function(s) {
        return s.parse();
      });
    }
    return null;
  };

  return ResourceSection;

})();


},{"./resources/layer_comps.coffee":64,"./resources/layer_links.coffee":65,"./resources/resolution_info.coffee":66,"lodash":undefined}],63:[function(require,module,exports){
var Resource, Resources;

Resource = require('./resource.coffee');

module.exports = Resources = (function() {
  function Resources(file) {
    this.file = file;
    this.resources = {};
    this.typeIndex = {};
    this.length = null;
  }

  Resources.prototype.skip = function() {
    this.length = this.file.readInt();
    return this.file.seek(this.length, true);
  };

  Resources.prototype.parse = function() {
    var finish, resource, resourceEnd, section;
    this.length = this.file.readInt();
    finish = this.length + this.file.tell();
    while (this.file.tell() < finish) {
      resource = new Resource(this.file);
      resource.parse();
      resourceEnd = this.file.tell() + resource.length;
      section = Resource.Section.factory(resource);
      if (section == null) {
        this.file.seek(resourceEnd);
        continue;
      }
      this.resources[section.id] = section;
      if (section.name != null) {
        this.typeIndex[section.name] = section.id;
      }
      this.file.seek(resourceEnd);
    }
    return this.file.seek(finish);
  };

  Resources.prototype.resource = function(search) {
    if (typeof search === 'string') {
      return this.byType(search);
    } else {
      return this.resources[search];
    }
  };

  Resources.prototype.byType = function(name) {
    return this.resources[this.typeIndex[name]];
  };

  return Resources;

})();


},{"./resource.coffee":61}],64:[function(require,module,exports){
var Descriptor, LayerComps;

Descriptor = require('../descriptor.coffee');

module.exports = LayerComps = (function() {
  LayerComps.prototype.id = 1065;

  LayerComps.prototype.name = 'layerComps';

  LayerComps.visibilityCaptured = function(comp) {
    return comp.capturedInfo & parseInt('001', 2) > 0;
  };

  LayerComps.positionCaptured = function(comp) {
    return comp.positionCaptured & parseInt('010', 2) > 0;
  };

  LayerComps.appearanceCaptured = function(comp) {
    return comp.appearanceCaptured & parseInt('100', 2) > 0;
  };

  function LayerComps(resource) {
    this.resource = resource;
    this.file = this.resource.file;
  }

  LayerComps.prototype.parse = function() {
    this.file.seek(4, true);
    return this.data = new Descriptor(this.file).parse();
  };

  LayerComps.prototype.names = function() {
    return this.data.list.map(function(comp) {
      return comp['Nm  '];
    });
  };

  LayerComps.prototype["export"] = function() {
    return this.data.list.map(function(comp) {
      return {
        id: comp.compID,
        name: comp['Nm  '],
        capturedInfo: comp.capturedInfo
      };
    });
  };

  return LayerComps;

})();


},{"../descriptor.coffee":4}],65:[function(require,module,exports){
var LinkLayers;

module.exports = LinkLayers = (function() {
  LinkLayers.prototype.id = 1026;

  LinkLayers.prototype.name = 'LinkLayers';

  function LinkLayers(resource) {
    this.resource = resource;
    this.file = this.resource.file;
    this.linkArray = [];
  }

  LinkLayers.prototype.parse = function() {
    var end;
    end = this.file.tell() + this.resource.length;
    while (end > this.file.tell()) {
      this.linkArray.push(this.file.readShort());
    }
    return this.linkArray.reverse();
  };

  return LinkLayers;

})();


},{}],66:[function(require,module,exports){
var ResolutionInfo;

module.exports = ResolutionInfo = (function() {
  ResolutionInfo.prototype.id = 1005;

  ResolutionInfo.prototype.name = 'resolutionInfo';

  function ResolutionInfo(resource) {
    this.resource = resource;
    this.file = this.resource.file;
  }

  ResolutionInfo.prototype.parse = function() {
    this.h_res = this.file.readUInt() / 65536;
    this.h_res_unit = this.file.readUShort();
    this.width_unit = this.file.readUShort();
    this.v_res = this.file.readUInt() / 65536;
    this.v_res_unit = this.file.readUShort();
    this.height_unit = this.file.readUShort();
    return this.resource.data = this;
  };

  ResolutionInfo.prototype["export"] = function() {
    var data, i, key, len, ref;
    data = {};
    ref = ['h_res', 'h_res_unit', 'width_unit', 'v_res', 'v_res_unit', 'height_unit'];
    for (i = 0, len = ref.length; i < len; i++) {
      key = ref[i];
      data[key] = this[key];
    }
    return data;
  };

  return ResolutionInfo;

})();


},{}],67:[function(require,module,exports){
module.exports = {
  pad2: function(i) {
    return (i + 1) & ~0x01;
  },
  pad4: function(i) {
    return ((i + 4) & ~0x03) - 1;
  },
  getUnicodeCharacter: function(cp) {
    var first, second;
    if (cp >= 0 && cp <= 0xD7FF || cp >= 0xE000 && cp <= 0xFFFF) {
      return String.fromCharCode(cp);
    } else if (cp >= 0x10000 && cp <= 0x10FFFF) {
      cp -= 0x10000;
      first = ((0xffc00 & cp) >> 10) + 0xD800;
      second = (0x3ff & cp) + 0xDC00;
      return String.fromCharCode(first) + String.fromCharCode(second);
    }
  },
  clamp: function(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }
};


},{}],"psd":[function(require,module,exports){
var File, Header, Image, LayerMask, LazyExecute, Module, PSD, RSVP, Resources,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

RSVP = require('rsvp');

Module = require('coffeescript-module').Module;

File = require('./psd/file.coffee');

LazyExecute = require('./psd/lazy_execute.coffee');

Header = require('./psd/header.coffee');

Resources = require('./psd/resources.coffee');

LayerMask = require('./psd/layer_mask.coffee');

Image = require('./psd/image.coffee');

module.exports = PSD = (function(superClass) {
  extend(PSD, superClass);

  PSD.Node = {
    Root: require('./psd/nodes/root.coffee')
  };

  PSD["extends"](require('./psd/init.coffee'));

  function PSD(data) {
    this.file = new File(data);
    this.parsed = false;
    this.header = null;
    Object.defineProperty(this, 'layers', {
      get: function() {
        return this.layerMask.layers;
      }
    });
    RSVP.on('error', function(reason) {
      return console.error(reason);
    });
  }

  PSD.prototype.parse = function() {
    if (this.parsed) {
      return;
    }
    this.parseHeader();
    this.parseResources();
    this.parseLayerMask();
    this.parseImage();
    return this.parsed = true;
  };

  PSD.prototype.parseHeader = function() {
    this.header = new Header(this.file);
    return this.header.parse();
  };

  PSD.prototype.parseResources = function() {
    var resources;
    resources = new Resources(this.file);
    return this.resources = new LazyExecute(resources, this.file).now('skip').later('parse').get();
  };

  PSD.prototype.parseLayerMask = function() {
    var layerMask;
    layerMask = new LayerMask(this.file, this.header);
    return this.layerMask = new LazyExecute(layerMask, this.file).now('skip').later('parse').get();
  };

  PSD.prototype.parseImage = function() {
    var image;
    image = new Image(this.file, this.header);
    return this.image = new LazyExecute(image, this.file).later('parse').ignore('width', 'height').get();
  };

  PSD.prototype.tree = function() {
    return new PSD.Node.Root(this);
  };

  return PSD;

})(Module);


},{"./psd/file.coffee":5,"./psd/header.coffee":6,"./psd/image.coffee":7,"./psd/init.coffee":19,"./psd/layer_mask.coffee":50,"./psd/lazy_execute.coffee":51,"./psd/nodes/root.coffee":58,"./psd/resources.coffee":63,"coffeescript-module":undefined,"rsvp":undefined}]},{},[])("psd")
});
