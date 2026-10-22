"use client";
import {useRouter} from "next/navigation";
import {Copy} from "lucide-react";
import {Editor} from "../Editor.jsx";
import {Meta} from "../Meta.js";
import {Button} from "../../components/Button.jsx";
import {toast} from "../../components/Toast.jsx";
import {duplicateNotebook, addNotebook} from "../api.js";
import {ensureUser} from "../auth.js";
import {extensionOf} from "../shared.js";

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
    <>
      <Meta
        example={example}
        actions={
          <Button onClick={onDuplicate} tip="Duplicate notebook">
            <Copy className="ic" size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="lbl">Duplicate</span>
          </Button>
        }
      />
      <Editor
        initialCode={initialCode}
        runtime={example.runtime}
        key={example.title}
        fileName={example.slug + extensionOf(example.runtime)}
      />
    </>
  );
}
