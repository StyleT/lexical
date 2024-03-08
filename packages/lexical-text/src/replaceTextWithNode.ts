/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  ElementNode,
  Klass,
  LexicalNode,
  TextNode,
} from 'lexical';

export type TextMatcherResult = {
  index: number;
  length: number;
  text: string;
  [otherOptions: string]: unknown;
};

export type TextMatcher = (
  text: string,
  parentNode: ElementNode | null,
) => TextMatcherResult | null;

const PUNCTUATION_OR_SPACE = /[.,;\s]/;

class TextToNodeReplacer<T extends ElementNode> {
  private readonly parentNode: ElementNode;

  constructor(
    private readonly toNode: Klass<T>,
    private readonly textNode: TextNode,
    private readonly matchers: Array<TextMatcher>,
    private readonly createReplacementNode: (
      nodes: TextNode[],
      match: TextMatcherResult,
    ) => ElementNode,
    private readonly revertReplacementNode: (node: T) => void,
    private readonly separator: RegExp,
  ) {
    this.parentNode = this.textNode.getParentOrThrow();
  }

  public init(): void {
    const previous = this.textNode.getPreviousSibling();
    if (this.isReplacerNode(this.parentNode)) {
      this.handleLinkEdit(this.parentNode);
    } else if (this.isReplacerNode(this.textNode)) {
      this.handleLinkEdit(this.textNode);
    } else {
      if (
        this.textNode.isSimpleText() &&
        (this.startsWithSeparator(this.textNode.getTextContent()) ||
          !this.isReplacerNode(previous))
      ) {
        this.handleNodeCreation(this.getTextNodesToMatch(this.textNode));
      }

      this.handleBadNeighbors();
    }
  }

  // Bad neighbors are edits in neighbor nodes that make AutoLinks incompatible.
  // Given the creation preconditions, these can only be simple text nodes.
  private handleBadNeighbors(): void {
    const previousSibling = this.textNode.getPreviousSibling();
    const nextSibling = this.textNode.getNextSibling();
    const text = this.textNode.getTextContent();

    if (
      this.isReplacerNode(previousSibling) &&
      !this.startsWithSeparator(text)
    ) {
      // TODO: this wouldn't work if target node simply extends TextNode
      previousSibling.append(this.textNode);
      this.handleLinkEdit(previousSibling);
      // TOOD: FIXME
      //   onChange(null, previousSibling.getURL());
    }

    if (this.isReplacerNode(nextSibling) && !this.endsWithSeparator(text)) {
      this.revertReplacementNode(nextSibling);
      this.handleLinkEdit(nextSibling);
      // TOOD: FIXME
      //   onChange(null, nextSibling.getURL());
    }
  }

  private isReplacerNode(node: LexicalNode | null | undefined): node is T {
    return node instanceof this.toNode;
  }

  private handleNodeCreation(textNodes: TextNode[]): void {
    let currentNodes = [...textNodes];
    const initialText = currentNodes
      .map((node) => node.getTextContent())
      .join('');
    let text = initialText;
    let match;
    let invalidMatchEnd = 0;

    while (
      (match = this.findFirstMatch(text, this.parentNode, this.matchers)) &&
      match !== null
    ) {
      const matchStart = match.index;
      const matchLength = match.length;
      const matchEnd = matchStart + matchLength;
      const isValid = this.isContentAroundIsValid(
        invalidMatchEnd + matchStart,
        invalidMatchEnd + matchEnd,
        initialText,
        currentNodes,
      );

      if (isValid) {
        const [matchingOffset, , matchingNodes, unmodifiedAfterNodes] =
          this.extractMatchingNodes(
            currentNodes,
            invalidMatchEnd + matchStart,
            invalidMatchEnd + matchEnd,
          );

        const actualMatchStart = invalidMatchEnd + matchStart - matchingOffset;
        const actualMatchEnd = invalidMatchEnd + matchEnd - matchingOffset;
        const remainingTextNode = this.replaceNode(
          matchingNodes,
          actualMatchStart,
          actualMatchEnd,
          match,
        );
        currentNodes = remainingTextNode
          ? [remainingTextNode, ...unmodifiedAfterNodes]
          : unmodifiedAfterNodes;
        invalidMatchEnd = 0;
      } else {
        invalidMatchEnd += matchEnd;
      }

      text = text.substring(matchEnd);
    }
  }

