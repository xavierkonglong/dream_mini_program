module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1761316310899, function(require, module, exports) {
module.exports = require('./lib/painter')

}, function(modId) {var map = {"./lib/painter":1761316310900}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1761316310900, function(require, module, exports) {
var fs = require('fs')
  , util = require('util')
  , xmlbuilder = require('xmlbuilder')
  , Layer = require('./layer')
  , Color = require('./color')

function Painter(options) {
  if (!(this instanceof Painter)) {
    return new Painter(options)
  }

  this.root = xmlbuilder.create('svg')
  this.root.attributes = {
    width: options.width + 'px',
    height: options.height + 'px',
    viewBox: '0 0 ' + options.width + ' ' + options.height,
    version: '1.1',
    xmlns: 'http://www.w3.org/2000/svg'
  }

  Layer.call(this)

  if (options.title) {
    this.title(options.title)
  }

  if (options.desc) {
    this.desc(options.desc)
  }
}
util.inherits(Painter, Layer)
Painter.createPainter = Painter

Painter.prototype.title = title
function title(text) {
  this.root.ele('title', {}, text)

  return this
}

Painter.prototype.desc = desc
function desc(text) {
  this.root.ele('desc', {}, text)

  return this
}

Painter.prototype.render = render
function render(stream, options) {
  if (typeof stream !== 'object') {
    stream = fs.createWriteStream(stream)
  }

  stream.write(this.toString(options))
  stream.end()
}

Painter.prototype.toString = toString
function toString(options) {
  return this.root.document().toString(options)
}

Painter.Color = Color
Painter.Layer = Layer
module.exports = Painter

}, function(modId) { var map = {"./layer":1761316310901,"./color":1761316310902}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1761316310901, function(require, module, exports) {
function Layer(parentNode, options) {
  if (!(this instanceof Layer)) {
    return new Layer(parentNode, options)
  }

  this.root = this.root || parentNode.ele('g', Layer.getStyle(options))
}

Layer.getStyle = getStyle
function getStyle(options) {
  var attrs = {}

  if (options && options.stroke) {
    attrs.stroke = options.stroke.color
    attrs['stroke-width'] = options.stroke.width
    attrs['stroke-linecap'] = options.stroke.linecap
  }

  if (options && options.fill) {
    attrs.fill = options.fill
  }

  return attrs
}

Layer.getPoints = getPoints
function getPoints(points) {
  return points.map(function (point) {
    return point.x + ',' + point.y
  }).join(' ')
}

Layer.validatePoints = validatePoints
function validatePoints(points) {
  if (!points || points.some(function (point) {
    return !(point && point.x && point.y)
  })) {
    throw new Error('Invalid Points')
  }
}

Layer.prototype.createLayer = createLayer
function createLayer(options) {
  return new Layer(this.root, options)
}

Layer.prototype.rect = rect
function rect(options) {
  var attrs

  options = options || {}

  attrs = Layer.getStyle(options)
  attrs.x = options.x || 0
  attrs.y = options.y || 0
  attrs.width = options.width || 0
  attrs.height = options.height || 0

  this.root.ele('rect', attrs)

  return this
}

Layer.prototype.circle = circle
function circle(options) {
  var attrs

  options = options || {}

  attrs = Layer.getStyle(options)
  attrs.cx = options.x || 0
  attrs.cy = options.y || 0
  attrs.r = options.radius || 0

  this.root.ele('circle', attrs)

  return this
}

Layer.prototype.ellipse = ellipse
function ellipse(options) {
  var attrs

  // TODO: Alternatively an ellipse based on width and height.

  options = options || {}
  options.radius = options.radius || {}

  attrs = Layer.getStyle(options)
  attrs.cx = options.x || 0
  attrs.cy = options.y || 0
  attrs.rx = options.radius.x || 0
  attrs.ry = options.radius.y || 0

  this.root.ele('ellipse', attrs)

  return this
}

Layer.prototype.line = line
function line(options) {
  var points = options && options.points
    , attrs

  Layer.validatePoints(points)

  attrs = Layer.getStyle(options)
  attrs.x1 = points[0].x || 0
  attrs.y1 = points[0].y || 0
  attrs.x2 = points[1].x || 0
  attrs.y2 = points[1].y || 0

  this.root.ele('line', attrs)

  return this
}

Layer.prototype.polyline = polyline
function polyline(options) {
  var points = options && options.points
    , attrs

  Layer.validatePoints(points)

  attrs = Layer.getStyle(options)
  attrs.points = Layer.getPoints(points)

  this.root.ele('polyline', attrs)

  return this
}

Layer.prototype.polygon = polygon
function polygon(options) {
  var points = options && options.points
    , attrs

  Layer.validatePoints(points)

  attrs = Layer.getStyle(options)
  attrs.points = Layer.getPoints(points)

  this.root.ele('polygon', attrs)

  return this
}

module.exports = Layer

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1761316310902, function(require, module, exports) {
var keywords = require('../data/colorKeywords')

function Color(r, g, b) {
  this.r = r
  this.g = g
  this.b = b
}

Color.prototype.toString = toString
function toString() {
  return Color.create(this.r, this.g, this.b)
}

Color.create = create
function create(r, g, b) {
  return 'rgb(' + r + ', ' + g + ', ' + b + ')'
}

Object.keys(keywords).forEach(function (key) {
  Color[key] = keywords[key]
})

module.exports = Color

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1761316310899);
})()
//miniprogram-npm-outsideDeps=["fs","util","xmlbuilder","../data/colorKeywords"]
//# sourceMappingURL=index.js.map