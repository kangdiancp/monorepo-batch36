// microservices/payroll-service-api/script/generate-proto.js

const { execSync } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';

// 1. Tentukan path ke root monorepo (naik 2 tingkat dari folder script)
const rootDir = path.resolve(__dirname, '../..');
const serviceDir = path.resolve(__dirname, '..');

// 2. Ambil plugin protoc-gen-ts_proto langsung dari root node_modules
const pluginPath = path.join(
  rootDir,
  'node_modules',
  '.bin',
  isWin ? 'protoc-gen-ts_proto.cmd' : 'protoc-gen-ts_proto'
);

// 3. Tentukan path absolute untuk proto dan output
const protoPath = path.join(serviceDir, 'protos');
const protoFile = path.join(protoPath, 'employee.proto');
const outputDir = path.join(serviceDir, 'src', 'grpc', 'generated');

const cmd = [
  'protoc',
  `--plugin=protoc-gen-ts_proto="${pluginPath}"`,
  `--ts_proto_out="${outputDir}"`,
  '--ts_proto_opt=outputServices=grpc-js,env=node,esModuleInterop=true,useOptionals=messages,keepCase=true,addGrpcMetadata=true,addNestjsRestParameter=false',
  `--proto_path="${protoPath}"`,
  `"${protoFile}"`,
].join(' ');

execSync(cmd, { stdio: 'inherit', cwd: serviceDir });