import {defineConfig} from 'vite';
const version=new Date().toISOString();
export default defineConfig({
 define:{__IBB5_APP_VERSION__:JSON.stringify(version)},
 plugins:[{name:'ibb5-app-version',apply:'build',generateBundle(){this.emitFile({type:'asset',fileName:'app-version.json',source:JSON.stringify({version})});}}]
});
