import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { Loc } from "../src/App.jsx";
import Login from "../src/pages/Login.jsx";
const view = () => render(<Loc.Provider value={{ user: null, setUser() {} }}><MemoryRouter><main><Login /></main></MemoryRouter></Loc.Provider>);
describe("Login page", () => {
  it("has no axe violations in both modes", async () => {
    const { container } = view();
    expect((await axe(container)).violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Create account", pressed: false }));
    expect((await axe(container)).violations).toEqual([]);
  });
  it("shows the name field only when creating an account", () => {
    view();
    expect(screen.queryByLabelText("Your name")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create account", pressed: false }));
    expect(screen.getByLabelText("Your name")).toBeTruthy();
  });
});
