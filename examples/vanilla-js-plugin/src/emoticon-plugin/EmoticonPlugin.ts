/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createTextNode, LexicalEditor, LexicalNode, TextNode} from 'lexical';

import {$createEmoticonNode} from './EmoticonNode';
import emojis from 'emoji-datasource-facebook/emoji.json';

const emojiTexts = emojis.reduce<{[key: string]: string}>((acc, row, idx) => {
  if (!row.has_img_facebook) {
    return acc;
  }

  if (row.text != null) {
    acc[row.text] = row.unified;
  }
  if (row.texts != null) {
    for (let i = 0; i < row.texts.length; i++) {
      acc[row.texts[i]] = row.unified;
    }
  }
  acc[`:${row.short_name}:`] = row.unified;

  return acc;
}, {});
console.log(emojiTexts);

export const checkText = (text: string): string => {
  const words = text.split(' ');
  const newText: string[] = [];
  words.forEach((word) => {
    let w = word;
    if (word in emojiTexts) {
      w = emojiTexts[word];
    }
    newText.push(w);
  });
  return newText.join(' ');
};

// const gallery = import.meta.glob('@emoji-datasource-facebook/**/*.{png,PNG}', { eager: false, as: 'url' });
// console.log(gallery);
// console.log(gallery['/node_modules/emoji-datasource-facebook/img/facebook/64/1f0cf.png']());

function emoticonTransform(node: TextNode) {
  if (node.hasFormat('code')) {
    return;
  }
  console.log('node', node.getParent());
  const textContent = node.getTextContent();

  let currNode: LexicalNode = node;
  const words = textContent.split(' ');
  let newText: string[] = [];
  words.forEach((word) => {
    let w = word;
    if (word in emojiTexts) {
      console.log('tst', TextNode.clone(node).getParent());
      const prevNode = currNode.insertAfter(TextNode.clone(node).getParent.setTextContent(newText.join(' ')));
      newText = [];
      console.log('prevNode', prevNode.getParent());
      currNode = prevNode.insertAfter($createEmoticonNode('', '🙂'));
      // w = emojiTexts[word];
      return;
    }
    newText.push(w);
  });
  if (newText.length > 0 && currNode !== node) {
    currNode = currNode.insertAfter(TextNode.clone(node).setTextContent(newText.join(' ')));
  }

  // if (textContent.includes(':avo:')) {
  //   node.replace($createEmoticonNode('emoticon avo-emoticon', 'avo'));
  // } else if (textContent.includes(':)')) {
  //   node.replace($createEmoticonNode('', '🙂'));
  // }
}

export function registerEmoticon(editor: LexicalEditor): () => void {
  // We don't use editor.registerUpdateListener here as...
  const removeTransform = editor.registerNodeTransform(
    TextNode,
    emoticonTransform,
  );
  return () => {
    removeTransform();
  };
}
