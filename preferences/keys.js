'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { PrefKeys } = Me.imports.preferences.prefKeys;

var schemaId = 'org.gnome.shell.extensions.custom-window-controls';

var SettingsKeys = new PrefKeys();
SettingsKeys.setKeys({
  'window-list': {
    default_value: '',
    widget_type: 'json_array',
  },
  'control-button-style': {
    default_value: 0,
    widget_type: 'dropdown',
    options: [
      'circle',
      'square',
      'dash',
      'diamond',
      'vertical',
      'slash',
      'back_slash',
    ],
  },
  'accent-color': {
    default_value: [0, 0, 0, 1],
    widget_type: 'color',
  },
});
