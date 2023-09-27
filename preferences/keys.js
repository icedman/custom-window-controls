'use strict';

import { PrefKeys } from './prefKeys.js';

export let schemaId = 'org.gnome.shell.extensions.custom-window-controls';

export let SettingsKeys = function () {
  let settingsKeys = new PrefKeys();

  settingsKeys.setKeys({
    'window-list': {
      default_value: '',
      widget_type: 'json_array',
    },
    'border-radius': {
      default_value: 0,
      widget_type: 'scale',
    },
    'border-thickness': {
      default_value: 0,
      widget_type: 'dropdown',
      test: { values: [0, 1, 2, 3] },
    },
    'border-color': {
      default_value: [1, 1, 1, 1],
      widget_type: 'color',
    },
    'unfocused-border-radius': {
      default_value: 0,
      widget_type: 'scale',
    },
    'unfocused-border-thickness': {
      default_value: 0,
      widget_type: 'dropdown',
      test: { values: [0, 1, 2, 3] },
    },
    'unfocused-border-color': {
      default_value: [1, 1, 1, 1],
      widget_type: 'color',
    },
    'button-layout': {
      default_value: 0,
      widget_type: 'dropdown',
    },
    'control-button-style': {
      default_value: 0,
      widget_type: 'dropdown',
      options: ['circle', 'square', 'dash', 'vertical', 'slash', 'back_slash'],
    },
    'enable-button-skin': {
      default_value: true,
      widget_type: 'switch',
    },
    'traffic-light-colors': {
      default_value: true,
      widget_type: 'switch',
    },
    'button-color': {
      default_value: [1, 1, 1, 1],
      widget_type: 'color',
    },
    'hovered-traffic-light-colors': {
      default_value: true,
      widget_type: 'switch',
    },
    'hovered-button-color': {
      default_value: [1, 1, 1, 1],
      widget_type: 'color',
    },
    'unfocused-traffic-light-colors': {
      default_value: true,
      widget_type: 'switch',
    },
    'unfocused-button-color': {
      default_value: [1, 1, 1, 1],
      widget_type: 'color',
    },
  });

  return settingsKeys;
};
