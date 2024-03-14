/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import {isHTMLElement, TextNode} from 'lexical';

export type SerializedEmojiNode = Spread<
  {
    unifiedID: string;
  },
  SerializedTextNode
>;

// TODO: write tests (including export/import) and write article
// article plan: basic code, import/export, then add more features

// TODO: try to replace with postinstall
const BASE_EMOJI_URI =
  'https://cdn.jsdelivr.net/npm/emoji-datasource-facebook@15.1.2/img/facebook/64/';
const EMOJI_DATA_ATTR = 'data-lexical-emoji-id';

function convertEmojiElement(domNode: Node): DOMConversionOutput {
  if (isHTMLElement(domNode)) {
    const id = domNode.getAttribute(EMOJI_DATA_ATTR);
    if (id) {
      return {node: $createEmojiNode(id)};
    }
  }

  return {node: null};
}

export class EmojiNode extends TextNode {
  __unifiedID: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__unifiedID, node.__key);
  }

  constructor(unifiedID: string, key?: NodeKey) {
    const unicodeEmoji = String.fromCodePoint(
      ...unifiedID.split('-').map((v) => parseInt(v, 16)),
    );
    super(unicodeEmoji, key);

    this.__unifiedID = unifiedID.toLowerCase();
  }

  /**
   * DOM that will be rendered by browser within contenteditable
   * This is what Lexical renders
   */
  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'emoji-node';
    dom.style.backgroundImage = `url('${BASE_EMOJI_URI}${this.__unifiedID}.png')`;
    dom.innerText = this.__text;
    return dom;
  }

  /**
   * Content used by clipboard in "text/html" data type
   * Try copying this and some adjacent nodes and pase them at https://evercoder.github.io/clipboard-inspector/
   */
  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute(EMOJI_DATA_ATTR, this.__unifiedID);
    const text = document.createTextNode(this.getTextContent());
    element.append(text);
    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      // '#text': () => ({
      //   conversion: convertEmojiElement,
      //   priority: 2,
      // }),
      span: () => {
        return {
          conversion: convertEmojiElement,
          priority: 2,
        };
      },
    };
  }

  // TODO: implement importDOM & exportDOM

  static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
    return $createEmojiNode(serializedNode.unifiedID);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      type: 'emoji',
      unifiedID: this.__unifiedID,
    };
  }
}

export function $createEmojiNode(unifiedID: string): EmojiNode {
  // TODO: explain mode & add to the docs & try to figure out how to disable char by char navigation
  const node = new EmojiNode(unifiedID).setMode('token');

  return node;
}
