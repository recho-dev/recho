import {notFound} from "next/navigation";
import {getAllJSExamples, removeMeta} from "../../utils.js";
import {cn} from "../../cn.js";
import {Meta} from "../../Meta.js";
import {ExampleEditor} from "../ExampleEditor.jsx";

export async function generateStaticParams() {
  return getAllJSExamples().map((example) => ({slug: example.slug}));
}

export async function generateMetadata({params}) {
  const {slug} = await params;
  const example = getAllJSExamples().find((example) => example.slug === slug);
  if (!example) notFound();
  return {
    title: `${example.title} | Recho`,
  };
}

export default async function Page({params}) {
  const {slug} = await params;
  const example = getAllJSExamples().find((example) => example.slug === slug);
  if (!example) notFound();
  const initialCode = removeMeta(example);
  return (
    <div className={cn("max-w-screen-lg lg:mx-auto mx-4 lg:my-10 my-4")}>
      <div className={cn("mb-6")}>
        <Meta example={example} />
      </div>
      <ExampleEditor example={example} initialCode={initialCode} />
    </div>
  );
}
