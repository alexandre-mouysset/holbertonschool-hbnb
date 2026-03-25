install the dependency
```
npm install
```
for launche the local server
```
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch
npx live-server --wait=1200 --ignorePattern="(node_modules|\.git|\.vscode|src/output\.css)"
```
