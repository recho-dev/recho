import {BadgeQuestionMarkIcon, HashIcon, RefreshCcw, type LucideIcon} from "lucide-react";
import {cn} from "../../components/cn.js";

export function Remote({remoteValue}: {remoteValue: unknown}) {
  let Icon: LucideIcon;
  let className: string = "";
  let text: string;
  switch (remoteValue) {
    case true:
      Icon = RefreshCcw;
      text = "Runtime";
      className = "animate-pulse";
      break;
    case "control.number":
      Icon = HashIcon;
      text = "recho.number";
      break;
    default:
      Icon = BadgeQuestionMarkIcon;
      text = "Unknown Source";
      break;
  }
  return (
    <div className="flex flex-row items-center gap-0.5 text-stone-600">
      <Icon className={cn("w-4 h-4", className)} />
      <span className="font-semibold uppercase">{text}</span>
    </div>
  );
}
