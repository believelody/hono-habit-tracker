import { SessionUser } from "$auth";
import { NotificationList } from "$components/notifications.component";
import classNames from "classnames";

export type HTMLProps = HTMLElement & {
  title: string;
  children: JSX.Element | JSX.Element[];
  class?: string;
  isHTMX?: boolean;
  currentURL?: string;
  sessionUser?: SessionUser;
};

export type PageContext<T> = T & Omit<HTMLProps, "title" | "children">;

export function BaseHtml({
  title,
  children,
  isHTMX,
  class: className,
}: HTMLProps) {
  const classes = classNames(
    "bg-slate-900 text-white relative min-h-screen",
    className
  );
  return isHTMX ? (
    <>{children}</>
  ) : (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@1.9.5"></script>
        <script src="https://unpkg.com/htmx.org/dist/ext/response-targets.js"></script>
        <script src="https://unpkg.com/htmx.org/dist/ext/loading-states.js"></script>
        <script src="https://cdn.tailwindcss.com?plugins=forms"></script>
        <script
          defer="true"
          src="https://unpkg.com/alpinejs-manage@latest/dist/manage.min.js"
        ></script>
        <script
          defer="true"
          src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
        ></script>
      </head>
      <body class={classes} hx-ext="response-targets" x-data hx-boost="true">
        <div
          hx-get="/api/notifications/register/success"
          hx-trigger="registerSuccessNotification from:body"
          hx-target="#notification-list"
          hx-swap="afterbegin"
          class={"hidden"}
        />
        <NotificationList />
        {children}
      </body>
    </html>
  );
}
