/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {CloneInto} from '../../types';

import {IS_FIREFOX} from 'shared/environment';

import {LexicalDevToolsEvents} from '../events';
import injectScript from './injectScript';

let backendDisconnected = false;
let backendInitialized = false;

// for security reasons, content scripts cannot read Lexical's changes to the DOM
// in order to access the editorState, we inject this script directly into the page
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#dom_access
injectScript('src/inject/index.bundle.js');

const port = chrome.runtime.connect({
  name: 'content-script',
});

function sayHelloToBackend() {
  port.postMessage({
    name: 'init',
  });
}

document.addEventListener(
  LexicalDevToolsEvents.LEXICAL_PRESENCE_UPDATE,
  function (e) {
    if (e.detail.lexical) {
      port.postMessage({
        name: 'lexical-found',
      });
    }
  },
);

document.addEventListener(
  LexicalDevToolsEvents.EDITOR_STATE_UPDATE,
  function (e) {
    // eslint-disable-next-line no-console
    console.log(
      '#2 Content Script: caught EDITOR_STATE_UPDATE; sending "editor-update" postMessage to "content-script" port',
      e,
    );
    port.postMessage({
      ...(e.detail ?? {}),
      name: 'editor-update',
    });
  },
);

function getCloneInto(): CloneInto | null {
  // @ts-ignore
  if (typeof globalThis.cloneInto === 'function') {
    // @ts-ignore
    return globalThis.cloneInto;
  }
  return null;
}

const cloneInto = getCloneInto();

function handleDisconnect() {
  backendDisconnected = true;
  // TODO: remove event listeners and post shutdown message
}

port.onMessage.addListener((message) => {
  if (message.name === LexicalDevToolsEvents.CHECK_FOR_LEXICAL) {
    backendInitialized = true;
    // As we load scripts on document_end, we wait for the
    // page to load before dispatching checkForLexical event
    window.onload = function () {
      document.dispatchEvent(
        new CustomEvent(LexicalDevToolsEvents.CHECK_FOR_LEXICAL),
      );
    };
  }

  if (message.name === LexicalDevToolsEvents.HIGHLIGHT) {
    const data = {lexicalKey: message.lexicalKey as string};
    const detail =
      IS_FIREFOX && cloneInto && document && document.defaultView
        ? cloneInto(data, document.defaultView)
        : data;
    document.dispatchEvent(
      new CustomEvent(LexicalDevToolsEvents.HIGHLIGHT, {
        detail,
      }),
    );
  }

  if (message.name === LexicalDevToolsEvents.DEHIGHLIGHT) {
    document.dispatchEvent(new CustomEvent(LexicalDevToolsEvents.DEHIGHLIGHT));
  }

  if (message.name === 'loadEditorState') {
    document.dispatchEvent(new CustomEvent('loadEditorState'));
  }
});
port.onDisconnect.addListener(handleDisconnect);

sayHelloToBackend();

if (!backendInitialized) {
  const intervalID = setInterval(() => {
    if (backendInitialized || backendDisconnected) {
      clearInterval(intervalID);
    } else {
      sayHelloToBackend();
    }
  }, 500);
}
