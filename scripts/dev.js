const { spawn, execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const apiServerDir = path.join(rootDir, 'artifacts', 'api-server');
const mobileDir = path.join(rootDir, 'artifacts', 'mobile');

console.log('\n==================================================');
console.log('🌮 INICIANDO ENTORNO LOCAL DE TACOS LOMA 🌮');
console.log('==================================================\n');

console.log('📦 Paso 1: Construyendo servidor Backend...');
try {
  execSync('node ./build.mjs', { cwd: apiServerDir, stdio: 'inherit' });
  console.log('✅ Backend construido con éxito.\n');
} catch (err) {
  console.error('❌ Error construyendo el backend:', err);
  process.exit(1);
}

console.log('🚀 Paso 2: Iniciando Backend y Frontend simultáneamente...');
console.log('👉 Backend escuchará en el puerto 5000');
console.log('👉 Frontend escuchará en el puerto 8081\n');

// 1. Servidor Backend
const backend = spawn('node', ['--env-file=.env', '--enable-source-maps', './dist/index.mjs'], {
  cwd: apiServerDir,
  stdio: 'inherit',
  env: { ...process.env }
});

// 2. Servidor Frontend (Expo Web)
const frontend = spawn('npx', ['expo', 'start', '--web'], {
  cwd: mobileDir,
  stdio: 'inherit',
  env: { ...process.env, BROWSER: 'none' },
  shell: true
});

// Detener procesos hijos limpiamente
const cleanup = () => {
  console.log('\n🛑 Apagando servidores de Tacos Loma...');
  try {
    backend.kill('SIGINT');
  } catch (e) {}
  try {
    frontend.kill('SIGINT');
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
