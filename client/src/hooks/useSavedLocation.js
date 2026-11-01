import { useEffect, useState } from "react";

const STORAGE_KEY = "ec_loc";

/** Remembers the user's chosen location in this browser. Storage problems are ignored. */
export function useSavedLocation() {
  const [location, setLocation] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
      // Older versions kept the plan here; it now lives on the server.
      localStorage.removeItem("ec_plan");
      localStorage.removeItem("ec_bookings");
    } catch {
      /* storage unavailable */
    }
  }, [location]);

  return [location, setLocation];
}
