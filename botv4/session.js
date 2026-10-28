/**
 * session.js — immutable per-run identity.
 * New session = new UUIDs + fresh super_props. Never saved to disk.
 */

import { buildSuperProps } from './superProps.js';

export class Session {
  constructor(heartbeatSession, launchSignature, superProps) {
    this.heartbeatSession = heartbeatSession;
    this.launchSignature  = launchSignature;
    this.superProps       = superProps;
  }

  static async create() {
    const hb  = crypto.randomUUID();
    const sig = crypto.randomUUID();
    const sp  = await buildSuperProps(sig, hb);
    return new Session(hb, sig, sp);
  }
}
