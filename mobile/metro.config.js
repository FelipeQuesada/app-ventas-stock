const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const pdfjsStub = path.resolve(projectRoot, 'shims/pdfjs-stub.js');
const exceljsStub = path.resolve(projectRoot, 'shims/exceljs-stub.js');

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isNative = platform === 'android' || platform === 'ios';
  const isPdfjs =
    moduleName === 'pdfjs-dist' ||
    moduleName.startsWith('pdfjs-dist/') ||
    moduleName.includes('pdfjs-dist/legacy/build/pdf');
  const isExceljs =
    moduleName === 'exceljs' ||
    moduleName.startsWith('exceljs/') ||
    moduleName.includes('exceljs/dist/');

  if (isNative && isPdfjs) {
    return { type: 'sourceFile', filePath: pdfjsStub };
  }
  if (isNative && isExceljs) {
    return { type: 'sourceFile', filePath: exceljsStub };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
