const { TextEditor } = require('atom');

const defaultValidator = (text) => {
  if (text.trim().length === 0) {
    return 'required';
  }
  return null;
};

const storageNamePrefix = "atom-input-dialog:";

module.exports = class InputDialog {
  constructor(options = {}) {
    this.callback = options.callback;

    this.historyName = options.historyName;
    this.history = this.loadHistory();
    this.historyIndex = this.history.length;

    this.miniEditor = this.buildMiniEditor(options);
    this.message = this.buildMessage(options);
    if (options.labelText) {
      this.label = this.buildLabel(options);
    }
    this.element = this.buildElement(options);

    this.validator = options.validator ? options.validator : defaultValidator;
    this.miniEditor.onDidChange(() => {
      this.message.textContent = this.validator(this.miniEditor.getText());
    });

    atom.commands.add(this.element, {
      "core:move-up": this.prevHistory.bind(this),
      "core:move-down": this.nextHistory.bind(this),
      'core:confirm': this.confirm.bind(this),
      'core:cancel': this.close.bind(this),
    });
  }

  attach() {
    this.storeFocusedElement();
    this.panel = atom.workspace.addModalPanel({ item: this });
    this.miniEditor.element.focus();
    this.miniEditor.scrollToCursorPosition();
  }

  confirm() {
    const text = this.miniEditor.getText();
    const error = this.validator(text);
    if (error) {
      this.message.textContent = error;
      return;
    }

    this.saveHistory(text);
    if (this.callback) {
      this.callback(text);
    }
    this.close();
  }

  close() {
    this.miniEditor.setText('');
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }

    if (this.miniEditor.element.hasFocus()) {
      this.restoreFocus();
    }
  }

  storeFocusedElement() {
    this.previouslyFocusedElement = document.activeElement;
    return this.previouslyFocusedElement;
  }

  restoreFocus() {
    if (this.previouslyFocusedElement && this.previouslyFocusedElement.parentElement) {
      this.previouslyFocusedElement.focus();
      return;
    }
    atom.views.getView(atom.workspace).focus();
  }

  buildMiniEditor({ defaultText, textPattern, selectedRange }) {
    const miniEditor = new TextEditor({ mini: true });
    miniEditor.element.addEventListener('blur', this.close.bind(this));

    if (defaultText) {
      miniEditor.setText(defaultText);
      if (selectedRange) {
        miniEditor.setSelectedBufferRange(selectedRange);
      }
    }

    if (textPattern) {
      miniEditor.onWillInsertText(({ cancel, text }) => {
        if (!text.match(textPattern)) {
          cancel();
        }
      });
    }

    return miniEditor;
  }

  buildLabel({ labelText, labelClass }) {
    const label = document.createElement('label');
    label.textContent = labelText;
    if (labelClass) {
      label.classList.add(labelClass);
    }

    return label;
  }

  buildMessage() {
    const message = document.createElement('div');
    message.classList.add('message');
    return message;
  }

  buildElement({ elementClass }) {
    const element = document.createElement('div');
    if (elementClass) {
      element.classList.add(elementClass);
    }
    if (this.label) {
      element.appendChild(this.label);
    }
    element.appendChild(this.miniEditor.element);
    element.appendChild(this.message);

    return element;
  }

  loadHistory() {
    if (this.historyName == undefined) {
      return [];
    }
    var items = localStorage.getItem(storageNamePrefix + this.historyName);
    if (!items) {
      return [];
    }
    items = JSON.parse(items);
    if (!Array.isArray(items)) {
      return [];
    }
    return items;
  }

  saveHistory(newItem) {
    if (this.historyName == undefined) {
      return;
    }
    var newHistory = [newItem];
    var existItem = {};
    existItem[newItem] = true;
    for (var i = this.history.length - 1; i >= 0; i--) {
      if (!existItem[this.history[i]]) {
        newHistory.unshift(this.history[i]);
        existItem[this.history[i]] = true;
      }
    }
    localStorage.setItem(storageNamePrefix + this.historyName, JSON.stringify(newHistory));
  }

  prevHistory() {
    var index = this.historyIndex - 1;
    if (index < 0) {
      index = 0;
    }
    this.historyIndex = index;
    this.miniEditor.setText((index < this.history.length) ? this.history[index] : "");
  }

  nextHistory() {
    var index = this.historyIndex + 1;
    if (index > this.history.length) {
      index = this.history.length;
    }
    this.historyIndex = index;
    this.miniEditor.setText((index < this.history.length) ? this.history[index] : "");
  }
};