  private getTextNodesToMatch(textNode: TextNode): TextNode[] {
    // check if next siblings are simple text nodes till a node contains a space separator
    const textNodesToMatch = [textNode];
    let nextSibling = textNode.getNextSibling();
    while (
      nextSibling !== null &&
      $isTextNode(nextSibling) &&
      nextSibling.isSimpleText()
    ) {
      textNodesToMatch.push(nextSibling);
      if (/[\s]/.test(nextSibling.getTextContent())) {
        break;
      }
      nextSibling = nextSibling.getNextSibling();
    }
    return textNodesToMatch;
  }

  private handleLinkEdit(
    linkNode: T,
    // TODO: FIXME
    // onChange: ChangeHandler,
  ): void {
    // Check children are simple text
    const children = linkNode.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      if (!$isTextNode(child) || !child.isSimpleText()) {
        this.revertReplacementNode(linkNode);
        // TODO: FIXME
        // onChange(null, linkNode.getURL());
        return;
      }
    }

    // Check text content fully matches
    const text = linkNode.getTextContent();
    const match = this.findFirstMatch(text, null, this.matchers);
    if (match === null || match.text !== text) {
      this.revertReplacementNode(linkNode);
      // TODO: FIXME
      //   onChange(null, linkNode.getURL());
      return;
    }

    // Check neighbors
    if (
      !this.isPreviousNodeValid(linkNode) ||
      !this.isNextNodeValid(linkNode)
    ) {
      this.revertReplacementNode(linkNode);
      // TODO: FIXME
      //   onChange(null, linkNode.getURL());
      return;
    }

    // TODO: FIXME
    // const url = linkNode.getURL();
    // if (url !== match.url) {
    //   linkNode.setURL(match.url);
    //   // onChange(match.url, url);
    // }

    // if (match.attributes) {
    //   const rel = linkNode.getRel();
    //   if (rel !== match.attributes.rel) {
    //     linkNode.setRel(match.attributes.rel || null);
    //     onChange(match.attributes.rel || null, rel);
    //   }

