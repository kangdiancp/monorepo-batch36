// scripts/generate-proto.js
const { execSync } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const pluginPath = path.join(
  'node_modules', '.bin',
  isWin ? 'protoc-gen-ts_proto.cmd' : 'protoc-gen-ts_proto',
);

const cmd = [
  'protoc',
  `--plugin=protoc-gen-ts_proto=${pluginPath}`,
  '--ts_proto_out=./src/grpc/generated',
  '--ts_proto_opt=outputServices=grpc-js,env=node,esModuleInterop=true,useOptionals=messages,keepCase=true,addGrpcMetadata=true,addNestjsRestParameter=false',
  '--proto_path=./proto',
  './proto/employee.proto',
].join(' ');

execSync(cmd, { stdio: 'inherit' });