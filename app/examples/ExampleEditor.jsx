"use client";
import {useRouter} from "next/navigation";
import {Editor} from "../Editor.jsx";
import {cn} from "../cn.js";
import {duplicateNotebook, addNotebook} from "../api.js";
import {ensureUser} from "../auth.js";

export function ExampleEditor({example, initialCode}) {
  const router = useRouter();

  async function onDuplicate() {
    if (!(await ensureUser())) return;
    const sourceNotebook = {
      title: example.title,
      content: initialCode,
      autoRun: true,
    };
    const duplicated = duplicateNotebook(sourceNotebook);
    try {
      await addNotebook(duplicated);
      router.push(`/works/${duplicated.id}`);
    } catch (error) {
      console.error(error);
      alert(`Failed to duplicate notebook: ${error.message}`);
    }
  }

  return (
    <Editor
      initialCode={initialCode}
      key={example.title}
      onDuplicate={onDuplicate}
      toolBarStart={
        <div className={cn("flex items-center")} key={example.slug}>
          <a
            href={`https://github.com/recho-dev/notebook/pull/${example.pull_request}`}
            target="_blank"
            rel="noreferrer"
            className={cn("bg-green-700 text-white rounded-md px-3 py-1 text-sm hover:bg-green-800")}
          >
            Comment
          </a>
        </div>
      }
    />
  );
}
