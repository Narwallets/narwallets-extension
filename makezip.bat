rem 
@echo on
del out\extension.zip
del /F/Q/S extension\dist
call npx tsc -b --verbose
cd extension
"C:\Program Files\7-Zip\7z" a -r -w -xr!*.map ..\out\extension.zip .
cd ..
pause
