/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalDevToolsEvents} from '../events';
import ActionIconWatchdog from './ActionIconWatchdog';

ActionIconWatchdog.start();

// Create messaging connection to send editorState updates to Lexical DevTools App.
// Each tab will have a separate messaging port for the devTools app & the inspectedWindow's content script, eg. { tabId: { reactPort, contentScriptPort } }
const tabsToPorts: Record<
  number,
  {
    contentScriptPort?: chrome.runtime.Port;
    reactPort?: chrome.runtime.Port;
    devtoolsPort?: chrome.runtime.Port;
  }
> = {};

// The Lexical DevTools React UI sends a message to initialize the port.
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  port.onMessage.addListener((message) => {
    let tabID;

    if (port.sender && port.sender.tab) {
      tabID = port.sender.tab.id;
    } else if (message.tabId) {
      // in the DevTools React App, port.sender is undefined within FROM_APP messages
      // instead tabId is sent within message payload
      tabID = message.tabId;
    } else {
      return;
    }

    if (tabID == null) {
      throw new Error(
        `Was unable to detect tabId for the following message: ${message.toString()}`,
      );
    }

    tabsToPorts[tabID] = tabsToPorts[tabID] ? tabsToPorts[tabID] : {};

    if (message.name === 'init' && port.name === 'react-app') {
      // eslint-disable-next-line no-console
      console.log(
        `Background Script: Initialized "react" port for tabID: ${tabID}`,
      );
      port.onDisconnect.addListener((disconnectedPort) => {
        // @ts-expect-error
        if (disconnectedPort.error != null) {
          // eslint-disable-next-line no-console
          console.log(
            // @ts-expect-error
            `Disconnected from "react-app" port for tabID "${tabID}" due to an error: ${disconnectedPort.error}`,
          );
        } else if (chrome.runtime.lastError) {
          // eslint-disable-next-line no-console
          console.log(
            `Disconnected from "react-app" port for tabID "${tabID}" due to an error: ${chrome.runtime.lastError}`,
          );
        }
        delete tabsToPorts[tabID].reactPort;
      });
      tabsToPorts[tabID].reactPort = port;
      return;
    }

    if (message.name === 'init' && port.name === 'content-script') {
      tabsToPorts[tabID] = tabsToPorts[tabID] ? tabsToPorts[tabID] : {};
      tabsToPorts[tabID].contentScriptPort = port;
      port.postMessage({
        name: LexicalDevToolsEvents.CHECK_FOR_LEXICAL,
      });
      return;
    }

    if (message.name === 'lexical-found' && port.name === 'content-script') {
      ActionIconWatchdog.setIconAndPopup('production', tabID);
    }

    if (message.name === 'init' && port.name === 'devtools') {
      const contentScriptPort = tabsToPorts[tabID].contentScriptPort;
      if (contentScriptPort) {
        contentScriptPort.postMessage({
          name: 'loadEditorState',
        });
      }
    }

    if (message.name === 'editor-update') {
      const reactPort = tabsToPorts[tabID].reactPort;
      // eslint-disable-next-line no-console
      console.log(
        '#3 Background Script: caught "editor-update" postMessage',
        reactPort,
        message,
      );
      if (reactPort) {
        // eslint-disable-next-line no-console
        console.log(
          '#4 Background Script: sending "editor-update" postMessage to "react" port',
        );
        reactPort.postMessage(message);
      }
    }

    if (message.name === 'highlight' || message.name === 'dehighlight') {
      const contentScriptPort = tabsToPorts[tabID].contentScriptPort;
      if (contentScriptPort) {
        contentScriptPort.postMessage({
          lexicalKey: message.lexicalKey ? message.lexicalKey : null,
          name: message.name,
        });
      }
    }
  });
});
