/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {IS_FIREFOX} from 'shared/environment';

export default class ActionIconWatchdog {
  private constructor() {}

  static start() {
    if (!IS_FIREFOX) {
      chrome.tabs.query({}, (tabs) =>
        tabs.forEach(this.checkAndHandleRestrictedPageIfSo.bind(this)),
      );
      chrome.tabs.onCreated.addListener((tab: chrome.tabs.Tab) => {
        this.checkAndHandleRestrictedPageIfSo(tab);
      });
    }

    // Listen to URL changes on the active tab and update the DevTools icon.
    chrome.tabs.onUpdated.addListener(this.handleTabsUpdatedEvent.bind(this));
  }

  static setIconAndPopup(lexicalBuildType: string, tabId: number) {
    const action = IS_FIREFOX ? chrome.browserAction : chrome.action;

    action.setIcon({
      path: {
        '128': chrome.runtime.getURL('icons/128-' + lexicalBuildType + '.png'),
        '16': chrome.runtime.getURL('icons/16-' + lexicalBuildType + '.png'),
        '32': chrome.runtime.getURL('icons/32-' + lexicalBuildType + '.png'),
        '48': chrome.runtime.getURL('icons/48-' + lexicalBuildType + '.png'),
      },
      tabId: tabId,
    });
    action.setPopup({
      popup: chrome.runtime.getURL('popups/' + lexicalBuildType + '.html'),
      tabId: tabId,
    });
  }

  private static handleTabsUpdatedEvent(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab,
  ): void {
    if (IS_FIREFOX) {
      // We don't properly detect protected URLs in Firefox at the moment.
      // However we can reset the DevTools icon to its loading state when the URL changes.
      // It will be updated to the correct icon by the onMessage callback below.
      if (tab.active && changeInfo.status === 'loading') {
        this.setIconAndPopup('disabled', tabId);
      }
    } else {
      // Don't reset the icon to the loading state for Chrome or Edge.
      // The onUpdated callback fires more frequently for these browsers,
      // often after onMessage has been called.
      this.checkAndHandleRestrictedPageIfSo(tab);
    }
  }

  private static isRestrictedBrowserPage(url: string | undefined) {
    return !url || new URL(url).protocol === 'chrome:';
  }

  private static checkAndHandleRestrictedPageIfSo(tab: chrome.tabs.Tab) {
    if (tab && tab.id && this.isRestrictedBrowserPage(tab.url)) {
      this.setIconAndPopup('restricted', tab.id);
    }
  }
}
