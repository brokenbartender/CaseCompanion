const path = require('path');

const target = path.resolve(__dirname, '..', 'server', 'scripts', 'prisma-generate.js');
require(target);
