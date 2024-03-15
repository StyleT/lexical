/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

declare global {
  interface DocumentEventMap {
    editorStateUpdate: CustomEvent;
    highlight: CustomEvent;
    lexicalPresenceUpdate: CustomEvent;
  }
}

// https://stackoverflow.com/a/63961972
// eslint-disable-next-line no-shadow
export enum LexicalDevToolsEvents {
  LEXICAL_PRESENCE_UPDATE = 'lexicalPresenceUpdate',
  EDITOR_STATE_UPDATE = 'editorStateUpdate',
  HIGHLIGHT = 'highlight',
  DEHIGHLIGHT = 'dehighlight',
  CHECK_FOR_LEXICAL = 'checkForLexical',
}
