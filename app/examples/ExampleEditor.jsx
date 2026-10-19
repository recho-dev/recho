"use client";
import {useRouter} from "next/navigation";
import {Editor} from "../Editor.jsx";
import {Button} from "../../components/Button.jsx";
import {toast} from "../../components/Toast.jsx";
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
      runtime: example.runtime,
    };
    const duplicated = duplicateNotebook(sourceNotebook);
    try {
      await addNotebook(duplicated);
      router.push(`/works/${duplicated.id}`);
    } catch (error) {
      console.error(error);
      toast(`Failed to duplicate notebook: ${error.message}`, {error: true});
    }
  }

  return (
    <Editor
      initialCode={initialCode}
      runtime={example.runtime}
      key={example.title}
      onDuplicate={onDuplicate}
      toolBarStart={
        example.pull_request && (
          <Button
            as="a"
            variant="ghost"
            key={example.slug}
            href={`https://github.com/recho-dev/notebook/pull/${example.pull_request}`}
            target="_blank"
            rel="noreferrer"
          >
            Comment
          </Button>
        )
      }
    />
  );
}
