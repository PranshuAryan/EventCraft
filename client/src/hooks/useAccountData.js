import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const SAVE_DELAY_MS = 600;

/**
 * Tracks the signed-in user and keeps their plan and bookings in sync with the server.
 * Changes are saved automatically a moment after the user stops editing.
 */
export function useAccountData() {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = logged out
  const [plan, setPlan] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveState, setSaveState] = useState("");
  const skipNextSave = useRef(false);

  // Find out who is logged in.
  useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  // Load saved data when the user changes.
  useEffect(() => {
    setHasLoaded(false);
    if (!user) {
      setPlan(null);
      setBookings([]);
      return;
    }
    let isActive = true;
    api("/data")
      .then((data) => {
        if (!isActive) return;
        skipNextSave.current = true; // loading must not trigger a save
        setPlan(data.plan);
        setBookings(data.bookings ?? []);
        setHasLoaded(true);
      })
      .catch(() => isActive && setSaveState("Could not load your saved data"));
    return () => {
      isActive = false;
    };
  }, [user]);

  // Save shortly after any change.
  useEffect(() => {
    if (!hasLoaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      api("/data", { method: "PUT", body: JSON.stringify({ plan, bookings }) })
        .then(() => setSaveState("Saved"))
        .catch(() => setSaveState("Could not save"));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [plan, bookings, hasLoaded]);

  return { user, setUser, plan, setPlan, bookings, setBookings, saveState };
}
