/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export default function injectScript(src: string) {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL(src);
  s.type = 'module'; // ESM module support
  s.onload = () => s.remove();
  (document.head || document.documentElement).append(s);
}
