"use client";

import { toast } from "sonner";

export const error = (title: string, opts?: Record<string, any>) => {
  return toast.error(title, opts);
};

export const warning = (title: string, opts?: Record<string, any>) => {
  return toast(title, { ...opts });
};

export const userRejected = (message = "Action cancelled") => {
  return toast.error(message);
};

export default { error, warning, userRejected };
