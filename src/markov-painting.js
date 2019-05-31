(function (root, factory) {
  if (typeof define === "function" && define.amd) { define([], factory); }
  else if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.MarkovPainting = factory(); }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ADJACENT = [
    {x: -1, y: 0},
    {x: 0, y: -1},
    {x: 1, y: 0},
    {x: 0, y: 1}
  ];

  var RandomStack = function (length) {
    this._data = new Array(length);
    this.length = 0;

    this.push = function (e) {
      this._data[this.length++] = e;
    };

    this.pop = function () {
      if (this.length == 0) {
        return null;
      }
      var idx = Math.floor(Math.random() * this.length);
      var e = this._data[idx];
      this._data[idx] = this._data[--this.length];
      return e;
    }
  };

  function getColor(imgData, index) {
    return {
      r: imgData[index],
      g: imgData[index+1],
      b: imgData[index+2]
    };
  }

  function setColor(imgData, index, color) {
    imgData[index] = color.r;
    imgData[index+1] = color.g;
    imgData[index+2] = color.b;
    imgData[index+3] = 255;
  }

  function compressColor(color, compression) {
    return {
      r: Math.floor(color.r / compression) * compression,
      g: Math.floor(color.g / compression) * compression,
      b: Math.floor(color.b / compression) * compression
    };
  }

  function encode(color) {
    return (color.r << 16) + (color.g << 8) + color.b;
  }

  function decode(key) {
    return {
      r: key >> 16,
      g: key >> 8 & 255,
      b: key & 255
    };
  }

  var MarkovPainting = function () {
    this._model = {};
    this.compression = 1;
  };

  MarkovPainting.prototype = {
    reset: function () {
      this._model = {};
    },

    addColorTransition: function (color1, color2) {
      var c1 = compressColor(color1, this.compression);
      var c2 = compressColor(color2, this.compression);
      var key1 = encode(c1);
      var key2 = encode(c2);
      if (this._model.hasOwnProperty(key1)) {
        this._model[key1].push(key2);
      }
      else {
        this._model[key1] = [key2];
      }
    },

    getNextColor: function (color) {
      var key = encode(color);
      if (this._model.hasOwnProperty(key)) {
        var random = Math.floor(Math.random() * this._model[key].length);
        return decode(this._model[key][random]);
      }
      return null;
    },

    getRandomColor: function () {
      var keys = Object.keys(this._model);
      if (keys.length) {
        var random = Math.floor(Math.random() * keys.length);
        return decode(keys[random]);
      }
      return null;
    },

    feedImageData: function (imageData) {
      var x = 0, y = 0, idx = 0, color = null;
      var x_ = 0, y_ = 0, idx_ = 0, color_ = null;
      for (x = 0; x < imageData.width; x++) {
        for (y = 0; y < imageData.height; y++) {
          idx = (x + y * imageData.width) << 2;
          color = getColor(imageData.data, idx);
          for (var k = 0; k < ADJACENT.length; k++) {
            x_ = x + ADJACENT[k].x;
            y_ = y + ADJACENT[k].y;
            if (x_ >= 0 && x_ < imageData.width && y_ >= 0 && y_ < imageData.height) {
              idx_ = (x_ + y_ * imageData.width) << 2;
              color_ = getColor(imageData.data, idx_);
              this.addColorTransition(color, color_);
            }
          }
        }
      }
    },

    feedColorMatrix: function (matrix) {
      var rows = matrix.length, columns = matrix[0].length;
      var r = 0, c = 0, color = null;
      var r_ = 0, c_ = 0, color_ = null;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < columns; c++) {
          color = matrix[r][c];
          for (var k = 0; k < ADJACENT.length; k++) {
            r_ = r + ADJACENT[k].y;
            c_ = c + ADJACENT[k].x;
            if (r_ >= 0 && r_ < rows && c_ >= 0 && c_ < columns) {
              color_ = matrix[r_][c_];
              this.addColorTransition(color, color_);
            }
          }
        }
      }
    },

    createImageData: function (width, height) {
      var imageData = new Uint8ClampedArray((width * height) << 2);
      var stack = new RandomStack();

      var point = {
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height)
      };
      var index = (point.x + point.y * width) << 2;
      setColor(imageData, index, this.getRandomColor());
      stack.push(point);

      var x = 0, y = 0, color = null, nextColor = null;
      while (stack.length > 0) {
        point = stack.pop();
        index = (point.x + point.y * width) << 2;
        color = getColor(imageData, index);
        for (var k = 0; k < ADJACENT.length; k++) {
          x = point.x + ADJACENT[k].x;
          y = point.y + ADJACENT[k].y;
          if (x >= 0 && x < width && y >= 0 && y < height) {
            index = (x + y * width) << 2;
            if (imageData[index+3] == 0) {
              nextColor = this.getNextColor(color);
              setColor(imageData, index, nextColor);
              stack.push({x: x, y: y });
            }
          }
        }
      }
      return imageData;
    }
  };

  return MarkovPainting;
}));
