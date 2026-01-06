import {
  Links,
  LinksFunction,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import React from "react";
import { Toaster } from "react-hot-toast";
import logoUrl from "./assets/logo.png";
import "./tailwind.css";
import "./index.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Toaster />
        <div id="modal-portal-exit" />
      </body>
    </html>
  );
}

export const meta: MetaFunction = () => [
  { title: "build" },
  { name: "description", content: "Let's Start Building!" },
];

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/png", href: logoUrl },
];

export default function App() {
  return <Outlet />;
}
