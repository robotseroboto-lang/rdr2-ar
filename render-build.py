import hashlib, io, pathlib, shutil, zipfile
parts = sorted(pathlib.Path('.').glob('site-package.part-*'))
blob = b''.join(part.read_bytes() for part in parts)
assert hashlib.sha256(blob).hexdigest() == "9e600824aeac34b1660100bea1594c755b85b7b96967d8820a660c4e7363dae2"
with zipfile.ZipFile(io.BytesIO(blob)) as archive:
    for name in archive.namelist():
        assert not pathlib.PurePosixPath(name).is_absolute() and '..' not in pathlib.PurePosixPath(name).parts
    archive.extractall('runtime')
root = pathlib.Path('runtime')
if (root / 'dist').exists():
    assert not (root / 'dist-before-render-backup').exists()
    (root / 'dist').rename(root / 'dist-before-render-backup')
shutil.copytree(root / 'pages-original', root / 'dist')
assert (root / 'dist/index.html').is_file()
assert (root / 'server/index.mjs').is_file()
print('Original frontend and full Node.js backend restored; prior dist preserved.')
