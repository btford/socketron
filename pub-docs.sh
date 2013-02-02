#!/bin/bash
node gen-docs.js
cd docs
git add -A
git commit -m "update docs"
git push origin +gh-pages
cd ../