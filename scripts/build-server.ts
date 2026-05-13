import * as esbuild from 'esbuild';

esbuild.buildSync({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.cjs',
  format: 'cjs',
  packages: 'external',
});
console.log('Server build complete.');
