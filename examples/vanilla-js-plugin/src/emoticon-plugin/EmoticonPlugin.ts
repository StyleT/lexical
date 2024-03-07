/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalEditor, TextNode} from 'lexical';

import {$createEmojiNode} from './EmojiNode';
import emojiReplacementMap from './emojiReplacementMap';

function findEmoji(text: string): [number, string | null] {
  const skippedText: string[] = [];

  for (const word of text.split(' ')) {
    if (!emojiReplacementMap.has(word)) {
      skippedText.push(word);
      continue;
    }

    // TODO: why this 1 is needed?
    return [skippedText.join(' ').length + 1, word];
  }

  return [0, null];
}

function textNodeTransform(node: TextNode): void {
  if (!node.isSimpleText() || node.hasFormat('code')) {
    return;
  }

  const text = node.getTextContent();

  // Find only 1st occurence as transform will be re-run anyway for the rest
  // because newly inserted nodes are considered to be dirty
  const [i, word] = findEmoji(text);
  if (word === null) {
    return;
  }

  let targetNode;
  if (i === 1) {
    // First text chunk within string, splitting onto 2 parts
    [targetNode] = node.splitText(i + word.length);
  } else {
    // In the middle of a string
    [, targetNode] = node.splitText(i, i + word.length);
  }

  const emojiNode = $createEmojiNode(emojiReplacementMap.get(word)!);
  targetNode.replace(emojiNode);
}

export function registerEmoticon(editor: LexicalEditor): () => void {
  // We don't use editor.registerUpdateListener here as...
  return editor.registerNodeTransform(TextNode, textNodeTransform);
}
