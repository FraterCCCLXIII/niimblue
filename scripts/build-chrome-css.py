from pathlib import Path

src = Path("src/styles/workspace.scss").read_text()
start = src.find(".ws-scroll {")
body = src[start:].replace("body {\n  margin: 0;\n}\n\n", "")
header = "/* Workspace chrome that is still more readable as CSS than utilities. */\n\n"
Path("src/styles/chrome.css").write_text(header + body)
print("wrote src/styles/chrome.css")
