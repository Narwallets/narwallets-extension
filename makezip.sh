echo "Remember: REMOVE LOG DEBUG"
echo "Remember: REMOVE logEnabled(1,2)"
echo "Remember: BUMP VERSION"
read -p "Press Enter to continue..."

rm out/extension.zip
rm -rf extension/dist
tsc -b --verbose
mkdir -p out
cd extension
zip -r ../out/extension.zip . -x '*.map'
cd ..

echo
echo expandig zip on ./ext-test
cd out
rm -rf ext-test
unzip extension.zip -d ext-test
cd ..

