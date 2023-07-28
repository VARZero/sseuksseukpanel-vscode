import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const provider = new SseukSseukPanel(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SseukSseukPanel.viewType, provider));

	vscode.window.onDidChangeTextEditorSelection((e) => {
        var lineN = e.selections[0].active.line;
        var colN = e.selections[0].active.character;
        var lineT = vscode.window.activeTextEditor?.document.lineAt(vscode.window.activeTextEditor.selection.active.line).text;
        provider.lineCursor(lineT, lineN, colN);
	});

    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("SseukSseuk.charSize") || e.affectsConfiguration("SseukSseuk.inputDelayTime") || e.affectsConfiguration("SseukSseuk.stylusType")){
            vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
        }
    });

    context.subscriptions.push(
		vscode.commands.registerCommand('SseukSseuk.suggest', () => {
            vscode.commands.executeCommand("editor.action.triggerSuggest");
		})
	);

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
		private readonly _extensionUri: vscode.Uri
	 ) {    }

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
                    var tabsize = Number( vscode.workspace.getConfiguration('editor').get('tabSize') ); var tabString = "";
                    for (var c = 0; c < tabsize; c++){ tabString += " "; }
                    var txtout = "";
                    switch(data.append){
                        case 'none': break;
                        case 'behind': break;
                        case 'space': txtout += " "; break;
                        case 'tab': txtout += tabString; break;
                    }
                    txtout += data.value;
					vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(txtout), // (TODO) 이부분은 나중에 VSCode 내부 API로도 받을수 있게 하기! 
                            new vscode.Range(new vscode.Position(data.line, data.col), new vscode.Position(data.line, data.col)));
                    vscode.commands.executeCommand("editor.action.triggerSuggest");
				break;
				case "currentEdit":
                    var lineText = vscode.window.activeTextEditor?.document.lineAt(data.line).text;
                    var endT = data.end;
                    if (endT === -1){ endT = data.start; }
                    lineText = lineText?.substring(data.start, endT+1);
                    switch(data.editType){
                        case 'cut':
                            vscode.env.clipboard.writeText(lineText!);
                        case 'delete':
                            vscode.window.activeTextEditor?.edit(tee => {
                                tee.delete(new vscode.Range(new vscode.Position(data.line, data.start), new vscode.Position(data.line, endT+1)));
                            });
                        break;
                        case 'copy':
                            vscode.env.clipboard.writeText(lineText!);
                        break;
                    }
                break;
			}
		});
	}

	public lineCursor(lineText: string | undefined, lineNumber: number, colNumber: number){
		if(this._view) {
			this._view.webview.postMessage({ type: 'lineCurser', lineT: lineText, lineN: lineNumber, colN: colNumber });
		}
	}

	private _getSSPHtmlWebview(webview: vscode.Webview) {
        console.log("a");
        var sspSettings = vscode.workspace.getConfiguration('SseukSseuk');

        var stylus = (sspSettings.stylusType === "stylus") || (sspSettings.stylusType === "non-hover stylus");
        var charsize = sspSettings.charSize; var inputDelayTime = sspSettings.inputDelayTime;
        var hover = sspSettings.stylusType === "non-hover stylus";

        const opencvjsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'opencv.js'));
        const tfUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'tf.min.js'));

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
section#sys{
    display: none;
}

#EditBox{
    background-color: var(--backgroundC);
    color: var(--elementC);
    display: flex;
    flex-direction: row;
    font-family: Consolas, monospace;
    font-size: ${String(charsize)}px;
    height: 5em; min-width: 100%;
    margin-top: 2em;
}

#textArea{
    color: var(--elementC);
    display: flex;
    border-right: 1px dotted var(--elementC);
}
.textChar{
    white-space: pre;
}
#textArea.active .textChar:hover{
    background-color: var(--elementC);
    color: var(--backgroundC);
}
.textChar.select{
    background-color: var(--elementC);
    color: var(--backgroundC);
}

