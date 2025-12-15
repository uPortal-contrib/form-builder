import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import summary from 'rollup-plugin-summary';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  input: 'src/form-builder.js',
  output: [
    {
      file: 'dist/form-builder.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/form-builder.min.js',
      format: 'es',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    // Resolve bare module specifiers to relative paths
    nodeResolve(),
    // Print bundle summary
    summary(),
    // visuals
    visualizer({
      template: 'sunburst',
      gzipSize: true,
    }),
  ],
};
