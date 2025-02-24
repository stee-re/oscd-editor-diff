import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: '/demo/',
  watch: false,
  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },
  
  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  appIndex: './demo/index.html',

  plugins: [
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.lit] }),
  ],

  // See documentation for all available options
});
