import {
  ArrowDownUpIcon,
  ClipboardPasteIcon,
  CornerDownLeftIcon,
  DeleteIcon,
  KeyboardIcon,
  LanguagesIcon,
  IndentIncreaseIcon,
  IndentDecreaseIcon,
  ListPlusIcon,
  MoveIcon,
  RedoDotIcon,
  ScissorsIcon,
  SquareDashedMousePointerIcon,
  SquareMousePointerIcon,
  TextCursorInputIcon,
  UndoDotIcon,
  type LucideIcon,
} from "lucide-react";
import {cn} from "../../components/cn.js";

export function UserEvent({userEvent}: {userEvent: string}) {
  let Icon: LucideIcon;
  let className: string = "";
  let text: string;
  switch (userEvent) {
    case "input":
      Icon = CornerDownLeftIcon;
      text = "Newline";
      break;
    case "input.type":
      Icon = KeyboardIcon;
      text = "Input";
      break;
    case "input.type.compose":
      Icon = LanguagesIcon;
      text = "Input";
      break;
    case "input.paste":
      Icon = ClipboardPasteIcon;
      text = "Paste";
      break;
    case "input.drop":
      Icon = SquareMousePointerIcon;
      text = "Drop";
      break;
    case "input.copyline":
      Icon = ListPlusIcon;
      text = "Duplicate Line";
      break;
    case "input.complete":
      Icon = ListPlusIcon;
      text = "Complete";
      break;
    case "input.indent":
      Icon = IndentIncreaseIcon;
      text = "Indent";
      break;
    case "delete.dedent":
      Icon = IndentDecreaseIcon;
      text = "Dedent";
      break;
    case "delete.selection":
      Icon = TextCursorInputIcon;
      text = "Delete Selection";
      break;
    case "delete.forward":
      Icon = DeleteIcon;
      className = "rotate-180";
      text = "Delete";
      break;
    case "delete.backward":
      Icon = DeleteIcon;
      text = "Backspace";
      break;
    case "delete.cut":
      Icon = ScissorsIcon;
      text = "Cut";
      break;
    case "move":
      Icon = MoveIcon;
      text = "Move (External)";
      break;
    case "move.line":
      Icon = ArrowDownUpIcon;
      text = "Move Line";
      break;
    case "move.drop":
      Icon = SquareDashedMousePointerIcon;
      text = "Move";
      break;
    case "undo":
      Icon = UndoDotIcon;
      text = "Undo";
      break;
    case "redo":
      Icon = RedoDotIcon;
      text = "Redo";
      break;
    default:
      return null;
  }
  return (
    <div className="flex flex-row items-center gap-0.5 text-stone-600">
      <Icon className={cn("w-4 h-4", className)} />
      <span className="font-semibold uppercase">{text}</span>
    </div>
  );
}
