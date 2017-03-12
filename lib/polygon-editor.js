'use babel';

import Raphael from '../node_modules/raphael/raphael';
import _ from 'lodash';

export default function PolygonEditor(id, options) {
  var self = this;

  var gridSize = 10;
  var subGridSize = 10;
  this.points = [];

  this.element = document.getElementById(id);
  this.size = getSize(
    element.clientWidth,
    element.clientHeight,
    gridSize,
    subGridSize
  );

  // console.log('PolygonEditor', this.size);
  this.paper = Raphael('drawAreaSource', this.size.width, this.size.height);

  function wireEvents(name) {
    self.element.addEventListener(name, function(e) {
      var pos = getEventPosition(e);
      if (self.tool && self.tool[name]) {
        self.tool[name](pos, e);
      }
      if (options.events[name]) {
        options.events[name](pos, e);
      }
    });
  }

  ['mousemove', 'mouseout', 'mousedown', 'mouseup'].forEach(wireEvents);

  function update() {
    updatePath();
    if (options.events.exportText) {
      options.events.exportText(exportText());
    }
  }
  
  this.tools = {
    add: {
      mousedown: function(pos, e) {
        addPoint(pos);
        update();
      }
    },
    move: {
      mousedown: function(pos, e) {
        self.drag = nearestPointIdx(pos);
      },
      mousemove: _.throttle(function(pos, e) {
        if (self.drag !== undefined) {
          movePoint(self.points[self.drag], pos);
          update();
        }
      }, 100),
      mouseup: function() {
        self.drag = undefined;
      }
    },
    delete: {
      mousedown: function(pos, e) {
        console.log('delete mousedown');
        var idx = nearestPointIdx(pos);
        self.points[idx].box.remove();
        self.points.splice(idx, 1);
        update();
      }
    }
  };

  function getSize(w, h, gridSize, subGridSize) {
    var width = w;
    var height = h;
    return {
      width,
      height,
      centerX: width / 2,
      centerY: height / 2,
      gridSize,
      subGridSize
    };
  }

  function getEventPosition(e) {
    // console.log('getEventPosition', e);
    // if the shift key is pressed, do not round (identity function)
    var round = e.shiftKey ? x => x : Math.round;
    if (e.preventDefault) e.preventDefault();
    e.stopPropagation();
    var x = round((e.offsetX - self.size.centerX) / self.size.gridSize);
    var y = -round((e.offsetY - self.size.centerY) / self.size.gridSize);
    var screenX = self.size.centerX + x * self.size.gridSize;
    var screenY = self.size.centerY - y * self.size.gridSize;
    return { x, y, screenX, screenY };
  }
  
  function distance(p0, p1) {
      return Math.sqrt((p0.x - p1.x) * (p0.x - p1.x) + (p0.y - p1.y) * (p0.y - p1.y));
  }

  function nearestPointIdx(pos) {
    return this.points.map(function(point, idx) {
      return {dist: distance(pos, point), idx};
    }).sort(function(a,b) {
      return a.dist > b.dist;
    })[0].idx;
  }
  
  function clear() {
    self.paper.clear();
    delete self.polygon;
    self.points = [];
    renderGrid(self.size);
  }

  function render() {
    renderGrid(self.size);
  }

  function renderGrid(size) {
    function axis(center, length, size, subsize, format) {
      var minor = [];
      var major = [];
      var lineNum = Math.floor(center / size);
      for (var i = 1; i <= lineNum; i++) {
        var pitch = i * size;

        if (i % subsize == 0) {
          major.push(format(center + pitch, length));
          major.push(format(center - pitch, length));
        } else {
          minor.push(format(center + pitch, length));
          minor.push(format(center - pitch, length));
        }
      }
      return [major, minor];
    }
    var str = '';
    var vert = (x, h) => `M${x},0L${x},${h}`;
    var [majorV, minorV] = axis(
      size.centerX,
      size.height,
      size.gridSize,
      size.subGridSize,
      vert
    );

    var horz = (y, w) => `M0,${y}L${w},${y}`;
    var [majorH, minorH] = axis(
      size.centerY,
      size.width,
      size.gridSize,
      size.subGridSize,
      horz
    );

    self.grid = self.paper
      .path(minorV.join('') + minorH.join(''))
      .attr('stroke', '#9ce5fb');

    self.subgrid = self.paper
      .path(majorV.join('') + majorH.join(''))
      .attr('stroke', '#26bbe7');

    self.axes = self.paper
      .path(
        `M0,${size.centerY}L${size.width},${size.centerY}M${size.centerX},0L${size.centerX},${size.height}`
      )
      .attr('stroke', '#1183a5');
  }

  function addPoint(pos) {
    self.points.push({
      x: pos.x,
      y: pos.y,
      screenX: pos.screenX,
      screenY: pos.screenY,
      type: 0,
      box: self.paper.rect(
        pos.screenX - self.size.gridSize / 2,
        pos.screenY - self.size.gridSize / 2,
        self.size.gridSize,
        self.size.gridSize
      ),
      prevCP: {
        x: 0,
        y: 0
      },
      nextCP: {
        x: 0,
        y: 0
      }
    });
  }
  
  function movePoint(point, pos) {
    point.x = pos.x;
    point.y = pos.y;
    point.screenX = pos.screenX;
    point.screenY = pos.screenY;
    point.box.attr({
        x: pos.screenX - self.size.gridSize / 2,
        y: pos.screenY - self.size.gridSize / 2
    });
  }

  function updatePath() {
    var path = self.points.reduce(
      function(result, point, idx) {
        if (!result.path) result.path = [];

        if (result.last && (result.last.type == 1 || point.type == 1)) {
          result.path.push(
            `C${result.last.screenX},${result.last.screenY},${point.screenX},${point.screenY}`
          );
        } else {
          result.path.push(`L${point.screenX},${point.screenY}`);
        }
        result.last = point;

        return result;
      },
      {}
    );

    var endpoint = self.points[self.points.length - 1];

    if (!self.polygon)
      self.polygon = self.paper.path('').attr('stroke-width', 3);

    self.polygon.attr(
      'path',
      `M${endpoint.screenX},${endpoint.screenY}${path.path.join('')}Z`
    );
  }

  function importStatus(err) {
    if (options.events.importStatus) {
      options.events.importStatus(err);
      console[err ? 'error' : 'info']('polygon-editor importText', err || 'ok');
    } else {
      console[err ? 'error' : 'info']('polygon-editor importText', err || 'ok');
    }
  }

  function importText(text) {
    try {
      var a = JSON.parse(text);
      clear();
      a.forEach(function(p) {
        var [x, y] = p;
        var screenX = self.size.centerX + x * self.size.gridSize;
        var screenY = self.size.centerY + y * self.size.gridSize;
        addPoint({ x, y, screenX, screenY });
      });

      updatePath();
      importStatus();
    } catch (err) {
      importStatus(err);
    }
  }

  function exportText() {
    var maxInterpolateSteps = 100;
    // var str = '';
    // // for (var i = 0; i < local.paths.length; i++) {
    //     // str += local.paths[i].prefix + '[';
    //     if (this.points.length > 0) {
    //         for (var j = 0; j < this.points.length; j++) {
    //             var p0 = this.points[j];
    //             var p1 = this.points[(j + 1) % this.points.length];
    //             str += '[' + p0.x + ',' + p0.y;
    //             if (p0.type == 1 || p1.type == 1) {
    //                 var q0 = {
    //                     x: p0.x + p0.nextCP.x,
    //                     y: p0.y + p0.nextCP.y
    //                 };
    //                 var q1 = {
    //                     x: p1.x + p1.prevCP.x,
    //                     y: p1.y + p1.prevCP.y
    //                 };
    //                 var prevPoint = p0;
    //                 str += '/*1:' + p0.prevCP.x + ',' + p0.prevCP.y + ',' + p0.nextCP.x + ',' + p0.nextCP.y + '*/';
    //                 for (var n = 1; n < maxInterpolateSteps; n += 1) {
    //                     // var k = n / maxInterpolateSteps;
    //                     // //The space makes these points not be used when generating the path again from code.
    //                     // var r0 = interpolate(p0, q0, k);
    //                     // var r1 = interpolate(q0, q1, k);
    //                     // var r2 = interpolate(q1, p1, k);
    //                     // var b0 = interpolate(r0, r1, k);
    //                     // var b1 = interpolate(r1, r2, k);
    //                     // var s = interpolate(b0, b1, k);
    //                     // if (distance(s, prevPoint) >= 1) {
    //                     //     prevPoint = s;
    //                     //     str += '] ,[';
    //                     //     str += (Math.round(s.x * 100) / 100) + ',' + (Math.round(s.y * 100) / 100);
    //                     // }
    //                 }
    //             }
    //             str += ']';
    //             if (j < this.points.length - 1)
    //                 str += ',';
    //         }
    //     } else {
    //         str += '[]';
    //     }
    //     // str += ']' + local.paths[i].postfix;
    // // }
    //
    // console.log('updateExport', str);

    var exportPoints = this.points.map(function(point) {
      return `[${point.x}, ${point.y}]`;
    });
    return `[${exportPoints}]`;
  }

  function setTool(name) {
    console.log('setTool', name);
    self.tool = self.tools[name];
    console.log('tool', self.tool);
  }

  function zoomIn() {
    console.log('zoomIn');
  }
  function zoomOut() {
    console.log('zoomOut');
  }
  function zoomHome() {
    console.log('zoomHome');
  }

  return {
    render,
    setTool,
    clear,
    zoomIn,
    zoomOut,
    zoomHome,
    importText
  };
}
