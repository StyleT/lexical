/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {createHeadlessEditor} from '@lexical/headless';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {LexicalEditor, SerializedEditorState} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import Inspector from '../Inspector';

function App(): JSX.Element {
  const [editor, setEditor] = useState<LexicalEditor | null>(null);
  const port = useRef<chrome.runtime.Port | null>(null);

  const updateEditorState = useCallback(
    (message: {editor: LexicalEditor; editorState: SerializedEditorState}) => {
      // eslint-disable-next-line no-console
      console.log('#5 DevTools Panel: received Lexical editor', message);
      // const editorFixed = {
      //   ...message.editor,
      //   _commands: new Map(),
      //   getEditorState: () => editor?._editorState,
      //   getRootElement: () => null,
      //   registerCommand: () => {},
      //   registerEditableListener: () => {},
      //   registerUpdateListener: () => {},
      //   setEditorState: () => {},
      // }
      const extensionEditor = createHeadlessEditor({
        nodes: [HeadingNode, QuoteNode],
        onError: console.error,
      });
      extensionEditor.setEditorState(
        extensionEditor.parseEditorState(message.editorState),
      );
      setEditor(extensionEditor);
    },
    [setEditor],
  );

  // highlight & dehighlight the corresponding DOM nodes onHover of DevTools nodes
  // const highlightDOMNode = useCallback(
  //   (lexicalKey: string) => {
  //     port.current?.postMessage({
  //       lexicalKey,
  //       name: LexicalDevToolsEvents.HIGHLIGHT,
  //       tabId: window.chrome.devtools.inspectedWindow.tabId,
  //     });
  //   },
  //   [port],
  // );

  // const deHighlightDOMNode = useCallback(
  //   (lexicalKey: string) => {
  //     port.current?.postMessage({
  //       name: LexicalDevToolsEvents.DEHIGHLIGHT,
  //       tabId: window.chrome.devtools.inspectedWindow.tabId,
  //     });
  //   },
  //   [port],
  // );

  useEffect(() => {
    // create and initialize the messaging port to receive editorState updates
    port.current = window.chrome.runtime.connect({
      name: 'react-app',
    });

    // message listener for editorState updates from inspectedWindow
    port.current.onMessage.addListener(updateEditorState);

    // post init message to background JS so tabId will be registered
    port.current.postMessage({
      name: 'init',
      tabId: window.chrome.devtools.inspectedWindow.tabId,
    });

    return () => {
      port.current?.onMessage.removeListener(updateEditorState);
      if (port.current) {
        port.current.disconnect();
      }
      port.current = null;
    };
  }, [updateEditorState]);

  return (
    <>
      {editor == null ? (
        <div className="loading-view">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="App">
          <Inspector editor={editor} />
        </div>
      )}
    </>
  );
}

export default App;
