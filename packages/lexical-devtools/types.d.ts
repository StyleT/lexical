import {ProtocolWithReturn} from 'webext-bridge';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    getTabID: ProtocolWithReturn<null, number>;
  }
}
