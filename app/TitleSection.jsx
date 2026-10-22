import {cn} from "../components/cn.js";

/**
 * The title above a notebook: its heading, a line of details such as the
 * author and date, and actions on the notebook at the right.
 */
export function TitleSection({title, details = null, actions = null}) {
  return (
    <div className={cn("title-section")}>
      <div className={cn("title-main")}>
        {title}
        {details && <p className={cn("status")}>{details}</p>}
      </div>
      {actions && <div className={cn("title-actions")}>{actions}</div>}
    </div>
  );
}
