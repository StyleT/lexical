/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import emojis from 'emoji-datasource-facebook/emoji.json';

const emojiReplacementMap = emojis.reduce<Map<string, string>>((acc, row) => {
  if (!row.has_img_facebook) {
    return acc;
  }
  acc.set(`:${row.short_name}:`, row.unified);

  if (row.text != null) {
    acc.set(row.text, row.unified);
  }
  if (row.texts != null) {
    for (const text of row.texts) {
      acc.set(text, row.unified);
    }
  }

  return acc;
}, new Map());

export default emojiReplacementMap;
