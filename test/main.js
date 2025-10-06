import * as jsTests from "./js/index.js";
import {createEditor} from "../editor/index.js";

// Select
const select = createSelect(() => {
  const {value} = select;
  history.pushState({value}, "", `?name=${value}`);
  render();
});
const options = Object.keys(jsTests).map(createOption);
select.append(...options);
document.body.append(select);

const container = document.createElement("div");
container.id = "container";
document.body.append(container);

// Init app name.
const initialValue = new URL(location).searchParams.get("name");
if (jsTests[initialValue]) select.value = initialValue;

let preEditor = null;
render();

async function render() {
  container.innerHTML = "";
  if (preEditor) preEditor.destroy();
  const editorContainer = document.createElement("div");
  const code = jsTests[select.value];
  const editor = createEditor(editorContainer, {code});
  editor.run();
  const runButton = document.createElement("button");
  runButton.textContent = "Run";
  runButton.onclick = () => editor.run();
  runButton.style.marginBottom = "10px";
  container.appendChild(runButton);

  const stopButton = document.createElement("button");
  stopButton.textContent = "Stop";
  stopButton.onclick = () => editor.stop();
  container.appendChild(stopButton);

  container.appendChild(editorContainer);
}

function createSelect(onchange) {
  const select = document.createElement("select");
  select.style.height = "20px";
  select.style.marginBottom = "10px";
  select.onchange = onchange;
  return select;
}

function createOption(key) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = key;
  return option;
}