#insertArea{
    height: 3.5em;
    display: flex;
}
.insertChar{
    border-bottom: 1px solid var(--elementC);
    position: relative;
    white-space: pre;
    color: var(--backgroundC);
}
.insertChar.active{
    border-left: 1px dashed var(--elementC);
}
#EditBox.NonActive .insertChar:hover{
    border-left: 1px dashed var(--elementC);
}

#appendArea{
    flex: 1;
    display: flex;
    flex-direction: row;
    height: 3.5em;
}
.appendEle{
    position: relative;
    white-space: pre;
}
.appendEle.active{
    border-left: 1px dashed var(--elementC);
}
#EditBox.NonActive .appendEle:hover{
    border-left: 1px dashed var(--elementC);
}
#appendTab{
    flex: 1;
    width: 80vw;
}

#toolArea{
    position: fixed;
    top: 0; left: 0;
    font-weight: bolder;
    width: 100%; height: 2em;
    display: flex;
}

#loading{
    padding-top: 0.5em;
    margin-right: 4px;
    opacity: 0;
}

#loading.active{
    opacity: 1;
}

#SelToolBox{
    display: none;
}

#SelToolBox.active{
    display: flex;
}

#InsToolBox{
    display: none;
}

#InsToolBox.active{
    display: flex;
}

.tools{
    color: var(--backgroundC);
    background-color: var(--elementC);
    padding-top: 0.5em;
    margin-right: 4px;
    padding-left: 1em;
    padding-right: 1em;
}

canvas{
    touch-action: none;
    left: 0;
    position: absolute;
    width: 80vw; height: 100%;
    z-index: 999;
    border-left: 1px dashed var(--elementC);
    border-top: 1px solid var(--elementC);
}

#ref{display: none;}
    </style>
    <title>SseukSsuek Panel</title>
    <script src="${opencvjsUri}"></script>
</head>
<body>
    <section id="sys">
        <div id="toolArea">
            <div id="loading">
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_P7sC{fill:var(--elementC);transform-origin:center;animation:spinner_svv2 .75s infinite linear}@keyframes spinner_svv2{100%{transform:rotate(360deg)}}</style><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" class="spinner_P7sC"/></svg>
            </div>
            <div id="SelToolBox">
                <div class="tools" id="cancel" onpointerdown="reload()">취소</div>
                <div class="tools" id="cut" onpointerdown="tool_cut()">자르기</div>
                <div class="tools" id="copy" onpointerdown="tool_copy()">복사</div>
                <div class="tools" id="delete" onpointerdown="tool_delete()">지우기</div>
            </div>
            <div id="InsToolBox">
                <div class="tools" id="stop" onpointerdown="reload()">중단</div>
                <div class="tools" id="space" onpointerdown="tool_space()">공백</div>
                <div class="tools" id="tab" onpointerdown="tool_tab()">탭</div>
            </div>
        </div>
        <div id="EditBox" class="NonActive">
            <div id="strings">
                <div id="textArea" class="active">
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
    </section>
    <section id="output"></section>
    <script>
let txt = "te xts"; let lastline = -1; let lastcol = -1;
let activeProcess = undefined;
let nowStatus = undefined;
const RefTa = document.querySelector("#sys > #toolArea");
const RefEb = document.querySelector("#sys > #EditBox");
let backgC;
let elemC;
let stylus = ${stylus};
let delayTime = ${inputDelayTime};

const vscode = acquireVsCodeApi();

class status{
    constructor(EB, lN, cN){
        this.targetEB = EB;

        this.drwaEnable = true;
        this.drawActive = false;
        this.ctx = undefined;
        this.lastPointX = -1;
        this.lastPointY = -1;

        this.lineNum = lN;
        this.col = cN;

        this.select = 0; // 0: 선택 안함, 1: 하나만 선택, 2. 선택 완료
        this.selectStart = -1;
        this.selectEnd = -1;
        
        this.insert = false;
        this.insertStart = -1;

        this.append = false;
        this.appendSize = "none";

        this.nowCanv = undefined;
        this.setLastTime = undefined;
    }

