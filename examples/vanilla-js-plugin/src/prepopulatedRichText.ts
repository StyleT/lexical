/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

export default function prepopulatedRichText() {
  const root = $getRoot();
  if (root.getFirstChild() !== null) {
    return;
  }

  const paragraph = $createParagraphNode();
  paragraph.append(
    $createTextNode('This is a demo environment built with '),
    $createTextNode('lexical').toggleFormat('code'),
    $createTextNode('.'),
    $createTextNode(' Try typing in '),
    $createTextNode('some smiles.').toggleFormat('bold'),
  );
  root.append(paragraph);
  const paragraph2 = $createParagraphNode();
  paragraph2.append(
    $createTextNode('Supported tokens: '),
    $createTextNode(':)').toggleFormat('code'),
    $createTextNode(', '),
    $createTextNode(':avo:').toggleFormat('code'),
    $createTextNode(', '),
  );
  root.append(paragraph2);
}