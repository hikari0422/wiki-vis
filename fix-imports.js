const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('src/components');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // We only care about files that are one level deeper now: Auth, Panels, Graph, Common
  // If the file is in a subdirectory of src/components (like src/components/Auth/UserAuth.tsx), 
  // its relative depth to src increased by 1.
  
  const depth = file.split(path.sep).length - 3; // src/components is 2, so src/components/Auth is 3 -> depth 1
  
  if (depth >= 1) {
    // For depth 1 (e.g. Auth, Panels, Common), replace '../' with '../../' for services, hooks, types
    const importsToFix = ['services', 'hooks', 'types'];
    importsToFix.forEach(dir => {
      // replace '../dir/' with '../../dir/'
      const regex = new RegExp(`from\\s+['"]\\.\\.\\/${dir}\\/`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `from '../../${dir}/`);
        changed = true;
      }
    });
    
    // Also fix cross-component imports
    // Previously: import { SavedHistoryModal } from './SavedHistoryModal';
    // Now: import { SavedHistoryModal } from '../Panels/SavedHistoryModal';
    if (file.includes('UserAuth.tsx')) {
      content = content.replace(/from '\.\/SavedHistoryModal'/g, "from '../Panels/SavedHistoryModal'");
      changed = true;
    }
  }

  // Depth 2 (e.g. Graph/WikiGraph/HoverCard.tsx)
  if (depth === 2) {
    const importsToFix = ['services', 'hooks', 'types'];
    importsToFix.forEach(dir => {
      // replace '../../dir/' with '../../../dir/'
      const regex = new RegExp(`from\\s+['"]\\.\\.\\/\\.\\.\\/${dir}\\/`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `from '../../../${dir}/`);
        changed = true;
      }
    });
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed imports in', file);
  }
});
