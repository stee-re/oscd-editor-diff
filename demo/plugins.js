import OscdMenuOpen from '@omicronenergy/oscd-menu-open';
import OscdMenuSave from '@omicronenergy/oscd-menu-save';
import OscdBackgroundEditV1 from '@omicronenergy/oscd-background-editv1';

import { OscdEditorDiff } from '../oscd-editor-diff.js';

customElements.define('oscd-menu-open', OscdMenuOpen);
customElements.define('oscd-menu-save', OscdMenuSave);
customElements.define('oscd-background-editv1', OscdBackgroundEditV1);
customElements.define('oscd-editor-diff', OscdEditorDiff);

export const plugins = {
  menu: [
    {
      name: 'Add plugins...',
      translations: { de: 'Erweitern...' },
      icon: 'extension',
      src: '/demo/AddPlugins.js',
    },
    {
      name: 'Open File',
      translations: { de: 'Datei öffnen' },
      icon: 'folder_open',
      tagName: 'oscd-menu-open',
    },
  ],
  editor: [
    {
      name: 'Diff',
      icon: 'difference',
      active: true,
      requireDoc: true,
      tagName: 'oscd-editor-diff',
    },
  ],
};
