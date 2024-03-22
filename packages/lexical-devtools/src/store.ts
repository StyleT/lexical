/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {uniq} from 'lodash';
import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

import {wrapStore} from './webext-zustand';

export interface ExtensionState {
  devtoolsPanelLoadedForTabIDs: number[];
  devtoolsPanelLoadedForTabID: (id: number) => void;
  devtoolsPanelUnloadedForTabID: (id: number) => void;
  counter: number;
  increase: (by: number) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set) => ({
    counter: 0,
    devtoolsPanelLoadedForTabID: (id) =>
      set((state) => ({
        devtoolsPanelLoadedForTabIDs: uniq([
          ...state.devtoolsPanelLoadedForTabIDs,
          id,
        ]),
      })),
    devtoolsPanelLoadedForTabIDs: [],
    devtoolsPanelUnloadedForTabID: (id) =>
      set((state) => ({
        devtoolsPanelLoadedForTabIDs: state.devtoolsPanelLoadedForTabIDs.filter(
          (v) => v !== id,
        ),
      })),
    increase: (by) => set((state) => ({counter: state.counter + by})),
  })),
);

export const storeReadyPromise = wrapStore(useExtensionStore);

export default useExtensionStore;
