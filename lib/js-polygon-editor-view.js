'use babel';

// import Raphael from '../node_modules/raphael/raphael';
import PolygonEditor from './polygon-editor.js';

export default class JsPolygonEditorView {
  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('js-polygon-editor');
    this.element.innerHTML = `
<div id="drawAreaSource" class="js-polygon-editor-paper"></div>
<div class="js-polygon-editor-toolbar">
  <div id="js-polygon-editor-tool-add" class="js-polygon-editor-tool">Add</div>
  <div id="js-polygon-editor-tool-move" class="js-polygon-editor-tool">Move</div>
  <div id="js-polygon-editor-tool-delete" class="js-polygon-editor-tool">Delete</div>
  <div id="js-polygon-editor-tool-clear" class="js-polygon-editor-tool">Clear</div>
  <div id="js-polygon-editor-tool-zoomin" class="js-polygon-editor-tool">Zoom In</div>
  <div id="js-polygon-editor-tool-zoomout" class="js-polygon-editor-tool">Zoom Out</div>
  <div id="js-polygon-editor-tool-zoomhome" class="js-polygon-editor-tool">Home</div>
  
  <div id="js-polygon-editor-coordinates"></div>
</div>
<div class="js-polygon-editor-info">

<textarea id="js-polygon-editor-export-area" class="native-key-bindings js-polygon-editor-default" rows="10"></textarea>
</div>
`;
  }

  render() {
    var self = this;

    var elementCoordinates = document.getElementById(
      'js-polygon-editor-coordinates'
    );
    this.elementExportArea = document.getElementById(
      'js-polygon-editor-export-area'
    );

    function importStatus(err) {
      ['default', 'ok', 'error'].forEach(function forEachImportStatus(status) {
        self.elementExportArea.classList.remove(`js-polygon-editor-${status}`);
      });

      self.elementExportArea.classList.add(
        `js-polygon-editor-${err ? 'error' : 'ok'}`
      );
    }
    var pe = PolygonEditor('drawAreaSource', {
      events: {
        mousemove: function(pos) {
          elementCoordinates.innerHTML = `x=${pos.x}, y=${pos.y}`;
        },
        mouseout: function() {
          elementCoordinates.innerHTML = '';
        },
        exportText: function(text) {
          self.elementExportArea.value = text;
        },
        importStatus: importStatus
      }
    });
    pe.render();

    function setTool(name, button) {
      pe.setTool(name);
      self.tools.forEach(function(tool) {
        tool.classList.toggle(
          'js-polygon-editor-tool-selected',
          tool.id == button.id
        );
      });
    }

    function wireEvents(events) {
      return Object.keys(events).map(function(name) {
        var id = `js-polygon-editor-tool-${name}`;
        var button = document.getElementById(id);
        button.addEventListener('click', function(e) {
          events[name](name, button);
        });
        return button;
      });
    }

    this.tools = wireEvents({ add: setTool, move: setTool, delete: setTool });
    this.buttons = wireEvents({
      clear: function() {
        pe.clear();
        self.elementExportArea.value = '';
      },
      zoomin: pe.zoomIn,
      zoomout: pe.zoomOut,
      zoomhome: pe.zoomHome
    });

    // set default tool
    setTool('add', this.tools[0]);

    this.elementExportArea.addEventListener('keyup', function(e) {
      console.log('keyup', e);
      pe.importText(self.elementExportArea.value);
    });
  }

  handleResize() {
    console.log('handleResize');
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    return 'polygon-editor';
  }
}
