import { SessionUser } from "$auth";
import { HonoRequest } from "hono";
import { HTTPException } from "hono/http-exception";

export type DateWithCompletion = {
    date: string;
    completed: boolean;
}

export function generateDatesByNumberOfDays(numberOfDays: number) {
    const today = new Date();
    return Array.from({ length: numberOfDays }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - index); // Go back i days
      return date;
    });
}

export function generateDatesWithCompletion(numberOfDays: number): DateWithCompletion[] {
  const completedRatio = 0.3; // 30% chance of completed

  const dates = generateDatesByNumberOfDays(numberOfDays);

  return dates.map((date) => {
    const completed = Math.random() < completedRatio;
    return {
      date: date.toISOString().slice(0, 10), // Format date (YYYY-MM-DD)
      completed,
    };
  });
}

export function fetchApi<T>(url: string | Request | URL, init?: FetchRequestInit | undefined): Promise<T> {
  return new Promise<T>((resolve) => {
    const json = fetch(url, init).then((res) => res.json());
    resolve(json);
  });
}

export async function executeHandlerForSessionUser<T>(handler: (user: SessionUser) => T, user: SessionUser | undefined): Promise<T> {
  if (!user) {
    throw new Error("Error session user");
  }
  return handler(user);
}


export function getURL(req: HonoRequest): URL {
  let href = req.header("hx-current-url") || req.url;
  if (!href) {
    throw new Error("href does not exist");
  }
  return new URL(href);
}