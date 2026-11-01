import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useLoc } from "../context.js";
import { ChevronIcon } from "./Icons.jsx";

const DEFAULT_SAVE_MESSAGE = "Your plans and payments save automatically.";

/** Header menu: a "Log in" link when signed out, or a dropdown with the user's details and Log out. */
export default function Account() {
  const { user, setUser, saveState } = useLoc();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close the menu when the user clicks anywhere outside it.
  useEffect(() => {
    if (!isOpen) return;
    const closeIfOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    return () => document.removeEventListener("pointerdown", closeIfOutside);
  }, [isOpen]);

  const logOut = () =>
    api("/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        setIsOpen(false);
        setUser(null);
        navigate("/");
      });

  const closeOnEscape = (event) => {
    if (event.key === "Escape" && isOpen) {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  if (!user) {
    return (
      <Link className="btn ghost" to="/login">
        Log in
      </Link>
    );
  }

  const firstName = user.name.split(" ")[0];
  const hasSaveProblem = saveState.startsWith("Could not");

  return (
    <div className="menu" ref={menuRef} onKeyDown={closeOnEscape}>
      <button
        ref={buttonRef}
        className="btn ghost menubtn"
        aria-expanded={isOpen}
        aria-controls="acctmenu"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="avatar" aria-hidden="true">
          {firstName[0]?.toUpperCase()}
        </span>
        <span className="mname">Hi, {firstName}</span>
        {hasSaveProblem && <span className="sr">(there is a problem saving your data)</span>}
        <ChevronIcon />
      </button>
      {isOpen && (
        <div id="acctmenu" className="menupanel">
          <p className="who">
            <b>{user.name}</b>
            <span className="muted">{user.email}</span>
          </p>
          <p className={hasSaveProblem ? "error" : "muted"} role="status">
            {saveState || DEFAULT_SAVE_MESSAGE}
          </p>
          <button className="btn ghost" onClick={logOut}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
