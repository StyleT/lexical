/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Events} from '@/events';

import useExtensionStore, {storeReadyPromise} from '../store';

export default defineUnlistedScript({
  main() {
    ContentScript.getTabID().then((tabID) => {
      storeReadyPromise
        .then(() => {
          // eslint-disable-next-line no-console
          console.log('Hello from injected script!', tabID);
          useExtensionStore.subscribe((state) => {
            // eslint-disable-next-line no-console
            // console.warn(`New store value in injected script`, state);
          });
          //setInterval(() => useExtensionStore.getState().increase(1), 5000);
        })
        .catch(console.error);
    });
  },
});

const ContentScript = (function () {
  let requestId = 0;

  function getTabID(data?: unknown): Promise<number> {
    const id = requestId++;

    return new Promise(function (resolve, reject) {
      const listener = function (evt: CustomEvent) {
        if (evt.detail.requestId === id) {
          // Deregister self
          document.removeEventListener(Events.LEXICAL_EXT_COMM_RES, listener);
          resolve(evt.detail.data);
        }
      };

      document.addEventListener(Events.LEXICAL_EXT_COMM_RES, listener);

      const payload = {data: data, id: id};

      document.dispatchEvent(
        new CustomEvent(Events.LEXICAL_EXT_COMM_REQ, {detail: payload}),
      );
    });
  }

  return {getTabID: getTabID};
})();
