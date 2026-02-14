import { Timeframe } from "./types";

export function rangeToPeriod1(range: Timeframe): Date {
  const now = new Date();

  switch (range) {
    case "1d":
      return new Date(now.getTime() - 1 * 86400000);

    case "5d":
      return new Date(now.getTime() - 5 * 86400000);

    case "1mo":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    case "3mo":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    case "6mo":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    case "2y":
      return new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    case "5y":
      return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

    case "10y":
      return new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());

    case "ytd":
      return new Date(now.getFullYear(), 0, 1);

    case "max":
      return new Date(0); // epoch start (commonly used as "all data")

    default: {
      const _exhaustiveCheck: never = range;
      return _exhaustiveCheck;
    }
  }
}
