/**
 * Client entry for the AppleSampleCode proof (#40).
 *
 * On out/index.html (static markup from render.mjs) it adopts the server's
 * markup with mount(host, { mode: 'adopt' }): the page reads and works
 * without JavaScript, and this only enhances it. On ../index.html (an empty
 * shell, the "before" case) there is nothing to adopt, so it renders fresh.
 */
import { App, State } from '../../src/index.js';
import { CollectionScene } from './views.js';
import data from './core-nfc.json' with { type: 'json' };

const host = document.getElementById('root');
const query = new State('');

App(() => CollectionScene(data, query)).mount(host, {
  mode: host.firstElementChild ? 'adopt' : 'replace',
});
