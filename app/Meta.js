import Link from "next/link";
import {cn} from "./cn.js";

export function Meta({example}) {
  return (
    <div className={cn("mb-3")}>
      <div className={cn("flex items-center gap-2")}>
        <img
          src={`https://github.com/${example.github}.png`}
          alt={example.author}
          className={cn("w-8 h-8 rounded-full")}
        />
        <div>
          <div className={cn("flex items-center gap-2 ellipsis line-clamp-1")}>
            <span>{example.author}</span>
            <span> / </span>
            <Link href={`/explore/${example.slug}`} className={cn("text-blue-500 hover:underline font-semibold")}>
              <span>{example.title}</span>
            </Link>
          </div>
          <div className={cn("text-sm text-gray-500")}>Created {example.created}</div>
        </div>
      </div>
      {example.label && Array.isArray(example.label) && example.label.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5 mt-3")}>
          {example.label.map((label, index) => (
            <span key={index} className={cn("text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700")}>
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