    activeEB(type, target, appSize){
        let textA = this.targetEB.children[0].children[0];
        for (let insEle of this.targetEB.children[0].children[1].children){
            insEle.removeEventListener("pointerdown", insertPD);
        }
        let appendA = this.targetEB.children[1];
        appendA.children[0].removeEventListener("pointerdown", appbPD); // Behind
        appendA.children[1].removeEventListener("pointerdown", appsPD); // Space
        appendA.children[2].removeEventListener("pointerdown", apptPD); // Tab
        
        this.targetEB.classList.remove("NonActive");

        if (type == "select"){
            document.querySelector("#output #SelToolBox").classList.add("active");
        
            switch(this.select){
                case 0:
                    this.select = 1;
                    this.selectStart = Number(target.id.replace(/[^0-9]/g, ""));
                    target.classList.add("select");
                break;
                case 1:
                    this.select = 2;
                    this.selectEnd = Number(target.id.replace(/[^0-9]/g, ""));
                    if (this.selectStart > this.selectEnd){
                        var temp = this.selectStart;
                        this.selectStart = this.selectEnd;
                        this.selectEnd = temp;
                    }
                    console.log(this.selectStart); console.log(this.selectEnd);
                    for (let selEle of this.targetEB.children[0].children[0].children){
                        selEle.removeEventListener("pointerdown", selectPD);
                    }
                    for (let col = this.selectStart; col <= this.selectEnd; col+=1){
                        document.querySelector("#output .textChar#t"+String(col)).classList.add("select");
                    }
                    textA.classList.remove("active");
                break;
            }
            return;
        }
        else{
            for (let selEle of this.targetEB.children[0].children[0].children){
                selEle.removeEventListener("pointerdown", selectPD);
            }
        }

        textA.classList.remove("active");
        switch(type){
            case "insert":
                this.insert = true;
                this.insertStart = Number(target.id.replace(/[^0-9]/g, ""));
            break;
            case "append":
                this.append = true;
                this.appendSize = appSize;
            break;
        }
        document.querySelector("#output #InsToolBox").classList.add("active");
        
        let newCanv = document.createElement("canvas");
        target.appendChild(newCanv);
        newCanv.addEventListener("pointerdown", canvPD);

        newCanv.width = newCanv.offsetWidth;
        newCanv.height = newCanv.offsetHeight;
    }
    displayLoading(){
        document.querySelector("#output > #toolArea #loading").classList.add("active");
    }
}

function setSsuekSsuek(text, line, col){
    if (nowStatus != undefined){
        if (nowStatus.setLastTime != undefined){ clearTimeout(nowStatus.setLastTime); }
        delete nowStatus;
    }
    if (activeProcess != undefined){ clearTimeout(activeProcess); }
    document.getElementById("output").innerHTML = "";
    
    // Tool박스 이벤트 지정.
    newTa = RefTa.cloneNode(true);
    document.querySelector("#output").appendChild(newTa);

    newEb = RefEb.cloneNode(true);
    newEbTa = newEb.children[0].children[0]; newEbTc = newEbTa.children[0];
    newEbIa = newEb.children[0].children[1]; newEbIc = newEbIa.children[0];
    newEbAa = newEb.children[1];
    newEbAb = newEbAa.children[0]; newEbAs = newEbAa.children[1];newEbAt = newEbAa.children[2];
    document.querySelector("#output").appendChild(newEb);

    charnum = 0
    for (char of text){
        eEbTc = newEbTc.cloneNode(true); 
        eEbTc.id = "t" + charnum; eEbTc.innerText = char;
        if (charnum == col){ eEbTc.classList.add("targetCol"); }
        eEbTc.addEventListener("pointerdown", selectPD);
        newEbTa.appendChild(eEbTc);
        eEbIc = newEbIc.cloneNode(true);
        eEbIc.id = "i" + charnum; eEbIc.innerText = char;
        eEbIc.addEventListener("pointerdown", insertPD);
        newEbIa.appendChild(eEbIc);
        charnum += 1;
    }
    newEbAb.addEventListener("pointerdown", appbPD);
    newEbAs.addEventListener("pointerdown", appsPD);
    newEbAt.addEventListener("pointerdown", apptPD);
    nowStatus = new status(newEb, line, col);

    newEbAb.scrollIntoView({inline: "start"});

    tcol = document.querySelector(".targetCol");
    if (tcol != undefined){
        tcol.scrollIntoView({inline: "center"});
    }

    txt = text; lastline = line; lastcol = col;
}

