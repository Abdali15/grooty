import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await cp('public','dist',{recursive:true});await mkdir('dist/vendor',{recursive:true});
await cp('node_modules/animate.css/animate.min.css','dist/vendor/animate.min.css');await cp('node_modules/hamburgers/dist/hamburgers.min.css','dist/vendor/hamburgers.min.css');
console.log('Grooty: propuesta estática generada en dist');
