import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "sseuksseukpanel-vscode" is now active!');

	const provider = new SseukSseukPanel(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SseukSseukPanel.viewType, provider));

	/*vscode.window.onDidChangeActiveTextEditor(() => {
		//
	});*/

	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.undo', () => {
			vscode.window.showInformationMessage('undo');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.addTopLine', () => {
			vscode.window.showInformationMessage('Add new Line - TOP');
		})
	);
	
	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.addBotLine', () => {
			vscode.window.showInformationMessage('Add new Line - BOTTOM');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.removeLine', () => {
			vscode.window.showInformationMessage('Remove Line');
		})
	);
}

class SseukSseukPanel implements vscode.WebviewViewProvider{
	public static readonly viewType = "SseukSseuk.panelView";

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	 ) {	}

	public resolveWebviewView(
	  webviewView: vscode.WebviewView, 
	  context: vscode.WebviewViewResolveContext, 
	  _token: vscode.CancellationToken) {
		this._view = webviewView;
		
		webviewView.webview.options = {
			enableScripts: true,

			localResourceRoots:[
				this._extensionUri
			]
		};
		
		webviewView.webview.html = this._getSSPHtmlWebview(webviewView.webview);
	}

	private _getSSPHtmlWebview(webview: vscode.Webview) {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
:root{
    --backgroundC: #1f2428;
    --elementC: white;
}
body{
    user-select: none;
}
#sys{
    display: none;
}
#EditBox{
    background-color: var(--backgroundC);
    display: flex;
    flex-direction: row;
    font-family: Consolas, monospace;
    font-size: 18px;
    height: 5em; width: 100%;
    border-bottom: 1px solid var(--elementC);
}

#textArea{
    color: var(--elementC);
    display: flex;
}
.textChar{
    white-space: pre;
}
.textChar:hover{
    background-color: var(--elementC);
    color: var(--backgroundC);
}

#insertArea{
    height: 3.5em;
    display: flex;
}
.insertChar{
    white-space: pre;
    color: var(--backgroundC);
}
.insertChar:hover{
    border-left: 1px dashed var(--elementC);
}

#appendArea{
    flex: 1;
    display: flex;
    flex-direction: row;
    height: 4em;
}
.appendEle{
    white-space: pre;
}
.appendEle:hover{
    border-left: 1px dashed var(--elementC);
}
#appendTab{
    flex: 1;
}

    </style>
    <title>SseukSsuek Panel</title>
</head>
<body>
    <section id="sys">
        <div id="EditBox">
            <div id="strings">
                <div id="textArea">
                    <div class="textChar" id="0"></div>
                </div>
                <div id="insertArea">
                    <div class="insertChar" id="0"></div>
                </div>
            </div>
            <div id="appendArea">
                <div id="appendBehind" class="appendEle"> </div>
                <div id="appendSpace" class="appendEle">   </div>
                <div id="appendTab" class="appendEle"></div>
            </div>
        </div>
    </section>
    <section id="output">
        <div id="EditBox">
            <div id="strings">
                <div id="textArea">
                    <div class="textChar" id="0">t</div>
                    <div class="textChar" id="1">e</div>
                    <div class="textChar" id="2"> </div>
                    <div class="textChar" id="3">x</div>
                    <div class="textChar" id="4">t</div>
                </div>
                <div id="insertArea">
                    <div class="insertChar" id="0">t</div>
                    <div class="insertChar" id="1">e</div>
                    <div class="insertChar" id="2"> </div>
                    <div class="insertChar" id="3">x</div>
                    <div class="insertChar" id="4">t</div>
                </div>
            </div>
            <div id="appendArea">
                <div id="appendBehind" class="appendEle"> </div>
                <div id="appendSpace" class="appendEle">   </div>
                <div id="appendTab" class="appendEle"></div>
            </div>
        </div>
    </section>
</body>
</html>
		`;
	}
}