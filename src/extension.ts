import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "sseuksseukpanel-vscode" is now active!');

	const provider = new SseukSseukPanel(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SseukSseukPanel.viewType, provider));

	vscode.window.onDidChangeTextEditorSelection((e) => {
		console.log(e);
		//provider.lineCursor(e);
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.undo', () => {
            vscode.commands.executeCommand("undo");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.addTopLine', () => {
            vscode.commands.executeCommand("editor.action.insertLineBefore");
		})
	);
	
	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.addBotLine', () => {
            vscode.commands.executeCommand("editor.action.insertLineAfter");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.removeLine', () => {
			vscode.commands.executeCommand("editor.action.deleteLines");
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

        webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'textadd':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`), new vscode.Range());
                        // 라인 위치 정보 가져오기
						break;
					}
			}
		});
	}

	public lineCursor(line: vscode.TextEditorSelectionChangeEvent){
		if(this._view) {
			this._view.webview.postMessage({ type: 'lineCurser', linePosition: line.selections });
		}
	}

	private _getSSPHtmlWebview(webview: vscode.Webview) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
:root{
    --backgroundC: var(--vscode-panel-background);
    --elementC: var(--vscode-editor-foreground);
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

#SelToolBox{
    display: none;
}

#SelToolBox.active{
    display: block;
}

#InsToolBox{
    display: none;
}

#InsToolBox.active{
    display: block;
}

#ref{display: none;}
    </style>
    <title>SseukSsuek Panel</title>
</head>
<body>
    <section id="sys">
        <div id="EditBox">
            <div id="strings">
                <div id="textArea">
                    <div class="textChar" id="ref"></div>
                </div>
                <div id="insertArea">
                    <div class="insertChar" id="ref"></div>
                </div>
            </div>
            <div id="appendArea">
                <div id="appendBehind" class="appendEle"> </div>
                <div id="appendSpace" class="appendEle">   </div>
                <div id="appendTab" class="appendEle"></div>
            </div>
        </div>
        <div id="SelToolBox">
            <div class="tools" id="cancel">취소</div>
            <div class="tools" id="cut">자르기</div>
            <div class="tools" id="copy">복사</div>
            <div class="tools" id="delete">지우기</div>
        </div>
        <div id="InsToolBox">
            <div class="tools" id="stop">중단</div>
            <div class="tools" id="space">공백</div>
            <div class="tools" id="tab">탭</div>
        </div>
    </section>
    <section id="output">
        <div id="process">
            <div id="loading">
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_P7sC{fill:var(--elementC);transform-origin:center;animation:spinner_svv2 .75s infinite linear}@keyframes spinner_svv2{100%{transform:rotate(360deg)}}</style><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" class="spinner_P7sC"/></svg>
            </div>
        </div>
        
        <div id="EditBox">
            <div id="strings">
                <div id="textArea">
                    <div class="textChar" id="ref"></div>
                    <div class="textChar" id="0">t</div>
                    <div class="textChar" id="1">e</div>
                    <div class="textChar" id="2"> </div>
                    <div class="textChar" id="3">x</div>
                    <div class="textChar" id="4">t</div>
                </div>
                <div id="insertArea">
                    <div class="insertChar" id="ref"></div>
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
        <div id="SelToolBox">
            <div class="tools" id="cancel">취소</div>
            <div class="tools" id="cut">자르기</div>
            <div class="tools" id="copy">복사</div>
            <div class="tools" id="delete">지우기</div>
        </div>
        <div id="InsToolBox">
            <div class="tools" id="stop">중단</div>
            <div class="tools" id="AddSpace">
                <div class="tools" id="space">공백</div>
                <div class="tools" id="tab">탭</div>
            </div>
        </div>
    </section>
    <script>
let txt = "te xt"
let nowStatus = undefined;
const RefEb = document.querySelector("#sys > #EditBox");

class status{
    constructor(){
        this.active = false;
        this.lineNum = -1;
        this.col = -1;

        this.select = false;
        this.seletStart = -1;
        this.selectEnd = -1;
        
        this.insert = false;
        this.insertStart = -1;

        this.append = false;
    }
}

function setSsuekSsuek(text){
    if (nowStatus != undefined){delete nowStatus;}
    nowStatus = new status;
    newEb = RefEb.cloneNode(true);
    newEbTa = newEb.children[0].children[0]; newEbTc = newEbTa.children[0];
    newEbIa = newEb.children[0].children[1]; newEbIc = newEbTa.children[0];
    newEbAa = newEb.children[1];
    newEbAb = newEbAa.children[0]; newEbAs = newEbAa.children[1]; newEbAt = newEbAa.children[2];
    document.querySelector("#output").appendChild(newEb);
    charnum = 0
    for (char of text){
        eEbTc = newEbTc.cloneNode(true); 
        eEbTc.id = charnum; eEbTc.innerText = char;
        eEbTc.addEventListener("pointerdown", selectPD);
        newEbTa.appendChild(eEbTc);
        eEbIc = newEbIc.cloneNode(true);
        eEbIc.id = charnum; eEbIc.innerText = char;
        eEbIc.addEventListener("pointerdown", insertPD);
        newEbIa.appendChild(eEbIc);
        charnum += 1;
    }
    newEbAb.addEventListener("pointerdown", appbPD);
    newEbAs.addEventListener("pointerdown", appsPD);
    newEbAt.addEventListener("pointerdown", apptPD);
}

function selectPD(e){
    //
}

function insertPD(e){
    //
}

function appbPD(e){
    //
}

function appsPD(e){
    //
}

function apptPD(e){
    //
}

    </script>
</body>
</html>
		`;
	}
}