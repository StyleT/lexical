#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {execSync} = require('child_process');
const {readFileSync, writeFileSync} = require('fs');
const {copy, ensureDir, move, remove} = require('fs-extra');
const {join} = require('path');

const STATIC_FILES = ['icons', 'popups'];

const preProcess = async (destinationPath, tempPath) => {
  await remove(destinationPath); // Clean up from previously completed builds
  await remove(tempPath); // Clean up from any previously failed builds
};

const postProcess = async (destinationPath, tempPath) => {
  await move(tempPath, destinationPath);
  await remove(tempPath); // Clean up temp directory and files
};

const build = async (tempPath, manifestPath) => {
  const tempSrcPath = join(tempPath, 'src');
  const tempAssetsPath = join(tempPath, 'assets');

  execSync(`npm run build`);
  await ensureDir(tempPath); // Create temp dir for this new build

  const buildSrcPath = join(__dirname, 'build', 'src');
  const buildAssetsPath = join(__dirname, 'build', 'assets');

  await move(buildSrcPath, tempSrcPath); // Copy built files to tempPath
  await move(buildAssetsPath, tempAssetsPath); // Copy built files to tempPath

  const copiedManifestPath = join(tempPath, 'manifest.json');

  await copy(manifestPath, copiedManifestPath);
  await Promise.all(
    STATIC_FILES.map((file) =>
      copy(join(__dirname, file), join(tempPath, file)),
    ),
  );

  const manifest = JSON.parse(readFileSync(copiedManifestPath).toString());

  if (process.env.NODE_ENV === 'development') {
    // When building the local development version of the
    // extension we want to be able to have a stable extension ID
    // for the local build (in order to be able to reliably detect
    // duplicate installations of DevTools).
    // By specifying a key in the built manifest.json file,
    // we can make it so the generated extension ID is stable.
    // For more details see the docs here: https://developer.chrome.com/docs/extensions/reference/manifest/key
    // Generated via:
    // $ openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem # private key
    // $ openssl rsa -in key.pem -pubout -outform DER | openssl base64 -A # this key below (strip % at the end)
    // $ openssl rsa -in key.pem -pubout -outform DER | shasum -a 256 | head -c32 | tr 0-9a-f a-p # extension ID
    manifest.key =
      'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAve7nOT9MtnECslFqKw5x0a/OvR/ZzsDBvcR3SIpQg446O7tKwFZTOQWgmceKZJAPT03Ztwdj7qJfAteSwaW4Aeoo6gK5BU7lAAAXeZNhzmuLSJhE4eu8KVDwck16iEx1C/IBKCypM+7H1wjwSVsjGpij2EDiH4Pw/aJ9LLRia7LO3xXTQTYzaJCzx1A+5JiFo5Y9tTtORdyFV/5bfaxibentXNxm52sj3spBe3wC7BuNoYmto9YdKhYk8Xsvs0u8tC7lRae9h57flLCmqPTi9ho4PkJXs4v/okxtGN2Lhwf3Az3ws1LAUqzGJrNK598IRU70a5ONtqXUc3vdGVJxtwIDAQAB';
  }

  writeFileSync(copiedManifestPath, JSON.stringify(manifest, null, 2));
};

const main = async (buildId) => {
  const root = join(__dirname, buildId);
  const destinationPath = join(root, 'build');

  try {
    const tempPath = join(__dirname, 'build', buildId);
    const manifestPath = join(root, 'manifest.json');
    await preProcess(destinationPath, tempPath);
    await build(tempPath, manifestPath);
    await postProcess(destinationPath, tempPath);

    return destinationPath;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = main;
