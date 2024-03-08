/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LinkAttributes} from '@lexical/link';
import type {ElementNode, LexicalEditor, LexicalNode} from 'lexical';

import {$createAutoLinkNode, $isLinkNode, AutoLinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type TextMatcherResult, $replaceTextWithNode} from '@lexical/text';
import {mergeRegister} from '@lexical/utils';
import {
  $createTextNode,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  TextNode,
} from 'lexical';
import {TextMatcher} from 'packages/lexical-text/src/replaceTextWithNode';
import {useEffect} from 'react';
import invariant from 'shared/invariant';

type ChangeHandler = (url: string | null, prevUrl: string | null) => void;

type LinkMatcherResult = TextMatcherResult & {
  attributes?: LinkAttributes;
  url: string;
};

export type LinkMatcher = (text: string) => LinkMatcherResult | null;

export function createLinkMatcherWithRegExp(
  regExp: RegExp,
  urlTransformer: (text: string) => string = (text) => text,
) {
  return (text: string) => {
    const match = regExp.exec(text);
    if (match === null) {
      return null;
    }
    return {
      index: match.index,
      length: match[0].length,
      text: match[0],
      url: urlTransformer(match[0]),
    };
  };
}

const PUNCTUATION_OR_SPACE = /[.,;\s]/;

function replaceWithChildren(node: ElementNode): Array<LexicalNode> {
  const children = node.getChildren();
  const childrenLength = children.length;

  for (let j = childrenLength - 1; j >= 0; j--) {
    node.insertAfter(children[j]);
  }

  node.remove();
  return children.map((child) => child.getLatest());
}

function createReplacementNode(
  nodes: TextNode[],
  match: TextMatcherResult,
): ElementNode {
  const linkNode = $createAutoLinkNode(
    match.text,
    match.attributes ?? undefined,
  );

  const [linkTextNode, ...restNodes] = nodes;

  const innerTextNode = $createTextNode(linkTextNode.getTextContent());
  innerTextNode.setFormat(linkTextNode.getFormat());
  innerTextNode.setDetail(linkTextNode.getDetail());
  linkNode.append(innerTextNode, ...restNodes);

  const selection = $getSelection();
  const selectedTextNode = selection
    ? selection.getNodes().find($isTextNode)
    : undefined;
  // it does not preserve caret position if caret was at the first text node
  // so we need to restore caret position
  if (selectedTextNode && selectedTextNode === linkTextNode) {
    if ($isRangeSelection(selection)) {
      innerTextNode.select(selection.anchor.offset, selection.focus.offset);
    } else if ($isNodeSelection(selection)) {
      innerTextNode.select(0, innerTextNode.getTextContent().length);
    }
  }

  return linkNode;
}

function useAutoLink(
  editor: LexicalEditor,
  matchers: Array<LinkMatcher>,
  onChange?: ChangeHandler,
): void {
  useEffect(() => {
    if (!editor.hasNodes([AutoLinkNode])) {
      invariant(
        false,
        'LexicalAutoLinkPlugin: AutoLinkNode not registered on editor',
      );
    }

    const matchersWrapped: TextMatcher[] = matchers.map(
      (matcher) => (text, parentNode) => {
        if (parentNode !== null && $isLinkNode(parentNode)) {
          return null;
        }

        return matcher(text);
      },
    );

    // TODO: FIXME
    // const onChangeWrapped = (url: string | null, prevUrl: string | null) => {
    //   if (onChange) {
    //     onChange(url, prevUrl);
    //   }
    // };

    return mergeRegister(
      editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
        const revertReplacementNode = (node: AutoLinkNode) =>
          replaceWithChildren(node);

        // TODO: add onChange support
        $replaceTextWithNode(
          AutoLinkNode,
          textNode,
          matchersWrapped,
          createReplacementNode,
          revertReplacementNode,
          PUNCTUATION_OR_SPACE,
        );
      }),
    );
  }, [editor, matchers, onChange]);
}

export function AutoLinkPlugin({
  matchers,
  onChange,
}: {
  matchers: Array<LinkMatcher>;
  onChange?: ChangeHandler;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useAutoLink(editor, matchers, onChange);

  return null;
}
