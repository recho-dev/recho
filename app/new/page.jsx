import {EditorPage} from "../EditorPage.jsx";
import {LANGUAGES} from "../shared.js";

// A new, unsaved notebook: /new?lang=wenyan starts one in wenyan.
export default async function Page({searchParams}) {
  const {lang} = await searchParams;
  const runtime = LANGUAGES.find((language) => language.value === lang)?.runtime;
  return <EditorPage runtime={runtime} />;
}