function selectPD(e){
    if (stylus && e.pointerType != "pen"){return;} 
    nowStatus.activeEB("select", e.currentTarget, "");
}

function insertPD(e){
    if (stylus && e.pointerType != "pen"){return;} 
    nowStatus.activeEB("insert", e.currentTarget, "");
}

function appbPD(e){
    if (stylus && e.pointerType != "pen"){return;} 
    nowStatus.activeEB("append", e.currentTarget, "behind");
}

function appsPD(e){
    if (stylus && e.pointerType != "pen"){return;} 
    nowStatus.activeEB("append", e.currentTarget, "space");
}

function apptPD(e){
    if (stylus && e.pointerType != "pen"){return;} 
    nowStatus.activeEB("append", e.currentTarget, "tab");
}

function reload(e){
    setSsuekSsuek(txt, lastline, lastcol);
}

function tool_cut(){
    currentEdit("cut");
}

function tool_copy(){
    currentEdit("copy");
}

function tool_delete(){
    currentEdit("delete")
}

function currentEdit(type){
    vscode.postMessage({
        type: "currentEdit",
        editType: type,
        line: nowStatus.lineNum,
        start: nowStatus.selectStart,
        end: nowStatus.selectEnd,
    });
}

function tool_space(){
    nowStatus.append = true;
    nowStatus.appendSize = "space";
    changeText("");
}

function tool_tab(){
    nowStatus.append = true;
    nowStatus.appendSize = "tab";
    changeText("");
}

function canvPD(e){
    console.log(stylus)
    if (stylus && e.pointerType != "pen"){return;} 
    if (nowStatus.drawEnable == false){
        nowStatus.drawActive = false; return;
    }
    nowStatus.drawActive = true;
    e.currentTarget.addEventListener("pointerup", canvCancel);
    e.currentTarget.addEventListener("pointerout", canvCancel);
    
    e.currentTarget.addEventListener("pointermove", canvPM);

    nowStatus.nowCanv = e.currentTarget;
    nowStatus.ctx = e.currentTarget.getContext("2d");

    if (nowStatus.setLastTime != undefined){
        clearTimeout(nowStatus.setLastTime);
    }
    nowStatus.setLastTime = undefined;

    e.currentTarget.removeEventListener("pointerdown", canvPD);
}

function canvCancel(e){
    nowStatus.drawActive = false;
    e.currentTarget.addEventListener("pointerdown", canvPD);

    //nowStatus.ctx = undefined;
    nowStatus.lastPointX = -1;
    nowStatus.lastPointY = -1;

    e.currentTarget.removeEventListener("pointermove", canvPM);

    e.currentTarget.removeEventListener("pointerup", canvCancel);
    e.currentTarget.removeEventListener("pointerout", canvCancel);
}

function canvPM(e){
    if (nowStatus.drawActive == false) {return;}
    nowStatus.ctx.lineWidth = 2; nowStatus.ctx.lineCap = "round"; 
    nowStatus.ctx.strokeStyle = elemC.slice(0, -1) +","+String(e.pressure.toFixed(1))+")";
    nowStatus.ctx.beginPath();
    nowStatus.ctx.moveTo(nowStatus.lastPointX, nowStatus.lastPointY);
    if (nowStatus.lastPointX == -1){
        nowStatus.ctx.moveTo(e.offsetX, e.offsetY);
    }
    nowStatus.ctx.lineTo(e.offsetX, e.offsetY);
    nowStatus.ctx.stroke();

    nowStatus.lastPointX = e.offsetX; nowStatus.lastPointY = e.offsetY; 
    if (nowStatus.setLastTime != undefined){
        clearTimeout(nowStatus.setLastTime);
    }
    
    nowStatus.setLastTime = setTimeout(canv2img, delayTime);
}

