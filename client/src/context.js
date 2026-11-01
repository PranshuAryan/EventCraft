import { createContext, useContext } from "react";

/** Shared app state: location, user, saved plan and bookings. Provided by <App />. */
export const Loc = createContext(null);

export const useLoc = () => useContext(Loc);
