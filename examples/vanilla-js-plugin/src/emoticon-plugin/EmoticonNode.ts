/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  TextNode,
} from 'lexical';

export class EmoticonNode extends TextNode {
  __className: string;

  constructor(className: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__className = className;
  }

  static getType() {
    return 'emoticon';
  }

  static clone(node: EmoticonNode): EmoticonNode {
    return new EmoticonNode(node.__className, node.__text, node.__key);
  }

  createDOM(config: EditorConfig, _editor?: LexicalEditor): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }
}

export function $isEmoticonNode(node: LexicalNode) {
  return node instanceof EmoticonNode;
}

export function $createEmoticonNode(className: string, emoticonText: string) {
  return new EmoticonNode(className, emoticonText).setMode('token');
}