function canv2img(){
    nowStatus.drawEnable = false;
    nowStatus.displayLoading();
    txtimg = nowStatus.nowCanv.toDataURL();
    console.log(txtimg);
    let txtData = nowStatus.ctx.getImageData(0, 0, nowStatus.nowCanv.width, nowStatus.nowCanv.height);

    //TODO // 텍스트 처리 함수로 넘기기.
    ssp_ocr(txtData)

    activeProcess = setTimeout(() => {changeText("test");}, delayTime);
}

function changeText(addtext){
    outcol = txt.length;
    if (nowStatus.insert == true){
        outcol = nowStatus.insertStart;
    }
    
    vscode.postMessage({
        type: "textadd",
        value: addtext,
        line: nowStatus.lineNum,
        col: outcol,
        append: nowStatus.appendSize
    });
}

function ssp_ocr(imgSource) {
    let chars = Array(); let charImgs = Array();

    let txtimg = cv.matFromImageData(imgSource);
    let rgbaP = new cv.MatVector();

    cv.split(txtimg, rgbaP);
    let alphaChannel = rgbaP.get(3);

    let thImg = new cv.Mat();
    cv.threshold(alphaChannel, thImg, 1, 255, 0);
    
    let cnt = new cv.MatVector(); let hiec = new cv.Mat();
    cv.findContours(thImg, cnt, hiec, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let pre_rects = Array(); let rects = Array();
    for(let c = 0; c < cnt.size(); c++){
        let rect = cv.boundingRect(cnt.get(c));
        pre_rects.push(rect);
    }
    pre_rects.sort((a,b) => {return a.x - b.x})

    for (prt of pre_rects){
        rects.push(prt);
        for (let b = 0; b < rects.length-1; b++){
            let nowBox = rects[b];
            if (prt.x > (nowBox.x+nowBox.width)) continue;
            else if ((prt.x+prt.width) < nowBox.x) break;

            rects.pop();
            if (prt.x <= nowBox.x) rects[b].x = prt.x;
            else if ((prt.x+prt.width) >= (nowBox.x+nowBox.width)){
                rects[b].x = prt.x;
                rects[b].width = prt.width;
            }
        }
    }

    for (let i = 0; i < rects.length; i++){
        blackImg = new cv.Mat()

        charOneImg = new cv.Mat();
        let area = new cv.Rect(rects[i].x, 0, rects[i].x+rects[i].width, rects[i].y+rects[i].height);
        charOneImg = thImg.roi(area);
        
        let wth = parseInt(28 * (rects[i].width/(rects[i].y+rects[i].height)));
        let borderL = parseInt((28-wth)/2);
        let borderR = (wth % 2) ? borderL+1 : borderL ;

        let dsize = new cv.Size(wth, 28);
        cv.resize(charOneImg, charOneImg, dsize, 0, 0, cv.INTER_AREA);
        if (wth < 28){
            let blk = new cv.Scalar(0);
            cv.copyMakeBorder(charOneImg, charOneImg, 0,0, borderL, borderR, cv.BORDER_CONSTANT, blk)
        }
        else{
            let rdsize = new cv.Size(28, 28);
            cv.resize(charOneImg, charOneImg, rdsize, 0, 0, cv.INTER_AREA);
        }

        let Img_array = [];
        for (let i = 0; i < charOneImg.cols; i++) {
            let rowArray = [];
            for (let j = 0; j < charOneImg.rows; j++) {
                let pixel = [];
                for (let k = 0; k < charOneImg.channels(); k++) {
                    pixel.push(charOneImg.ucharPtr(i, j)[k]);
                }
                rowArray.push(pixel);
            }
            Img_array.push(rowArray);
        }

        charImgs.push(Img_array);
        charOneImg.delete();
    }
    
    console.log(charImgs);

    txtimg.delete(); rgbaP.delete(); alphaChannel.delete();
    thImg.delete(); cnt.delete(); hiec.delete();
};

window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type){
        case 'lineCurser':
            setSsuekSsuek(message.lineT, message.lineN, message.colN);
        break;
    }
});

document.addEventListener("DOMContentLoaded", () => {
    backgC = getComputedStyle(RefEb).getPropertyValue('background-color');
    elemC = getComputedStyle(RefEb).getPropertyValue('color');
});
    </script>
</body>
</html>`;
	}
}