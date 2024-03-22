/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useEffect} from 'react';
import * as React from 'react';

import lexicalLogo from '@/public/lexical.svg';

import useStore from '../../store';

function App() {
  const {
    devtoolsPanelLoadedForTabID,
    devtoolsPanelUnloadedForTabID,
    counter,
    increase,
  } = useStore();

  useEffect(() => {
    devtoolsPanelLoadedForTabID(browser.devtools.inspectedWindow.tabId);

    return () => {
      devtoolsPanelUnloadedForTabID(browser.devtools.inspectedWindow.tabId);
    };
  }, [devtoolsPanelLoadedForTabID, devtoolsPanelUnloadedForTabID]);

  return (
    <>
      <div>
        <a href="https://lexical.dev" target="_blank">
          <img src={lexicalLogo} className="logo" alt="Lexical logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={() => increase(1)}>count is {counter}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  );
}

export default App;
