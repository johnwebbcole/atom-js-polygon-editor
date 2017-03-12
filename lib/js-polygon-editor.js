'use babel';

import JsPolygonEditorView from './js-polygon-editor-view';
import {CompositeDisposable} from 'atom';
var url = require('url');

var test = [[0, 0], [8, 0], [8, 8], [0, 8]];

export default {
  jsPolygonEditorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    console.log('js-polygon-editor.activate', state);
    this.jsPolygonEditorView = new JsPolygonEditorView(
      state.jsPolygonEditorViewState,
    );
    this.modalPanel = atom.workspace.addRightPanel({
      item: this.jsPolygonEditorView.getElement(),
      visible: false,
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'js-polygon-editor:toggle': () => this.show(),
      }),
    );

    atom.workspace.addOpener(function(uri) {
      var u = url.parse(uri);
      console.log('addOpener js-polygon-editor:', u, uri);

      if (u.protocol != 'js-polygon-editor:') return;

      this.jsPolygonEditorView = new JsPolygonEditorView(
        state.jsPolygonEditorViewState,
      );
      return this.jsPolygonEditorView;
    });
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.jsPolygonEditorView.destroy();
  },

  serialize() {
    return {
      jsPolygonEditorViewState: this.jsPolygonEditorView.serialize(),
    };
  },

  show() {
    var self = this;
    console.log('JsPolygonEditor was shown!');

    atom.workspace
      .open('js-polygon-editor://toggle', {
        split: 'right',
        searchAllPanes: true,
        activatePane: false,
      })
      .then(function(view) {
        this.pane = atom.workspace.paneForItem(view);
        console.log('view', view, this.pane);
        self.subscriptions.add(
          this.pane.onDidChangeFlexScale(function(e) {
            // console.log('onDidChangeFlexScale');
            view.handleResize(e);
          }),
        );

        self.subscriptions.add(
          this.pane.onDidActivate(function(e) {
            // console.log('onDidActivate');
            view.handleResize(e);
          }),
        );

        view.render();
      });
  },
};