    //   const target = linkNode.getTarget();
    //   if (target !== match.attributes.target) {
    //     linkNode.setTarget(match.attributes.target || null);
    //     onChange(match.attributes.target || null, target);
    //   }
    // }
  }

  private replaceNode(
    nodes: TextNode[],
    startIndex: number,
    endIndex: number,
    match: TextMatcherResult,
  ): TextNode | undefined {
    if (nodes.length === 1) {
      let remainingTextNode = nodes[0];
      let linkTextNode;

      if (startIndex === 0) {
        [linkTextNode, remainingTextNode] =
          remainingTextNode.splitText(endIndex);
      } else {
        [, linkTextNode, remainingTextNode] = remainingTextNode.splitText(
          startIndex,
          endIndex,
        );
      }

      linkTextNode.replace(this.createReplacementNode(nodes, match));

      return remainingTextNode;
    } else if (nodes.length > 1) {
      const firstTextNode = nodes[0];
      let offset = firstTextNode.getTextContent().length;
      let firstLinkTextNode;
      if (startIndex === 0) {
        firstLinkTextNode = firstTextNode;
      } else {
        [, firstLinkTextNode] = firstTextNode.splitText(startIndex);
      }
      const linkNodes = [];
      let remainingTextNode;
      for (let i = 1; i < nodes.length; i++) {
        const currentNode = nodes[i];
        const currentNodeText = currentNode.getTextContent();
        const currentNodeLength = currentNodeText.length;
        const currentNodeStart = offset;
        const currentNodeEnd = offset + currentNodeLength;
        if (currentNodeStart < endIndex) {
          if (currentNodeEnd <= endIndex) {
            linkNodes.push(currentNode);
          } else {
            const [linkTextNode, endNode] = currentNode.splitText(
              endIndex - currentNodeStart,
            );
            linkNodes.push(linkTextNode);
            remainingTextNode = endNode;
          }
        }
        offset += currentNodeLength;
      }

      const linkNode = this.createReplacementNode(
        [firstLinkTextNode, ...linkNodes],
        match,
      );
      firstLinkTextNode.replace(linkNode);

      return remainingTextNode;
    }
    return undefined;
  }

  private isSeparator(char: string): boolean {
    return this.separator.test(char);
  }

  private endsWithSeparator(textContent: string): boolean {
    return this.isSeparator(textContent[textContent.length - 1]);
  }

  private startsWithSeparator(textContent: string): boolean {
    return this.isSeparator(textContent[0]);
  }

  private isPreviousNodeValid(node: LexicalNode): boolean {
    let previousNode = node.getPreviousSibling();
    if ($isElementNode(previousNode)) {
      previousNode = previousNode.getLastDescendant();
    }
    return (
      previousNode === null ||
      $isLineBreakNode(previousNode) ||
      ($isTextNode(previousNode) &&
        this.endsWithSeparator(previousNode.getTextContent()))
    );
  }

  private isNextNodeValid(node: LexicalNode): boolean {
    let nextNode = node.getNextSibling();
    if ($isElementNode(nextNode)) {
      nextNode = nextNode.getFirstDescendant();
    }
    return (
      nextNode === null ||
      $isLineBreakNode(nextNode) ||
      ($isTextNode(nextNode) &&
        this.startsWithSeparator(nextNode.getTextContent()))
    );
  }

  private isContentAroundIsValid(
    matchStart: number,
    matchEnd: number,
    text: string,
    nodes: TextNode[],
  ): boolean {
    const contentBeforeIsValid =
      matchStart > 0
        ? this.isSeparator(text[matchStart - 1])
        : this.isPreviousNodeValid(nodes[0]);
    if (!contentBeforeIsValid) {
      return false;
    }

    const contentAfterIsValid =
      matchEnd < text.length
        ? this.isSeparator(text[matchEnd])
        : this.isNextNodeValid(nodes[nodes.length - 1]);
    return contentAfterIsValid;
  }

  private extractMatchingNodes(
    nodes: TextNode[],
    startIndex: number,
    endIndex: number,
  ): [
    matchingOffset: number,
    unmodifiedBeforeNodes: TextNode[],
    matchingNodes: TextNode[],
    unmodifiedAfterNodes: TextNode[],
  ] {
    const unmodifiedBeforeNodes: TextNode[] = [];
    const matchingNodes: TextNode[] = [];
    const unmodifiedAfterNodes: TextNode[] = [];
    let matchingOffset = 0;

    let currentOffset = 0;
    const currentNodes = [...nodes];

    while (currentNodes.length > 0) {
      const currentNode = currentNodes[0];
      const currentNodeText = currentNode.getTextContent();
      const currentNodeLength = currentNodeText.length;
      const currentNodeStart = currentOffset;
      const currentNodeEnd = currentOffset + currentNodeLength;

      if (currentNodeEnd <= startIndex) {
        unmodifiedBeforeNodes.push(currentNode);
        matchingOffset += currentNodeLength;
      } else if (currentNodeStart >= endIndex) {
        unmodifiedAfterNodes.push(currentNode);
      } else {
        matchingNodes.push(currentNode);
      }
      currentOffset += currentNodeLength;
      currentNodes.shift();
    }
    return [
      matchingOffset,
      unmodifiedBeforeNodes,
      matchingNodes,
      unmodifiedAfterNodes,
    ];
  }

  private findFirstMatch(
    text: string,
    parentNode: ElementNode | null,
    matchers: Array<TextMatcher>,
  ): TextMatcherResult | null {
    for (let i = 0; i < matchers.length; i++) {
      const match = matchers[i](text, parentNode);

      if (match) {
        return match;
      }
    }

    return null;
  }
}
export function $replaceTextWithNode<T extends ElementNode>(
  toNode: Klass<T>,
  textNode: TextNode,
  matchers: Array<TextMatcher>,
  createReplacementNode: (
    nodes: TextNode[],
    match: TextMatcherResult,
  ) => ElementNode,
  revertReplacementNode: (node: T) => void,
  separator: RegExp = PUNCTUATION_OR_SPACE,
): void {
  const replacer = new TextToNodeReplacer(
    toNode,
    textNode,
    matchers,
    createReplacementNode,
    revertReplacementNode,
    separator,
  );

  replacer.init();
}
